import LoginForm from "@/components/AuthForms/LoginForm";
import { BRAND_PALETTE } from "@/theme/brand-palette";
import Box from "@mui/material/Box";

const LoginPage = () => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        py: { xs: 3, md: 8 },
        px: 0,
        minHeight: "calc(100vh - 140px)",
        backgroundColor: BRAND_PALETTE.mint,
      }}
    >
      <LoginForm />
    </Box>
  );
};

export default LoginPage;
