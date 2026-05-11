"use client";
import React, { useMemo } from 'react';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery } from '@tanstack/react-query';

interface IStripeCheckoutProps {
    children: React.ReactElement | React.ReactElement[];
}

const StripeWebCheckoutProvider = ({ children }: IStripeCheckoutProps) => {
    const { data: stripe, isLoading: stripeIsLoading } = useQuery({
        queryKey: ['stripe-pub-web'],
        queryFn: async (): Promise<string> => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_KEY}/stripe/get-stripe-pub`);
            const data = await res.json();
            return data.stripePubKey;
        },
        staleTime: Infinity,
    });

    const stripePromie = useMemo(() => {
        if (stripe) {
            return loadStripe(String(stripe))
        }
        return null;
    }, [stripe])

    return (
        <Elements stripe={stripePromie}>
            {children}
        </Elements>
    );
};

export default StripeWebCheckoutProvider;

