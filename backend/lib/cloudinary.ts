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

/** Upload listing screenshots or exchange files (images use `image`, else `raw`). */
export async function uploadBufferToCloudinary(
  fileBuffer: Buffer,
  mimetype: string,
  folder = "exchange-deliverables",
) {
  const isImage = /^image\/(png|jpe?g|webp|gif)$/i.test(mimetype);
  const resource_type = isImage ? "image" : "raw";
  const dataUri = `data:${mimetype};base64,${fileBuffer.toString("base64")}`;
  return cloudinary.uploader.upload(dataUri, {
    resource_type,
    folder,
    use_filename: true,
    unique_filename: true,
  });
}