"use client";

import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { registerRequest } from "@/services/auth.service";
import {
  PUBLIC_REGISTER_ROLES,
  type PublicRegisterRole,
} from "@/types";

/** Public self-registration form with role selection (excludes Super Admin). */
export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<PublicRegisterRole>("Recruiter");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await registerRequest({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      // After register, send user to login with a success hint in query.
      router.replace("/login?registered=1");
    } catch (err) {
      if (isAxiosError(err)) {
        setError(
          (err.response?.data as { message?: string } | undefined)?.message ??
            "Registration failed. Check your details and try again.",
        );
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        py: 4,
        background: "linear-gradient(160deg, #e8f5e9 0%, #f4f6f8 45%, #ffffff 100%)",
      }}
    >
      <Paper elevation={3} sx={{ width: "100%", maxWidth: 460, p: 4 }}>
        <Stack spacing={2.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "grid",
              placeItems: "center",
            }}
          >
            <PersonAddAltIcon />
          </Box>

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h5">Create account</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Register with a role to access the ATS AI Platform
            </Typography>
          </Box>

          {error ? (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          ) : null}

          <Box component="form" onSubmit={onSubmit} sx={{ width: "100%" }}>
            <Stack spacing={2}>
              <TextField
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                slotProps={{ htmlInput: { minLength: 2 } }}
              />
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                helperText="Minimum 6 characters"
                slotProps={{ htmlInput: { minLength: 6 } }}
              />
              <TextField
                select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as PublicRegisterRole)}
                required
                helperText="Super Admin accounts are provisioned by seed/admin only"
              >
                {PUBLIC_REGISTER_ROLES.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                type="submit"
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {submitting ? "Creating account..." : "Register"}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                Already have an account?{" "}
                <Link href="/login">Sign in</Link>
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
