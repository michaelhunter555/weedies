import React, { useCallback, useState } from 'react';

type Methods = "POST" | "GET";
type Body = string | FormData | null;

export const useApi = () => {
    const url = process.env.NEXT_PUBLIC_API_SERVER;
    const [isError, setIsError] = useState<string>("");

    const request = useCallback( 
        async (
            path: string,
            method: Methods = "GET", 
            body: Body = null, 
            customerHeaders?: {}, 
        ): Promise<any | undefined> => {
        try {
            //console.log("url", url)
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_SERVER}/${path}`, {
                method: method ?? 'GET',
                body,
                headers: {
                    ...customerHeaders,
                },
            })
            const data = await res.json();
            if(!data.ok) {
                setIsError(data.error)
                throw new Error(`Error: ${res.status}`)
            }
            return data;
        } catch(err) {
            console.log(err);
        }
    }, []);

    return { request, isError };
    
}