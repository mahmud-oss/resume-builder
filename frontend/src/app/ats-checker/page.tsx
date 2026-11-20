import type { Metadata } from "next";

import { AtsChecker } from "@/components/ats/AtsChecker";

export const metadata: Metadata = { title: "ATS checker" };

export default function AtsCheckerPage() {
  return <AtsChecker />;
}
