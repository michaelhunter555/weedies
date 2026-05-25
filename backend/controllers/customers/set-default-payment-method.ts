import type { Request, Response } from "express";

import User from "../../models/user";
import stripe from "../../utils/stripe";

/**
 * Sets the Stripe customer's invoice default payment method (used for
 * off-session charges and what our GET /payment-methods returns).
 */
export default async function setDefaultPaymentMethod(req: Request, res: Response) {
  const customerId = req.body?.customerId as string | undefined;
  const paymentMethodId = req.body?.paymentMethodId as string | undefined;

  if (!customerId || !paymentMethodId) {
    return void res.status(400).json({
      ok: false,
      message: "customerId and paymentMethodId are required",
    });
  }

  if (!req.user?.userId) {
    return void res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  try {
    const user = await User.findOne({ stripeCustomerId: customerId }).select("_id");
    if (!user || String(user._id) !== req.user.userId) {
      return void res.status(403).json({ ok: false, message: "Forbidden" });
    }

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (String(pm.customer) !== customerId) {
      return void res.status(400).json({
        ok: false,
        message: "That card is not attached to this billing profile",
      });
    }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    await User.findByIdAndUpdate(user._id, {
      $set: { defaultPaymentIntendId: paymentMethodId },
    });

    return void res.status(200).json({
      ok: true,
      defaultPaymentMethodId: paymentMethodId,
    });
  } catch (err) {
    console.error("set-default-payment-method", err);
    return void res.status(500).json({
      ok: false,
      message: "Could not update default payment method",
    });
  }
}
