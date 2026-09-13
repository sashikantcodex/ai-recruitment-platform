"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  getCandidateAttempt,
  startCandidateAttempt,
  submitCandidateAttempt,
} from "@/services/assessments.service";
import type { CandidateAttempt } from "@/types";

type AnswerState = Record<number, { selectedIndex?: number; response?: string }>;

/** Candidate-facing assessment, opened from an emailed token link. */
export default function AssessmentPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [attempt, setAttempt] = useState<CandidateAttempt | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCandidateAttempt(token);
      setAttempt(data);
      setRemaining(data.remainingMinutes);
      setError(null);
    } catch {
      setError("This assessment link is invalid or has expired.");
    }
  }, [token]);

  useEffect(() => {
    void (async () => {
      if (token) await load();
    })();
  }, [token, load]);

  // Local countdown so the candidate sees the clock without polling the API.
  useEffect(() => {
    if (attempt?.status !== "in_progress" || remaining === null) return;
    const timer = setInterval(() => {
      setRemaining((value) => (value === null ? null : Math.max(0, value - 1)));
    }, 60_000);
    return () => clearInterval(timer);
  }, [attempt?.status, remaining]);

  async function start() {
    try {
      await startCandidateAttempt(token);
      await load();
    } catch {
      setError("Could not start the assessment.");
    }
  }

  async function submit() {
    if (!attempt) return;
    try {
      setSubmitting(true);
      setError(null);
      const payload = attempt.questions.map((question, index) => ({
        questionIndex: index,
        ...(question.type === "mcq"
          ? { selectedIndex: answers[index]?.selectedIndex }
          : { response: answers[index]?.response ?? "" }),
      }));
      const outcome = await submitCandidateAttempt(token, payload);
      setResult({ score: outcome.score, passed: outcome.passed });
    } catch {
      setError("Submission failed — your time may have run out.");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !attempt) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (result) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Assessment submitted
          </Typography>
          <Alert severity={result.passed ? "success" : "info"}>
            You scored {result.score}%.{" "}
            {result.passed
              ? "You have moved forward to the interview stage."
              : "Thanks for your time — the hiring team will be in touch."}
          </Alert>
        </Paper>
      </Container>
    );
  }

  if (!attempt) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography>Loading…</Typography>
      </Container>
    );
  }

  const notStarted = attempt.status === "invited";

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
          <Typography variant="h5" sx={{ flex: 1 }}>
            {attempt.title}
          </Typography>
          <Chip size="small" label={`${attempt.questions.length} questions`} />
          <Chip
            size="small"
            color={remaining !== null && remaining <= 5 ? "error" : "default"}
            label={`${remaining ?? attempt.durationMinutes} min left`}
          />
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {notStarted ? (
          <Stack spacing={2}>
            <Alert severity="info">
              You have {attempt.durationMinutes} minutes once you begin. The timer starts
              when you press Start.
            </Alert>
            <Button variant="contained" onClick={() => void start()} sx={{ alignSelf: "start" }}>
              Start assessment
            </Button>
          </Stack>
        ) : (
          <Stack spacing={3}>
            {attempt.questions.map((question, index) => (
              <Stack key={`${index}-${question.prompt}`} spacing={1}>
                <Typography variant="subtitle1">
                  {index + 1}. {question.prompt}
                </Typography>

                {question.type === "mcq" ? (
                  <FormControl>
                    <RadioGroup
                      value={answers[index]?.selectedIndex ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [index]: { selectedIndex: Number(e.target.value) },
                        }))
                      }
                    >
                      {(question.options ?? []).map((option, optionIndex) => (
                        <FormControlLabel
                          key={option}
                          value={optionIndex}
                          control={<Radio />}
                          label={option}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                ) : (
                  <TextField
                    multiline
                    minRows={question.type === "code" ? 8 : 4}
                    placeholder={
                      question.type === "code" ? "Write your code here…" : "Your answer…"
                    }
                    value={answers[index]?.response ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [index]: { response: e.target.value },
                      }))
                    }
                  />
                )}
                <Divider />
              </Stack>
            ))}

            <Button
              variant="contained"
              disabled={submitting}
              onClick={() => void submit()}
              sx={{ alignSelf: "start" }}
            >
              {submitting ? "Submitting…" : "Submit assessment"}
            </Button>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
