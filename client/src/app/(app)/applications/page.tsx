"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyWithResume,
  listApplications,
  updateApplicationStage,
} from "@/services/applications.service";
import { getJobs } from "@/services/jobs.service";
import type { Application, ApplicationStage, Job } from "@/types";
import { formatScore, selectableStages, stageLabel } from "@/utils/format";
import { isAxiosError } from "axios";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [apps, jobList] = await Promise.all([listApplications(), getJobs()]);
      setApplications(apps);
      setJobs(jobList);
    } catch {
      setError("Failed to load applications");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadData();
    })();
  }, [loadData]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: "candidate",
        headerName: "Candidate",
        flex: 1,
        minWidth: 140,
        valueGetter: (_value, row) => row.candidateId?.name ?? "-",
      },
      {
        field: "email",
        headerName: "Email",
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row) => row.candidateId?.email ?? "-",
      },
      {
        field: "job",
        headerName: "Job",
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row) => row.jobId?.title ?? "-",
      },
      {
        field: "stage",
        headerName: "Stage",
        width: 140,
        valueGetter: (_value, row) => stageLabel(String(row.stage)),
      },
      {
        field: "aiScore",
        headerName: "AI Score",
        width: 110,
        valueGetter: (_value, row) => formatScore(row.aiScore),
      },
      {
        field: "advance",
        headerName: "Advance",
        width: 180,
        sortable: false,
        renderCell: (params) => {
          const options = selectableStages(String(params.row.stage));
          return (
            <TextField
              select
              size="small"
              value={params.row.stage}
              onChange={(event) => {
                const next = event.target.value as ApplicationStage;
                if (next === params.row.stage) return;
                void updateApplicationStage(params.row._id, next)
                  .then(() => {
                    setError(null);
                    return loadData();
                  })
                  .catch((err: unknown) => {
                    const message = isAxiosError(err)
                      ? (err.response?.data as { message?: string } | undefined)?.message
                      : undefined;
                    setError(
                      message ??
                        "Invalid stage move. Advance one step at a time (e.g. Applied → Screened → Interview).",
                    );
                  });
              }}
              sx={{ width: 160 }}
            >
              {options.map((stage) => (
                <MenuItem key={stage} value={stage}>
                  {stageLabel(stage)}
                </MenuItem>
              ))}
            </TextField>
          );
        },
      },
    ],
    [loadData],
  );

  async function handleApply() {
    if (!resume) return;
    setSaving(true);
    try {
      await applyWithResume({
        jobId,
        name: name.trim(),
        email: email.trim(),
        resume,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      setOpen(false);
      setJobId("");
      setName("");
      setEmail("");
      setPhone("");
      setResume(null);
      await loadData();
    } catch {
      setError("Failed to submit application");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">Applications</Typography>
        <Button onClick={() => setOpen(true)}>Apply with Resume</Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ height: 520, bgcolor: "background.paper", borderRadius: 2 }}>
        <DataGrid
          rows={applications}
          columns={columns}
          getRowId={(row) => row._id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Apply with Resume</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Job"
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              required
            >
              {jobs.map((job) => (
                <MenuItem key={job._id} value={job._id}>
                  {job.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Candidate Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <TextField
              label="Phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <Button variant="outlined" component="label">
              {resume ? resume.name : "Upload Resume"}
              <input
                hidden
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(event) => setResume(event.target.files?.[0] ?? null)}
              />
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={saving || !jobId || !name.trim() || !email.trim() || !resume}
          >
            {saving ? "Submitting..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
