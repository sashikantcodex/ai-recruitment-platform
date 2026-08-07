"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { knowledgeIngest, knowledgeQuery } from "@/services/platform.service";

export default function KnowledgePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("policy");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">RAG Knowledge Base</Typography>
      <Alert severity="info">
        Local Chroma-shaped store with mock embeddings. Seeded with hiring policies, interview
        guidelines, salary bands, and compliance rules.
      </Alert>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Ingest document
        </Typography>
        <Stack spacing={2}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <TextField
            label="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            multiline
            minRows={4}
          />
          <Button
            disabled={title.trim().length < 1 || content.trim().length < 10}
            onClick={async () => {
              try {
                await knowledgeIngest({
                  title: title.trim(),
                  content: content.trim(),
                  category: category.trim() || "policy",
                });
                setMessage("Document ingested");
                setTitle("");
                setContent("");
              } catch {
                setError("Ingest failed — is the AI service running?");
              }
            }}
          >
            Ingest
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Query policies
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Question"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What is our senior engineer salary band?"
          />
          <Button
            disabled={!query.trim()}
            onClick={async () => {
              try {
                const result = await knowledgeQuery(query.trim());
                setAnswer(result.answer);
              } catch {
                setError("Query failed — is the AI service running?");
              }
            }}
          >
            Ask
          </Button>
          {answer ? <Alert severity="success">{answer}</Alert> : null}
        </Stack>
      </Paper>
    </Stack>
  );
}
