import type { Request, Response } from "express";
import type Stripe from "stripe";

import User from "../../models/user";
import stripe from "../../utils/stripe";

/** Detaches one or more card payment methods from the authenticated buyer. */
export default async function deletePaymentMethods(req: Request, res: Response) {
  const paymentMethodIds = req.body?.paymentMethodIds as unknown;

  if (!Array.isArray(paymentMethodIds) || paymentMethodIds.length === 0) {
    return void res.status(400).json({
      ok: false,
      message: "paymentMethodIds must be a non-empty array",
    });
  }

  if (!req.user?.userId) {
    return void res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  try {
    const user = await User.findById(req.user.userId).select("stripeCustomerId");
    const customerId = user?.stripeCustomerId;
    if (!customerId) {
      return void res.status(400).json({
        ok: false,
        message: "No Stripe customer on this account",
      });
    }

    for (const rawId of paymentMethodIds) {
      const id = String(rawId);
      const pm = await stripe.paymentMethods.retrieve(id);
      if (String(pm.customer) !== customerId) {
        return void res.status(403).json({
          ok: false,
          message: "One or more cards do not belong to your account",
        });
      }
      await stripe.paymentMethods.detach(id);
    }

    const customer = await stripe.customers.retrieve(customerId);
    let nextDefault: string | null = null;
    if (customer && !("deleted" in customer && customer.deleted)) {
      const inv = (customer as Stripe.Customer).invoice_settings
        ?.default_payment_method;
      nextDefault =
        typeof inv === "string"
          ? inv
          : inv && "id" in inv
            ? String((inv as { id: string }).id)
            : null;
    }

    await User.findByIdAndUpdate(req.user.userId, {
      $set: { defaultPaymentIntendId: nextDefault },
    });

    return void res.status(200).json({ ok: true });
  } catch (err) {
    console.error("delete-payment-methods", err);
    return void res.status(500).json({
      ok: false,
      message: "Could not remove payment method(s)",
    });
  }
}
