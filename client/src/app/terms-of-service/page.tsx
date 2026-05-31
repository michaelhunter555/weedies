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
        title="3.1 Account Deletion"
        paragraphs={[
          `You have the right to delete your account at any time. 
          Once an account is deleted, it cannot be reinstated.
          Any pending or active transactions unrelated to the account deletion must be canceled/refunded and the funds will be returned to the original customers.
          
          You must also delete any active listings, resolve any open disputes, and no negative balances or pending payouts. Deleting your account does not affect your payouts, however, in the event that you do delete your account where A. Avaialble payout balance is greater than $0.00 USD or B. Pending payout balance is greater than $0.00 USD. 
          Dap & Flip will claim no responsibility or liability in the accuracy of the payout. 
          When a user deletes their account, our access to your Stripe associated data is deleted alongside it. 
          This means, while you will still be paid any money owed to you, we no longer have access to verify the accuracy of any future payments or payouts.
          `
        ]}
      />

      <LegalSection
        title="4. Listings and seller obligations"
        paragraphs={[
          `You represent that you have the right to sell or transfer what you list and that your listing is accurate and not misleading.
          All listings require review before publication. We may remove or reject listings at our discretion.
          You are responsible for delivering what you promise after a sale, including access, assets, and documentation agreed with the buyer.
          In order maintain a positive app experience, any listings that you sell must be delivered in your selected grace period; not exceeding 14 business days.
          When a listing is sold, you must ensure the swift handover of all deliverables including assets not limited to, social media pages, branding assets, repos, and any other assets that are part of the listing.`,
        ]}
      />

      <LegalSection
        title="5. Listing Purchases"
        paragraphs={[
          `For listings under $1000.00 USD, payment will be handled through Stripe. 
          After a buyer has completed payment, it is the sellers obligation to accept the payment, (or cancel the payment) and begin the process of handing over all deliverables.
          For listings over $1000.00 USD but less than $4000.00 USD, buyers will have the option to pay via Escrow.
          For listings over $4000.00 USD, escrow will be required. 
          `
        ]}
      />

<LegalSection
        title="5.1 Stripe Payments"
        paragraphs={[
          `For any Stripe related transactions, the seller will have a maximum of 7 business days from the date of payment to accept or reject. If no action is taken in this time, the payment will expire and the buyer will be fully refunded (100%).
          Stripe charges a flat fee of 2.9% + $0.30 USD per transaction. 
          This fee is the responsibility of the seller. 
          Payouts via Stripe can take up 2-3 business days AFTER the seller has accepted payment. 
          Please note, your very first purchase may be subject to Stripe risk assessment causing your first payout to delay for up to 7 business days.
          `
        ]}
      />

<LegalSection
        title="5.2 Escrow Payments"
        paragraphs={[
          `Our platform utilizes Escrow.com to facilitate payments as an option for listings over $1000.00 USD and as a requirement for listings over $4000.00 USD. When a buyer selects this option, the seller and buyer will receive an email notification from Escrow.com. Escrow.com transactions require both users to accept the agreement, or in other words, agree to A. Buyer agrees to pay a set amount of funds and B. The seller agrees to handover all promised deliverables. Within this, we will act as a broker, so in every escrow.com transaction, you will see info@elevatedappgroup.com included as the initiator and creator.
          It is very important to strictly follow the directions set in this process to ensure a smooth transaction.
          For escrow transactions between $1000.00 USD and $3999.99 USD, the buyer will be 100% responsible for all escrow related fees.
          For any escrow transaction over $4000.00 USD, the fees will be split 50/50 between the buyer and seller. 
          `
        ]}
      />



      <LegalSection
        title="6. Platform Success Fees"
        paragraphs={[
         `
         When a listing is sold, Dap & Flip will charge the seller a success fee that is a percentage of the listing price.
         The fee is taken immediately after the successful capture of payment. By using our platform, you agree to pay this fee in the event your listing sells. 
         Morover, you agree to avoid any actions or attempts to circumvent this fee. This includes, attempting to influence or convince the buyer or seller to continue the transaction outside of Dap & Flip to avoid paying this fee. 
         It is fully our right and discretion to determine if you have violated this clause. 
         In the event that it is determined that a user has violated this clause, we will immediately terminate your account.
         
         `
        ]}
      />

      <LegalSection
        title="7. Prohibited conduct"
        paragraphs={[
         `
         At the end of the day, we are a platform that links buyers and sellers. As a User, you aggree to engage in respectful behavior and avoid any actions that may be deemed as harassment, spam, or attempts to circumvent fees or payment flows.
         This means, no illegal content, fraud, malware, stolen assets, or infringement of intellectual property. You also agree not to verbally abuse users during conversations. This includes sending messages that contain racism, sexism, homophobia, transphobia, and any other form of discrimination.
         All conversations are subject to moderation at the request of either chat participant.
         `
        ]}
      />

<LegalSection
        title="7.1 User Account Suspension"
        paragraphs={[
         `
        Dap & Flip reserves the right to susepend any account for any violation of these Terms, at any time, without notice. When an account is suspended, the user must cease from attempting to access the platform, engage with other users, or access any of their listings. Any listing fees paid are non-refundable.
        During the suspension period, any payouts related the the suspension will be held. This does not include other transactions or payouts that are not related to the suspension. Once the suspension is lifted, the user will be able to access their account and listings again. You have the right to contact us at info@elevatedappgroup.com to appeal the suspension.
         `
        ]}
      />

<LegalSection
        title="7.2 User Account Termination"
        paragraphs={[
         `
        Dap & Flip reserves the right to terminate any account for any violation of these Terms, at any time, without notice.
        Any payout related to the cause of account termination will be fully refunded to the original customer. 
        Any listing fees paid are non-refundable. Any pending or active transactions unrelated to the account termination will be canceled/refunded and the funds will be returned to the original customers.
        Once an account is terminated, it cannot be reinstated.
        Further, a terminated account is equivalent to a lifetime ban. 
        After account terminiation, Dap & Flip reserves the right to deny any future attempts to create, purchase, profit from listings, or engage with the platform in any way.
         `
        ]}
      />

<LegalSection
        title="8. Payout Policies"
        paragraphs={[
         `
         Payouts run and rolling 2-day basis for Stripe related transactions. A seller must onboard through our personalized Stripe onboarding process to receive payouts. 
         Dap & Flip claims no responsibility or liability in the event where you are unable to onboard with Stripe whether to due to existing or recent issues with your account, identity, or any other reason.
         We have no say or control in the event where Stripe rejects your application for any reason. For escrow related transactions, payouts are sent directly to your bank via ACH. It is solely your responsibility to make sure you are providing accurate information. 
         Dap & Flip claims no responsibility or liability in the event where your bank account details are incorrect, invalid, or your bank account rejects the transaction altogether.

         `
        ]}
      />

      <LegalSection
        title="9. Intellectual property"
        paragraphs={[
          "We own the Service, brand, and platform software. You receive a limited license to use the Service as intended.",
          "You retain rights in your listings and content; you grant us a license to host, display, and promote your listings on the Service.",
          ""
        ]}
      />

      <LegalSection
        title="10. Disclaimers"
        paragraphs={[
          'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
          `We do not guarantee that any listing will sell,that buyers will complete payment, that sellers will complete handover, or that integrations (e.g. analytics) will remain available.
          We do not guarantee the accuracy of any listing or information provided by the seller. The buyer is solely responsible for inquiring, scrutinizing, and verifying the accuracy of any listing or information provided by the seller. 
          Dap & Flip claims no responsibility or liability for any actions or decisions made by the buyer or seller.
          `,
        ]}
      />

      <LegalSection
        title="11. Limitation of liability"
        paragraphs={[
          `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${LEGAL_ENTITY_NAME.toUpperCase()} AND ITS AFFILIATES ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL.`,
          "Our total liability for any claim relating to the Service is limited to the greater of (a) amounts you paid us in platform fees in the twelve months before the claim, or (b) one hundred U.S. dollars ($100).",
        ]}
      />

      <LegalSection
        title="12. Indemnity"
        paragraphs={[
          "You agree to indemnify and hold us harmless from claims arising out of your use of the Service, your listings, your transactions with other users, or your violation of these Terms or applicable law.",
        ]}
      />

<LegalSection
        title="13. Disputes"
        paragraphs={[
          `
          Buyers and sellers both have the right to open a dispute. When a dispute is open, payment will be held until the dispute is resolved. Buyers and Sellers will have the option to provide information to support their case. Sellers will have an additional option to accept the claim and either fully refund, partially refund or escalate the dispute to Dap & Flip.
          Dap & Flip will review any escalated disputes and make a decision. If the decision is in favor of the buyer, they will either be fully refunded or partially depending on their "desired action". Once a dispute is resolved, it cannot be reopened. In every dispute, Dap & Flip ensures that both parties (buyer and seller) will have an opportunity to provide clear evidence in their favor.
          `
        ]}
      />

      <LegalSection
        title="14. Governing law"
        paragraphs={[
          "These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles, unless your local law requires otherwise.",
          "Any disputes will be resolved in the state or federal courts located in Delaware, unless applicable law provides otherwise.",
        ]}
      />

      <LegalSection
        title="15. Changes"
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
