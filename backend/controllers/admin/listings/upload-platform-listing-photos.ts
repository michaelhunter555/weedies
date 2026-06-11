import type { Request, Response } from "express";

import { uploadToCloudinary } from "../../../lib/cloudinary";

/** Admin: upload listing screenshots for platform listing form (same limits as seller flow). */
export async function uploadPlatformListingPhotos(req: Request, res: Response) {
  try {
    const files = (req as Express.Request & { files?: Express.Multer.File[] }).files;
    if (!files || files.length === 0) {
      return void res.status(400).json({ message: "No photos provided" });
    }

    const uploads = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));
    const urls = uploads.map((u: { secure_url?: string }) => u.secure_url).filter(Boolean) as string[];

    if (urls.length === 0) {
      return void res.status(500).json({ message: "Upload failed" });
    }

    return void res.status(201).json({ urls });
  } catch (err) {
    console.error("uploadPlatformListingPhotos:", err);
    return void res.status(500).json({ message: "Failed to upload photos" });
  }
}
