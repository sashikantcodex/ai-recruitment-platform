"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { applyToPosting, getPosting } from "@/services/careers.service";
import type { PublicPosting } from "@/types";

/** Public posting detail with candidate self-service application. */
export default function PostingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [posting, setPosting] = useState<PublicPosting | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getPosting(slug)
      .then(setPosting)
      .catch(() => setError("This role is no longer accepting applications"));
  }, [slug]);

  async function submit() {
    if (!resume) return;
    try {
      setSubmitting(true);
      setError(null);
      await applyToPosting(slug, {
        name,
        email,
        ...(phone ? { phone } : {}),
        resume,
      });
      setSubmitted(true);
    } catch {
      setError("We could not submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !posting) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">{error}</Alert>
        <Button component={Link} href="/careers" sx={{ mt: 2 }}>
          Back to all roles
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Button component={Link} href="/careers" sx={{ mb: 2 }}>
        ← All roles
      </Button>

      {posting ? (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4">{posting.title}</Typography>
          <Stack direction="row" spacing={1} sx={{ my: 2, flexWrap: "wrap", gap: 1 }}>
            {posting.posting?.location ? (
              <Chip size="small" label={posting.posting.location} />
            ) : null}
            {posting.posting?.employmentType ? (
              <Chip
                size="small"
                label={posting.posting.employmentType.replace(/_/g, " ")}
              />
            ) : null}
            {posting.posting?.salaryRange ? (
              <Chip size="small" label={posting.posting.salaryRange} />
            ) : null}
            {(posting.skills ?? []).map((skill) => (
              <Chip key={skill} size="small" variant="outlined" label={skill} />
            ))}
          </Stack>

          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
            {posting.description}
          </Typography>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" gutterBottom>
            Apply for this role
          </Typography>

          {submitted ? (
            <Alert severity="success">
              Thanks — your application is in. We&apos;ll be in touch by email.
            </Alert>
          ) : (
            <Stack spacing={2} sx={{ maxWidth: 520 }}>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <TextField
                label="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button component="label" variant="outlined">
                {resume ? resume.name : "Upload resume (PDF, DOCX or TXT)"}
                <input
                  hidden
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setResume(e.target.files?.[0] ?? null)}
                />
              </Button>
              <Button
                variant="contained"
                disabled={!name || !email || !resume || submitting}
                onClick={() => void submit()}
              >
                {submitting ? "Submitting…" : "Submit application"}
              </Button>
            </Stack>
          )}
        </Paper>
      ) : (
        <Typography>Loading…</Typography>
      )}
    </Container>
  );
}
