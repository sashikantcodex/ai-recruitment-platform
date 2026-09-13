"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  answerInterviewSession,
  getInterviewSession,
  startInterviewSession,
} from "@/services/careers.service";
import type { CandidateInterviewSession } from "@/types";

/** Candidate-facing AI interview, opened from an emailed token link. */
export default function AiInterviewPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [session, setSession] = useState<CandidateInterviewSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSession(await getInterviewSession(token));
      setError(null);
    } catch {
      setError("This interview link is invalid or has expired.");
    }
  }, [token]);

  useEffect(() => {
    void (async () => {
      if (token) await load();
    })();
  }, [token, load]);

  async function start() {
    try {
      setBusy(true);
      setSession(await startInterviewSession(token));
      setError(null);
    } catch {
      setError("Could not start the interview.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    try {
      setBusy(true);
      const next = await answerInterviewSession(token, answer);
      setSession(next);
      setAnswer("");
      setError(null);
    } catch {
      setError("Could not record that answer. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !session) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography>Loading…</Typography>
      </Container>
    );
  }

  const question = session.question || session.currentQuestion || "";
  const done = session.status === "completed";
  const progress = session.maxQuestions
    ? Math.min(100, (session.askedCount / session.maxQuestions) * 100)
    : 0;

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <Typography variant="h5" sx={{ flex: 1 }}>
            AI interview{session.jobTitle ? ` · ${session.jobTitle}` : ""}
          </Typography>
          <Chip
            size="small"
            label={`${session.askedCount}/${session.maxQuestions} questions`}
          />
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ mb: 3 }} />

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        {done ? (
          <Alert severity="success">
            Thanks — your interview is complete. The hiring team will review your answers
            and get back to you.
          </Alert>
        ) : session.status === "not_started" ? (
          <Stack spacing={2}>
            <Alert severity="info">
              You&apos;ll be asked up to {session.maxQuestions} questions, one at a time.
              Take your time — there is no per-question timer.
            </Alert>
            <Button
              variant="contained"
              disabled={busy}
              onClick={() => void start()}
              sx={{ alignSelf: "start" }}
            >
              Start interview
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="h6">{question}</Typography>
            <TextField
              multiline
              minRows={6}
              placeholder="Your answer…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <Button
              variant="contained"
              disabled={busy || !answer.trim()}
              onClick={() => void submitAnswer()}
              sx={{ alignSelf: "start" }}
            >
              {busy ? "Sending…" : "Submit answer"}
            </Button>
          </Stack>
        )}

        {(session.transcript ?? []).length > 0 ? (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" gutterBottom>
              Your answers so far
            </Typography>
            <Stack spacing={2}>
              {(session.transcript ?? [])
                .filter((turn) => turn.answer)
                .map((turn, index) => (
                  <Stack key={`${index}-${turn.question}`}>
                    <Typography variant="body2" color="text.secondary">
                      {turn.question}
                    </Typography>
                    <Typography variant="body2">{turn.answer}</Typography>
                  </Stack>
                ))}
            </Stack>
          </>
        ) : null}
      </Paper>
    </Container>
  );
}
