"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Paper, Typography, Chip, Stack, CardMedia, Rating, Skeleton, Button  } from "@mui/material";
import { StyledFadeIn } from "@/components/Shared/FadeIn/StyledFadeIn";
import Park from "@mui/icons-material/Park";

interface IProductCard {
    name?: string;
    price?: number;
    rating?: number;
    reviews?: number;
    previousPrice?:number;
    isPromo?:boolean;
    id?: string;
}

export default function ProductCard({ name, price, rating, reviews, previousPrice, id }: IProductCard) {
    const router = useRouter();
    const [display, setDisplay] = useState<boolean>(false);
    const [isPromo, setIsPromo] = useState<boolean>(false);
    const [priceOptions, setPriceOptions] = useState<{ amount: string, price: number, stock: number; }[]>([{
        amount: '3.5g',
        price: 39.99,
        stock: 10,
    }, {
        amount: '7g',
        price: 79.99,
        stock: 1,
    }, {
        amount: '14g',
        price: 149.99,
        stock: 10,
    }, {
        amount: '28g',
        price: 249.99,
        stock: 10,
    }]);
    const [selectedPrice, setSelectedPrice] = useState<number>(priceOptions[0].price);
    const [selectedAmount, setSelectedAmount] = useState<string>(priceOptions[0].amount);

    

    const handleAmountClick = (amount: string, price: number) => {
        setSelectedAmount(amount);
        setSelectedPrice(price);
    }

    const handleViewFlower = (id: string) => {
        if(id) {
            router.push(`/products/${id}`);
        }
    }

  return (
    <Paper
    onMouseEnter={() => setDisplay(true)} 
    onMouseLeave={() => setDisplay(false)} 
    sx={{ borderRadius: 2, padding: 0}}>
        <Stack 
        direction="column" alignItems="center" spacing={1} sx={{ position: "relative"}}>
            <CardMedia
                component="img"
                src="/1.jpg"
                alt="product-image"
                sx={{ width: '100%', height: 150, cursor: "pointer", ...(display && { opacity: 0.9, backgroundColor: 'rgba(0,0,0,0.5)' }) }}
            />
            <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" fontWeight={600} fontSize={16}>Alpine Kush</Typography>
            <Stack sx={{ position: 'absolute', top: 0, left: 0 }}>
            <Chip icon={<Park />} clickable size="small" label="10% off" color="success" sx={{ border: '1px solid rgba(143, 239, 139, 0.97)', color: 'rgba(137, 232, 133, 0.97)' }} />
            </Stack>
            </Stack>
            {display && (
                <StyledFadeIn sx={{ zIndex: 1000, position: "absolute", top: 140, left: "auto", width: "200px", height: "auto", backgroundColor: "rgb(255, 255, 255)", borderRadius: 2, padding: 1 }} visible={display} delay={0.1} yAxis={10}>
                <Stack direction="row" spacing={2}>
                {priceOptions.map((option) => (
                    <Chip
                    key={option.amount}
                    color={selectedAmount === option.amount ? 'success' : 'default'}
                    variant={selectedAmount === option.amount ? 'filled' : 'outlined'} 
                    clickable size="small" 
                    label={option.amount} 
                    onClick={() => handleAmountClick(option.amount, option.price)} 
                    />
                ))}
           </Stack>
                </StyledFadeIn>
            )} 
        </Stack>
        <Stack direction="column" sx={{ padding: 2}}>
            
            <Stack direction="row" alignItems="center" spacing={1}>
            <Rating value={4.5} readOnly size="small" />
            <Typography color="text.secondary" style={{ cursor: "pointer" }} variant="body2" onClick={() => console.log("reviews")}>4.5 (100 reviews)</Typography>
            </Stack>
            
            <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontWeight: 600 }}>${selectedPrice}</Typography>
            <Typography color="text.secondary" variant="subtitle2" sx={{ fontWeight: 400, fontSize: 12 }}>(9 in stock)</Typography>
            </Stack>

            <Button
            onClick={() => {
                if(id) {
                    handleViewFlower(id);
                }
            }}
            style={{ borderRadius: '10px'}} 
            variant="contained" 
            color="success">View flower</Button>
        </Stack>
    </Paper>
  );
}