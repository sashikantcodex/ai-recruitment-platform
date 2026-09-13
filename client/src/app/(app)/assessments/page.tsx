"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { listApplications } from "@/services/applications.service";
import {
  generateAssessment,
  inviteToAssessment,
  listAssessments,
  listAttempts,
} from "@/services/assessments.service";
import { getJobs } from "@/services/jobs.service";
import type { Application, Assessment, AssessmentAttempt, Job } from "@/types";
import { formatScore } from "@/utils/format";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobId, setJobId] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("medium");
  const [numQuestions, setNumQuestions] = useState("8");
  const [applicationId, setApplicationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [list, allAttempts, allJobs, apps] = await Promise.all([
      listAssessments(),
      listAttempts(),
      getJobs(),
      listApplications(),
    ]);
    setAssessments(list);
    setAttempts(allAttempts);
    setJobs(allJobs);
    setApplications(apps);
  }, []);

  useEffect(() => {
    void (async () => {
      await reload().catch(() => setError("Failed to load assessments"));
    })();
  }, [reload]);

  async function run(action: () => Promise<unknown>, success: string, failure: string) {
    try {
      setError(null);
      await action();
      setMessage(success);
      await reload();
    } catch {
      setMessage(null);
      setError(failure);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Assessment Tests</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Generate a test from a job description
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Job"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            sx={{ minWidth: 260 }}
          >
            {jobs.map((job) => (
              <MenuItem key={job._id} value={job._id}>
                {job.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as (typeof DIFFICULTIES)[number])}
            sx={{ width: 160 }}
          >
            {DIFFICULTIES.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Questions"
            type="number"
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            sx={{ width: 140 }}
          />
          <Button
            variant="contained"
            disabled={!jobId}
            onClick={() =>
              run(
                () =>
                  generateAssessment({
                    jobId,
                    difficulty,
                    numQuestions: Number(numQuestions) || 8,
                  }),
                "Assessment generated",
                "Generation failed",
              )
            }
          >
            Generate
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Assessments
        </Typography>
        {assessments.length === 0 ? (
          <Alert severity="info">Generate a test from a job description to start.</Alert>
        ) : null}

        <Stack spacing={2}>
          {assessments.map((assessment) => (
            <Stack key={assessment._id} spacing={1}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
              >
                <Typography sx={{ flex: 1, minWidth: 220 }}>
                  {assessment.title}
                </Typography>
                <Chip size="small" label={`${assessment.questions?.length ?? 0} Qs`} />
                <Chip size="small" label={`${assessment.durationMinutes} min`} />
                <Chip size="small" label={`pass ≥ ${assessment.passingScore}%`} />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  select
                  size="small"
                  label="Invite application"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  sx={{ minWidth: 280 }}
                >
                  {applications.map((app) => (
                    <MenuItem key={app._id} value={app._id}>
                      {app.candidateId?.name} · {app.jobId?.title} · {app.stage}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  size="small"
                  disabled={!applicationId}
                  onClick={() =>
                    run(
                      () => inviteToAssessment(assessment._id, applicationId),
                      "Invite emailed to the candidate",
                      "Invite failed — the candidate may already have an open invite",
                    )
                  }
                >
                  Send invite
                </Button>
              </Stack>
              <Divider />
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Attempts
        </Typography>
        {attempts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No attempts yet.
          </Typography>
        ) : null}
        <Stack spacing={1}>
          {attempts.map((attempt) => (
            <Stack
              key={attempt._id}
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
            >
              <Typography sx={{ flex: 1, minWidth: 220 }}>
                {attempt.candidateId?.name ?? "Candidate"} ·{" "}
                {attempt.assessmentId?.title ?? "Assessment"}
              </Typography>
              <Chip size="small" label={attempt.status} />
              {attempt.status === "graded" ? (
                <Chip
                  size="small"
                  color={attempt.passed ? "success" : "error"}
                  label={`${formatScore(attempt.score)}% · ${
                    attempt.passed ? "passed" : "failed"
                  }`}
                />
              ) : null}
              {attempt.token && attempt.status !== "graded" ? (
                <Typography variant="caption" color="text.secondary">
                  /assessment/{attempt.token}
                </Typography>
              ) : null}
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
