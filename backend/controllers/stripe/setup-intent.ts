import { Request, Response } from "express";
import User from "../../models/user";
import stripe from "../../utils/stripe";

/**
 * Create a SetupIntent so the buyer can attach a card to their Stripe
 * customer record. The client sends the customer id either in the JSON
 * body (preferred, matches the other POST endpoints) or as a query
 * param - we accept both to avoid silent `undefined` failures.
 */
export default async function setupIntent(req: Request, res: Response) {
    const customerId =
        (req.body?.customerId as string | undefined) ||
        (req.query?.customerId as string | undefined);

    if (!customerId) {
        return void res.status(400).json({
            error:
                "customerId is required - send it in the JSON body as { customerId }.",
            ok: false,
        });
    }

    if (!req.user?.userId) {
        return void res.status(401).json({ error: "Unauthorized", ok: false });
    }

    try {
        const user = await User.findOne({ stripeCustomerId: customerId }).select(
            "_id",
        );

        if (!user) {
            return void res
                .status(404)
                .json({ error: "No user found for that Stripe customer id", ok: false });
        }

        if (String(user._id) !== req.user.userId) {
            return void res.status(403).json({ error: "Forbidden", ok: false });
        }

        const intent = await stripe.setupIntents.create({
            customer: String(customerId),
        });

        if (!intent.client_secret) {
            return void res.status(500).json({
                error: "Stripe did not return a client_secret",
                ok: false,
            });
        }

        return void res
            .status(200)
            .json({ clientSecret: intent.client_secret, ok: true });
    } catch (err) {
        console.log("setup-intent error:", err);
        return void res
            .status(500)
            .json({ error: "Error creating setup intent", ok: false });
    }
}