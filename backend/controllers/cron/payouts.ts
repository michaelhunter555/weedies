import stripe from "../../utils/stripe";
import Transaction from "../../models/transactions";

import PayoutBatch from "../../models/payoutBatch";
import mongoose from "mongoose";

export enum AccountStatus {
    GOOD = 'good',
    SUSPENDED = 'suspended',
    BANNED = 'banned',
  }

export default async function initiatePayout() {
    // bi-weekly cron - twice a week
    // check for stipe account id
    // check all bookings completed successfully
    try {
        const transactions = await Transaction.aggregate([
            {
              $match: {
                bookingCompleteTime: { $lte: new Date(Date.now() - 24*60*60*1000) },
                hasDispute: { $ne: true },
                paidOut: false,
                stripePaymentIntentId: { $exists: true, $ne: null },
                paymentType: { $ne: 'refund' },
              }
            },
            {
              $lookup: {
                from: 'barbers',
                localField: 'barberId',
                foreignField: '_id',
                as: 'barber'
              }
            },
            { $unwind: '$barber' },
            {
              $match: {
                'barber.accountStatus': AccountStatus.GOOD,
                'barber.stripeAccountId': { $exists: true, $ne: null }
              }
            },
            {
              $group: {
                _id: '$barberId',
                name: { $first: '$barber.name' },
                email: { $first: '$barber.email' },
                stripeAccountId: { $first: '$barber.stripeAccountId' },
                pushToken: { $first: '$barber.pushToken' },
                transactions: { $push: '$_id' },
                amountCharged: { $sum: '$amountCharged' }
              }
            }
          ]);

          for(const [i, barberGroup] of transactions.entries()) {
            const { _id: barberId, stripeAccountId, pushToken, transactions: barberTransactions, name, email } = barberGroup;

            if(!stripeAccountId) {
              console.log("❌ No stripe account id found for barber:", barberId);
              continue;
            };

            const balance = await stripe.balance.retrieve({ stripeAccount: stripeAccountId });
            const totalAvailable = balance?.available?.find((b) => b.currency === 'usd');

            if (!totalAvailable || totalAvailable?.amount <= 0) {
              console.log("❌ No available balance found for barber:", barberId);
              continue;
            };
            console.log("payout#:", i,"\n", "amount charged:", barberGroup.amountCharged);

            const payoutAmount = Math.min(totalAvailable?.amount ?? 0, Math.floor(barberGroup.amountCharged));
            if(payoutAmount <= 100) {
              console.log("⚠️ Payout amount is less than 100 for barber:", barberId);
              continue;
            };

            const orderedTransactions = await Transaction.find({ _id: { $in: barberTransactions } }).select('_id amountCharged bookingCompleteTime').sort({ bookingCompleteTime: 1 });

            let remainingAmount = payoutAmount;
            const paidTransactions: mongoose.Types.ObjectId[] = [];

            for(const tx of orderedTransactions) {
              if(remainingAmount <= 0) break;
              if(remainingAmount >= tx.amountCharged) {
                paidTransactions.push(tx._id);
                remainingAmount -= tx.amountCharged;
              } else {
                console.log(`Partial payout left $${remainingAmount / 100}, transaction ${tx._id} not fully covered`);
                break;
              }
            }

            if(paidTransactions.length === 0) {
              console.log("❌ No transactions to payout for barber:", barberId);
              continue;
            }

            const batchPayout = await PayoutBatch.create({
              barberId,
              transactions: paidTransactions,
              amount: payoutAmount - remainingAmount,
              status: 'pending',
              stripePayoutId: null,
              payoutDate: null,
            })

            await stripe.payouts.create({
                    amount: payoutAmount,
                    currency: 'usd',
                    metadata: {
                      barberId: String(barberId),
                      barberName: name as string,
                      barberEmail: email as string,
                      barberPushToken: pushToken ?? "",
                      batchPayoutId: String(batchPayout._id),
                    }
                }, { 
                  stripeAccount: stripeAccountId, 
                  idempotencyKey: `${String(batchPayout._id)}:payout` 
                })

                // console.log('payout', payout.id, payout.status);
                // console.log(`✅ Payout created for barber ${barberId}`);
                // console.log(`  ↳ Stripe Payout ID: ${payout.id}`);
                // console.log(`  ↳ Status: ${payout.status}`);
                // console.log(`  ↳ Amount: $${(payoutAmount / 100).toFixed(2)}`);

                // console.log(`✅ Payout sent to barber ${barberId}: $${(payoutAmount / 100).toFixed(2)}`);
        }

        console.log("Cron Completed: Payouts sent for", transactions.length, "barbers");
    } catch (err) {
        console.log("Cron Failed to run", err);
    }
}