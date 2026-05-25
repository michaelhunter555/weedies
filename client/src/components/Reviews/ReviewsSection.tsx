import Avatar from "@mui/material/Avatar";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

type ReviewItem = {
  id: string;
  name: string;
  handle: string;
  rating: number;
  purchaseDate: string;
  productImage: string;
  appTitle: string;
  tier: string;
  title: string;
  body: string;
};

const dummyReviews: ReviewItem[] = [
  {
    id: "r1",
    name: "Jordan P.",
    handle: "@jordanp",
    rating: 5,
    purchaseDate: "Apr 18, 2026",
    productImage: "/5.jpg",
    appTitle: "PromptForge",
    tier: "Pro",
    title: "Replaced 3 of my prompt tools",
    body:
      "The A/B test view is chef's kiss. I shipped a new copy variant to prod in about 20 minutes. Wild that this was vibecoded.",
  },
  {
    id: "r2",
    name: "Sam R.",
    handle: "@samr",
    rating: 4,
    purchaseDate: "Mar 02, 2026",
    productImage: "/3.jpg",
    appTitle: "Focuspace",
    tier: "Free",
    title: "My best focus app in years",
    body:
      "Ambient rooms are super clean. I'd pay for a Pro tier the moment there's team rooms - take my money.",
  },
  {
    id: "r3",
    name: "Avery K.",
    handle: "@averyk",
    rating: 5,
    purchaseDate: "Feb 11, 2026",
    productImage: "/9.jpg",
    appTitle: "ShipKit",
    tier: "Lifetime",
    title: "Paid for itself in a weekend",
    body:
      "Saved me probably 30 hours of plumbing. Auth, billing, DB - all wired up. Now I just build the fun part.",
  },
];

export default function ReviewsSection() {
  return (
    <Stack spacing={2}>
      <Stack>
        <Typography variant="h4" fontWeight={800}>
          Loved by builders & buyers
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Real reviews from people running these apps in production.
        </Typography>
      </Stack>

      <Stack spacing={2}>
        {dummyReviews.map((r, idx) => (
          <Paper key={r.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: "secondary.main",
                    width: 36,
                    height: 36,
                  }}
                >
                  {r.name.slice(0, 1)}
                </Avatar>
                <Stack sx={{ flex: 1 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={700}>{r.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.handle}
                      </Typography>
                      <Chip
                        size="small"
                        color="success"
                        variant="outlined"
                        icon={<VerifiedRoundedIcon sx={{ fontSize: 14 }} />}
                        label="Verified buyer"
                        sx={{ fontSize: 11 }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Purchased: {r.purchaseDate}
                    </Typography>
                  </Stack>
                  <Rating value={r.rating} readOnly size="small" />
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <CardMedia
                  component="img"
                  src={r.productImage}
                  alt="reviewed-app"
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    objectFit: "cover",
                    border: "1px solid #eee",
                  }}
                />
                <Stack>
                  <Typography variant="body2" color="text.secondary">
                    App: <b>{r.appTitle}</b> · <i>{r.tier}</i> license
                  </Typography>
                  <Typography fontWeight={700}>{r.title}</Typography>
                  <Typography color="text.secondary">{r.body}</Typography>
                </Stack>
              </Stack>
            </Stack>
            {idx !== dummyReviews.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}
