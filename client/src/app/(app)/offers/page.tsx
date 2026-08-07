"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { listApplications } from "@/services/applications.service";
import {
  createOffer,
  listOffers,
  respondOffer,
  sendOffer,
} from "@/services/platform.service";
import type { Application, Offer } from "@/types";

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const [o, a] = await Promise.all([listOffers(), listApplications()]);
    setOffers(o);
    setApplications(a);
  }

  useEffect(() => {
    void reload().catch(() => setError("Failed to load offers"));
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Offers</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Application"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            sx={{ minWidth: 280 }}
          >
            {applications.map((app) => (
              <MenuItem key={app._id} value={app._id}>
                {app.candidateId?.name} · {app.jobId?.title}
              </MenuItem>
            ))}
          </TextField>
          <Button
            disabled={!applicationId}
            onClick={async () => {
              try {
                await createOffer(applicationId);
                setMessage("Offer drafted with AI salary benchmark");
                await reload();
              } catch {
                setError("Failed to create offer");
              }
            }}
          >
            Create Offer
          </Button>
        </Stack>
      </Paper>

      {offers.map((offer) => (
        <Paper key={offer._id} sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="h6">
              {offer.candidateId?.name} · {offer.jobId?.title}
            </Typography>
            <Typography>
              {offer.salary} {offer.currency} · {offer.status}
            </Typography>
            {offer.benchmark ? (
              <Typography variant="body2" color="text.secondary">
                Benchmark mid {offer.benchmark.mid} ({offer.benchmark.min}–{offer.benchmark.max})
              </Typography>
            ) : null}
            {offer.signingUrl ? (
              <Alert severity="info">DocuSign stub: {offer.signingUrl}</Alert>
            ) : null}
            <Stack direction="row" spacing={1}>
              <Button
                disabled={offer.status !== "draft"}
                onClick={async () => {
                  try {
                    await sendOffer(offer._id);
                    setMessage("Offer sent via DocuSign stub");
                    await reload();
                  } catch {
                    setError("Send failed");
                  }
                }}
              >
                Send for E-Sign
              </Button>
              <Button
                disabled={offer.status !== "sent"}
                onClick={async () => {
                  await respondOffer(offer._id, "accepted");
                  setMessage("Offer accepted — onboarding started");
                  await reload();
                }}
              >
                Accept
              </Button>
              <Button
                color="secondary"
                disabled={offer.status !== "sent"}
                onClick={async () => {
                  await respondOffer(offer._id, "declined");
                  setMessage("Offer declined");
                  await reload();
                }}
              >
                Decline
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
