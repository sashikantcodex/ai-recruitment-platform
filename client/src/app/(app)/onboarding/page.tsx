"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import {
  listOnboarding,
  toggleOnboardingChecklist,
  verifyOnboardingDoc,
} from "@/services/platform.service";
import type { OnboardingPacket } from "@/types";

export default function OnboardingPage() {
  const [packets, setPackets] = useState<OnboardingPacket[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setPackets(await listOnboarding());
  }

  useEffect(() => {
    void reload().catch(() => setError("Failed to load onboarding"));
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Employee Onboarding</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {packets.length === 0 ? (
        <Alert severity="info">Accept an offer to start an onboarding packet.</Alert>
      ) : null}

      {packets.map((packet) => (
        <Paper key={packet._id} sx={{ p: 2 }}>
          <Typography variant="h6">
            {packet.candidateId?.name ?? "Candidate"} · {packet.status}
          </Typography>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Checklist
          </Typography>
          {(packet.checklist ?? []).map((item, index) => (
            <FormControlLabel
              key={`${packet._id}-${index}`}
              control={
                <Checkbox
                  checked={Boolean(item.done)}
                  onChange={async (_e, checked) => {
                    await toggleOnboardingChecklist(packet._id, index, checked);
                    await reload();
                  }}
                />
              }
              label={item.item}
            />
          ))}
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Document verification
          </Typography>
          {(packet.documents ?? []).map((doc) => (
            <Stack
              key={doc._id ?? doc.name}
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", mb: 1 }}
            >
              <Typography sx={{ flex: 1 }}>
                {doc.name} · {doc.status}
              </Typography>
              <Button
                size="small"
                disabled={!doc._id || doc.status === "verified"}
                onClick={async () => {
                  if (!doc._id) return;
                  await verifyOnboardingDoc(packet._id, doc._id, "verified");
                  await reload();
                }}
              >
                Verify
              </Button>
            </Stack>
          ))}
        </Paper>
      ))}
    </Stack>
  );
}
