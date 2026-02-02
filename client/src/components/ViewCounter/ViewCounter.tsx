"use client";

import React, { useEffect, useState } from "react";

import Typography from "@mui/material/Typography";

const ViewCounter = () => {
  const [viewers, setViewers] = useState<number>(
    Math.floor(Math.random() * 10) + 1
  );

  useEffect(() => {
    const updateViewers = () => {
      setViewers((prev) => {
        const randomChange = Math.floor(Math.random() * 5) - 2;
        const newViewers = prev + randomChange;
        return Math.max(newViewers, 1);
      });
    };
    const interval = setInterval(() => {
      updateViewers();
    }, Math.floor(Math.random() * 3000) + 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Typography color="text.secondary" variant="subtitle2">
      {viewers} {viewers > 1 ? "people are" : "person is"} viewing this item.
    </Typography>
  );
};

export default ViewCounter;
