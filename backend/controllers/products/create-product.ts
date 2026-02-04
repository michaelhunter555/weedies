import type { Request, Response } from "express";
import Product from "../../models/product";
import { uploadToCloudinary } from "../../lib/cloudinary";

export async function createProduct(req: Request, res: Response) {
    const { adminId } = req.query;
    const {
        name,
        description,
        priceOptions,
        price,
        previousPrice,
        category,
        subCategory,
        brand,
        stock,
        isActive,
        totalReviews,
        averageRating,
        sku,
        mood,
        THCa,
        type,
        strain,
    } = req.body;

    if(req?.user?.userId !== adminId) {
        return void res.status(403).json({ message: "Unauthorized" });
    }

    let productImages: string[] = [];
  try {
    // If multipart images are provided via multer, upload and store their URLs
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (files?.length) {
      const uploads = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));
      const urls = uploads.map((u) => u.secure_url).filter(Boolean);
        productImages = urls;
        }

    const product = await Product.create({
        name,
        description,
        priceOptions,
        price,
        previousPrice,
        category,
        subCategory,
        brand,
        stock,
        isActive,
        totalReviews,
        averageRating,
        sku,
        mood,
        THCa,
        type,
        strain,
        image: productImages,
    });
    return void res.status(201).json(product);
  } catch (err) {
    return void res.status(500).json({ message: "Failed to create product" });
  }
}