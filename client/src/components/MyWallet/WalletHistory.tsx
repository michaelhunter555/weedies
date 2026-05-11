"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface IWalletHistory {
  children?: React.ReactNode;
  emptyMessage?: string;
  maxHeight?: number | string;
}

const WalletHistory: React.FC<IWalletHistory> = ({
  children,
  emptyMessage = "No wallet activity yet.",
  maxHeight = 480,
}) => {
  const hasContent = React.Children.count(children) > 0;

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        maxHeight,
        overflowY: "auto",
        p: 1,
      }}
    >
      {hasContent ? (
        <Stack direction="column" spacing={1.5}>
          {children}
        </Stack>
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: 4,
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {emptyMessage}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default WalletHistory;
