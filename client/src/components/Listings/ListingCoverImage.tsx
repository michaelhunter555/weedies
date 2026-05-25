"use client";

import { useEffect, useState } from "react";
import { CardMedia, type CardMediaProps } from "@mui/material";

import {
  PLACEHOLDER_APP_COVER,
  resolveListingCoverUrl,
} from "@/utils/listing-cover";

type ListingWithPhotos = {
  photos?: string[];
  coverIndex?: number;
};

type Props = {
  listing?: ListingWithPhotos | null;
  alt: string;
  sx?: CardMediaProps<"img">["sx"];
};

export function ListingCoverImage({ listing, alt, sx }: Props) {
  const [src, setSrc] = useState(PLACEHOLDER_APP_COVER);

  useEffect(() => {
    setSrc(resolveListingCoverUrl(listing));
  }, [listing]);

  return (
    <CardMedia
      component="img"
      src={src}
      alt={alt}
      onError={() => {
        if (src !== PLACEHOLDER_APP_COVER) {
          setSrc(PLACEHOLDER_APP_COVER);
        }
      }}
      sx={sx}
    />
  );
}
