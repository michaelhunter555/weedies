"use client";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";

import StyledText from "../Shared/Text/StyledText";

interface QuantityProps {
  onQuantity: (quantity: string) => void;
  quantity: number;
}

const QuantitySelector = ({ onQuantity, quantity }: QuantityProps) => {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      spacing={2}
      sx={{ width: "100%" }}
    >
      <Chip
        onClick={() => onQuantity("decrement")}
        component="button"
        label="-"
        variant="outlined"
        sx={{ minWidth: 50 }}
      />
      <Chip
        onClick={() => onQuantity("increment")}
        component="button"
        label="+"
        variant="outlined"
        sx={{ minWidth: 50 }}
      />
      <StyledText
        sx={{
          width: "20px",
        }}
        variant="subtitle2"
      >
        {quantity}
      </StyledText>
    </Stack>
  );
};

export default QuantitySelector;
