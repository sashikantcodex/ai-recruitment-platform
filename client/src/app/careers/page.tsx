"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listPostings } from "@/services/careers.service";
import type { PublicPosting } from "@/types";

/** Public careers board — no login required. */
export default function CareersPage() {
  const [postings, setPostings] = useState<PublicPosting[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      listPostings(query || undefined)
        .then((rows) => {
          if (!active) return;
          setPostings(rows);
          setError(null);
        })
        .catch(() => active && setError("Failed to load open roles"))
        .finally(() => active && setLoaded(true));
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>
        Open roles
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Browse our live openings and apply with your resume.
      </Typography>

      <TextField
        fullWidth
        label="Search by title or skill"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 3 }}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {loaded && postings.length === 0 && !error ? (
        <Alert severity="info">No open roles right now — check back soon.</Alert>
      ) : null}

      <Stack spacing={2}>
        {postings.map((posting) => (
          <Paper key={posting._id} sx={{ p: 3 }}>
            <Typography variant="h6" component={Link} href={`/careers/${posting.posting?.slug}`}>
              {posting.title}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ my: 1, flexWrap: "wrap", gap: 1 }}>
              {posting.posting?.location ? (
                <Chip size="small" label={posting.posting.location} />
              ) : null}
              {posting.posting?.employmentType ? (
                <Chip
                  size="small"
                  label={posting.posting.employmentType.replace(/_/g, " ")}
                />
              ) : null}
              {posting.department ? (
                <Chip size="small" variant="outlined" label={posting.department} />
              ) : null}
            </Stack>
            <Box
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {posting.description}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
}
