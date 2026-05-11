"use client";

import * as React from "react";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";

interface IWallet {
  balance: number;
  addBalance: () => void;
  currency?: string;
}

const Wallet: React.FC<IWallet> = ({
  balance,
  addBalance,
  currency = "USD",
}) => {
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(balance);

  return (
    <Stack direction="column" spacing={1.5} alignItems="center">
      <Stack direction="row" gap={1.25} justifyContent="center" alignItems="center">
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          {formatted}
        </Typography>
        <AccountBalanceWalletRoundedIcon sx={{ fontSize: 40 }} />
      </Stack>
      <Button
        onClick={addBalance}
        variant="contained"
        color="primary"
        sx={{ fontWeight: 700, minWidth: 180 }}
      >
        Add Balance
      </Button>
      <Divider sx={{ width: "100%", my: 1.25 }} />
    </Stack>
  );
};

export default Wallet;
