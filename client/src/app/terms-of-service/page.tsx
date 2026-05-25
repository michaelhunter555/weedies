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

export default function TermsOfServicePage() {
  return (
    <MarketingPageShell
      title="Terms & Conditions"
      subtitle={`Rules for using ${APP_NAME} at ${APP_DOMAIN}, operated by ${LEGAL_ENTITY_NAME}.`}
      maxWidth="md"
    >
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Last updated: {LAST_UPDATED}
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph sx={{ lineHeight: 1.7 }}>
        These Terms & Conditions (“Terms”) govern your access to and use of {APP_NAME}{" "}
        ({APP_DOMAIN}) and related services (the “Service”). The Service is operated by{" "}
        {LEGAL_ENTITY_NAME} (“we,” “us,” or “our”). Our company
        website is{" "}
        <a href={LEGAL_ENTITY_URL} style={{ color: "inherit", fontWeight: 700 }}>
          {LEGAL_ENTITY_DOMAIN}
        </a>
        . By creating an account, listing an app, or making a purchase, you agree to
        these Terms. If you do not agree, do not use the Service.
      </Typography>

      <LegalSection
        title="1. The Service"
        paragraphs={[
          `${APP_NAME} is a marketplace that connects sellers of digital apps and related assets with buyers. We are not a party to transactions between users except as described below (payments, fees, and platform rules).`,
          "We may modify, suspend, or discontinue features at any time.",
        ]}
      />

      <LegalSection
        title="2. Eligibility"
        paragraphs={[
          "You must be at least 18 years old (or the age of majority in your jurisdiction) and able to enter a binding contract.",
          "You must provide accurate registration information and keep your account secure.",
        ]}
      />

      <LegalSection
        title="3. Accounts"
        paragraphs={[
          "You are responsible for all activity under your account.",
          "We may suspend or terminate accounts that violate these Terms, applicable law, or that pose risk to other users or the platform.",
        ]}
      />

      <LegalSection
        title="4. Listings and seller obligations"
        paragraphs={[
          "You represent that you have the right to sell or transfer what you list and that your listing is accurate and not misleading.",
          "Listings may require review before publication. We may remove or reject listings at our discretion.",
          "You are responsible for delivering what you promise after a sale, including access, assets, and documentation agreed with the buyer.",
          "Private listings, auctions, and buy-it-now sales are subject to additional rules shown in the product.",
        ]}
      />

      <LegalSection
        title="5. Purchases and the exchange room"
        paragraphs={[
          "Buyers pay through Stripe Checkout. Payment may be authorized and captured later according to the exchange flow.",
          "Sellers must capture or cancel authorized payments within applicable time windows.",
          "Buyers confirm receipt in the exchange room when satisfied; confirmation is binding for marketplace purposes as stated in the product.",
          "Optional reviews may be submitted after confirmation.",
        ]}
      />

      <LegalSection
        title="6. Fees and payments"
        paragraphs={[
          "Platform success fees and listing fees apply as disclosed when you list or sell. Stripe processing fees apply separately.",
          "Payouts to sellers are handled through Stripe Connect subject to Stripe’s terms and verification requirements.",
          "We are not responsible for delays or holds imposed by Stripe or card networks.",
        ]}
      />

      <LegalSection
        title="7. Prohibited conduct"
        paragraphs={[
          "No illegal content, fraud, malware, stolen assets, or infringement of intellectual property.",
          "No harassment, spam, or attempts to circumvent fees or payment flows.",
          "No scraping, reverse engineering, or abuse of APIs except as permitted in writing.",
        ]}
      />

      <LegalSection
        title="8. Intellectual property"
        paragraphs={[
          "We own the Service, brand, and platform software. You receive a limited license to use the Service as intended.",
          "You retain rights in your listings and content; you grant us a license to host, display, and promote your listings on the Service.",
        ]}
      />

      <LegalSection
        title="9. Disclaimers"
        paragraphs={[
          'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
          "We do not guarantee that any listing will sell, that buyers will complete handover, or that integrations (e.g. analytics) will remain available.",
        ]}
      />

      <LegalSection
        title="10. Limitation of liability"
        paragraphs={[
          `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${LEGAL_ENTITY_NAME.toUpperCase()} AND ITS AFFILIATES ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL.`,
          "Our total liability for any claim relating to the Service is limited to the greater of (a) amounts you paid us in platform fees in the twelve months before the claim, or (b) one hundred U.S. dollars ($100).",
        ]}
      />

      <LegalSection
        title="11. Indemnity"
        paragraphs={[
          "You agree to indemnify and hold us harmless from claims arising out of your use of the Service, your listings, your transactions with other users, or your violation of these Terms or applicable law.",
        ]}
      />

      <LegalSection
        title="12. Disputes between users"
        paragraphs={[
          "Disputes between buyers and sellers should be resolved directly when possible. We may provide tools (messages, exchange room) but are not obligated to mediate.",
          "Chargebacks and payment disputes are handled under Stripe and card network rules.",
        ]}
      />

      <LegalSection
        title="13. Governing law"
        paragraphs={[
          "These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles, unless your local law requires otherwise.",
          "Any disputes will be resolved in the state or federal courts located in Delaware, unless applicable law provides otherwise.",
        ]}
      />

      <LegalSection
        title="14. Changes"
        paragraphs={[
          "We may update these Terms. We will post changes on this page and update the “Last updated” date. Material changes may be communicated by email or in-product notice where appropriate.",
        ]}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary">
        {LEGAL_ENTITY_NAME} ·{" "}
        <a href={LEGAL_ENTITY_URL} style={{ color: "inherit", fontWeight: 700 }}>
          {LEGAL_ENTITY_DOMAIN}
        </a>
        . Questions? Visit our{" "}
        <a href="/contact-us" style={{ color: "inherit", fontWeight: 700 }}>
          contact page
        </a>{" "}
        or read the{" "}
        <a href="/privacy-policy" style={{ color: "inherit", fontWeight: 700 }}>
          Privacy Policy
        </a>
        .
      </Typography>
    </MarketingPageShell>
  );
}
