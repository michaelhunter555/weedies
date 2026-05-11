import {v2 as cloudinary} from "cloudinary";
import dotenv from 'dotenv';

dotenv.config();

// Support both the canonical Cloudinary env var names and the legacy
// shorter ones already present in this project's .env.
cloudinary.config({
    cloud_name:
      process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME,
    api_key:
      process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API,
    api_secret:
      process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET,
  });
  
export const destroyImage = async (publicId: string) => {
    return await cloudinary.uploader.destroy(publicId)
}

export const uploadToCloudinary = async (fileBuffer: Buffer) => {
    return await cloudinary.uploader.upload(`data:image/jpeg;base64,${fileBuffer.toString("base64")}`, {
      resource_type: "image",
    });
  };