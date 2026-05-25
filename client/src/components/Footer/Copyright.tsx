import Link from "next/link";

import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { SITE_FOOTER_LINKS } from "@/content/site-footer-links";

export default function Copyright() {
  const year = new Date().getFullYear();

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      spacing={1}
      sx={{ width: "90%", flexWrap: "wrap", rowGap: 0.5 }}
    >
      <Typography variant="body2" color="text.secondary">
        © Dap & Flip {year} · dapandflip.com
      </Typography>

      <Stack
        direction="row"
        spacing={2}
        flexWrap="wrap"
        useFlexGap
        sx={{ gap: { xs: 1.5, sm: 2 } }}
      >
        {SITE_FOOTER_LINKS.map((item) => (
          <MuiLink
            key={item.href}
            component={Link}
            href={item.href}
            variant="body2"
            color="text.secondary"
            underline="hover"
            sx={{ fontWeight: 500, fontSize: "0.8125rem" }}
          >
            {item.label}
          </MuiLink>
        ))}
      </Stack>
    </Stack>
  );
}
