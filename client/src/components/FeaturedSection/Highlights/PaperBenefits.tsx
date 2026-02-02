import StyledText from "@/components/Shared/Text/StyledText";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import ExposureIcon from "@mui/icons-material/Exposure";
import HeightIcon from "@mui/icons-material/Height";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import TheatersIcon from "@mui/icons-material/Theaters";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";

import CoreFeaturePreview from "../CoreFeatures/CoreFeatureSelector";
import MiheCommercial from "../Video/MiheCommercial";

interface HighlightNotesProps {
  isMobile: boolean;
}

type HighlightProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
};
const highlights: HighlightProps[] = [
  {
    title: "Manage Intensity",
    description:
      "Increase intensity for a more vigorous workout or decrease it to idly cycle and focus on other tasks",
    icon: <ExposureIcon />,
  },
  {
    title: "Clip-in pedals",
    description:
      "lock-in during your experience with metal pedals that produce a strong grip with no-slip traction.",
    icon: <DirectionsBikeIcon />,
  },
  {
    title: "5-minutes a day",
    description:
      "Just by cycling on your bike for 5-10 minutes a day can improve your overall focus for the day.",
    icon: <MonitorHeartIcon />,
  },
  {
    title: "Easy Local Pickup",
    description: "Opt for store pickup after purchase to save even more",
    icon: <LocationOnIcon />,
  },
  {
    title: "Adjusts for Height/Weight",
    description:
      "The mihe fitness has a capacity of 300lbs with the ability to accomodate individuals from 5ft to 6ft 8in",
    icon: <HeightIcon />,
  },
  {
    title: "Satisfactory Guarantee",
    description:
      "If you're not happy, you can return the bike for minimal restocking fee.",
    icon: <ThumbUpIcon />,
  },
];

const HighlightNotes = ({ isMobile }: HighlightNotesProps) => {
  return (
    <Grid container spacing={3} direction={isMobile ? "column" : "row"}>
      {highlights.map(({ title, description, icon }, i) => (
        <Grid size={isMobile ? 12 : 4} key={`${title}-${i}`}>
          <Paper
            sx={{
              borderRadius: 5,
              padding: 2,
              gap: 2,
            }}
          >
            <StyledText variant="h6" align="center">
              {title}
            </StyledText>
            <StyledText variant="subtitle1" align="center">
              {icon}
            </StyledText>
            <Divider />
            <StyledText variant="subtitle2">{description}</StyledText>
          </Paper>
        </Grid>
      ))}
      <Divider flexItem sx={{ width: "100%", alignItems: "center" }}>
        <Stack id="feature" direction="row" alignItems="center" spacing={1}>
          <StyledText variant="subtitle2">Core Features</StyledText>
          <DirectionsBikeIcon />
        </Stack>
      </Divider>
      <Grid size={12}>
        <CoreFeaturePreview />
      </Grid>
      <Grid size={12}>
        <Divider sx={{ margin: "1rem auto" }}>
          <Stack spacing={1} alignItems="center" direction="row">
            <StyledText variant="subtitle2">Video</StyledText>
            <TheatersIcon />
          </Stack>
        </Divider>
        <MiheCommercial />
      </Grid>
    </Grid>
  );
};

export default HighlightNotes;
