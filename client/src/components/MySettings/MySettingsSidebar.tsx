"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";

import {
  BRAND_PALETTE,
  brandNavIconActiveColor,
  brandSelectedNavSx,
} from "@/theme/brand-palette";

export type MySettingsSidebarProps = {
  userId: string;
  /** When `customer`, seller-only shortcuts stay out of the nav. */
  mode?: "customer" | "seller";
};

function pathMatchesOverview(pathname: string, base: string) {
  return pathname === base || pathname === `${base}/`;
}

function pathMatchesHref(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MySettingsSidebar({ userId, mode }: MySettingsSidebarProps) {
  const pathname = usePathname() || "";
  const base = `/my-settings/${encodeURIComponent(userId)}`;
  const showSelling = mode !== "customer";

  const items: Array<{
    key: string;
    href: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    hidden?: boolean;
    isActive: (p: string) => boolean;
  }> = [
    {
      key: "overview",
      href: base,
      label: "Overview",
      description: "Stats, payouts, and shortcuts",
      icon: <HomeRoundedIcon fontSize="small" />,
      isActive: (p) => pathMatchesOverview(p, base),
    },
    {
      key: "messages",
      href: "/messages",
      label: "Messages",
      description: "Inbox & listing conversations",
      icon: <ChatRoundedIcon fontSize="small" />,
      isActive: (p) => pathMatchesHref(p, "/messages"),
    },
    {
      key: "bids",
      href: `${base}/bids`,
      label: "My bids",
      description: "Auctions you have joined",
      icon: <GavelRoundedIcon fontSize="small" />,
      isActive: (p) => pathMatchesHref(p, `${base}/bids`),
    },
    // {
    //   key: "listings",
    //   href: `${base}#my-listings`,
    //   label: "My listings",
    //   description: "Selling on the marketplace",
    //   icon: <StorefrontRoundedIcon fontSize="small" />,
    //   hidden: !showSelling,
    //   isActive: () => false,
    // },
    {
      key: "wallet",
      href: `${base}/wallet`,
      label: "Wallet",
      description: "Cards & billing",
      icon: <CreditCardRoundedIcon fontSize="small" />,
      isActive: (p) => pathMatchesHref(p, `${base}/wallet`),
    },
    {
      key: "orders",
      href: `${base}/order-history`,
      label: "Orders",
      description: "Purchases & receipts",
      icon: <ReceiptLongRoundedIcon fontSize="small" />,
      isActive: (p) => pathMatchesHref(p, `${base}/order-history`),
    },
    // {
    //   key: "shipping",
    //   href: `${base}/shipping-info`,
    //   label: "Shipping",
    //   description: "Delivery details",
    //   icon: <LocalShippingRoundedIcon fontSize="small" />,
    //   isActive: (p) => pathMatchesHref(p, `${base}/shipping-info`),
    // },
  ];

  return (
    <Paper
      variant="outlined"
      sx={{
        width: { xs: "100%", md: 240 },
        flexShrink: 0,
        borderRadius: 3,
        borderColor: BRAND_PALETTE.borderSubtle,
        overflow: "hidden",
        position: { md: "sticky" },
        top: { md: 24 },
        alignSelf: "flex-start",
      }}
    >
      <Box sx={{ px: 2, py: 1.75, borderBottom: `1px solid ${BRAND_PALETTE.borderSubtle}` }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.02 }}>
          Account
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Dashboard sections
        </Typography>
      </Box>
      <List dense disablePadding sx={{ py: 0.5 }}>
        {items
          .filter((i) => !i.hidden)
          .map((item, idx, arr) => {
            const active = item.isActive(pathname);
            const showDivider = idx < arr.length - 1;
            return (
              <Box key={item.key}>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  selected={active}
                  sx={{
                    py: 1.25,
                    borderRadius: 0,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: active ? brandNavIconActiveColor : "text.secondary",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    secondary={item.description}
                    primaryTypographyProps={{
                      variant: "body2",
                      sx: { fontWeight: active ? 800 : 600, lineHeight: 1.2 },
                    }}
                    secondaryTypographyProps={{
                      variant: "caption",
                      sx: { lineHeight: 1.25 },
                    }}
                  />
                </ListItemButton>
                {showDivider ? <Divider component="li" sx={{ mx: 1 }} /> : null}
              </Box>
            );
          })}
      </List>
    </Paper>
  );
}
