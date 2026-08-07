"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  approveJob,
  closeJob,
  getJobById,
  getJobRankings,
  submitJob,
  updateJob,
} from "@/services/jobs.service";
import type { Application, Job } from "@/types";
import { formatScore } from "@/utils/format";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [job, setJob] = useState<Job | null>(null);
  const [rankings, setRankings] = useState<Application[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadJob = useCallback(async () => {
    try {
      setError(null);
      const data = await getJobById(jobId);
      setJob(data);
      setTitle(data.title);
      setDescription(data.description);
      setSkills((data.skills ?? []).join(", "));
      setDepartment(data.department ?? "");
      try {
        setRankings(await getJobRankings(jobId));
      } catch {
        setRankings([]);
      }
    } catch {
      setError("Failed to load job");
    }
  }, [jobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  async function runAction(action: "submit" | "approve" | "close" | "save") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (action === "save") {
        await updateJob(jobId, {
          title: title.trim(),
          description: description.trim(),
          skills: skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          ...(department.trim() ? { department: department.trim() } : {}),
        });
        setMessage("Job updated");
      }
      if (action === "submit") setMessage((await submitJob(jobId)).message);
      if (action === "approve") setMessage((await approveJob(jobId)).message);
      if (action === "close") setMessage((await closeJob(jobId)).message);
      await loadJob();
    } catch {
      setError(`Failed to ${action} job`);
    } finally {
      setBusy(false);
    }
  }

  if (!job && !error) return <Typography>Loading job...</Typography>;
  if (!job) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h5">Edit JD</Typography>
            <Chip label={job.status} color="primary" />
          </Stack>

          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={4}
          />
          <TextField
            label="Skills (comma separated)"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
          <TextField
            label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}
          {message ? <Alert severity="success">{message}</Alert> : null}

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button disabled={busy} onClick={() => runAction("save")}>
              Save
            </Button>
            <Button disabled={busy || job.status !== "draft"} onClick={() => runAction("submit")}>
              Submit for Approval
            </Button>
            <Button
              disabled={busy || job.status !== "pending_approval"}
              onClick={() => runAction("approve")}
            >
              Approve / Publish
            </Button>
            <Button
              color="secondary"
              disabled={busy || job.status === "closed"}
              onClick={() => runAction("close")}
            >
              Close
            </Button>
          </Stack>

          {(job.approvalEvents ?? []).length > 0 ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Approval history
              </Typography>
              {(job.approvalEvents ?? []).map((event, index) => (
                <Typography key={`${event.action}-${index}`} variant="body2" color="text.secondary">
                  {event.action}
                  {event.at ? ` · ${new Date(event.at).toLocaleString()}` : ""}
                </Typography>
              ))}
            </Box>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          AI Candidate Rankings
        </Typography>
        {rankings.length === 0 ? (
          <Alert severity="info">No applications ranked yet.</Alert>
        ) : (
          rankings.map((app, index) => (
            <Stack
              key={app._id}
              direction="row"
              spacing={2}
              sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Typography sx={{ width: 32 }}>#{index + 1}</Typography>
              <Typography sx={{ flex: 1 }}>
                {app.candidateId?.name ?? "Candidate"} ({app.candidateId?.email})
              </Typography>
              <Chip size="small" label={`Score ${formatScore(app.aiScore)}`} />
              <Chip size="small" label={String(app.stage)} variant="outlined" />
            </Stack>
          ))
        )}
      </Paper>
    </Stack>
  );
}
