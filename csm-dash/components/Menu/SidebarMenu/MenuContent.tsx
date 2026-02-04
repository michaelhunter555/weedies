import React from "react";

import Link from "next/link";
import { useRouter } from "next/router";

import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";

const navItems = [
  { text: "Analytics", icon: <InsightsRoundedIcon />, link: "/analytics" },
  { text: "Products", icon: <Inventory2RoundedIcon />, link: "/products" },
  { text: "Orders", icon: <ReceiptLongRoundedIcon />, link: "/orders" },
  { text: "Customers", icon: <PeopleRoundedIcon />, link: "/customers" },
  { text: "Messages", icon: <ChatRoundedIcon />, link: "/messages" },
  { text: "Issues", icon: <ReportProblemRoundedIcon />, link: "/issues" },
] as const;

export default function MenuContent() {
  const router = useRouter();
  const current = router.asPath || router.pathname;

  const isActive = (href: string) => {
    if (href === "/") return current === "/";
    return current === href || current.startsWith(`${href}/`);
  };

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}>
      <List dense>
        {navItems.map((item) => (
          <ListItem key={item.link} disablePadding sx={{ display: "block" }}>
            <Link href={item.link} passHref legacyBehavior>
              <ListItemButton component="a" selected={isActive(item.link)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </Link>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
