"use client";

import { Divider, Grid2, Paper, Stack, Typography, Slider, Chip, Button, Box } from "@mui/material";
import ProductCard from "../Products/ProductCard";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface IProductCollection {
    collectionName: string;
    category?: string;
}

const filters = [
    { label: "Indica", value: "indica" },
    { label: "Sativa", value: "sativa" },
    { label: "Hybrid", value: "hybrid" },
    { label: "Lowest Price", value: "lowest-price" },
    { label: "Highest Price", value: "highest-price" },
]
const Collection = ({ collectionName, category }: IProductCollection) => {
    return (
        <Stack sx={{ marginTop: 2 }}>
            <Grid2 container spacing={2} direction="column">
               
                        <Typography component="h2" variant="h4">{collectionName}</Typography>
                <Grid2 container direction="row" justifyContent="center" spacing={2} size={12}>
                    
            {Array.from({ length: 10 }).map((_, index) => (
                <ProductCard key={index} id={`product-${index}`} />
            ))}
                   
                </Grid2>
            </Grid2>
        </Stack>
    );
};

export default Collection;