import express from 'express';
import MilkEntry from '../models/MilkEntry';
import mongoose from 'mongoose';

const router = express.Router();
const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// GET all
router.get("/", async (req, res) => {
  try {
    const entries = await MilkEntry.find().sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch milk records" });
  }
});

// GET by farmId (optional/deprecated)
router.get("/farm/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!isValidObjectId(farmId)) return res.status(400).json({ error: "Invalid Farm ID" });
    const entries = await MilkEntry.find({ farmId: new mongoose.Types.ObjectId(farmId) }).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch milk records" });
  }
});

// POST new
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const entryDate = data.date ? new Date(data.date) : new Date();
    const year = entryDate.getFullYear();
    
    const newEntry = new MilkEntry({
      ...data,
      year,
      farmId: data.farmId && isValidObjectId(data.farmId) ? new mongoose.Types.ObjectId(data.farmId) : undefined
    });
    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (error) {
    console.error("POST milk error:", error);
    res.status(500).json({ error: "Failed to add milk record" });
  }
});

// PUT update
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    
    const updateData = { ...req.body, updatedAt: new Date() };
    if (updateData.date) {
      updateData.year = new Date(updateData.date).getFullYear();
    }

    const updated = await MilkEntry.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Record not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update record" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    await MilkEntry.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete record" });
  }
});

export default router;
