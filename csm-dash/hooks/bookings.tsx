import { useCallback } from 'react';
import { useApi } from './useHttp';
import useAuth from '@/context/auth-context';
import { IBookings } from '@/types';

type GetBookingsResponse = {
  bookings: IBookings[];
  currentPage: number;
  totalPages: number;
  totalBookings: number;
}

export const useBookings = () => {
  const { request } = useApi();
  const auth = useAuth();

  const getBookings = useCallback(async (
    page: number,
    limit: number,
    status?: IBookings['bookingStatus'],
    search?: string
  ): Promise<GetBookingsResponse | void> => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.append('status', status);
      if (search && search.trim()) params.append('search', search.trim());

      const res = await request(
        `admin/bookings?${params.toString()}`,
        'GET',
        null,
        { Authorization: `Bearer ${auth.jwtToken}` }
      );

      return {
        bookings: res.bookings as IBookings[],
        currentPage: res.currentPage,
        totalPages: res.totalPages,
        totalBookings: res.totalBookings,
      };
    } catch(err) {
      console.log(err);
    }
  }, [request]);

  const getBookingById = useCallback(async (bookingId: string): Promise<IBookings | void> => {
    try {
      const res = await request(
        `admin/booking-by-id?bookingId=${bookingId}`,
        'GET',
        null,
        { Authorization: `Bearer ${auth.jwtToken}` }
      );
      return res.booking as IBookings;
    } catch(err) {
      console.log(err);
    }
  }, [request]);

  return { getBookings, getBookingById };
}


