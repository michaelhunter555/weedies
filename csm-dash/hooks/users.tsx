import { useCallback } from 'react';
import { useApi } from './useHttp';
import useAuth from '@/context/auth-context';
import { IBarber } from '@/types';

type GetUsersResponse = {
  users: IBarber[];
  ok: boolean;
}

export const useUsers = () => {
  const { request } = useApi();
  const auth = useAuth();

  const getUsers = useCallback(async (
    page: number,
    limit: number,
    search?: string
  ): Promise<GetUsersResponse | void> => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search && search.trim()) params.append('search', search.trim());

      const res = await request(
        `admin/get-all-users?${params.toString()}`,
        'GET',
        null,
        { Authorization: `Bearer ${auth.jwtToken}` }
      );

      return res;
    } catch(err) {
      console.log(err);
    }
  }, [request]);

  const getUserById = useCallback(async (userId: string): Promise<IBarber | void> => {
    try {
      const res = await request(
        `admin/get-user-by-id?userId=${userId}`,
        'GET',
        null,
        { Authorization: `Bearer ${auth.jwtToken}` }
      );
      return res.user as IBarber;
    } catch(err) {
      console.log(err);
    }
  }, [request]);

  return { getUsers, getUserById };
}
