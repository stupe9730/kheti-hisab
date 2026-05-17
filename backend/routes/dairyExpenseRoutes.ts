import express from 'express';
import DairyExpense from '../models/DairyExpense';
import mongoose from 'mongoose';

const router = express.Router();
const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// GET all
router.get("/", async (req, res) => {
  try {
    const entries = await DairyExpense.find().sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dairy expenses" });
  }
});

// GET by farmId (optional/deprecated)
router.get("/farm/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!isValidObjectId(farmId)) return res.status(400).json({ error: "Invalid Farm ID" });
    const entries = await DairyExpense.find({ farmId: new mongoose.Types.ObjectId(farmId) }).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dairy expenses" });
  }
});

// POST new
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const entryDate = data.date ? new Date(data.date) : new Date();
    const year = entryDate.getFullYear();
    
    // Initial transaction if paidAmountNow > 0
    const transactionHistory = [];
    if (data.paidAmountNow > 0) {
      transactionHistory.push({
        amount: data.paidAmountNow,
        date: data.paidDate || data.date || new Date(),
        description: "Initial Payment"
      });
    }

    const newEntry = new DairyExpense({
      ...data,
      year,
      farmId: data.farmId && isValidObjectId(data.farmId) ? new mongoose.Types.ObjectId(data.farmId) : undefined,
      totalPaidAmount: data.paidAmountNow || 0,
      transactionHistory
    });
    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (error) {
    console.error("POST dairy expense error:", error);
    res.status(500).json({ error: "Failed to add dairy expense" });
  }
});

// PUT update (General update or Payment update)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const existingEntry = await DairyExpense.findById(id);
    if (!existingEntry) return res.status(404).json({ error: "Expense not found" });

    const { type, paymentAmount, paidDate, description } = req.body;

    if (type === 'payment') {
      const amount = Number(paymentAmount);
      existingEntry.totalPaidAmount += amount;
      existingEntry.remainingAmount -= amount;
      existingEntry.paymentStatus = existingEntry.remainingAmount <= 0 ? 'paid' : 'unpaid';
      
      existingEntry.transactionHistory.push({
        amount,
        date: paidDate ? new Date(paidDate) : new Date(),
        description: description || "Payment updated"
      });

      existingEntry.updatedAt = new Date();
      await existingEntry.save();
      return res.json(existingEntry);
    }

    // Default general update
    const updateData = { ...req.body, updatedAt: new Date() };
    if (updateData.date) {
      updateData.year = new Date(updateData.date).getFullYear();
    }

    const updated = await DairyExpense.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    console.error("PUT dairy expense error:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    await DairyExpense.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
