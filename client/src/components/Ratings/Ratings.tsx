"use client";
import { useContext, useState } from "react";

import { AuthContext } from "@/context/auth-context";
import Fade from "@mui/material/Fade";
import Rating from "@mui/material/Rating";

const ProductRatings = () => {
  const auth = useContext(AuthContext);
  const [rating, setRating] = useState(3.5);
  return (
    <Fade in={true} timeout={500}>
      <Rating readOnly={Boolean(auth?.isLoggedIn) ?? false} value={rating} />
    </Fade>
  );
};

export default ProductRatings;
