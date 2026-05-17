import express from 'express';
import KhatEntry from '../models/KhatEntry';
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
    const entries = await KhatEntry.find(query).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch khat entries" });
  }
});

// GET entries by farmId
router.get("/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!isValidObjectId(farmId)) return res.status(400).json({ error: "Invalid Farm ID" });
    const entries = await KhatEntry.find({ farmId: new mongoose.Types.ObjectId(farmId) }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch khat entries" });
  }
});

// POST new khat entry
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data.farmId || !isValidObjectId(data.farmId)) return res.status(400).json({ error: "Valid farmId required" });
    
    const totalAmount = parseFloat(data.totalAmount) || 0;
    const paidAmountNow = parseFloat(data.paidAmountNow) || 0;
    const remainingAmount = totalAmount - paidAmountNow;

    const newEntry = new KhatEntry({
      ...data,
      farmId: new mongoose.Types.ObjectId(data.farmId),
      totalPaidAmount: paidAmountNow,
      remainingAmount: remainingAmount,
      createdAt: new Date(),
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
    console.error("Khat post error:", error);
    res.status(500).json({ error: "Failed to save khat entry" });
  }
});

// PUT update khat entry (History array logic)
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const entry = await KhatEntry.findById(id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    // Calculate new values
    const newPaidInput = parseFloat(req.body.paidNow) || 0;
    const currentTotalAmount = req.body.totalAmount !== undefined ? parseFloat(req.body.totalAmount) : entry.totalAmount;
    
    let updatedTotalPaid = entry.totalPaidAmount + newPaidInput;
    let finalPaidNow = newPaidInput;
    
    // Auto cap totalPaid to totalAmount
    if (updatedTotalPaid > currentTotalAmount) {
      updatedTotalPaid = currentTotalAmount;
      finalPaidNow = Math.max(0, currentTotalAmount - entry.totalPaidAmount);
    }
    
    const updatedRemaining = Math.max(0, currentTotalAmount - updatedTotalPaid);
    const finalPaymentStatus = (req.body.paymentStatus === 'paid' || updatedRemaining <= 0) ? 'paid' : 'unpaid';

    // Update main fields
    entry.totalAmount = currentTotalAmount;
    entry.paidAmountNow = finalPaidNow;
    entry.totalPaidAmount = updatedTotalPaid;
    entry.remainingAmount = updatedRemaining;
    entry.paymentStatus = finalPaymentStatus;
    
    if (req.body.description) entry.description = req.body.description;
    if (req.body.providerName !== undefined) entry.providerName = req.body.providerName;
    entry.version = entry.version + 1;

    // Push to history
    if (!entry.transactionHistory) {
      entry.transactionHistory = [];
    }
    
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
    console.error("PUT Khat error:", error);
    res.status(500).json({ error: "Failed to update khat entry" });
  }
});

// GET transaction history (Audit)
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid ID" });

    const entry = await KhatEntry.findById(id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    // Map history to look like full entries for compatibility with Detail screen
    const history = entry.transactionHistory.map((h, idx) => ({
      id: `${entry._id}_${idx}`,
      khatName: entry.khatName,
      providerName: entry.providerName,
      quantity: entry.quantity,
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

// DELETE khat entry
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    await KhatEntry.findByIdAndDelete(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete khat entry" });
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
    const entries = await KhatEntry.find({
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
