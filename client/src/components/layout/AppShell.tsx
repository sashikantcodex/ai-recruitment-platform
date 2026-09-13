"use client";

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventIcon from "@mui/icons-material/Event";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PeopleIcon from "@mui/icons-material/People";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import QuizIcon from "@mui/icons-material/Quiz";
import RateReviewIcon from "@mui/icons-material/RateReview";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import DescriptionIcon from "@mui/icons-material/Description";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SettingsIcon from "@mui/icons-material/Settings";
import WorkIcon from "@mui/icons-material/Work";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuthStore } from "@/store/AuthContext";

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/jobs", label: "Jobs", icon: <WorkIcon /> },
  { href: "/sourcing", label: "Sourcing", icon: <TravelExploreIcon /> },
  { href: "/candidates", label: "Candidates", icon: <PersonSearchIcon /> },
  { href: "/applications", label: "Applications", icon: <PeopleIcon /> },
  { href: "/assessments", label: "Assessments", icon: <QuizIcon /> },
  { href: "/interviews", label: "Interviews", icon: <EventIcon /> },
  { href: "/evaluations", label: "Evaluations", icon: <RateReviewIcon /> },
  { href: "/offers", label: "Offers", icon: <DescriptionIcon /> },
  { href: "/onboarding", label: "Onboarding", icon: <RocketLaunchIcon /> },
  { href: "/knowledge", label: "Knowledge", icon: <MenuBookIcon /> },
  { href: "/agents", label: "Agents", icon: <AutoAwesomeIcon /> },
  { href: "/settings", label: "Settings", icon: <SettingsIcon /> },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const { user, isLoading } = useAuthGuard();

  if (isLoading || !user) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ATS AI Platform
          </Typography>
          <Typography variant="body2">
            {user.name} · {user.role}
          </Typography>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        <List>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: "background.default" }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
