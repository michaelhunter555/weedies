import StyledText from "../Shared/Text/StyledText";

interface ShippingMessageProps {
  isShipping: boolean;
}

const willShip = "This will ship via USPS and arrive in 2-5 business days.";
const willPickUp =
  "This item will be picked up between working hours (9am-5pm).";

const ShippingMessage = ({ isShipping }: ShippingMessageProps) => {
  return (
    <StyledText sx={{ fontSize: 11 }} variant="subtitle2">
      {willShip}
    </StyledText>
  );
};

export default ShippingMessage;
