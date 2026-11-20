import type { Metadata } from "next";

import { Tailor } from "@/components/tailor/Tailor";

export const metadata: Metadata = { title: "Tailor my resume" };

export default function TailorPage() {
  return <Tailor />;
}
