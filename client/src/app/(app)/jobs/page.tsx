"use client";

import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createJob, getJobs } from "@/services/jobs.service";
import type { Job } from "@/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      setError(null);
      setJobs(await getJobs());
    } catch {
      setError("Failed to load jobs");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadJobs();
    })();
  }, [loadJobs]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: "title",
        headerName: "Title",
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Link href={`/jobs/${params.row._id}`}>{String(params.value)}</Link>
        ),
      },
      { field: "department", headerName: "Department", width: 160 },
      {
        field: "status",
        headerName: "Status",
        width: 160,
        renderCell: (params) => <Chip size="small" label={String(params.value)} />,
      },
      {
        field: "skills",
        headerName: "Skills",
        flex: 1,
        minWidth: 200,
        valueGetter: (_value, row) => (row.skills ?? []).join(", "),
      },
    ],
    [],
  );

  async function handleCreateJob() {
    setSaving(true);
    try {
      const skillList = skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

      await createJob({
        title: title.trim(),
        description: description.trim(),
        ...(skillList.length ? { skills: skillList } : {}),
        ...(department.trim() ? { department: department.trim() } : {}),
      });

      setOpen(false);
      setTitle("");
      setDescription("");
      setSkills("");
      setDepartment("");
      await loadJobs();
    } catch {
      setError("Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">Jobs</Typography>
        <Button startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Create Job
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ height: 520, bgcolor: "background.paper", borderRadius: 2 }}>
        <DataGrid
          rows={jobs}
          columns={columns}
          getRowId={(row) => row._id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Job</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={4}
              required
              helperText="Minimum 10 characters"
            />
            <TextField
              label="Skills (comma separated)"
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
            />
            <TextField
              label="Department"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} variant="text">
            Cancel
          </Button>
          <Button
            onClick={handleCreateJob}
            disabled={saving || !title.trim() || description.trim().length < 10}
          >
            {saving ? "Saving..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
