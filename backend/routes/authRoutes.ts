import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import crypto from "crypto";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

// Middleware to protect routes
export const protect = async (req: any, res: any, next: any) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ error: "User not found" });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ error: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized, no token" });
  }
};

// @route   POST /api/auth/register
router.post("/register", async (req: any, res: any) => {
  const { fullName, username, mobileNumber, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      username,
      mobileNumber,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        mobileNumber: user.mobileNumber,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/auth/login
router.post("/login", async (req: any, res: any) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "30d" });
      res.json({
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          mobileNumber: user.mobileNumber,
          profilePhoto: user.profilePhoto,
        },
      });
    } else {
      res.status(401).json({ error: "Invalid username or password" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/auth/forgot-password
router.post("/forgot-password", async (req: any, res: any) => {
  const { usernameOrMobile } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ username: usernameOrMobile }, { mobileNumber: usernameOrMobile }],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // In a real app, you'd send an email or SMS. 
    // Here we'll generate a token and return it for demonstration since OTP is forbidden.
    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    res.json({
      message: "Reset token generated",
      resetToken, // Returning to client for simplified flow without email/SMS
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/auth/reset-password
router.post("/reset-password", async (req: any, res: any) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/auth/me
router.get("/me", protect, async (req: any, res: any) => {
  res.json(req.user);
});

// @route   PUT /api/auth/profile
router.put("/profile", protect, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.fullName = req.body.fullName || user.fullName;
      user.mobileNumber = req.body.mobileNumber || user.mobileNumber;
      user.profilePhoto = req.body.profilePhoto || user.profilePhoto;

      if (req.body.password) {
        user.password = await bcrypt.hash(req.body.password, 10);
      }

      const updatedUser = await user.save();
      res.json({
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        mobileNumber: updatedUser.mobileNumber,
        profilePhoto: updatedUser.profilePhoto,
      });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
