"use client";

import React, { useEffect, useState } from "react";
import {
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import useAuth from "@/context/auth-context";
import { useApi } from "@/hooks/useHttp";

export interface IJoinAgreements {
  _id: string;
  email: string;
  name: string;
  date: string;
  location: string;
  isLicensed: boolean;
  termsApproved: boolean;
}

const ApplicationsTable = () => {
  const { request } = useApi();
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);

  /** Wrap your backend call */
  const getUserApplications = async (page: number, limit: number) => {
    const res = await request(
      `/admin/get-applications?page=${page}&limit=${limit}&order=1`
    );
    return res;
  };

  const { data, isLoading } = useQuery({
    queryKey: ["applications", page, limit],
    queryFn: () => getUserApplications(page, limit),
    staleTime: 5 * 60 * 1000,
    enabled: auth.hydrated && !!auth.jwtToken,
  });

  useEffect(() => {
    if (data?.totalPages) {
      setTotalPages(data.totalPages);
    }
  }, [data?.totalPages]);

  const handlePageChange = (_event: any, value: number) => {
    setPage(value);
  };

  return (
    <>
      {data?.applications?.length === 0 && !isLoading && (
        <Stack>
          <Typography variant="h5" color="text.secondary">
            No Applications yet.
          </Typography>
        </Stack>
      )}

      {data?.applications?.length > 0 && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Licensed</TableCell>
                <TableCell>Agreed Terms</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.applications.map((app: IJoinAgreements) => (
                <TableRow key={app._id}>
                  <TableCell>{app.name}</TableCell>
                  <TableCell>{app.email}</TableCell>
                  <TableCell>{String(app.date).split("T")[0]}</TableCell>
                  <TableCell>{app.location}</TableCell>
                  <TableCell>{app.isLicensed ? "✅" : "❌"}</TableCell>
                  <TableCell>{app.termsApproved ? "✅" : "❌"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            count={totalPages}
            onChange={handlePageChange}
          />
        </TableContainer>
      )}
    </>
  );
};

export default ApplicationsTable;
