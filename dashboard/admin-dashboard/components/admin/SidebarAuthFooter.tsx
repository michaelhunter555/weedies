"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { useAdminAuth } from "@/context/admin-auth-context";

export function SidebarAuthFooter() {
  const { admin, accessToken, hydrated, login, logout } = useAdminAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) {
    return (
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Loading…
        </Typography>
      </Box>
    );
  }

  if (accessToken && admin) {
    return (
      <Box sx={{ px: 2, py: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Signed in
        </Typography>
        <Typography variant="body2" fontWeight={600} noWrap title={admin.email}>
          {admin.email}
        </Typography>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="inherit"
          sx={{ mt: 1 }}
          onClick={() => void logout()}
        >
          Log out
        </Button>
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{
        px: 2,
        py: 2,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        Admin login
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block", lineHeight: 1.35 }}>
        No account yet? Use the email and password you want, then Sign in - the
        server creates the admin on first login for that email.
      </Typography>
      {error ? (
        <Alert severity="error" sx={{ mt: 1, py: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <TextField
        fullWidth
        size="small"
        margin="dense"
        label="Email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
      />
      <TextField
        fullWidth
        size="small"
        margin="dense"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={busy}
      />
      <Button
        fullWidth
        type="submit"
        variant="contained"
        size="small"
        sx={{ mt: 1 }}
        disabled={busy || !email.trim() || !password}
      >
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </Box>
  );
}
