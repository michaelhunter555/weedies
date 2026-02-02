import React, { useCallback } from 'react';
import { useApi } from './useHttp';

export const useGetApplications = () => {
    const { request, isError: isApplicationError } = useApi();
    const storage = localStorage.getItem("@token");
    const user = JSON.parse(String(storage));

    
    const getUserApplications = useCallback(async (page?: number, limit?: number, order?: number, query?: string, token?: string) => {
        console.log("applications",user);
       const response =  await request(
        `/admin/get-applications?page=${page}&limit=${limit}&order=${order}&search=${query}`,
        'GET',
        null,
        { Authorization: `Bearer ${token}`}
    );
       return {
        applications: response.applications,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
        totalApplications: response.totalApplications,
       }
    }, [request]);

    type AppResponse = 'accept' | 'reject' | 'RFE'
    const createApplicationResponse = useCallback(async (appResponse: AppResponse, reason: string) => {
      const response = await request(
        `/admin/application-response`, 
        'POST', 
        JSON.stringify({ appResponse, reason }),
        {
            "Content-Type":"application/json",
            Authorization: `Bearer ${user.user.jwtToken}`
        }
    );
    return response;
    }, []);


    return {
        getUserApplications,
        createApplicationResponse,
        isApplicationError,
    }
}