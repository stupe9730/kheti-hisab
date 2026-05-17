import express from 'express';
import OtherExpense from '../models/OtherExpense';
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
    const entries = await OtherExpense.find(query).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch other expenses" });
  }
});

// GET entries by specific farmId
router.get("/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!isValidObjectId(farmId)) {
      return res.status(400).json({ error: "Invalid Farm ID" });
    }
    const entries = await OtherExpense.find({ farmId: new mongoose.Types.ObjectId(farmId) }).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch other expenses" });
  }
});

// POST new entry
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data.farmId || !isValidObjectId(data.farmId)) return res.status(400).json({ error: "Valid farmId required" });
    
    const totalAmount = Number(data.totalAmount) || 0;
    const paidAmount = Number(data.paidAmount) || 0;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    const newEntry = new OtherExpense({
      ...data,
      farmId: new mongoose.Types.ObjectId(data.farmId),
      paidAmount: paidAmount,
      remainingAmount: remainingAmount,
      transactionHistory: [{
        amount: paidAmount,
        date: new Date(),
        description: "Initial Payment"
      }]
    });
    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ error: "Failed to add other expense" });
  }
});

// PUT update
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const entry = await OtherExpense.findById(id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    // If updating from the form, we might be revising the whole record
    // Or just adding a payment.
    const totalAmount = req.body.totalAmount !== undefined ? Number(req.body.totalAmount) : entry.totalAmount;
    const newPaidAmount = req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : entry.paidAmount;
    
    // Check if paidAmount changed to add to history if it's a simple update
    if (newPaidAmount !== entry.paidAmount) {
      entry.transactionHistory.push({
        amount: newPaidAmount - entry.paidAmount,
        date: new Date(),
        description: req.body.notes || "Payment Adjustment"
      });
    }

    entry.expenseName = req.body.expenseName || entry.expenseName;
    entry.category = req.body.category || entry.category;
    entry.date = req.body.date || entry.date;
    entry.quantity = req.body.quantity !== undefined ? Number(req.body.quantity) : entry.quantity;
    entry.unit = req.body.unit || entry.unit;
    entry.totalAmount = totalAmount;
    entry.paidAmount = newPaidAmount;
    entry.remainingAmount = Math.max(0, totalAmount - newPaidAmount);
    entry.sellerName = req.body.sellerName || entry.sellerName;
    entry.billNumber = req.body.billNumber || entry.billNumber;
    entry.notes = req.body.notes || entry.notes;
    entry.season = req.body.season || entry.season;
    entry.year = req.body.year || entry.year;
    entry.updatedAt = new Date();

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error("PUT OtherExpense error:", error);
    res.status(500).json({ error: "Failed to update other expense" });
  }
});

// POST bulk payment
router.post("/bulk-payment", async (req, res) => {
  try {
    const { farmId, year, amount, note, date: paymentDate } = req.body;
    let remainingToPay = Number(amount) || 0;
    
    if (!isValidObjectId(farmId)) return res.status(400).json({ error: "Invalid Farm ID" });
    if (!year) return res.status(400).json({ error: "Year is required" });
    if (remainingToPay <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });

    // Find all entries for this farm and year with a balance
    const entries = await OtherExpense.find({
      farmId: new mongoose.Types.ObjectId(farmId),
      year: String(year),
      remainingAmount: { $gt: 0 }
    }).sort({ date: 1 }); // Oldest first

    if (entries.length === 0) {
      return res.status(400).json({ error: "No pending expenses found for this year" });
    }

    const updatedEntries = [];
    for (const entry of entries) {
      if (remainingToPay <= 0) break;

      const canPayForThis = Math.min(remainingToPay, entry.remainingAmount);
      entry.paidAmount += canPayForThis;
      entry.remainingAmount -= canPayForThis;
      
      entry.transactionHistory.push({
        amount: canPayForThis,
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

// DELETE entry
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    const result = await OtherExpense.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ error: "Entry not found" });
    res.json({ message: "Entry deleted successfully", id });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete other expense" });
  }
});

export default router;
