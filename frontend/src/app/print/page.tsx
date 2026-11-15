import type { Metadata } from "next";

import { PrintView } from "@/components/resume/PrintView";

export const metadata: Metadata = { title: "Print", robots: { index: false, follow: false } };

/**
 * Not a page for people. The PDF exporter opens it, hands it a resume, and prints it.
 * It holds no data of its own.
 */
export default function PrintPage() {
  return <PrintView />;
}
