import LoginForm from "@/components/AuthForms/LoginForm";
import { AppGoogleOAuthProvider } from "@/components/Auth/AppGoogleOAuthProvider";
import { BRAND_PALETTE } from "@/theme/brand-palette";
import Box from "@mui/material/Box";

const LoginPage = () => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        py: { xs: 3, md: 8 },
        px: { xs: 2, sm: 3 },
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        backgroundColor: BRAND_PALETTE.mint,
      }}
    >
      <AppGoogleOAuthProvider>
        <LoginForm />
      </AppGoogleOAuthProvider>
    </Box>
  );
};

export default LoginPage;
