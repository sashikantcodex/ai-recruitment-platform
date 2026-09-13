"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCandidate, listCandidates, updateCandidate } from "@/services/platform.service";
import type { Candidate } from "@/types";
import { joinList } from "@/utils/format";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  const load = useCallback(async () => {
    try {
      setCandidates(await listCandidates());
    } catch {
      setError("Failed to load candidates");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "name", headerName: "Name", flex: 1, minWidth: 140 },
      { field: "email", headerName: "Email", flex: 1, minWidth: 180 },
      { field: "phone", headerName: "Phone", width: 140 },
      {
        field: "skills",
        headerName: "Skills",
        flex: 1,
        minWidth: 180,
        valueGetter: (_v, row) => joinList(row.skills),
      },
      {
        field: "actions",
        headerName: "Profile",
        width: 120,
        sortable: false,
        renderCell: (params) => (
          <Button
            size="small"
            onClick={async () => {
              const detail = await getCandidate(params.row._id);
              setSelected(detail.candidate);
              setSummary(detail.candidate.summary ?? "");
              setSkills((detail.candidate.skills ?? []).join(", "));
              setPhone(detail.candidate.phone ?? "");
              setLocation(detail.candidate.location ?? "");
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Candidates
      </Typography>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      <Box sx={{ height: 520, bgcolor: "background.paper", borderRadius: 2 }}>
        <DataGrid
          rows={candidates}
          columns={columns}
          getRowId={(row) => row._id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Box>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit profile — {selected?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <TextField
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <TextField
              label="Summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              multiline
              minRows={3}
            />
            <TextField
              label="Skills (comma separated)"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)} variant="text">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!selected) return;
              await updateCandidate(selected._id, {
                phone,
                location,
                summary,
                skills: skills
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
              setSelected(null);
              await load();
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
