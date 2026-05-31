import { Divider, Typography } from "@mui/material";

import {
  LegalSection,
  MarketingPageShell,
} from "@/components/Marketing/MarketingPageShell";
import {
  APP_DOMAIN,
  APP_NAME,
  LEGAL_ENTITY_DOMAIN,
  LEGAL_ENTITY_NAME,
  LEGAL_ENTITY_URL,
} from "@/brand";

const LAST_UPDATED = "May 24, 2026";

export default function PrivacyPolicyPage() {
  return (
    <MarketingPageShell
      title="Privacy Policy"
      subtitle={`How ${APP_NAME} (${APP_DOMAIN}), operated by ${LEGAL_ENTITY_NAME}, collects, uses, and protects your information.`}
      maxWidth="md"
    >
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Last updated: {LAST_UPDATED}
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph sx={{ lineHeight: 1.7 }}>
        This Privacy Policy describes how {LEGAL_ENTITY_NAME} (“we,” “us,” or “our”)
        handles personal information when you use {APP_NAME} at{" "}
        {APP_DOMAIN} and related services (the “Service”). {LEGAL_ENTITY_NAME} is the
        legal operator of the Service. Our company website is{" "}
        <a href={LEGAL_ENTITY_URL} style={{ color: "inherit", fontWeight: 700 }}>
          {LEGAL_ENTITY_DOMAIN}
        </a>
        . We may update this policy as the product matures. If you have questions,
        contact us via the contact page.
      </Typography>

      <LegalSection
        title="1. Information we collect"
        paragraphs={[
          "Account information: name, email address, profile details, and authentication identifiers when you sign up or sign in (including third-party sign-in providers).",
          "Seller and payout information: Stripe Connect account status, country, and payment-related metadata processed by Stripe (we do not store card numbers).",
          "Buyer payment information: payment methods and billing details are handled by Stripe; we receive tokens and transaction references, not full card data.",
          "Listing and marketplace activity: listings you create, bids, purchases, messages, reviews, and exchange-room activity.",
          "Technical data: IP address, browser type, device information, cookies, and usage logs used for security, analytics, and performance.",
          "Optional integrations: if you connect Google Analytics or similar tools to a listing, we store OAuth tokens and property identifiers needed to display metrics.",
        ]}
      />

      <LegalSection
        title="2. How we use information"
        paragraphs={[
          "Provide and operate the marketplace (accounts, listings, checkout, messaging, payouts).",
          "Process payments and prevent fraud through Stripe and related service providers.",
          "Communicate with you about your account, transactions, and support requests.",
          "Improve the Service, troubleshoot issues, and enforce our Terms.",
          "Comply with legal obligations and respond to lawful requests.",
        ]}
      />

      <LegalSection
        title="3. How we share information"
        paragraphs={[
          "With other users when you publish listings, send messages, or complete transactions (e.g. buyer and seller see relevant profile and order information).",
          "With service providers such as Stripe (payments), cloud hosting, email delivery, and analytics—only as needed to run the Service.",
          "For legal reasons if required by law, court order, or to protect rights, safety, and security.",
          "In connection with a business transfer (merger, acquisition, or asset sale), subject to appropriate notices where required.",
          "We do not sell your personal information to third parties for their own marketing.",
        ]}
      />

      <LegalSection
        title="4. Cookies and tracking"
        paragraphs={[
          "We use cookies and similar technologies for authentication, preferences, and security.",
          "Third-party services (e.g. Stripe, Google sign-in) may set their own cookies when you use those features.",
          "You can control cookies through your browser settings; disabling cookies may limit some features.",
        ]}
      />

      <LegalSection
        title="5. Data retention"
        paragraphs={[
          "We retain information while your account is active and as needed to provide the Service.",
          "Transaction and payout records may be kept longer for accounting, tax, dispute resolution, and legal compliance.",
          "You may request deletion of your account; some data may remain where we have a legitimate need to retain it.",
        ]}
      />

      <LegalSection
        title="6. Security"
        paragraphs={[
          "We use reasonable administrative, technical, and organizational measures to protect information.",
          "No method of transmission or storage is 100% secure; use strong passwords and protect your account credentials.",
        ]}
      />

      <LegalSection
        title="7. Your choices and rights"
        paragraphs={[
          "Access and update profile information in your account settings where available.",
          "Disconnect optional integrations (e.g. Google Analytics) from listing settings.",
          "Depending on your location, you may have rights to access, correct, delete, or restrict processing of personal data. Contact us to exercise these rights.",
        ]}
      />

      <LegalSection
        title="8. Children"
        paragraphs={[
          "The Service is not directed to children under 13 (or the minimum age in your jurisdiction). We do not knowingly collect personal information from children.",
        ]}
      />

      <LegalSection
        title="9. International users"
        paragraphs={[
          "If you access the Service from outside the United States, your information may be processed in the U.S. or other countries where our providers operate.",
        ]}
      />

      <LegalSection
        title="10. Changes to this policy"
        paragraphs={[
          "We may update this Privacy Policy from time to time. We will post the revised version on this page and update the “Last updated” date.",
          "Continued use of the Service after changes constitutes acceptance of the updated policy where permitted by law.",
        ]}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary">
        {LEGAL_ENTITY_NAME} ·{" "}
        <a href={LEGAL_ENTITY_URL} style={{ color: "inherit", fontWeight: 700 }}>
          {LEGAL_ENTITY_DOMAIN}
        </a>
        . Privacy requests: use our{" "}
        <a href="/contact-us" style={{ color: "inherit", fontWeight: 700 }}>
          contact form
        </a>
        .
      </Typography>
    </MarketingPageShell>
  );
}
