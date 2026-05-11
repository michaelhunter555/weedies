import { Request, Response } from 'express';
import Disputes from '../../models/disputes';
import mongoose from 'mongoose';

export default async function (req: Request, res: Response) {
    const { userId, page, limit, order, queryValue, status } = req.query;
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 8;
    const orderNum = Number(order) === -1 ? -1 : 1;

    if (!userId) {
        return void res.status(400).json({ error: 'Please pass a valid string id value', ok: false })
    }
    if (String(userId) !== req.user?.userId) {
        return void res.status(403).json({ error: 'Forbidden', ok: false })
    }

    const disputeQuery: any = {
        $or: [
            { userId: req.user?.userId },
            { sellerId: req.user?.userId }
        ],
        ...(status ? { disputeStatus: status } : {}),
    }

    if (queryValue && queryValue !== 'undefined') {
        const andConditions: any[] = [];
        const orConditions: any[] = [];

        const isObjectId = mongoose.Types.ObjectId.isValid(String(queryValue));

        if (isObjectId) {
            orConditions.push(
                { _id: new mongoose.Types.ObjectId(String(queryValue)) },
            )
        }

        orConditions.push(
            { initiatorName: { $regex: queryValue, $options: 'i' } },
            { category: { $regex: queryValue, $options: 'i' } },
            { status: { $regex: queryValue, $options: 'i' } },
            { decision: { $regex: queryValue, $options: 'i' } },
            { action: { $regex: queryValue, $options: 'i' } },
        )

        andConditions.push({ $or: orConditions });
        disputeQuery.$and = andConditions;
    }

    try {
        // barberId
        const disputes = await Disputes.find(disputeQuery).sort({ createdAt: orderNum }).skip((pageNum - 1) * limitNum).limit(limitNum);

        if (!disputes) {
            return void res.status(404).json({ error: 'No disputes found for the given userId', ok: false })
        }
        const totalDisputes = await Disputes.countDocuments(disputeQuery);
        const totalPages = Math.ceil(totalDisputes / limitNum);
        res.status(200).json({
            disputes,
            page: pageNum,
            limit: limitNum,
            totalPages,
            totalDisputes,
            ok: true,
        })
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error getting dispute data ' + err, ok: false })
    }
}