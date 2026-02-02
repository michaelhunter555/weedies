"use client";
import { useState } from "react";

import { StyledStack } from "@/components/Shared/FadeIn/StyledFadeIn";
import StyledText from "@/components/Shared/Text/StyledText";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";

import { coreFeatures } from "./FeatureFields";

interface CoreFeatureCards {
  onClick: (imagePath: string) => void;
}
const FeaturedCards = ({ onClick }: CoreFeatureCards) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const handleClick = (path: string) => {
    onClick(path);
  };
  return (
    <StyledStack visible={true} delay={0.1} spacing={3}>
      {coreFeatures.map((feature, i) => (
        <Paper
          elevation={0}
          key={i}
          onClick={() => {
            handleClick(feature.path);
            setSelectedIndex(i);
          }}
          sx={{
            padding: 2,
            cursor: "pointer",
            borderRadius: 2,
            border:
              selectedIndex === i ? "1px solid #3eb9bd " : "1px solid #b1b1b1",
          }}
        >
          <StyledText variant="body1" sx={{ fontWeight: 700 }}>
            {feature.text}
          </StyledText>
          <Divider flexItem />
          <StyledText variant="subtitle2">{feature.description}</StyledText>
        </Paper>
      ))}
    </StyledStack>
  );
};

export default FeaturedCards;
