import express from "express";
import Farm from "../models/Farm";
import TractorEntry from "../models/TractorEntry";
import KhatEntry from "../models/KhatEntry";
import SeedEntry from "../models/SeedEntry";
import AushadEntry from "../models/AushadEntry";
import WorkerEntry from "../models/WorkerEntry";
import HarvestEntry from "../models/HarvestEntry";
import MilkEntry from "../models/MilkEntry";
import DairyExpense from "../models/DairyExpense";
import mongoose from "mongoose";

const router = express.Router();

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// GET all farms
router.get("/", async (req, res) => {
  try {
    const farms = await Farm.find().sort({ createdAt: -1 });
    res.json(farms);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch farms" });
  }
});

// POST new farm
router.post("/", async (req, res) => {
  try {
    const { name, year } = req.body;
    if (!name || !year)
      return res.status(400).json({ error: "Name and year required" });

    const newFarm = new Farm({ name, year });
    await newFarm.save();
    res.status(201).json(newFarm);
  } catch (error) {
    res.status(500).json({ error: "Failed to create farm" });
  }
});

// PUT update farm
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ error: "Invalid Farm ID" });

    const { name, year } = req.body;
    const farm = await Farm.findByIdAndUpdate(
      id,
      { name, year },
      { new: true },
    );
    if (!farm) return res.status(404).json({ error: "Farm not found" });
    res.json(farm);
  } catch (error) {
    res.status(500).json({ error: "Failed to update farm" });
  }
});

// DELETE farm
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("DELETE Farm request received for ID:", id);

    if (!isValidObjectId(id)) {
      console.error("Invalid Farm ID provided:", id);
      return res.status(400).json({ error: "Invalid Farm ID" });
    }

    const farm = await Farm.findById(id);
    if (!farm) {
      console.error("Farm not found for deletion, ID:", id);
      return res.status(404).json({ error: "Farm not found" });
    }

    // Delete the farm
    await Farm.findByIdAndDelete(id);
    console.log("Farm document deleted from DB, ID:", id);

    // Delete all related data from all collections
    const tractorResult = await TractorEntry.deleteMany({ farmId: id });
    const khatResult = await KhatEntry.deleteMany({ farmId: id });
    const seedResult = await SeedEntry.deleteMany({ farmId: id });
    const aushadResult = await AushadEntry.deleteMany({ farmId: id });
    const workerResult = await WorkerEntry.deleteMany({ farmId: id });
    const harvestResult = await HarvestEntry.deleteMany({ farmId: id });
    const milkResult = await MilkEntry.deleteMany({ farmId: id });
    const dairyResult = await DairyExpense.deleteMany({ farmId: id });

    console.log("Cascade deleted related records for farm:", id, {
      tractor: tractorResult.deletedCount,
      khat: khatResult.deletedCount,
      seeds: seedResult.deletedCount,
      aushad: aushadResult.deletedCount,
      worker: workerResult.deletedCount,
      harvest: harvestResult.deletedCount,
      milk: milkResult.deletedCount,
      dairy: dairyResult.deletedCount,
    });

    res.json({ success: true, id: id });
  } catch (error: any) {
    console.error("Detailed Delete error:", error);
    res.status(500).json({ error: error.message || "Failed to delete farm" });
  }
});

export default router;
