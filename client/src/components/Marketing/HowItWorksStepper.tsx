"use client";

import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { BRAND_PALETTE } from "@/theme/brand-palette";

export const HOW_IT_WORKS_STEPS = [
  {
    image: "/your_apps.png",
    caption: "You list apps that you've built and are ready to sell.",
  },
  {
    image: "/homepage_pack/1.png",
    caption: "Connect with users interested in buying your app in the U.S and Canada.",
  },
  {
    image: "/homepage_pack/3.png",
    caption: "We provide the platform and security to guarantee a safe & secure exchange.",
  },
] as const;

type HowItWorksStepperProps = {
  title?: string;
  sx?: object;
};

export function HowItWorksStepper({
  title = "How it works",
  sx,
}: HowItWorksStepperProps) {
  return (
    <Stack spacing={2} sx={sx}>
      <Typography
        variant="h5"
        fontWeight={800}
        textAlign="center"
        sx={{ color: BRAND_PALETTE.charcoal }}
      >
        {title}
      </Typography>

      <Grid container spacing={{ xs: 0, md: 2 }} justifyContent="center">
        {HOW_IT_WORKS_STEPS.map((card, index) => {
          const step = index + 1;
          const isFirst = index === 0;
          const isLast = index === HOW_IT_WORKS_STEPS.length - 1;

          return (
            <Grid key={card.image} size={{ xs: 12, md: 4 }}>
              <Stack
                direction={{ xs: "row", md: "column" }}
                alignItems={{ xs: "flex-start", md: "center" }}
                sx={{ height: "100%" }}
              >
                <Stack
                  alignItems="center"
                  sx={{
                    display: { xs: "flex", md: "none" },
                    width: 40,
                    flexShrink: 0,
                    alignSelf: "stretch",
                    pt: 0.5,
                  }}
                >
                  {!isFirst ? (
                    <Box
                      sx={{
                        width: 2,
                        flex: 1,
                        minHeight: 16,
                        bgcolor: BRAND_PALETTE.sage,
                        borderRadius: 1,
                      }}
                    />
                  ) : null}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      flexShrink: 0,
                      bgcolor: BRAND_PALETTE.charcoal,
                      color: BRAND_PALETTE.onPrimary,
                      border: `2px solid ${BRAND_PALETTE.seafoam}`,
                    }}
                  >
                    {step}
                  </Box>
                  {!isLast ? (
                    <Box
                      sx={{
                        width: 2,
                        flex: 1,
                        minHeight: 24,
                        bgcolor: BRAND_PALETTE.sage,
                        borderRadius: 1,
                      }}
                    />
                  ) : null}
                </Stack>

                <Stack sx={{ flex: 1, width: "100%", minWidth: 0 }} spacing={1.5}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    sx={{
                      display: { xs: "none", md: "flex" },
                      width: "100%",
                      px: 1,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: isFirst ? "transparent" : BRAND_PALETTE.sage,
                        borderRadius: 1,
                      }}
                    />
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        mx: 1,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "1rem",
                        flexShrink: 0,
                        bgcolor: BRAND_PALETTE.charcoal,
                        color: BRAND_PALETTE.onPrimary,
                        border: `2px solid ${BRAND_PALETTE.seafoam}`,
                      }}
                    >
                      {step}
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        bgcolor: isLast ? "transparent" : BRAND_PALETTE.sage,
                        borderRadius: 1,
                      }}
                    />
                  </Stack>

                  <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                      borderRadius: 1,
                      borderColor: BRAND_PALETTE.sage,
                      bgcolor: "background.paper",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      p: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: "100%",
                        maxWidth: 220,
                        aspectRatio: "1",
                        mx: "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: BRAND_PALETTE.mint,
                        borderRadius: 1,
                        border: `1px solid ${BRAND_PALETTE.sage}`,
                      }}
                    >
                      <Box
                        component="img"
                        src={card.image}
                        alt={`Step ${step}`}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                      sx={{ mt: 1.5, fontWeight: 600, lineHeight: 1.5 }}
                    >
                      {card.caption}
                    </Typography>
                  </Paper>
                </Stack>
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
