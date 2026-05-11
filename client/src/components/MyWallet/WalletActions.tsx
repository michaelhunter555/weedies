"use client";

import * as React from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface IWalletActions {
  date: string;
  amount: number;
  currency?: string;
}

const WalletActions: React.FC<IWalletActions> = ({
  date,
  amount,
  currency = "USD",
}) => {
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);

  return (
    <Stack direction="column" spacing={1.25}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {date}
      </Typography>
      <Typography variant="body2">
        &bull; Deposit Amount: {formatted}
      </Typography>
    </Stack>
  );
};

export default WalletActions;
