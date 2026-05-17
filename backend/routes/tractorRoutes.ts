import express from 'express';
import TractorEntry from '../models/TractorEntry';
import mongoose from 'mongoose';

const router = express.Router();

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// GET all entries (or by farmId)
router.get("/", async (req, res) => {
  try {
    const { farmId } = req.query;
    const query = farmId && isValidObjectId(farmId as string) 
      ? { farmId: new mongoose.Types.ObjectId(farmId as string) } 
      : {};
    const entries = await TractorEntry.find(query).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// GET entries by specific farmId
router.get("/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!isValidObjectId(farmId)) {
      // If it's not a valid ObjectId, it might be a query for all or something else, 
      // but the requirement says strictly by farmId.
      return res.status(400).json({ error: "Invalid Farm ID" });
    }
    const entries = await TractorEntry.find({ farmId: new mongoose.Types.ObjectId(farmId) }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// POST new entry
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data.farmId || !isValidObjectId(data.farmId)) return res.status(400).json({ error: "Valid farmId required" });
    
    const totalAmount = Number(data.totalAmount) || 0;
    const paidAmountNow = Number(data.paidAmountNow) || 0;
    const remainingAmount = totalAmount - paidAmountNow;

    const newEntry = new TractorEntry({
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
    res.status(500).json({ error: "Failed to add entry" });
  }
});

// PUT revision (update)
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const entry = await TractorEntry.findById(id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    let newPaidInput = Number(req.body.paidNow) || 0;
    const currentTotalAmount = req.body.totalAmount !== undefined ? Number(req.body.totalAmount) : entry.totalAmount;
    
    let updatedTotalPaid = entry.totalPaidAmount + newPaidInput;
    let finalPaidNow = newPaidInput;
    
    if (updatedTotalPaid > currentTotalAmount) {
      updatedTotalPaid = currentTotalAmount;
      finalPaidNow = Math.max(0, currentTotalAmount - entry.totalPaidAmount);
    }
    
    const updatedRemaining = Math.max(0, currentTotalAmount - updatedTotalPaid);
    const finalPaymentStatus = (req.body.paymentStatus === 'Paid' || updatedRemaining <= 0) ? 'Paid' : 'Unpaid';
    
    // Update fields
    entry.totalAmount = currentTotalAmount;
    entry.paidAmountNow = finalPaidNow;
    entry.totalPaidAmount = updatedTotalPaid;
    entry.remainingAmount = updatedRemaining;
    entry.paymentStatus = finalPaymentStatus;
    
    if (req.body.description) entry.description = req.body.description;
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
    console.error("PUT Tractor error:", error);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// GET history
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const entry = await TractorEntry.findById(id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    // For backwards compatibility with screens expecting full entry objects
    const history = entry.transactionHistory.map((h, idx) => ({
       id: `${entry._id}_${idx}`,
       workType: entry.workType,
       providerName: entry.providerName,
       landSize: entry.landSize,
       rate: entry.rate,
       totalAmount: entry.totalAmount,
       paidAmountNow: h.paidNow,
       totalPaidAmount: h.totalPaid,
       remainingAmount: h.remaining,
       paymentStatus: h.remaining <= 0 ? 'Paid' : 'Unpaid',
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

// POST bulk payment for a farm and year
router.post("/bulk-payment", async (req, res) => {
  try {
    const { farmId, year, amount, note, date: paymentDate } = req.body;
    let remainingToPay = Number(amount) || 0;
    
    if (!isValidObjectId(farmId)) return res.status(400).json({ error: "Invalid Farm ID" });
    if (!year) return res.status(400).json({ error: "Year is required" });
    if (remainingToPay <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Find all entries for this farm and year with a balance
    const entries = await TractorEntry.find({
      farmId: new mongoose.Types.ObjectId(farmId),
      createdAt: { $gte: startDate, $lte: endDate },
      remainingAmount: { $gt: 0 }
    }).sort({ createdAt: 1 }); // Oldest first

    if (entries.length === 0) {
      return res.status(400).json({ error: "No pending expenses found for this year" });
    }

    const updatedEntries = [];
    for (const entry of entries) {
      if (remainingToPay <= 0) break;

      const canPayForThis = Math.min(remainingToPay, entry.remainingAmount);
      entry.totalPaidAmount += canPayForThis;
      entry.remainingAmount -= canPayForThis;
      entry.paidAmountNow = canPayForThis;
      entry.paymentStatus = entry.remainingAmount <= 0 ? 'Paid' : 'Unpaid';
      
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

    res.json({ message: "Bulk payment applied successfully", paidCount: updatedEntries.length, remainingAmount: remainingToPay });
  } catch (error) {
    console.error("Bulk payment error:", error);
    res.status(500).json({ error: "Failed to apply bulk payment" });
  }
});

export default router;
