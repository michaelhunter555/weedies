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
            name: "User Issue Report[Dap & Flip]",
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: 'User Issue Report',
                email: userEmail, //info@elevatedappgroup.com
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
    userName: string,
    senderName: string,
    message: string,
) => {
    const payload = {
        sender: {
            name: "User Chat Message Received[Dap & Flip]",
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: 'User Chat Message Received',
                email: userEmail, //info@elevatedappgroup.com
            }
        ],
        subject: `${userName} received a chat message`,
        htmlContent: `
        <html>
        <body>
        <p>User Email: ${userEmail}</p>
        <br />
        sender name: ${senderName}
        <br />
        message: ${message}
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

// user sale notification
export const userSaleNotificationEmail = async (
    userEmail: string, 
    userName: string,
    saleAmount: number,
    saleDate: Date,
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
        subject: `${userName} made a sale`,
        htmlContent: `
        <html>
        <body>
        <p>User Email: ${userEmail}</p>
        <br />
        sale amount: ${saleAmount}
        <br />
        sale date: ${saleDate}
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
            name: "Admin Listing Approval or Denial Notification[Dap & Flip]",
            email: 'no-reply@elevatedappgroup.com', //
        },
        to: [
            {
                name: 'Admin Listing Approval or Denial Notification',
                email: userEmail, //info@elevatedappgroup.com
            }
        ],
        subject: `${userName} has a listing approval or denial`,
        htmlContent: `
        <html>
        <body>
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