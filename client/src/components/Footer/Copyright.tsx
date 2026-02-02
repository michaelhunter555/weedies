import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function Copyright() {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography variant="body2" color="text.secondary" mt={1}>
        {"Copyright © "} Mihe.fitness {new Date().getFullYear()}
      </Typography>
    </Stack>
  );
}
