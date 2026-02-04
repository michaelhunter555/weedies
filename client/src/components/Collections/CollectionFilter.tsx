import { Box, Slider, Divider, Typography, Chip, Grid2, Stack, Paper, Button } from "@mui/material";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const filters = [
    { label: "Indica", value: "indica" },
    { label: "Sativa", value: "sativa" },
    { label: "Hybrid", value: "hybrid" },
    { label: "Lowest Price", value: "lowest-price" },
    { label: "Highest Price", value: "highest-price" },
]

export default function CollectionFilter() {
    return (
        <Grid2 size={11}>
        <Paper sx={{ padding: 2, borderRadius: 5 }}>
            <Typography variant="subtitle2">Filter by price</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
                {/* slider for price */}
                <Box sx={{ width: "40%" }}>
            <Slider defaultValue={50} aria-label="Default" valueLabelDisplay="auto" />
                </Box>
            <Divider orientation="vertical" flexItem sx={{ margin: "0 10px" }} />
            {/* chip filters */}
            <Stack direction="row" spacing={1} sx={{ width: "40%", flexWrap: "wrap" }}>
            {filters.map((filter) => (
                <Chip size="small" clickable component="button" key={filter.value} label={filter.label} />
            ))}
            </Stack>
            {/* clear filters button */}
            <Button endIcon={<ArrowForwardIcon />} color="success">
            Search
            </Button>
            </Stack>
        </Paper>

    </Grid2>            
    )
}