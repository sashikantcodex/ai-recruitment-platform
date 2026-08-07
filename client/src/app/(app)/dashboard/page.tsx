"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { listApplications } from "@/services/applications.service";
import { getJobs } from "@/services/jobs.service";

type DashboardStats = {
  totalJobs: number;
  publishedJobs: number;
  applications: number;
  avgAiScore: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    publishedJobs: 0,
    applications: 0,
    avgAiScore: 0,
  });

  useEffect(() => {
    void (async () => {
      try {
        const [jobs, applications] = await Promise.all([
          getJobs(),
          listApplications(),
        ]);

        const scored = applications.filter((app) => typeof app.aiScore === "number");
        const avgAiScore =
          scored.length > 0
            ? Math.round(
                scored.reduce((sum, app) => sum + (app.aiScore ?? 0), 0) / scored.length,
              )
            : 0;

        setStats({
          totalJobs: jobs.length,
          publishedJobs: jobs.filter((job) => job.status === "published").length,
          applications: applications.length,
          avgAiScore,
        });
      } catch {
        // Keep zeros if APIs fail; shell still usable.
      }
    })();
  }, []);

  const cards = [
    { label: "Total Jobs", value: stats.totalJobs },
    { label: "Published Jobs", value: stats.publishedJobs },
    { label: "Applications", value: stats.applications },
    { label: "Avg AI Score", value: stats.avgAiScore },
  ];

  return (
    <>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Dashboard
      </Typography>
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">{card.label}</Typography>
                <Typography variant="h4">{card.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
