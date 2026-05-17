import express from 'express';
import mongoose from 'mongoose';
import MilkEntry from '../models/MilkEntry';
import DairyExpense from '../models/DairyExpense';

const router = express.Router();

// DELETE all dairy data for a specific year
router.delete("/year/:year", async (req, res) => {
  try {
    const { year } = req.params;
    const yearNum = parseInt(year);

    if (isNaN(yearNum)) {
      return res.status(400).json({ error: "Invalid year" });
    }

    // Delete from both collections
    const milkDelete = await MilkEntry.deleteMany({ year: yearNum });
    const expenseDelete = await DairyExpense.deleteMany({ year: yearNum });

    res.json({
      message: `Deleted records for year ${yearNum}`,
      details: {
        milkRecordsDeleted: milkDelete.deletedCount,
        expensesDeleted: expenseDelete.deletedCount
      }
    });
  } catch (error) {
    console.error("Error deleting year data:", error);
    res.status(500).json({ error: "Failed to delete year data" });
  }
});

export default router;
