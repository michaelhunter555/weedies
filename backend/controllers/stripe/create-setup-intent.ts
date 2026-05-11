import { Request, Response } from "express";
import stripe from "../../utils/stripe";

export default async function createSetupIntent(req: Request, res: Response) {
  const { customerId } = req.body;
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
  });
  res.status(200).json({ setupIntent });
}