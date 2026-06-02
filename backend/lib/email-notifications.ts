const brevoAPIKey = process.env.BREVO_API_KEY;



 // user issue report email
export const userIssueReportNotificationEmail = async (
    userEmail: string, 
    userName: string,
    issueDescription: string,
    category: string,
) => {
    const payload = {
        sender: {
            name: "User Support Email[Dap & Flip]",
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: 'User Issue Report',
                email: 'info@elevatedappgroup.com'
            }
        ],
        subject: `${userName} reported an issue`,
        htmlContent: `
        <html>
        <body>
        <p>User Email: ${userEmail}</p>
        <br />
        category: ${category}
        <br />
        issue: ${issueDescription}
        <br />
        </body>
        </html>
        `
    }

    try {

        const res = await fetch(`https://api.brevo.com/v3/smtp/email`, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "Content-Type": "application/json",
                "api-key": String(brevoAPIKey),
            },
            body: JSON.stringify(payload)
        })
    if(!res.ok) {
        const err = await res.text();
        console.error("brevo error",err)
    } else {
        console.log("brevo email sent successfully");
    }
    } catch(err) {
        console.log("POST error",err);
    }
};

// user chat message notification
export const userChatMessageReceivedNotificationEmail = async (
    userEmail: string, 
    senderName: string,
    message: string,
) => {
    const payload = {
        sender: {
            name: `${senderName} Sent You a Message[Dap & Flip]`,
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: `${senderName} Sent You a Message`,
                email: userEmail, //info@elevatedappgroup.com
            }
        ],
        subject: `New message from ${senderName} on Dap & Flip`,
        htmlContent: `
        <html>
        <body>
        <p>${senderName} sent you a message:</p>
        <br />
        <p>${message}</p>
        <br />
        <p>To reply, visit the <a href="https://dapandflip.com/messages">messages page</a>.</p>
        </body>
        </html>
        `
    }
    try {
        const res = await fetch(`https://api.brevo.com/v3/smtp/email`, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "Content-Type": "application/json",
                "api-key": String(brevoAPIKey),
            },
            body: JSON.stringify(payload)
        })
        if(!res.ok) {
            const err = await res.text();
            console.error("brevo error",err)
        } else {
            console.log("brevo email sent successfully");
        }
    } catch(err) {
        console.log("POST error",err);
    }
};

// user sale notification
export const userSaleNotificationEmail = async (
    userEmail: string, 
    userName: string,
    saleAmount: number,
    saleDate: Date,
    listingName?: string,
    listingId?: string,
    slug?: string,
    userId?: string,
    paymentMethod?: 'stripe' | 'escrow',
) => {
    const payload = {
        sender: {
            name: "User Sale Notification[Dap & Flip]",
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: 'User Sale Notification',
                email: userEmail, //info@elevatedappgroup.com
            }
        ],
        subject: `Your listing Sold! Congratulations!`,
        htmlContent: `
        <html>
        <body>
        <p>Congratulations ${userName}! Your listing <b>${listingName}</b> has been sold for <b>$${saleAmount}</b>. To offer the best user experience, please communicate with your buyer and initiate handover within your listed grace handover period.</p>
        <p>What to do next:</p>
        <ol>
            <li>Head over to your <a href="https://dapandflip.com/my-settings/${userId}">seller dashboard</a>.</li>
            <li>On the menu, click on "Orders" and you will see the order. Then click the button that says "Exchange" to visit the exchange page.</li>
            <li>Buyer's payment method was proccessed via ${paymentMethod}. ${paymentMethod === 'stripe' ? 'You must accept this payment before handover of deliverables.' : 'You will complete this transaction on escrow.com. You should receive an email from escrow.com soon.'}</li>
            <li>After accepting payment, reach out to the buyer if you haven't already and request handover details.</li>
            <li>Once the handover is complete, your buyer will confirm the handover.</li>
            <li>You'll receive payment to your listed bank account after the buyer confirms the handover and payment finishes processing (2-3 business days for USA).</li>
        </ol>
        <p>Listing url: <a href="https://dapandflip.com/products/${listingId}/${slug}">${listingName}</a></p>
        <br />
        sale amount: $${saleAmount.toFixed(2)}
        <br />
        sale date: ${saleDate.toLocaleString()}
        <br />
        payment method: ${paymentMethod}
        <br />
        --------------------------------
        <p>This is an automated email. Please do not reply to this email. If you have any questions, please e-mail us at info@elevatedappgroup.com</p>
        <p>Thank you for using Dap & Flip!</p>
        <p>The Dap & Flip Team</p>
        </body>
        </html>
        `
    }
    try {
        const res = await fetch(`https://api.brevo.com/v3/smtp/email`, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "Content-Type": "application/json",
                "api-key": String(brevoAPIKey),
            },
            body: JSON.stringify(payload)
        })
        if(!res.ok) {
            const err = await res.text();
            console.error("brevo error",err)
        } else {
            console.log("brevo email sent successfully");
        }
    } catch(err) {
        console.log("POST error",err);
    }
};

function clientOriginForEmail(): string {
    const raw = process.env.CLIENT_ORIGIN?.trim();
    if (raw) {
        const first = raw.split(",")[0]?.trim();
        if (first) return first.replace(/\/$/, "");
    }
    return "https://dapandflip.com";
}

// user dispute notification (seller or other non-initiator)
export const userDisputeNotificationEmail = async (
    userEmail: string,
    userName: string,
    userId: string,
    disputeId: string,
    amountPaidCents: number,
    requestedRefundCents: number,
    desiredAction: "full_refund" | "partial_refund",
    disputeDate: Date,
    disputeCategory: string,
    appName?: string,
) => {
    const origin = clientOriginForEmail();
    const amountPaid = (amountPaidCents / 100).toFixed(2);
    const requested = (requestedRefundCents / 100).toFixed(2);
    const refundRequestLine =
        desiredAction === "full_refund"
            ? `Full refund requested (<b>$${requested}</b> of $${amountPaid} paid).`
            : `Partial refund requested: <b>$${requested}</b> of $${amountPaid} paid.`;
    const resolutionUrl = `${origin}/my-settings/${encodeURIComponent(userId)}/resolution-center/${encodeURIComponent(disputeId)}`;

    const payload = {
        sender: {
            name: "User Dispute Notification[Dap & Flip]",
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: userName || "User Dispute Notification",
                email: userEmail,
            }
        ],
        subject: `Post-sale dispute action required`,
        htmlContent: `
        <html>
        <body>

        <p>Hi ${userName},</p>
        <p>A dispute was opened on Dap &amp; Flip regarding <b>${appName ?? "your listing"}</b>. The buyer reported: <code>${disputeCategory}</code>.</p>
        <p>${refundRequestLine}</p>
        <p>Opened: <b>${disputeDate.toLocaleString()}</b></p>
        <p>Please visit the <a href="${resolutionUrl}">Resolution Center</a> to review the case.</p>
        <ol>
        <li><b>Accept</b> the refund request to issue the refund through Stripe.</li>
        <li><b>Escalate</b> if you disagree, platform review will decide.</li>
        <li>You have 3 days to respond or the dispute may be resolved in the buyer's favor.</li>
        <li>Message the buyer in the exchange room to resolve faster when possible.</li>
        </ol>
        </body>
        </html>
        `
    }
    try {
        const res = await fetch(`https://api.brevo.com/v3/smtp/email`, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "Content-Type": "application/json",
                "api-key": String(brevoAPIKey),
            },
            body: JSON.stringify(payload)
        })
        if(!res.ok) {
            const err = await res.text();
            console.error("brevo error",err)
        } else {
            console.log("brevo email sent successfully");
        }
    } catch(err) {
        console.log("POST error",err);
    }
};

const ADMIN_INBOX = "info@elevatedappgroup.com";

// dispute requires review email (seller escalated or charge dispute).
export const disputeRequiresReviewEmail = async (
    disputeId: string,
    listingAppName: string,
    category: string,
    initiatorName: string,
    amountPaidCents: number,
    requestedRefundCents: number,
    desiredAction: "full_refund" | "partial_refund",
    sellerResponse?: string,
) => {
    const amountPaid = (amountPaidCents / 100).toFixed(2);
    const requested = (requestedRefundCents / 100).toFixed(2);
    const refundLine =
        desiredAction === "full_refund"
            ? `Full refund ($${requested})`
            : `Partial refund ($${requested} of $${amountPaid})`;

    const payload = {
        sender: {
            name: "Dispute Review[Dap & Flip]",
            email: "no-reply@elevatedappgroup.com",
        },
        to: [{ name: "Dap & Flip Support", email: ADMIN_INBOX }],
        subject: `Dispute needs review: ${listingAppName}`,
        htmlContent: `
        <html><body>
        <p>A dispute requires platform review.</p>
        <ul>
        <li>Dispute ID: <code>${disputeId}</code></li>
        <li>Listing: <b>${listingAppName}</b></li>
        <li>Category: <code>${category}</code></li>
        <li>Opened by: ${initiatorName}</li>
        <li>Requested: ${refundLine}</li>
        ${sellerResponse ? `<li>Seller response: ${sellerResponse}</li>` : ""}
        </ul>
        <p>Review in admin tools or contact parties as needed.</p>
        </body></html>
        `,
    };

    await sendBrevoPayload(payload);
};

// Admin dispute decision email (buyer + seller).
export const adminDisputeDecisionEmail = async (
    userEmail: string,
    userName: string,
    userId: string,
    disputeId: string,
    listingAppName: string,
    decisionSummary: string,
    action: "refund" | "partial_refund" | "none",
    platformResponse: string,
) => {
    const origin = clientOriginForEmail();
    const resolutionUrl = `${origin}/my-settings/${encodeURIComponent(userId)}/resolution-center/${encodeURIComponent(disputeId)}`;
    const actionLabel =
        action === "refund"
            ? "Full refund"
            : action === "partial_refund"
              ? "Partial refund"
              : "No refund";

    const payload = {
        sender: {
            name: "Dispute Decision[Dap & Flip]",
            email: "no-reply@elevatedappgroup.com",
        },
        to: [{ name: userName || "User", email: userEmail }],
        subject: `Dispute resolved: ${listingAppName}`,
        htmlContent: `
        <html><body>
        <p>Hi ${userName},</p>
        <p>Platform review for <b>${listingAppName}</b> is complete.</p>
        <p><b>Outcome:</b> ${decisionSummary} (${actionLabel})</p>
        <p>${platformResponse}</p>
        <p><a href="${resolutionUrl}">View in Resolution Center</a></p>
        </body></html>
        `,
    };

    await sendBrevoPayload(payload);
};

/** Contact form submission from signed-in users → support inbox. */
export const contactUsSupportEmail = async (input: {
  userId: string;
  userEmail: string;
  userName: string;
  topic: string;
  topicLabel: string;
  message: string;
}) => {
  const safeMessage = input.message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");

  const payload = {
    sender: {
      name: "Dap & Flip Contact",
      email: "no-reply@elevatedappgroup.com",
    },
    replyTo: {
      email: input.userEmail,
      name: input.userName,
    },
    to: [{ name: "Dap & Flip Support", email: ADMIN_INBOX }],
    subject: `[Contact] ${input.topicLabel} — ${input.userName}`,
    htmlContent: `
        <html><body>
        <p><b>Contact form</b> (${input.topicLabel})</p>
        <ul>
        <li>User: ${input.userName}</li>
        <li>Email: <a href="mailto:${input.userEmail}">${input.userEmail}</a></li>
        <li>User ID: <code>${input.userId}</code></li>
        <li>Topic: <code>${input.topic}</code></li>
        </ul>
        <p><b>Message</b></p>
        <p>${safeMessage}</p>
        </body></html>
        `,
  };

  await sendBrevoPayload(payload, { throwOnFailure: true });
};

async function sendBrevoPayload(
  payload: Record<string, unknown>,
  opts?: { throwOnFailure?: boolean },
): Promise<void> {
    try {
        const res = await fetch(`https://api.brevo.com/v3/smtp/email`, {
            method: "POST",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
                "api-key": String(brevoAPIKey),
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.text();
            console.error("brevo error", err);
            if (opts?.throwOnFailure) {
                throw new Error("Support email could not be delivered.");
            }
        } else {
            console.log("brevo email sent successfully");
        }
    } catch (err) {
        console.log("POST error", err);
        if (opts?.throwOnFailure) {
            throw err instanceof Error ? err : new Error("Support email could not be delivered.");
        }
    }
}

// auction ending soon notification
export const auctionEndingSoonNotificationEmail = async (
    userEmail: string,
    userName: string,
    appName: string,
    listingId: string,
    auctionEndDate: Date,
    listingUrl?: string,
) => {
    const origin = clientOriginForEmail();
    const url =
        listingUrl ??
        `${origin}/products/${encodeURIComponent(listingId)}`;

    const payload = {
        sender: {
            name: "Auction Ending Soon[Dap & Flip]",
            email: "no-reply@elevatedappgroup.com",
        },
        to: [{ name: userName || "Bidder", email: userEmail }],
        subject: `Auction ending soon: ${appName}`,
        htmlContent: `
        <html><body>
        <p>Hi ${userName},</p>
        <p>The auction for <b>${appName}</b> ends <b>${auctionEndDate.toLocaleString()}</b>.</p>
        <p><a href="${url}">View listing</a></p>
        </body></html>
        `,
    };

    await sendBrevoPayload(payload);
};

export const auctionWinnerBuyerEmail = async (
    userEmail: string,
    userName: string,
    userId: string,
    appName: string,
    listingId: string,
    winAmount: number,
    checkoutUrl: string,
    exchangeUrl: string,
) => {
    const payload = {
        sender: {
            name: "Auction Won[Dap & Flip]",
            email: "no-reply@elevatedappgroup.com",
        },
        to: [{ name: userName || "Buyer", email: userEmail }],
        subject: `You won the auction: ${appName}`,
        htmlContent: `
        <html><body>
        <p>Hi ${userName},</p>
        <p>Congratulations! You won <b>${appName}</b> for <b>$${winAmount.toFixed(2)}</b>.</p>
        <p>Complete payment to secure the sale:</p>
        <ol>
        <li><a href="${checkoutUrl}">Checkout</a></li>
        <li>Then use the <a href="${exchangeUrl}">Exchange room</a> for handover.</li>
        </ol>
        </body></html>
        `,
    };
    await sendBrevoPayload(payload);
};

export const auctionWinnerSellerEmail = async (
    userEmail: string,
    userName: string,
    userId: string,
    appName: string,
    listingId: string,
    winAmount: number,
    buyerName: string,
    exchangeUrl: string,
) => {
    const payload = {
        sender: {
            name: "Auction Ended[Dap & Flip]",
            email: "no-reply@elevatedappgroup.com",
        },
        to: [{ name: userName || "Seller", email: userEmail }],
        subject: `Auction ended: ${appName}`,
        htmlContent: `
        <html><body>
        <p>Hi ${userName},</p>
        <p>Your auction for <b>${appName}</b> ended. High bid: <b>$${winAmount.toFixed(2)}</b> from ${buyerName}.</p>
        <p>The listing is reserved until they pay. You will be notified when checkout completes.</p>
        <p><a href="${exchangeUrl}">Open Exchange room</a></p>
        </body></html>
        `,
    };
    await sendBrevoPayload(payload);
};

export const auctionEndedNoWinnerSellerEmail = async (
    userEmail: string,
    userName: string,
    appName: string,
    listingId: string,
    slug?: string,
    note?: string,
) => {
    const origin = clientOriginForEmail();
    const slugPart = slug ? `/${encodeURIComponent(slug)}` : "";
    const url = `${origin}/products/${encodeURIComponent(listingId)}${slugPart}`;

    const payload = {
        sender: {
            name: "Auction Ended[Dap & Flip]",
            email: "no-reply@elevatedappgroup.com",
        },
        to: [{ name: userName || "Seller", email: userEmail }],
        subject: `Auction ended: ${appName}`,
        htmlContent: `
        <html><body>
        <p>Hi ${userName},</p>
        <p>Your auction for <b>${appName}</b> has ended with no payable winning bid.</p>
        ${note ? `<p>${note}</p>` : ""}
        <p><a href="${url}">View listing</a></p>
        </body></html>
        `,
    };
    await sendBrevoPayload(payload);
};

// payment expiring notification
export const paymentExpiringNotificationEmail = async (
    userEmail: string, 
    userName: string,
    paymentAmount: number,
    paymentDate: Date,
) => {
    const payload = {
        sender: {
            name: "Payment Expiring Notification[Dap & Flip]",
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: 'Payment Expiring Notification',
                email: userEmail, //info@elevatedappgroup.com
            }
        ],
        subject: `${userName} has a payment expiring`,
        htmlContent: `
        <html>
        <body>
        <p>User Email: ${userEmail}</p> <br />
        payment amount: ${paymentAmount}
        <br />
        payment date: ${paymentDate}
        <br />
        </body>
        </html>
        `
    }
    try {
        const res = await fetch(`https://api.brevo.com/v3/smtp/email`, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "Content-Type": "application/json",
                "api-key": String(brevoAPIKey),
            },
            body: JSON.stringify(payload)
        })
        if(!res.ok) {
            const err = await res.text();
            console.error("brevo error",err)
        } else {
            console.log("brevo email sent successfully");
        }
    } catch(err) {
        console.log("POST error",err);
    }
};

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Seller notification after admin approve / reject / unpublish on a listing review. */
export const adminListingApprovalOrDenialNotificationEmail = async (
    userEmail: string,
    userName: string,
    listingId: string,
    listingName: string,
    listingStatus: string,
    listingStatusChangeDate: Date,
    rejectionReason?: string,
) => {
    const safeName = escapeHtml(userName || "there");
    const safeListing = escapeHtml(listingName || "Listing");
    const when = listingStatusChangeDate.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    const isRejected = listingStatus === "rejected";
    const isLive = listingStatus === "live";
    const isPaused = listingStatus === "paused";

    const subject = isRejected
        ? `Your listing "${listingName}" needs changes before it can go live`
        : isLive
          ? `Your listing "${listingName}" is now live on Dap & Flip`
          : isPaused
            ? `Your listing "${listingName}" has been unpublished`
            : `Update on your listing "${listingName}"`;

    const statusLine = isRejected
        ? "not approved yet"
        : isLive
          ? "approved and is live on the marketplace"
          : isPaused
            ? "unpublished (taken off the marketplace)"
            : `updated to <b>${escapeHtml(listingStatus)}</b>`;

    const reasonBlock = isRejected
        ? `<p><b>What to fix</b></p>
<p>${escapeHtml(rejectionReason?.trim() || "Please review our listing guidelines and update your listing so it meets marketplace standards.")}</p>
<p>You can edit and resubmit this listing from your seller dashboard. Listings in <b>rejected</b> status are removed automatically if they stay inactive for about 7 days, so resubmit when you are ready.</p>`
        : isLive
          ? `<p>Buyers can discover and purchase your app on Dap & Flip. Open your seller dashboard to manage the listing.</p>`
          : "";

    const payload = {
        sender: {
            name: "Dap & Flip Listings",
            email: "no-reply@elevatedappgroup.com",
        },
        to: [
            {
                name: userName || "Seller",
                email: userEmail,
            },
        ],
        subject,
        htmlContent: `
        <html>
        <body>
        <p>Hi ${safeName},</p>
        <p>Your listing <b>${safeListing}</b> was ${statusLine}.</p>
        ${reasonBlock}
        <p style="color:#666;font-size:13px;">
        Listing ID: ${escapeHtml(listingId)}<br />
        Updated: ${escapeHtml(when)}
        </p>
        <p>Questions? Reply to this message or contact us at info@elevatedappgroup.com.</p>
        </body>
        </html>
        `,
    };

    await sendBrevoPayload(payload);
};

export type PayoutEmailStatus = "created" | "paid" | "failed" | "canceled";

function formatPayoutMoney(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency.toUpperCase(),
        }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
    }
}

// Seller Connect payout notification (Brevo).
export const payoutsNotificationEmail = async (
    userEmail: string,
    userName: string,
    payoutAmount: number,
    payoutCurrency: string,
    payoutDate: Date,
    status: PayoutEmailStatus = "paid",
) => {
    const amountLabel = formatPayoutMoney(payoutAmount, payoutCurrency);
    const dateLabel = payoutDate.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    const copy: Record<
        PayoutEmailStatus,
        { subject: string; headline: string; detail: string }
    > = {
        created: {
            subject: `Payout initiated: ${amountLabel}`,
            headline: "Your payout is on the way",
            detail:
                "We started a transfer from your Dap & Flip balance to your connected bank account. You'll get another email when it completes.",
        },
        paid: {
            subject: `Payout deposited: ${amountLabel}`,
            headline: "Your payout was deposited",
            detail:
                "Stripe marked this payout as paid. Funds should appear on your bank timeline per your financial institution.",
        },
        failed: {
            subject: `Payout failed: ${amountLabel}`,
            headline: "Your payout could not be completed",
            detail:
                "Please sign in to Dap & Flip and verify your Stripe Connect payout details, then contact support if you need help.",
        },
        canceled: {
            subject: `Payout canceled: ${amountLabel}`,
            headline: "Your payout was canceled",
            detail:
                "This transfer was canceled before completion. Sign in to review your seller dashboard or contact support with questions.",
        },
    };

    const { subject, headline, detail } = copy[status];

    const payload = {
        sender: {
            name: "Dap & Flip Payouts",
            email: "no-reply@elevatedappgroup.com",
        },
        to: [
            {
                name: userName || "Seller",
                email: userEmail,
            },
        ],
        subject,
        htmlContent: `
        <html>
        <body>
        <p>Hi ${userName || "there"},</p>
        <p><strong>${headline}</strong></p>
        <p>Amount: ${amountLabel}<br />
        Date: ${dateLabel}</p>
        <p>${detail}</p>
        <p>- Dap & Flip</p>
        </body>
        </html>
        `,
    };
    try {
        const res = await fetch(`https://api.brevo.com/v3/smtp/email`, { 
            method: "POST",
            headers: {
                "accept": "application/json",
                "Content-Type": "application/json",
                "api-key": String(brevoAPIKey),
            },
            body: JSON.stringify(payload)
        })
        if(!res.ok) {
            const err = await res.text();
            console.error("brevo error",err)
        } else {
            console.log("brevo email sent successfully");
        }
    } catch(err) {
        console.log("POST error",err);
    }
};