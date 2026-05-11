import { Request, Response } from 'express';
import stripe from '../../utils/stripe';
import User from '../../models/user';

export default async function(req: Request, res: Response) {
const { stripeCustomerId } = req.query;

try {
    const user = await User.findOne({ stripeCustomerId: stripeCustomerId }).select('_id')
    if(String(user._id) !== req.user?.userId) {
        return void res.status(403).json({error: 'Forbidden', ok: false })
    }
const paymentMethods = await stripe.paymentMethods.list({
    customer: `${stripeCustomerId}`,
    type: 'card'
})
let hasCard = false;
if (paymentMethods.data.length > 0) {
    hasCard = true;
}

res.status(200).json({ hasCard, paymentMethods, ok: true })
} catch(err) {
    console.log(err);
    res.status(500).json({ error: err, ok: false })
}

}