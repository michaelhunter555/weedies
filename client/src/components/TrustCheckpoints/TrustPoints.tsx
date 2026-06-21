import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Stack, 
    Tooltip, 
    Divider, 
    styled, 
    tooltipClasses, 
    TooltipProps, 
    Collapse,
    Button } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';


const trustPoints = [
    { title: "Skip the 0 to 1 hustle. Start with something ready to go.", description: "Skip the 0 to 1 hustle. Start running this app in production." },
    { title: "Secure Exchange Flows", description: "Our secure exchange flow ensures that all sides are honest and protected." },
    { title: "100% Customer Focused Protection", description: "Your payment is protected and is only released after your confirmation of receiving all deliverables." },
    { title: "30-Day Money Back Guarantee", description: "If you're not satisfied with the app, you can get a full refund within 30 days." },
    { title: "Industry-Backed Standards", description: "You don't just get a functional app, you get an app that will protect your business and your customers." },
]

const TrustPoints = () => {
    const [expanded, setExpanded] = useState(false);

    const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: "#f7f7f7",
      color: "rgba(0, 0, 0, 0.87)",
      maxWidth: 220,
      fontSize: theme.typography.pxToRem(12),
      border: "1px solid #dadde9",
    },
  }));

  const handleExpand = () => {
    setExpanded((prev) => !prev);
  }
  return (
    <Box>
        <Stack direction="column" spacing={2} sx={{  }}>
            <Typography sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, textDecoration: 'underline dotted' }} variant="subtitle2" color="text.secondary" onClick={handleExpand}>Why Choose Dap & Flip?</Typography>
           
        <Collapse in={expanded}>
            {trustPoints.map((point) => (
                <HtmlTooltip title={point.description} key={point.title}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: 'pointer' }}>
                        <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                    <Typography style={{ fontSize: 12 }} variant="subtitle2">{point.title}</Typography>
                </Stack>
                </HtmlTooltip>
            ))}
            </Collapse>
        </Stack>
    </Box>
  )
}

export default TrustPoints