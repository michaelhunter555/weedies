import Avatar from "@mui/material/Avatar";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type ReviewItem = {
  id: string;
  name: string;
  rating: number;
  orderDate: string;
  productImage: string;
  productTitle: string;
  title: string;
  body: string;
};

const dummyReviews: ReviewItem[] = [
  {
    id: "r1",
    name: "Jordan P.",
    rating: 5,
    orderDate: "Jan 18, 2026",
    productImage: "/1.jpg",
    productTitle: "Alpine Kush (3.5g)",
    title: "Fast pickup + great quality",
    body: "Placed my order and pickup was smooth. Packaging was discreet and the product was fresh.",
  },
  {
    id: "r2",
    name: "Sam R.",
    rating: 4,
    orderDate: "Dec 02, 2025",
    productImage: "/1.jpg",
    productTitle: "Alpine Kush (7g)",
    title: "Solid selection",
    body: "Good variety and the staff answered my questions. Would love more edible options, but overall great.",
  },
  {
    id: "r3",
    name: "Avery K.",
    rating: 5,
    orderDate: "Nov 11, 2025",
    productImage: "/1.jpg",
    productTitle: "Alpine Kush (14g)",
    title: "Exactly what I wanted",
    body: "Clean experience, easy checkout, and the product matched the description. Will order again.",
  },
];

export default function ReviewsSection() {
  return (
    <Stack spacing={2}>
      <Stack>
        <Typography variant="h4" fontWeight={800}>
          Trust, Respect & Transparency
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Real feedback from customers.
        </Typography>
      </Stack>

      <Stack spacing={2}>
        {dummyReviews.map((r, idx) => (
          <Paper key={r.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: "success.main", width: 36, height: 36 }}>
                  {r.name.slice(0, 1)}
                </Avatar>
                <Stack sx={{ flex: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={700}>{r.name}</Typography>
                      <Chip
                        size="small"
                        color="success"
                        variant="outlined"
                        label="Verified"
                        sx={{ fontSize: 12 }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Order date: {r.orderDate}
                    </Typography>
                  </Stack>
                  <Rating value={r.rating} readOnly size="small" />
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <CardMedia
                  component="img"
                  src={r.productImage}
                  alt="reviewed-product"
                  sx={{ width: 64, height: 64, borderRadius: 2, objectFit: "cover", border: "1px solid #eee" }}
                />
                <Stack>
                  <Typography variant="body2" color="text.secondary">
                    Ordered: <b>{r.productTitle}</b>
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


