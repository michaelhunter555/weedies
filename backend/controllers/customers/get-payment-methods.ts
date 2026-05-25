import type { Request, Response } from "express";
import type Stripe from "stripe";

import User from "../../models/user";
import stripe from "../../utils/stripe";

export default async function (req: Request, res: Response) {
  const stripeCustomerId = req.query.stripeCustomerId;

  try {
    if (!stripeCustomerId || typeof stripeCustomerId !== "string") {
      return void res
        .status(400)
        .json({ error: "Missing stripeCustomerId", ok: false });
    }

    const user = await User.findOne({ stripeCustomerId }).select("_id");
    if (!user || String(user._id) !== req.user?.userId) {
      return void res.status(403).json({ error: "Forbidden", ok: false });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    });

    const hasCard = paymentMethods.data.length > 0;

    let defaultPaymentMethodId: string | null = null;
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (customer && !("deleted" in customer && customer.deleted)) {
        const raw = (customer as Stripe.Customer).invoice_settings
          ?.default_payment_method;
        if (typeof raw === "string") {
          defaultPaymentMethodId = raw;
        } else if (raw && typeof raw === "object" && "id" in raw) {
          defaultPaymentMethodId = String((raw as { id: string }).id);
        }
      }
    } catch (e) {
      console.error("get-payment-methods: retrieve customer", e);
    }

    await User.findByIdAndUpdate(user._id, {
      $set: { defaultPaymentIntendId: defaultPaymentMethodId },
    });

    res.status(200).json({
      hasCard,
      defaultPaymentMethodId,
      paymentMethods,
      ok: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err, ok: false });
  }
}
