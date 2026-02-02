import { keyframes } from "@mui/material";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";
import TableRow from "@mui/material/TableRow";

/**
 * Fade in componets for Grid, Stack and TableRows
 * @param visible - boolean to determine when children will fade in
 * @param delay - milliseconds to delay the children
 * @param yAxis - y-axis position to appear from
 */

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

interface FadeInProps {
  visible: boolean;
  delay?: number;
  yAxis?: number;
}

export const StyledFadeIn = styled("div", {
  shouldForwardProp: (prop) =>
    prop !== "visible" && prop !== "delay" && prop !== "yAxis",
})<FadeInProps>(({ visible, delay, yAxis }) => ({
  opacity: 0,
  transform: `translateY(${yAxis ? `${yAxis}px` : "20px"})`,
  transition: `opacity 0.5s ease-in-out ${delay}s, transform 0.5s ease-in-out ${delay}s`,
  ...(visible && {
    animation: `${fadeIn} 0.5s ${delay}s forwards`,
  }),
}));

export const StyledTableRowFadeIn = styled(TableRow, {
  shouldForwardProp: (prop) =>
    prop !== "visible" && prop !== "delay" && prop !== "yAxis",
})<FadeInProps>(({ visible, delay, yAxis }) => ({
  opacity: 0,
  transform: `translateY(${yAxis ? `${yAxis}px` : "5px"})`,
  transition: `opacity 0.5s ease-in-out ${delay}s, transform 0.5s ease-in-out ${delay}s`,
  ...(visible && {
    animation: `${fadeIn} 0.5s ${delay}s forwards`,
  }),
}));

export const StyledStack = styled(Stack, {
  shouldForwardProp: (prop) =>
    prop !== "visible" && prop !== "delay" && prop !== "yAxis",
})<FadeInProps>(({ visible, delay, yAxis }) => ({
  opacity: 0,
  transform: `translateY(${yAxis ? `${yAxis}px` : "20px"})`,
  transition: `opacity 0.5s ease-in-out ${delay}s, transform 0.5s ease-in-out ${delay}s`,
  ...(visible && {
    animation: `${fadeIn} 0.5s ${delay}s forwards`,
  }),
}));

export const StyledGrid = styled(Grid, {
  shouldForwardProp: (prop) =>
    prop !== "visible" && prop !== "delay" && prop !== "yAxis",
})<FadeInProps>(({ visible, delay, yAxis }) => ({
  opacity: 0,
  transform: `translateY(${yAxis ? `${yAxis}px` : "20px"})`,
  transition: `opacity 0.5s ease-in-out ${delay}s, transform 0.5s ease-in-out ${delay}s`,
  ...(visible && {
    animation: `${fadeIn} 0.5s ${delay}s forwards`,
  }),
}));
