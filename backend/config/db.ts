import mongoose from "mongoose";

export const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI || MONGODB_URI === "MY_MONGODB_URI") {
    console.warn("⚠️ MONGODB_URI is not set. Database operations will fail.");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'farmApp',
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log("✅ Successfully connected to MongoDB Atlas (Database: farmApp)");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err instanceof Error ? err.message : err);
    // Don't exit, the /api middleware will report the error to the user if they try to use it
  }
};
