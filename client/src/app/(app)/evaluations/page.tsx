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
  decideEvaluation,
  generateEvaluation,
  listEvaluations,
} from "@/services/evaluations.service";
import type { Application, Evaluation, EvaluationDecision } from "@/types";
import { formatScore, joinList } from "@/utils/format";

const DECISION_COLOR: Record<EvaluationDecision, "success" | "warning" | "error"> = {
  hire: "success",
  hold: "warning",
  reject: "error",
};

function signalLine(evaluation: Evaluation) {
  const s = evaluation.signals ?? {};
  const parts = [
    typeof s.screeningScore === "number" ? `screening ${s.screeningScore}%` : null,
    typeof s.assessmentScore === "number" ? `assessment ${s.assessmentScore}%` : null,
    typeof s.interviewScore === "number"
      ? `interviews ${s.interviewScore}% (${s.interviewCount ?? 0})`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "no signals recorded";
}

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [list, apps] = await Promise.all([listEvaluations(), listApplications()]);
    setEvaluations(list);
    setApplications(apps);
  }, []);

  useEffect(() => {
    void (async () => {
      await reload().catch(() => setError("Failed to load evaluations"));
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
      <Typography variant="h5">Candidate Evaluation</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Consolidate screening, assessment and interview signals
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Application"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            sx={{ minWidth: 320 }}
          >
            {applications.map((app) => (
              <MenuItem key={app._id} value={app._id}>
                {app.candidateId?.name} · {app.jobId?.title} · {app.stage}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!applicationId}
            onClick={() =>
              run(
                () => generateEvaluation(applicationId),
                "Evaluation generated",
                "Generation failed — the candidate may have no signals yet",
              )
            }
          >
            Generate evaluation
          </Button>
        </Stack>
      </Paper>

      {evaluations.length === 0 ? (
        <Alert severity="info">
          Generate an evaluation once a candidate has been screened, tested or interviewed.
        </Alert>
      ) : null}

      {evaluations.map((evaluation) => (
        <Paper key={evaluation._id} sx={{ p: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
          >
            <Typography variant="h6" sx={{ flex: 1, minWidth: 200 }}>
              {evaluation.candidateId?.name ?? "Candidate"} ·{" "}
              {evaluation.jobId?.title ?? "Job"}
            </Typography>
            <Chip size="small" label={`${formatScore(evaluation.overallScore)}% overall`} />
            <Chip
              size="small"
              color={DECISION_COLOR[evaluation.recommendation]}
              label={`AI: ${evaluation.recommendation}`}
            />
            {evaluation.decision ? (
              <Chip
                size="small"
                variant="outlined"
                color={DECISION_COLOR[evaluation.decision]}
                label={`decided: ${evaluation.decision}`}
              />
            ) : null}
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {signalLine(evaluation)}
          </Typography>
          {evaluation.summary ? (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {evaluation.summary}
            </Typography>
          ) : null}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
            <Stack sx={{ flex: 1 }}>
              <Typography variant="subtitle2">Strengths</Typography>
              <Typography variant="body2">{joinList(evaluation.strengths)}</Typography>
            </Stack>
            <Stack sx={{ flex: 1 }}>
              <Typography variant="subtitle2">Concerns</Typography>
              <Typography variant="body2">{joinList(evaluation.concerns)}</Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Decision note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              sx={{ flex: 1 }}
            />
            {(["hire", "hold", "reject"] as const).map((decision) => (
              <Button
                key={decision}
                size="small"
                color={DECISION_COLOR[decision]}
                disabled={evaluation.decision === decision}
                onClick={() =>
                  run(
                    async () => {
                      await decideEvaluation(
                        evaluation.applicationId ?? "",
                        decision,
                        note || undefined,
                      );
                      setNote("");
                    },
                    `Recorded ${decision}`,
                    "Decision failed — the application may not allow that stage move",
                  )
                }
              >
                {decision}
              </Button>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
