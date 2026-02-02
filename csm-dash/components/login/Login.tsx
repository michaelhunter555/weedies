"use client";
import { useState } from "react";
import { Box, Button, TextField, Typography, Container, Paper } from "@mui/material";
import useAuth from "@/context/auth-context"; // import your custom Auth hook

const LoginPage = () => {
  const { handleLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    console.log(email, password)
    e.preventDefault();
    handleLogin(email, password);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography textAlign="center" variant="h5" mb={3}>
          Admin Login
        </Typography>

        <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Email"
            fullWidth
            value={email}
            type="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            fullWidth
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="contained">
            Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
