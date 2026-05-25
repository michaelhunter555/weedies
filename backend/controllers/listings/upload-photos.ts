import type { Request, Response } from "express";
import { uploadToCloudinary } from "../../lib/cloudinary";

/**
 * Uploads 1..6 listing screenshots to Cloudinary and returns their hosted
 * URLs. Stored separately from `createListing` so the UI can show per-file
 * progress and let the seller continue editing the rest of the form while
 * uploads are in flight.
 *
 * Wired in `routes/listingRoutes.ts` behind `authenticate` +
 * `multer.array("photos", 6)`.
 *
 * Request (multipart/form-data):
 *   field "photos" - 1..6 image files (jpg/png/webp)
 *
 * Response:
 *   201 { urls: string[] }
 *   400 { message }  - no files / unsupported type
 *   500 { message }
 */
export async function uploadListingPhotos(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return void res.status(400).json({ message: "No photos provided" });
    }

    const uploads = await Promise.all(
      files.map((f) => uploadToCloudinary(f.buffer)),
    );
    const urls = uploads.map((u) => u.secure_url).filter(Boolean);

    if (urls.length === 0) {
      return void res.status(500).json({ message: "Upload failed" });
    }

    return void res.status(201).json({ urls });
  } catch (err) {
    console.log("uploadListingPhotos error:", err);
    return void res.status(500).json({ message: "Failed to upload photos" });
  }
}
