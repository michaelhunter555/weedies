"use client";

import { useState } from "react";

import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { APP_NAME } from "@/brand";
import { brandContainedButtonSx } from "@/theme/brand-palette";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "buying", label: "Buying on the marketplace" },
  { value: "selling", label: "Selling / payouts" },
  { value: "account", label: "Account & login" },
  { value: "report", label: "Report a listing or user" },
  { value: "other", label: "Other" },
] as const;

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<string>("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Not wired to backend yet — simulate success for UX preview.
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  if (submitted) {
    return (
      <Alert severity="success" sx={{ borderRadius: 2 }}>
        Thanks for reaching out. This form is not connected to email yet your
        message was not sent. We&apos;ll enable support delivery soon. For urgent
        issues, note your account email and sale ID in a follow-up once live.
      </Alert>
    );
  }

  return (
    <Paper
      component="form"
      variant="outlined"
      onSubmit={handleSubmit}
      sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}
    >
      <Stack spacing={2.5}>
        <Typography variant="body2" color="text.secondary">
          Send us a message about {APP_NAME}. Fields marked with * are required.
        </Typography>

        <TextField
          label="Name"
          required
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />

        <TextField
          label="Email"
          type="email"
          required
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <FormControl fullWidth>
          <InputLabel id="contact-topic-label">Topic</InputLabel>
          <Select
            labelId="contact-topic-label"
            label="Topic"
            value={topic}
            onChange={(e) => setTopic(String(e.target.value))}
          >
            {TOPICS.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Message"
          required
          fullWidth
          multiline
          minRows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Include your account email and listing ID if this is about a specific sale."
          inputProps={{ maxLength: 4000 }}
          helperText={`${message.length} / 4000`}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={submitting || !name.trim() || !email.trim() || !message.trim()}
          sx={{ ...brandContainedButtonSx, alignSelf: "flex-start", px: 3 }}
        >
          {submitting ? "Sending…" : "Send message"}
        </Button>

        <Typography variant="caption" color="text.secondary">
          Preview only: submissions are not delivered until we connect this form to
          support email or ticketing.
        </Typography>
      </Stack>
    </Paper>
  );
}
