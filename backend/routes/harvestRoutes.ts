import express from 'express';
import HarvestEntry from '../models/HarvestEntry';
import mongoose from 'mongoose';

const router = express.Router();
const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// GET entries (optionally by farmId)
router.get("/", async (req, res) => {
  try {
    const { farmId } = req.query;
    const query = farmId && isValidObjectId(farmId as string) 
      ? { farmId: new mongoose.Types.ObjectId(farmId as string) } 
      : {};
    const entries = await HarvestEntry.find(query).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch harvest entries" });
  }
});

// GET all by farmId
router.get("/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!isValidObjectId(farmId)) return res.status(400).json({ error: "Invalid Farm ID" });
    const entries = await HarvestEntry.find({ farmId: new mongoose.Types.ObjectId(farmId) }).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// POST new
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data.farmId || !isValidObjectId(data.farmId)) return res.status(400).json({ error: "Valid farmId required" });
    
    const newEntry = new HarvestEntry({
      ...data,
      farmId: new mongoose.Types.ObjectId(data.farmId)
    });
    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (error) {
    console.error("POST harvest error:", error);
    res.status(500).json({ error: "Failed to add entry" });
  }
});

// PUT update
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    const updated = await HarvestEntry.findByIdAndUpdate(
      id, 
      { ...req.body, updatedAt: new Date() }, 
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Entry not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });
    await HarvestEntry.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

export default router;
