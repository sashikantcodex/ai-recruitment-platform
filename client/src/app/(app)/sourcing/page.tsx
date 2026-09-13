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
import { getJobs } from "@/services/jobs.service";
import {
  addProspect,
  contactProspect,
  convertProspect,
  createCampaign,
  listCampaigns,
  searchProspects,
  updateProspectStatus,
} from "@/services/sourcing.service";
import type { Job, SourcingCampaign } from "@/types";
import { formatScore } from "@/utils/format";

export default function SourcingPage() {
  const [campaigns, setCampaigns] = useState<SourcingCampaign[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState("");
  const [minMatchScore, setMinMatchScore] = useState("40");
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectSkills, setProspectSkills] = useState("");
  const [targetCampaign, setTargetCampaign] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [list, allJobs] = await Promise.all([listCampaigns(), getJobs()]);
    setCampaigns(list);
    setJobs(allJobs);
  }, []);

  useEffect(() => {
    void (async () => {
      await reload().catch(() => setError("Failed to load sourcing campaigns"));
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
      <Typography variant="h5">Candidate Sourcing</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          New campaign
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Job"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            sx={{ minWidth: 280 }}
          >
            {jobs.map((job) => (
              <MenuItem key={job._id} value={job._id}>
                {job.title} · {job.status}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Min match score"
            type="number"
            value={minMatchScore}
            onChange={(e) => setMinMatchScore(e.target.value)}
            sx={{ width: 160 }}
          />
          <Button
            disabled={!jobId}
            onClick={() =>
              run(
                () =>
                  createCampaign({
                    jobId,
                    minMatchScore: Number(minMatchScore) || 40,
                  }),
                "Campaign created",
                "Failed to create campaign",
              )
            }
          >
            Create campaign
          </Button>
        </Stack>
      </Paper>

      {campaigns.length === 0 ? (
        <Alert severity="info">
          Create a campaign against a job to search the talent pool for matches.
        </Alert>
      ) : null}

      {campaigns.map((campaign) => (
        <Paper key={campaign._id} sx={{ p: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
          >
            <Typography variant="h6" sx={{ flex: 1 }}>
              {campaign.name}
            </Typography>
            <Chip size="small" label={campaign.status} />
            <Chip size="small" label={`${campaign.prospects?.length ?? 0} prospects`} />
            <Button
              size="small"
              variant="contained"
              onClick={() =>
                run(
                  async () => {
                    const result = await searchProspects(campaign._id);
                    setMessage(
                      `Scanned ${result.scanned} candidate(s), added ${result.added} prospect(s)`,
                    );
                  },
                  "Talent pool searched",
                  "Search failed",
                )
              }
            >
              Search talent pool
            </Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {(campaign.prospects ?? []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No prospects yet — run a search or add one by hand below.
            </Typography>
          ) : null}

          <Stack spacing={1}>
            {(campaign.prospects ?? []).map((prospect) => (
              <Stack
                key={prospect._id}
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                sx={{ alignItems: { md: "center" }, flexWrap: "wrap", gap: 1 }}
              >
                <Typography sx={{ flex: 1, minWidth: 220 }}>
                  {prospect.name ?? "Prospect"} · {prospect.email}
                  {typeof prospect.matchScore === "number"
                    ? ` · match ${formatScore(prospect.matchScore)}`
                    : ""}
                </Typography>
                <Chip size="small" label={prospect.status} />
                <Button
                  size="small"
                  disabled={prospect.status !== "sourced"}
                  onClick={() =>
                    run(
                      () => contactProspect(campaign._id, prospect._id),
                      "AI outreach sent",
                      "Outreach failed",
                    )
                  }
                >
                  Send outreach
                </Button>
                <Button
                  size="small"
                  disabled={prospect.status !== "contacted"}
                  onClick={() =>
                    run(
                      () => updateProspectStatus(campaign._id, prospect._id, "responded"),
                      "Marked as responded",
                      "Update failed",
                    )
                  }
                >
                  Mark responded
                </Button>
                <Button
                  size="small"
                  disabled={prospect.status !== "responded"}
                  onClick={() =>
                    run(
                      () => convertProspect(campaign._id, prospect._id),
                      "Converted to an application",
                      "Convert failed — the prospect may have no resume on file",
                    )
                  }
                >
                  Convert to application
                </Button>
              </Stack>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Name"
              value={targetCampaign === campaign._id ? prospectName : ""}
              onChange={(e) => {
                setTargetCampaign(campaign._id);
                setProspectName(e.target.value);
              }}
            />
            <TextField
              size="small"
              label="Email"
              value={targetCampaign === campaign._id ? prospectEmail : ""}
              onChange={(e) => {
                setTargetCampaign(campaign._id);
                setProspectEmail(e.target.value);
              }}
            />
            <TextField
              size="small"
              label="Skills (comma separated)"
              value={targetCampaign === campaign._id ? prospectSkills : ""}
              onChange={(e) => {
                setTargetCampaign(campaign._id);
                setProspectSkills(e.target.value);
              }}
            />
            <Button
              size="small"
              disabled={
                targetCampaign !== campaign._id || !prospectName || !prospectEmail
              }
              onClick={() =>
                run(
                  async () => {
                    await addProspect(campaign._id, {
                      name: prospectName,
                      email: prospectEmail,
                      skills: prospectSkills
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    });
                    setProspectName("");
                    setProspectEmail("");
                    setProspectSkills("");
                  },
                  "Prospect added",
                  "Failed to add prospect",
                )
              }
            >
              Add prospect
            </Button>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
