import { useState } from "react";

import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";

import { StyledFadeIn } from "../Shared/FadeIn/StyledFadeIn";

interface ImageListProps {
  onImageClick: (path: string) => void;
}

const ImageList = ({ onImageClick }: ImageListProps) => {
  const [selected, setSelected] = useState<number>(1);

  const handleImageSelection = (index: number) => {
    setSelected(index);
    onImageClick(`${index === 0 ? 1 : index}.jpg`);
  };

  return Array.from({ length: 14 })
    .map((_, i) => (
      <StyledFadeIn key={i} visible={true} delay={i * 0.1} yAxis={10}>
        <Card
          onClick={() => handleImageSelection(i)}
          sx={{
            border:
              i === selected ? "2px solid #b1b1b1" : "2px solid transparent",
            cursor: "pointer",
          }}
        >
          <CardMedia
            component="img"
            src={`/${i === 0 ? 1 : i}.jpg`}
            alt={`mihe_image_${i}`}
            sx={{ height: "100%", width: "100%", objectFit: "contain" }}
          />
        </Card>
      </StyledFadeIn>
    ))
    .slice(1);
};

export default ImageList;
