import Box from "@mui/material/Box";

const MiheCommercial = () => {
  return (
    <Box id="video">
      <iframe
        width="100%"
        height="500"
        src="https://www.youtube.com/embed/h1p4lDAftEE?si=HMhnjci_L6s-dU9h"
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
    </Box>
  );
};

export default MiheCommercial;
