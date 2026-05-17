import express from "express";
import mongoose from "mongoose";
import SeedEntry from "../models/SeedEntry.js";

const router = express.Router();

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// GET all seeds (optionally by farmId)
router.get("/", async (req, res) => {
  try {
    const { farmId } = req.query;
    const query = farmId && isValidObjectId(farmId as string) 
      ? { farmId: new mongoose.Types.ObjectId(farmId as string) } 
      : {};
    const seeds = await SeedEntry.find(query).sort({ date: -1 });
    res.json(seeds);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch seeds" });
  }
});

// GET all seeds for a farm
router.get("/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!isValidObjectId(farmId)) return res.status(400).json({ error: "Invalid Farm ID" });
    const seeds = await SeedEntry.find({ farmId }).sort({ date: -1 });
    res.json(seeds);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch seeds" });
  }
});

// POST new seed entry
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data.farmId || !isValidObjectId(data.farmId)) return res.status(400).json({ error: "Valid farmId required" });
    
    const totalAmount = parseFloat(data.totalAmount) || 0;
    const paidAmountNow = parseFloat(data.paidAmountNow) || 0;
    const remainingAmount = totalAmount - paidAmountNow;

    const newEntry = new SeedEntry({
      ...data,
      farmId: new mongoose.Types.ObjectId(data.farmId),
      totalPaidAmount: paidAmountNow,
      remainingAmount: remainingAmount,
      transactionHistory: [{
        paidNow: paidAmountNow,
        totalPaid: paidAmountNow,
        remaining: remainingAmount,
        date: new Date(),
        description: "Initial Purchase"
      }]
    });

    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (error) {
    console.error("POST Seeds error:", error);
    res.status(500).json({ error: "Failed to add seed entry" });
  }
});

// PUT update seed entry (Incremental payment)
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const entry = await SeedEntry.findById(id);
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
    if (req.body.seedCompany !== undefined) entry.seedCompany = req.body.seedCompany;
    if (req.body.providerName !== undefined) entry.providerName = req.body.providerName;
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
    console.error("PUT Seed error:", error);
    res.status(500).json({ error: "Failed to update seed entry" });
  }
});

// DELETE seed entry
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    const result = await SeedEntry.findByIdAndDelete(id);
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
    const entry = await SeedEntry.findById(id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    const history = entry.transactionHistory.map((h, idx) => ({
      id: `${entry._id}_${idx}`,
      seedName: entry.seedName,
      seedCompany: entry.seedCompany,
      providerName: entry.providerName,
      cropType: entry.cropType,
      quantity: entry.quantity,
      unit: entry.unit,
      price: entry.price,
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
    const entries = await SeedEntry.find({
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
