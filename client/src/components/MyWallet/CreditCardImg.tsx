import * as React from "react";
import Box from "@mui/material/Box";

import SvgAmex from "./PaymentSVGs/amex";
import SvgDiscover from "./PaymentSVGs/discover";
import SvgGeneric from "./PaymentSVGs/generic";
import SvgJcb from "./PaymentSVGs/jcb";
import SvgVisa from "./PaymentSVGs/visa";
import SvgUnionpay from "./PaymentSVGs/unionpay";
import SvgPaypal from "./PaymentSVGs/paypal";
import SvgMaestro from "./PaymentSVGs/maestro";
import SvgMastercard from "./PaymentSVGs/mastercard";

const creditImages = {
  visa: SvgVisa,
  mastercard: SvgMastercard,
  amex: SvgAmex,
  "american express": SvgAmex,
  discover: SvgDiscover,
  jcb: SvgJcb,
  unionpay: SvgUnionpay,
  paypal: SvgPaypal,
  maestro: SvgMaestro,
  generic: SvgGeneric,
} as const;

interface ICardIcon {
  cardName?: string | null;
  width?: number | string;
  height?: number | string;
}

const CardIcon: React.FC<ICardIcon> = ({
  cardName,
  width = 40,
  height = 26,
}) => {
  const key = (cardName ?? "generic").toLowerCase();
  const Svg =
    creditImages[key as keyof typeof creditImages] ?? creditImages.generic;

  return (
    <Box
      sx={{
        width,
        height,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Svg width="100%" height="100%" />
    </Box>
  );
};

export default CardIcon;
