import { useContext } from 'react';

import { FaStripe } from 'react-icons/fa';

import {
  Content,
  PageContainer,
} from '@/components/Footer/FooterStyles';
import { CartContext } from '@/context/cart/cart-context';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid2';
import Modal from '@mui/material/Modal';
import Stack from '@mui/material/Stack';

import { StyledStack } from '../Shared/FadeIn/StyledFadeIn';
import StyledBoxContainer from '../Shared/Modals/ModalStyles';
import StyledText from '../Shared/Text/StyledText';

interface CartModalProps {
  open: boolean;
  onClose: () => void;
}

const CartModal = ({ open, onClose }: CartModalProps) => {
  const cart = useContext(CartContext);

  return (
    <Modal open={open} onClose={onClose}>
      <StyledBoxContainer width="500px" sx={{ height: "350px" }}>
        <PageContainer minHeight="100%">
          <Content>
            <StyledText variant="h4">Your Cart</StyledText>
            <Divider sx={{ marginBottom: "2rem" }} />
            {cart.quantity === 0 ? (
              <StyledText variant="h6">
                There are no items in your cart
              </StyledText>
            ) : (
              <StyledStack
                visible={true}
                delay={0.3}
                spacing={4}
                sx={{ width: "100%" }}
              >
                <Grid container direction="row" alignItems="center">
                  <Grid size={2}>
                    <CardMedia
                      component="img"
                      src="/2.jpg"
                      alt="mihe-cart-img"
                      sx={{
                        width: "70%",
                        height: "70%",
                        border: "1px solid #b1b1b1",
                        borderRadius: 2,
                      }}
                    />
                  </Grid>

                  <Grid size={2}>
                    <StyledText variant="subtitle2">
                      {cart.quantity} X
                    </StyledText>
                  </Grid>

                  <Grid size={7}>
                    <StyledText variant="subtitle2">Mihe X-900</StyledText>
                    <Divider />
                    <StyledText variant="subtitle2">Shipping</StyledText>
                  </Grid>
                </Grid>
              </StyledStack>
            )}
          </Content>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: "100%" }}
          >
            <Button
              onClick={() => {
                cart.removeFromCart({
                  id: 1,
                  price: 0,
                  quantity: 0,
                });

                onClose();
              }}
            >
              Clear Cart?
            </Button>
            <FormHelperText>
              <b>Total:</b> ${cart.totalPrice.toFixed(2)}
            </FormHelperText>
          </Stack>
          <Divider sx={{ margin: "1rem auto", width: "90%" }} flexItem />
          <StyledStack
            visible={true}
            delay={0.3}
            spacing={2}
            direction="row"
            justifyContent={"flex-end"}
          >
            <Chip
              color="error"
              label="Close"
              component="button"
              variant="outlined"
              onClick={onClose}
            />
            <Stack alignItems="center">
              <Chip
                disabled={cart.quantity === 0}
                label={"Checkout"}
                component="button"
                variant="outlined"
                onClick={() => console.log("stripecheckout")}
              />
              <FaStripe size={25} style={{ color: "purple" }} />
            </Stack>
          </StyledStack>
        </PageContainer>
      </StyledBoxContainer>
    </Modal>
  );
};

export default CartModal;
