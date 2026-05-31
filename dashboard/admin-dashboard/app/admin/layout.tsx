"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import ViewListIcon from "@mui/icons-material/ViewList";
import GavelIcon from "@mui/icons-material/Gavel";
import { AdminAuthProvider } from "@/context/admin-auth-context";
import { SidebarAuthFooter } from "@/components/admin/SidebarAuthFooter";

const DRAWER_WIDTH = 260;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";

  return (
    <AdminAuthProvider>
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              borderRight: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            },
          }}
        >
          <Box sx={{ px: 2.5, py: 2.5 }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
              Marketplace
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Admin
            </Typography>
          </Box>

          <List dense sx={{ px: 1 }}>
            <ListItemButton
              component={Link}
              href="/admin/listings"
              selected={pathname.startsWith("/admin/listings")}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <ViewListIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Listings" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItemButton>
            <ListItemButton
              component={Link}
              href="/admin/disputes"
              selected={pathname.startsWith("/admin/disputes")}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <GavelIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Disputes" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItemButton>
          </List>

          <Box sx={{ flex: 1, minHeight: 0 }} />

          <SidebarAuthFooter />
        </Drawer>

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
          }}
        >
          <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: "auto" }}>{children}</Box>
        </Box>
      </Box>
    </AdminAuthProvider>
  );
}
