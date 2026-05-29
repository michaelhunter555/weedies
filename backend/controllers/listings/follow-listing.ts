import type { Request, Response } from "express";
import Listing from "../../models/listing";

export async function followListing(req: Request, res: Response) {
    const { listingId } = req.body;
  
    if (!listingId) {
        return void res.status(400).json({ message: "Invalid listing id" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
        return void res.status(404).json({ message: "Listing not found" });
    }

    if (listing.auctionFollowers.includes(req.user?.userId)) {
        return void res.status(400).json({ message: "You are already following this listing" });
    }

    listing.auctionFollowers.push(req.user?.userId);
    await listing.save();

    return void res.status(200).json({ message: "Listing followed successfully" });
}