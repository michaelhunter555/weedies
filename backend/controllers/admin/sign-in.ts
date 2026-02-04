import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import Admin from "../../models/Admin";
import { signAccessToken, signRefreshToken } from "../../lib/jwt";

export async function signIn(req: Request, res: Response) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return void res.status(400).json({ message: "Missing email or password" });
    }

    let admin = await Admin.findOne({ email });

    // TEMP: auto-create the admin if it doesn't exist (remove later)
    if (!admin) {
      const passwordHash = await bcrypt.hash(password, 10);
      admin = await Admin.create({
        name: "Admin Mike",
        email,
        passwordHash,
        role: "admin",
        permissions: [],
        latestHistory: [{ action: "auto-created", timestamp: new Date() }],
      });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return void res.status(401).json({ message: "Invalid password" });
    }

    admin.lastLoginAt = new Date();
    admin.latestHistory = [
      { action: "login", timestamp: new Date() },
      ...(admin.latestHistory || []),
    ].slice(0, 25);

    const refreshToken = signRefreshToken(String(admin._id));
    admin.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await admin.save();

    const accessToken = signAccessToken({ sub: String(admin._id), role: "admin" });

    res.cookie?.("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    res.status(200).json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      accessToken,
      refreshToken,
    });
  } catch {
    res.status(500).json({ message: "Admin sign-in failed" });
  }
}