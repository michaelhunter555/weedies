"use client";
import { useEffect, useState } from "react";

import StyledText from "../Shared/Text/StyledText";

type CountDownTimerProps = {
  timeLeft: number;
};

const CountdownTimer = ({ timeLeft }: CountDownTimerProps) => {
  const [time, setTime] = useState(timeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [time]);

  const convertTime = (time: number) => {
    const hours = Math.floor(time / (60 * 60 * 1000));
    const minutes = Math.floor((time % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((time % (60 * 1000)) / 1000);

    const formatedHours = hours.toString().padStart(2, "0");
    const formatMinutes = minutes.toString().padStart(2, "0");
    const formatSeconds = seconds.toString().padStart(2, "0");
    return `${formatedHours}:${formatMinutes}:${formatSeconds}`;
  };

  return (
    <StyledText variant="subtitle2">
      {convertTime(time)} Get $20 off Ends Soon!
    </StyledText>
  );
};

export default CountdownTimer;
