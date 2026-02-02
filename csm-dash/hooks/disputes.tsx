import { IDisputes } from '@/types';
import { useCallback } from 'react';
import { useApi } from './useHttp';
import useAuth from '@/context/auth-context';

export const useDispute = () => {
    const { request } = useApi();
    const auth = useAuth();
    // const createDispute = useCallback(async (transactionId: string, disputeData: IDisputes,) => {
    //     const authToken = await getAuthToken();
    //     const formData = new FormData();
        
    //     formData.append('transactionId', transactionId);
    //     formData.append('userId', String(user?.id));
    //     formData.append('bookingId', disputeData.bookingId);
    //     formData.append('disputeExplanation', disputeData.disputeExplanation);
    //     formData.append('initiator', disputeData.initiator);
    //     formData.append('initiatorName', disputeData.initiatorName);
    //     formData.append('amountPaid', String(disputeData?.amountPaid ?? ""));
    //     formData.append('category', disputeData.category);

    //     if(disputeData.desiredAction) {
    //         formData.append('desiredAction', disputeData.desiredAction)
    //         if(disputeData.requestedRefundAmount && !isNaN(disputeData.requestedRefundAmount)) {
    //             formData.append('requestedRefundAmount', String(disputeData.requestedRefundAmount))
    //         };
    //     }

        
    //     const images = ['imageOne', 'imageTwo'];

    //     images.forEach((image) => {
    //         const uri = String(disputeData[image as keyof IDisputes])
    //         if(uri === "") {
    //             formData.append(image, "")
    //         } else if(uri.startsWith("file://")) {
    //             const filename = uri.split('/').pop();
    //             const match = /\.(\w+)$/.exec(filename ?? '');
    //             const type = match ? `image/${match[1]}` : `image`;
          
    //             formData.append(image, {
    //               uri,
    //               name: filename,
    //               type,
    //             } as any);
    //         }
    //     })


    //     try {
    //         const res = await fetch(`${process.env.EXPO_PUBLIC_API_SERVER}/user/create-dispute`, 
    //             { 
    //                 method: 'POST', 
    //                 body: formData,
    //                 headers: { 
    //                     "Authorization": `Bearer ${authToken}`
    //                 },
    //             });

    //             const data = await res.json();
    //             if(!data.ok) {
    //                 throw new Error(data.error);
    //             }
    //             return data.disputeId;
    //     } catch(err) {
    //         console.log(err);
    //     }

    // }, [])

    const getDisputeById = useCallback(async (disputeId: string): Promise<IDisputes | void> => {
        try {
            const res = await request(
                `admin/get-dispute-by-id?disputeId=${disputeId}`,
                'GET',
                null,
                { Authorization: `Bearer ${auth.jwtToken}` }
            );
            return res.dispute as IDisputes;
        } catch(err) {
            console.log(err);
        }
    }, [request]);

    type GetDisputesResponse = {
        disputes: IDisputes[];
        currentPage: number;
        totalPages: number;
        totalDisputes: number;
    }

    const getAllDisputes = useCallback(async (userId: string, page: number, limit: number, order: number, search?: string): Promise<GetDisputesResponse | void> => {
        try {
            const params = new URLSearchParams({
                userId,
                page: String(page),
                limit: String(limit),
                order: String(order),
            });
            if (search && search.trim()) {
                params.append('search', search.trim());
            }
            const res = await request(
                `admin/get-disputes?${params.toString()}`,
                'GET',
                null,
                { Authorization: `Bearer ${auth.jwtToken}` }
            );
            return {
                disputes: res.disputes as IDisputes[],
                currentPage: res.currentPage,
                totalPages: res.totalPages,
                totalDisputes: res.totalDisputes,
            };
        } catch(err) {
            console.log(err);
        }
    },[request]);

    return {
        getAllDisputes,
        getDisputeById
    }
}