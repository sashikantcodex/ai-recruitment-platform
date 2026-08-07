"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { runAgent } from "@/services/platform.service";

export default function AgentsPage() {
  const [agent, setAgent] = useState<"recruiter" | "interview" | "hr">("recruiter");
  const [jdText, setJdText] = useState("Senior React Engineer building ATS products");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">AI Agents Console</Typography>
      <Alert severity="info">
        Recruiter, Interview, and HR agents orchestrate sourcing, questions/scorecards, and
        offer/onboarding drafts via the FastAPI service.
      </Alert>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Agent"
            value={agent}
            onChange={(e) => setAgent(e.target.value as typeof agent)}
          >
            <MenuItem value="recruiter">Recruiter Agent</MenuItem>
            <MenuItem value="interview">Interview Agent</MenuItem>
            <MenuItem value="hr">HR Agent</MenuItem>
          </TextField>
          <TextField
            label="Job / context"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            multiline
            minRows={3}
          />
          <Button
            onClick={async () => {
              try {
                setError(null);
                const data = await runAgent(agent, {
                  jdText,
                  title: jdText,
                  skills: ["React", "TypeScript"],
                  candidates: [],
                });
                setResult(JSON.stringify(data, null, 2));
              } catch {
                setError("Agent run failed — is the AI service running?");
              }
            }}
          >
            Run Agent
          </Button>
          {result ? (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{result}</pre>
            </Paper>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}
