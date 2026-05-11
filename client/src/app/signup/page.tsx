import LoginForm from "@/components/AuthForms/LoginForm";
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
        background:
          "radial-gradient(800px 300px at 50% 0%, rgba(124,58,237,0.08), transparent 60%)",
      }}
    >
      <LoginForm />
    </Box>
  );
};

export default LoginPage;
