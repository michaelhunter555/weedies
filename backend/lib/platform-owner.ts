import User from "../models/user";

/**
 * Marketplace user that owns platform-managed listings (set via ADMIN_CREATE_EMAIL).
 * Used when admin creates listings on behalf of the platform — no seller Stripe Connect
 * or listing-fee checkout required.
 */
export async function getPlatformOwnerUser() {
  const email = process.env.ADMIN_CREATE_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error(
      "ADMIN_CREATE_EMAIL is not configured. Set it to the platform owner's User email.",
    );
  }

  const user = await User.findOne({ email }).select(
    "_id email name stripeCustomerId stripeConnectAccountId totalListings",
  );
  if (!user) {
    throw new Error(
      `No User found for ADMIN_CREATE_EMAIL (${email}). Create/sign up that account first.`,
    );
  }

  return user;
}

export async function getPlatformOwnerUserId(): Promise<string> {
  const user = await getPlatformOwnerUser();
  return String(user._id);
}
