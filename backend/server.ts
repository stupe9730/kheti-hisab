import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "./config/db";

import farmRoutes from "./routes/farmRoutes";
import tractorRoutes from "./routes/tractorRoutes";
import khatRoutes from "./routes/khatRoutes";
import seedRoutes from "./routes/seedRoutes";
import aushadRoutes from "./routes/aushadRoutes";
import workerRoutes from "./routes/workerRoutes";
import harvestRoutes from "./routes/harvestRoutes";
import milkRoutes from "./routes/milkRoutes";
import dairyExpenseRoutes from "./routes/dairyExpenseRoutes";
import dairyRoutes from "./routes/dairyRoutes";
import otherExpenseRoutes from "./routes/otherExpenseRoutes";
import authRoutes from "./routes/authRoutes";

import Farm from "./models/Farm";
import TractorEntry from "./models/TractorEntry";
import KhatEntry from "./models/KhatEntry";
import SeedEntry from "./models/SeedEntry";
import AushadEntry from "./models/AushadEntry";
import WorkerEntry from "./models/WorkerEntry";
import HarvestEntry from "./models/HarvestEntry";
import OtherExpense from "./models/OtherExpense";

dotenv.config();

async function startServer() {
  const app = express();

  const PORT = process.env.PORT || 3000;

  // MongoDB Connection
  await connectDB();

  // Middleware
  const allowedOrigins = [
    "http://localhost:5173",
    "https://kheti-hisab.vercel.app",
  ];

  app.use(
    cors({
      origin: function (origin, callback) {
        // लोकल टेस्ट किंवा मोबाईलसाठी ओरिजिन नसेल तर परवानगी द्या
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
          return callback(null, true);
        } else {
          // ❌ 'new Error' पाठवू नका, त्यामुळे सर्व्हर रिस्पॉन्स न देताच ब्लॉक होतो
          // ✅ फक्त false पाठवा
          return callback(null, false);
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 204, // 👈 हे अत्यंत महत्त्वाचे आहे, यानेच प्रीफ्लाईट एरर निघून जाईल!
    }),
  );
  app.use(express.json());

  // Database Connection Check
  app.use("/api", (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "Please check MongoDB connection",
      });
    }

    next();
  });

  // Health Route
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      env: process.env.NODE_ENV || "development",
    });
  });

  // API Routes
  app.use("/api/farms", farmRoutes);

  app.use("/api/tractor", tractorRoutes);

  app.use("/api/khat", khatRoutes);

  app.use("/api/seeds", seedRoutes);

  app.use("/api/aushad", aushadRoutes);

  app.use("/api/worker", workerRoutes);

  app.use("/api/harvest", harvestRoutes);

  app.use("/api/milk", milkRoutes);

  app.use("/api/dairy-expense", dairyExpenseRoutes);

  app.use("/api/dairy", dairyRoutes);

  app.use("/api/other-expenses", otherExpenseRoutes);

  app.use("/api/auth", authRoutes);

  // Summary Route
  app.get("/api/summary", async (req, res) => {
    try {
      const farms = await Farm.find();

      const tractorEntries = await TractorEntry.find();

      const khatEntries = await KhatEntry.find();

      const seedEntries = await SeedEntry.find();

      const aushadEntries = await AushadEntry.find();

      const workerEntries = await WorkerEntry.find();

      const harvestEntries = await HarvestEntry.find();

      const otherExpenses = await OtherExpense.find();

      res.json({
        farms,
        tractorEntries,
        khatEntries,
        seedEntries,
        aushadEntries,
        workerEntries,
        harvestEntries,
        otherExpenses,
      });
    } catch (error: any) {
      console.error("Summary fetch error:", error.message);

      res.status(500).json({
        error: "Failed to fetch summary",
      });
    }
  });

  // Global Error Handler
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      console.error(err.stack);

      res.status(500).json({
        error: "Something went wrong!",
      });
    },
  );

  // Start Server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
