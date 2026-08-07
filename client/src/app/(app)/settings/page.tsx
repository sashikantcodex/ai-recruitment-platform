"use client";

import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useAuthStore } from "@/store/AuthContext";

export default function SettingsPage() {
  const { user } = useAuthStore();

  if (!user) {
    return <Typography>Loading profile...</Typography>;
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 640 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Settings
      </Typography>
      <Stack spacing={1.5}>
        <Typography>
          <strong>Name:</strong> {user.name}
        </Typography>
        <Typography>
          <strong>Email:</strong> {user.email}
        </Typography>
        <Typography>
          <strong>Role:</strong> {user.role}
        </Typography>
        <Alert severity="info">
          Profile is loaded from `/auth/me`. Password/org settings can be added later.
        </Alert>
      </Stack>
    </Paper>
  );
}
