"use client";

import React, { useEffect, useState } from "react";

import Typography from "@mui/material/Typography";

const ViewCounter = () => {
  // IMPORTANT: avoid hydration mismatch by rendering a deterministic value on first render
  // and only randomizing after the component mounts in the browser.
  const [viewers, setViewers] = useState<number>(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setViewers(Math.floor(Math.random() * 10) + 1);

    const updateViewers = () => {
      setViewers((prev) => {
        const randomChange = Math.floor(Math.random() * 5) - 2;
        const newViewers = prev + randomChange;
        return Math.max(newViewers, 1);
      });
    };
    const interval = setInterval(updateViewers, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Typography color="text.secondary" variant="subtitle2">
      {mounted ? viewers : "—"} {mounted && viewers > 1 ? "people are" : "person is"} viewing this item.
    </Typography>
  );
};

export default ViewCounter;
