"use client";

import React, { useContext, useState } from "react";

import { scrollToSection } from "@/utils/sectionScroll";
import MenuIcon from "@mui/icons-material/Menu";
import { Chip, ListItemIcon } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import useTheme from "@mui/material/styles/useTheme";
import useMediaQuery from "@mui/material/useMediaQuery";

import { AuthContext } from "../../context/auth-context";
import { StyledBox, StyledContainer } from "./HeaderStyles";
import { MainMenuItems } from "./menuItems";

const logoStyle = {
  width: "250px",
  height: "auto",
  cursor: "pointer",
};

type OpenMenuProps = {
  onMobileMenuClick: () => void;
};

const Header = () => {
  const auth = useContext(AuthContext);
  const [openDrawer, setOpenDrawer] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // const handleLogout = () => {
  //   auth.logout();
  // };

  const handleOpenMenu = () => {
    setOpenDrawer((prev) => !prev);
  };

  const handleScrollToSection = (id: string) => {
    scrollToSection(id);
    setOpenDrawer(false);
  };

  return (
    <StyledContainer isMobile={isMobile}>
      {isMobile && (
        <IconButton onClick={handleOpenMenu}>
          <MenuIcon />
        </IconButton>
      )}
      <StyledBox>
        {!isMobile && (
          <List sx={{ display: "flex", alignItems: "center" }}>
            {MainMenuItems?.filter((menu) => {
              if (auth.isLoggedIn) {
                return menu.text !== "Login";
              } else {
                return menu.text !== "Logout";
              }
            }).map((menu, i) => (
              <MenuItem
                key={`${menu.component}--${i}`}
                onClick={() => handleScrollToSection(menu?.route as string)}
                sx={{ "&:hover": { backgroundColor: "#fff" } }}
              >
                <ListItem>
                  <ListItemText
                    primary={menu.text}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        color: "#b1b1b1",
                      },
                      fontSize: 14,
                    }}
                  />
                  {menu.icon && <ListItemIcon>{menu.icon}</ListItemIcon>}
                </ListItem>
              </MenuItem>
            ))}
            <Chip
              clickable
              label="Contact us"
              color="primary"
              onClick={() => {
                window.location.href = "tel:410-866-1063";
              }}
            />
          </List>
        )}

        {isMobile && (
          <Drawer open={openDrawer} onClose={handleOpenMenu}>
            <List
              sx={{
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              {MainMenuItems?.filter((menu) => {
                if (auth.isLoggedIn) {
                  return menu.text !== "Login";
                } else {
                  return menu.text !== "Logout";
                }
              }).map((menu, i) => (
                <MenuItem
                  key={menu?.text}
                  onClick={() => handleScrollToSection(menu?.route as string)}
                >
                  <ListItem>
                    <ListItemText
                      primary={menu.text}
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          color: "#b1b1b1",
                        },
                        fontSize: 12,
                      }}
                    />
                    {menu.icon && <ListItemIcon>{menu.icon}</ListItemIcon>}
                  </ListItem>
                </MenuItem>
              ))}
              <Chip
                clickable
                label="Contact us"
                color="primary"
                onClick={() => {
                  window.location.href = "tel:410-866-1063";
                }}
              />
            </List>
          </Drawer>
        )}
      </StyledBox>
    </StyledContainer>
  );
};

export default Header;
