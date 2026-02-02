import LoginForm from "@/components/AuthForms/LoginForm";
import Box from "@mui/material/Box";

const LoginPage = () => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginTop: "6rem",
      }}
    >
      <LoginForm />
    </Box>
  );
};

export default LoginPage;
