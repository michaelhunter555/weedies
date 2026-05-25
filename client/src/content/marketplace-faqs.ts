export type MarketplaceFaq = {
  id: string;
  question: string;
  answer: string;
};

export const MARKETPLACE_FAQS: MarketplaceFaq[] = [
  {
    id: "what-is",
    question: "What is Dap & Flip?",
    answer:
      "Dap & Flip (dapandflip.com) is a marketplace where indie builders list digital apps and products, and buyers can discover, purchase, and take over projects. Sellers connect payouts through Stripe; buyers pay through secure checkout.",
  },
  {
    id: "list-app",
    question: "How do I list my app?",
    answer:
      "Create an account, complete seller onboarding (Stripe Connect), then use List your app from the homepage or dashboard. Your first 3 listings are free; additional listings may incur a small platform listing fee. Listings may require admin review before going live.",
  },
  {
    id: "fees",
    question: "What fees does the platform charge?",
    answer:
      "Dap & Flip charges a success fee when your app sells (tiered by sale price). Listing fees may apply after your first 3 free listings. Stripe also charges standard payment processing fees on transactions. See the fee breakdown when you create or edit a listing.",
  },
  {
    id: "payments",
    question: "How do payments and payouts work?",
    answer:
      "Buyers complete checkout with a card. For many sales, funds are authorized first and captured by the seller within the capture window in the exchange room. After capture, Stripe routes proceeds to your connected account according to Stripe’s payout schedule.",
  },
  {
    id: "exchange",
    question: "What is the exchange room after a sale?",
    answer:
      "The exchange room is where the buyer and seller coordinate handover after checkout. The seller captures (or cancels) the authorized payment, may upload optional documents, and the buyer confirms receipt. Either party can leave an optional review after confirmation.",
  },
  {
    id: "refunds",
    question: "Can I get a refund?",
    answer:
      "Refunds and disputes depend on the specific sale, Stripe payment status, and our policies. Contact the seller through messages first. For charge issues, email support from the contact page. We do not guarantee refunds for completed handovers confirmed by the buyer.",
  },
  {
    id: "private",
    question: "What are private listings?",
    answer:
      "Sellers can mark a listing private so full details are hidden until they approve an access request. Approved buyers can view the listing and proceed like any other buyer.",
  },
  {
    id: "auctions",
    question: "How do auctions work?",
    answer:
      "On auction listings, buyers place bids. The seller can accept or reject bids. Payment and handover follow the same exchange flow once a winning bid is accepted and checkout completes.",
  },
  {
    id: "data",
    question: "How is my data used?",
    answer:
      "We collect account, listing, transaction, and messaging data needed to run the marketplace. Analytics integrations (e.g. Google Analytics) are optional and controlled by sellers when they link a property. See our Privacy Policy for details.",
  },
  {
    id: "account",
    question: "How do I delete my account?",
    answer:
      "Contact us through the contact page with your account email. We will guide you through deletion where legally and operationally possible. Some transaction records may be retained as required for payments, tax, or fraud prevention.",
  },
];
