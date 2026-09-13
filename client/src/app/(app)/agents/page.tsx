"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listApplications } from "@/services/applications.service";
import { getJobs } from "@/services/jobs.service";
import { runAgent } from "@/services/platform.service";
import type { Application, Job } from "@/types";

type AgentName = "recruiter" | "interview" | "hr";

export default function AgentsPage() {
  const [agent, setAgent] = useState<AgentName>("recruiter");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobId, setJobId] = useState("");
  const [pickedApplicationId, setApplicationId] = useState("");
  const [execute, setExecute] = useState(true);
  const [sendOffer, setSendOffer] = useState(true);
  const [acceptOffer, setAcceptOffer] = useState(false);
  const [schedule, setSchedule] = useState(true);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [jobList, apps] = await Promise.all([getJobs(), listApplications()]);
      setJobs(jobList);
      setApplications(apps);
      if (!jobId && jobList[0]) setJobId(jobList[0]._id);
    } catch {
      setError("Failed to load jobs/applications");
    }
  }, [jobId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const appsForJob = useMemo(
    () =>
      applications.filter((app) => {
        const id =
          typeof app.jobId === "object" && app.jobId
            ? app.jobId._id
            : String(app.jobId ?? "");
        return !jobId || id === jobId;
      }),
    [applications, jobId],
  );

  // Derived during render: a pick made before the job filter changed can fall out of
  // the list, so fall back to the first match rather than syncing state in an effect.
  const applicationId = appsForJob.some((a) => a._id === pickedApplicationId)
    ? pickedApplicationId
    : (appsForJob[0]?._id ?? "");

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const scheduledAt = schedule
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      const data = await runAgent(agent, {
        execute,
        jobId: jobId || undefined,
        applicationId: applicationId || undefined,
        ...(agent === "interview" && scheduledAt ? { scheduledAt, durationMinutes: 60 } : {}),
        ...(agent === "hr"
          ? { send: sendOffer || acceptOffer, accept: acceptOffer }
          : {}),
      });
      setResult(JSON.stringify(data, null, 2));
      await load();
    } catch {
      setError("Agent run failed — check API/AI are running and required IDs are set.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">AI Agents Console</Typography>
      <Alert severity="info">
        Agents can <strong>advise</strong> (AI JSON) or <strong>execute</strong> real pipeline
        steps: Recruiter shortlists → Interview prepares/schedules → HR drafts/sends/accepts
        offers (and creates onboarding on accept).
      </Alert>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Agent"
            value={agent}
            onChange={(e) => setAgent(e.target.value as AgentName)}
          >
            <MenuItem value="recruiter">Recruiter — shortlist top applicant</MenuItem>
            <MenuItem value="interview">Interview — create + questions + schedule</MenuItem>
            <MenuItem value="hr">HR — draft offer (+ send/accept)</MenuItem>
          </TextField>

          <TextField
            select
            label="Job"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            helperText="Used by Recruiter rankings and AI context"
          >
            {jobs.map((job) => (
              <MenuItem key={job._id} value={job._id}>
                {job.title} ({job.status})
              </MenuItem>
            ))}
          </TextField>

          {(agent === "interview" || agent === "hr" || agent === "recruiter") && (
            <TextField
              select
              label="Application"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              helperText={
                agent === "recruiter"
                  ? "Optional — defaults to top AI-ranked application"
                  : "Required for Interview / HR execute"
              }
            >
              {appsForJob.map((app) => (
                <MenuItem key={app._id} value={app._id}>
                  {(app.candidateId?.name ?? "Candidate") +
                    ` — ${app.stage}` +
                    (app.aiScore != null ? ` (score ${app.aiScore})` : "")}
                </MenuItem>
              ))}
            </TextField>
          )}

          <FormControlLabel
            control={
              <Checkbox checked={execute} onChange={(e) => setExecute(e.target.checked)} />
            }
            label="Execute pipeline actions (not advisory-only)"
          />

          {agent === "interview" && execute ? (
            <FormControlLabel
              control={
                <Checkbox checked={schedule} onChange={(e) => setSchedule(e.target.checked)} />
              }
              label="Also schedule interview for tomorrow"
            />
          ) : null}

          {agent === "hr" && execute ? (
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sendOffer}
                    onChange={(e) => setSendOffer(e.target.checked)}
                  />
                }
                label="Send offer (e-sign stub)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={acceptOffer}
                    onChange={(e) => setAcceptOffer(e.target.checked)}
                  />
                }
                label="Accept offer → onboarding"
              />
            </Stack>
          ) : null}

          <Button onClick={handleRun} disabled={running || (execute && agent !== "recruiter" && !applicationId)}>
            {running ? "Running..." : execute ? "Run Agent + Execute" : "Run Advisory Only"}
          </Button>

          {result ? (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Result (advisory + executed)
              </Typography>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{result}</pre>
            </Paper>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}
