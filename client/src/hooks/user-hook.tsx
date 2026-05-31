import { useCallback } from "react";

import { useApiFetchOrThrow } from "./use-api-fetch";

type DeleteAccountResponse = {
  ok?: boolean;
  message?: string;
};

export const useUser = () => {
  const { apiFetch } = useApiFetchOrThrow();

  const deleteMyAccount = useCallback(async (): Promise<DeleteAccountResponse> => {
    return apiFetch<DeleteAccountResponse>("/user/me", "DELETE");
  }, [apiFetch]);

  return {
    deleteMyAccount,
  };
};
