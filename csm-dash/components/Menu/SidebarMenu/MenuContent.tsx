import React, { useState } from "react";

import Link from "next/link";

import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import HelpRoundedIcon from "@mui/icons-material/HelpRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";

const mainListItems = [
  { text: "Applications", icon: <HomeRoundedIcon />, link: "/" },
  {
    text: "Messages",
    icon: <AnalyticsRoundedIcon />,
    link: "/chats",
  },
  { text: "Disputes", icon: <AnalyticsRoundedIcon />, link: "/disputes" },
  { text: "Bookings", icon: <PeopleRoundedIcon />, link: "/bookings" },
  { text: "Users", icon: <AssignmentRoundedIcon />, link: "/users" },
];

const secondaryListItems = [
  { text: "Settings", icon: <SettingsRoundedIcon />, link: "/settings" },
  { text: "About", icon: <InfoRoundedIcon />, link: "/about" },
  { text: "Feedback", icon: <HelpRoundedIcon />, link: "/feedback" },
];

export default function MenuContent() {
  const [selected, setSelected] = useState<number | null>(0);
  const [secondSelect, setSecondSelect] = useState<number | null>(null);

  const handleSelected = (i: number) => {
    if (secondSelect !== null) {
      setSecondSelect(null);
    }
    setSelected(i);
  };

  const handleSecondSelect = (i: number) => {
    if (selected !== null) {
      setSelected(null);
    }
    setSecondSelect(i);
  };

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}>
      <List dense>
        {mainListItems.map((item, index) => (
          <Link
            key={index}
            href={item?.link ? item?.link : "#"}
            style={{ textDecoration: "none", color: "black" }}
          >
            <ListItem disablePadding sx={{ display: "block" }}>
              <ListItemButton
                onClick={() => handleSelected(index)}
                selected={selected === index}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          </Link>
        ))}
      </List>

      <List dense>
        {secondaryListItems.map((item, index) => (
          <ListItem key={index} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              onClick={() => handleSecondSelect(index)}
              selected={secondSelect === index}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
