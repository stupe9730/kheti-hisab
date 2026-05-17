import express from "express";
import mongoose from "mongoose";
import WorkerEntry from "../models/WorkerEntry.js";

const router = express.Router();

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// GET all workers (optionally by farmId)
router.get("/", async (req, res) => {
  try {
    const { farmId } = req.query;
    const query = farmId && isValidObjectId(farmId as string) 
      ? { farmId: new mongoose.Types.ObjectId(farmId as string) } 
      : {};
    const entries = await WorkerEntry.find(query).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// GET all workers for a farm
router.get("/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!isValidObjectId(farmId)) return res.status(400).json({ error: "Invalid Farm ID" });
    const entries = await WorkerEntry.find({ farmId }).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// POST new worker entry
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data.farmId || !isValidObjectId(data.farmId)) return res.status(400).json({ error: "Valid farmId required" });
    
    const totalAmount = parseFloat(data.totalAmount) || 0;
    const paidAmountNow = parseFloat(data.paidAmountNow) || 0;
    const remainingAmount = totalAmount - paidAmountNow;

    const newEntry = new WorkerEntry({
      ...data,
      farmId: new mongoose.Types.ObjectId(data.farmId),
      totalPaidAmount: paidAmountNow,
      remainingAmount: remainingAmount,
      transactionHistory: [{
        paidNow: paidAmountNow,
        totalPaid: paidAmountNow,
        remaining: remainingAmount,
        date: new Date(),
        description: "Initial Record"
      }]
    });

    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (error) {
    console.error("POST Worker error:", error);
    res.status(500).json({ error: "Failed to add entry" });
  }
});

// PUT update worker entry (Incremental payment)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const entry = await WorkerEntry.findById(id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    const newPaidInput = parseFloat(req.body.paidNow) || 0;
    const currentTotalAmount = req.body.totalAmount !== undefined ? parseFloat(req.body.totalAmount) : entry.totalAmount;
    
    let updatedTotalPaid = entry.totalPaidAmount + newPaidInput;
    let finalPaidNow = newPaidInput;
    
    if (updatedTotalPaid > currentTotalAmount) {
      updatedTotalPaid = currentTotalAmount;
      finalPaidNow = Math.max(0, currentTotalAmount - entry.totalPaidAmount);
    }
    
    const updatedRemaining = Math.max(0, currentTotalAmount - updatedTotalPaid);
    const finalPaymentStatus = (req.body.paymentStatus === 'paid' || updatedRemaining <= 0) ? 'paid' : 'unpaid';

    entry.totalAmount = currentTotalAmount;
    entry.paidAmountNow = finalPaidNow;
    entry.totalPaidAmount = updatedTotalPaid;
    entry.remainingAmount = updatedRemaining;
    entry.paymentStatus = finalPaymentStatus;
    
    if (req.body.description) entry.description = req.body.description;
    if (req.body.workerName) entry.workerName = req.body.workerName;
    if (req.body.workType) entry.workType = req.body.workType;
    if (req.body.workingDays !== undefined) entry.workingDays = req.body.workingDays;
    if (req.body.ratePerDay !== undefined) entry.ratePerDay = req.body.ratePerDay;
    
    entry.version = entry.version + 1;

    if (!entry.transactionHistory) entry.transactionHistory = [];
    entry.transactionHistory.push({
      paidNow: finalPaidNow,
      totalPaid: updatedTotalPaid,
      remaining: updatedRemaining,
      date: new Date(),
      description: req.body.description || "Payment Update"
    });

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error("PUT Worker error:", error);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// DELETE worker entry
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    const result = await WorkerEntry.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ error: "Entry not found" });
    res.json({ message: "Entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

// GET transaction history
router.get("/history/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await WorkerEntry.findById(id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    const history = entry.transactionHistory.map((h, idx) => ({
      id: `${entry._id}_${idx}`,
      workerName: entry.workerName,
      workType: entry.workType,
      workingDays: entry.workingDays,
      ratePerDay: entry.ratePerDay,
      totalAmount: entry.totalAmount,
      paidAmountNow: h.paidNow,
      totalPaidAmount: h.totalPaid,
      remainingAmount: h.remaining,
      paymentStatus: h.remaining <= 0 ? 'paid' : 'unpaid',
      createdAt: h.date,
      paidDate: h.date,
      description: h.description,
      version: idx + 1
    }));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.post("/bulk-payment", async (req, res) => {
  try {
    const { farmId, year, amount, note, date: paymentDate } = req.body;
    let remainingToPay = Number(amount) || 0;
    if (!isValidObjectId(farmId)) return res.status(400).json({ error: "Invalid Farm ID" });
    if (!year) return res.status(400).json({ error: "Year is required" });
    if (remainingToPay <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const entries = await WorkerEntry.find({
      farmId: new mongoose.Types.ObjectId(farmId),
      $or: [{ date: { $gte: startDate, $lte: endDate } }, { createdAt: { $gte: startDate, $lte: endDate } }],
      remainingAmount: { $gt: 0 }
    }).sort({ date: 1, createdAt: 1 });
    if (entries.length === 0) return res.status(400).json({ error: "No pending expenses found" });
    const updatedEntries = [];
    for (const entry of entries) {
      if (remainingToPay <= 0) break;
      const canPayForThis = Math.min(remainingToPay, entry.remainingAmount);
      entry.totalPaidAmount += canPayForThis;
      entry.remainingAmount -= canPayForThis;
      entry.paidAmountNow = canPayForThis;
      entry.paymentStatus = entry.remainingAmount <= 0 ? 'paid' : 'unpaid';
      entry.transactionHistory.push({
        paidNow: canPayForThis,
        totalPaid: entry.totalPaidAmount,
        remaining: entry.remainingAmount,
        date: paymentDate ? new Date(paymentDate) : new Date(),
        description: note || "Year-end Bulk Payment"
      });
      await entry.save();
      updatedEntries.push(entry);
      remainingToPay -= canPayForThis;
    }
    res.json({ message: "Bulk payment applied successfully", paidCount: updatedEntries.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to apply bulk payment" });
  }
});

export default router;
