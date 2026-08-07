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
  createInterview,
  generateInterviewQuestions,
  listInterviews,
  saveInterviewScorecard,
  scheduleInterview,
} from "@/services/platform.service";
import type { Application, Interview } from "@/types";

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const [ints, apps] = await Promise.all([listInterviews(), listApplications()]);
    setInterviews(ints);
    setApplications(apps);
  }

  useEffect(() => {
    void reload().catch(() => setError("Failed to load interviews"));
  }, []);

  const selected = interviews.find((i) => i._id === selectedId) ?? null;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Interviews</Typography>
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
                const created = await createInterview(applicationId);
                setMessage("Interview created");
                setSelectedId(created._id);
                await reload();
              } catch {
                setError("Failed to create interview");
              }
            }}
          >
            Create Interview
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Existing interviews
        </Typography>
        <Stack spacing={1}>
          {interviews.map((item) => (
            <Button
              key={item._id}
              variant={selectedId === item._id ? "contained" : "outlined"}
              onClick={() => setSelectedId(item._id)}
              sx={{ justifyContent: "flex-start" }}
            >
              {item.candidateId?.name ?? "Candidate"} · {item.jobId?.title ?? "Job"} ·{" "}
              {item.status}
            </Button>
          ))}
        </Stack>
      </Paper>

      {selected ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Interview workspace
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Schedule (ISO datetime)"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              placeholder="2026-08-10T15:00:00.000Z"
              helperText="Uses stub Google Calendar + Zoom adapters"
            />
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              <Button
                disabled={!scheduledAt}
                onClick={async () => {
                  try {
                    await scheduleInterview(selected._id, scheduledAt);
                    setMessage("Scheduled via calendar/meeting stubs");
                    await reload();
                  } catch {
                    setError("Schedule failed");
                  }
                }}
              >
                Schedule
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await generateInterviewQuestions(selected._id);
                    setMessage("AI questions generated");
                    await reload();
                  } catch {
                    setError("Question generation failed");
                  }
                }}
              >
                Generate AI Questions
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await saveInterviewScorecard(selected._id, {
                      technical: 4,
                      communication: 4,
                      culture: 4,
                      notes,
                      recommendation: "yes",
                    });
                    setMessage("Scorecard saved");
                    await reload();
                  } catch {
                    setError("Scorecard failed");
                  }
                }}
              >
                Save Scorecard
              </Button>
            </Stack>
            <TextField
              label="Interview notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              minRows={3}
            />
            {selected.meetingUrl ? (
              <Alert severity="info">Meeting: {selected.meetingUrl}</Alert>
            ) : null}
            {(selected.questions ?? []).length > 0 ? (
              <Stack>
                <Typography variant="subtitle2">AI Questions</Typography>
                {(selected.questions ?? []).map((q) => (
                  <Typography key={q} variant="body2">
                    • {q}
                  </Typography>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
