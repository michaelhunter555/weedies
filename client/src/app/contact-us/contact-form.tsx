"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { useForm } from "@/hooks/useForm";
import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import { APP_NAME } from "@/brand";
import { brandContainedButtonSx } from "@/theme/brand-palette";

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

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "buying", label: "Buying on the marketplace" },
  { value: "selling", label: "Selling / payouts" },
  { value: "account", label: "Account & login" },
  { value: "report", label: "Report a listing or user" },
  { value: "other", label: "Other" },
] as const;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export type ContactFormProps = {
  defaultName: string;
  defaultEmail: string;
  onSubmitted: () => void;
};

export function ContactForm({ defaultName, defaultEmail, onSubmitted }: ContactFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formState, inputHandler] = useForm(
    {
      name: { value: defaultName, isValid: defaultName.trim().length >= 2 },
      email: { value: defaultEmail, isValid: isValidEmail(defaultEmail) },
      topic: { value: "general", isValid: true },
      message: { value: "", isValid: false },
    },
    false,
  );

  const { name, email, topic, message } = formState.inputs;
  const { apiFetch } = useApiFetchOrThrow();

  const sendContactMutation = useMutation({
    mutationKey: ["contact-us"],
    mutationFn: async () => {
      return await apiFetch<{ ok?: boolean; message?: string }>("/user/contact-us", "POST", {
        name: String(name.value).trim(),
        topic: String(topic.value),
        message: String(message.value).trim(),
      });
    },
    onSuccess: () => {
      setSubmitError(null);
      setSubmitted(true);
      onSubmitted();
    },
    onError: (error) => {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to send contact message.",
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!formState.isValid) return;
    await sendContactMutation.mutateAsync();
  };

  const messageLen = String(message.value).trim().length;

  if (submitted) {
    return (
      <Alert severity="success" sx={{ borderRadius: 2 }}>
        Thanks for reaching out. Your message was sent to our support team. We will reply to{" "}
        <b>{defaultEmail || "your account email"}</b> when we can.
      </Alert>
    );
  }

  return (
    <Paper
      component="form"
      variant="outlined"
      onSubmit={(e) => void handleSubmit(e)}
      sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}
    >
      <Stack spacing={2.5}>
        <Typography variant="body2" color="text.secondary">
          Send us a message about {APP_NAME}. We reply to the email on your account.
        </Typography>

        {submitError ? (
          <Alert severity="error" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        ) : null}

        <TextField
          label="Name"
          required
          fullWidth
          value={String(name.value)}
          onChange={(e) =>
            inputHandler("name", e.target.value, e.target.value.trim().length >= 2)
          }
          autoComplete="name"
        />

        <TextField
          label="Email"
          type="email"
          required
          fullWidth
          value={String(email.value)}
          disabled
          helperText="From your account — we reply here"
          autoComplete="email"
        />

        <FormControl fullWidth>
          <InputLabel id="contact-topic-label">Topic</InputLabel>
          <Select
            labelId="contact-topic-label"
            label="Topic"
            value={String(topic.value)}
            onChange={(e) => inputHandler("topic", String(e.target.value), true)}
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
          value={String(message.value)}
          onChange={(e) =>
            inputHandler(
              "message",
              e.target.value,
              e.target.value.trim().length >= 10,
            )
          }
          placeholder="Include your listing ID or order details if this is about a specific sale."
          inputProps={{ maxLength: 4000 }}
          helperText={`${messageLen} / 4000 (minimum 10 characters)`}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={sendContactMutation.isPending || !formState.isValid}
          sx={{ ...brandContainedButtonSx, alignSelf: "flex-start", px: 3 }}
        >
          {sendContactMutation.isPending ? "Sending…" : "Send message"}
        </Button>
      </Stack>
    </Paper>
  );
}
