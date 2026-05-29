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
        subject: `You listing Sold! Congratulations!`,
        htmlContent: `
        <html>
        <body>
        <p>Congratulations ${userName}! Your listing <b>${listingName}</b> has been sold for <b>$${saleAmount}</b>. To offer the best user experience, please communicate with your buyer and initiate handover within your listed grace handover period.</p>
        <p>What to do next:</p>
        <ol>
            <li>Head over to your <a href="https://dapandflip.com/my-settings/${userId}">seller dashboard</a>.</li>
            <li>On the menu, click on "Orders" and you will see the order. Then click the button that says "Exchange" to visit the exchange page.</li>
            <li>Buyer's payment method was ${paymentMethod}. ${paymentMethod === 'stripe' ? 'You must accept this payment.' : 'You will complete this transaction on escrow.com. You should receive an email from escrow.com soon.'}</li>
            <li>After accepting payment, reach out to the buyer if you haven't already and request handover details.</li>
            <li>Once the handover is complete, your buyer will confirm the handover.</li>
            <li>You receive payment to your listed bank account after the buyer confirms the handover and payment finishes processing (2-3 business days for USA).</li>
        </ol>
        <p>Listing url: <a href="https://dapandflip.com/products/${listingId}/${slug}">${listingName}</a></p>
        <p>User Email: ${userEmail}</p>
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

// user dispute notification
export const userDisputeNotificationEmail = async (
    userEmail: string, 
    userName: string,
    disputeAmount: number,
    disputeDate: Date,
) => {
    const payload = {
        sender: {
            name: "User Dispute Notification[Dap & Flip]",
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: 'User Dispute Notification',
                email: userEmail, //info@elevatedappgroup.com
            }
        ],
        subject: `${userName} has a dispute`,
        htmlContent: `
        <html>
        <body>
        <p>User Email: ${userEmail}</p>
        <br />
        dispute amount: ${disputeAmount}
        <br />
        dispute date: ${disputeDate}
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

// auction ending soon notification
export const auctionEndingSoonNotificationEmail = async (
    userEmail: string, 
    userName: string,
    auctionEndDate: Date,
) => {
    const payload = {
        sender: {
            name: "Auction Ending Soon Notification[Dap & Flip]",
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: 'Auction Ending Soon Notification',
                email: userEmail, //info@elevatedappgroup.com
            }
        ],
        subject: `${userName} has an auction ending soon`,
        htmlContent: `
        <html>
        <body>  
        <p>User Email: ${userEmail}</p>
        <br />
        auction end date: ${auctionEndDate}
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

// payment expiring notification
export const adminListingApprovalOrDenialNotificationEmail = async (
    userEmail: string, 
    userName: string,
    listingId: string,
    listingName: string,
    listingStatus: string,
    listingStatusChangeDate: Date,
) => {
    const payload = {
        sender: {
            name: "Admin Listing Review Notification[Dap & Flip]",
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: 'Admin Listing Review Notification',
                email: userEmail, //info@elevatedappgroup.com
            }
        ],
        subject: `${userName} submitted a listing for review`,
        htmlContent: `
        <html>
        <body>
        <p>Hi ${userName}, your listing has been approved. Details are below.</p>
        <p>User Email: ${userEmail}</p> <br />
        listing id: ${listingId}
        <br />
        listing name: ${listingName}
        <br />
        listing status: ${listingStatus}
        <br />
        listing status change date: ${listingStatusChangeDate}
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
            subject: `Payout initiated — ${amountLabel}`,
            headline: "Your payout is on the way",
            detail:
                "We started a transfer from your Dap & Flip balance to your connected bank account. You'll get another email when it completes.",
        },
        paid: {
            subject: `Payout deposited — ${amountLabel}`,
            headline: "Your payout was deposited",
            detail:
                "Stripe marked this payout as paid. Funds should appear on your bank timeline per your financial institution.",
        },
        failed: {
            subject: `Payout failed — ${amountLabel}`,
            headline: "Your payout could not be completed",
            detail:
                "Please sign in to Dap & Flip and verify your Stripe Connect payout details, then contact support if you need help.",
        },
        canceled: {
            subject: `Payout canceled — ${amountLabel}`,
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