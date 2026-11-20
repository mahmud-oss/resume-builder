import type { Metadata } from "next";

import { JobMatch } from "@/components/match/JobMatch";

export const metadata: Metadata = { title: "Job match" };

export default function JobMatchPage() {
  return <JobMatch />;
}
