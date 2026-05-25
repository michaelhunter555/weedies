"use client";

import LockIcon from "@mui/icons-material/Lock";
import { FormHelperText, Stack } from "@mui/material";

type Props = {
  /** Defaults to Stripe checkout line used on product detail & homepage. */
  children?: React.ReactNode;
};

export function SecureCheckoutNote({ children }: Props) {
  return (
    <Stack
      direction="row"
      justifyContent="center"
      alignItems="center"
      spacing={0.5}
      sx={{ mt: 0.25 }}
    >
      <LockIcon sx={{ fontSize: 16, color: "rgba(20, 131, 6, 0.87)" }} />
      <FormHelperText
        sx={{ m: 0, fontSize: 12, color: "text.secondary", lineHeight: 1.3 }}
      >
        {children ?? "Secure checkout with Stripe guaranteed."}
      </FormHelperText>
    </Stack>
  );
}
