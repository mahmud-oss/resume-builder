import type { Metadata } from "next";

import { Landing } from "@/components/landing/Landing";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name}: a CV that gets read` },
  description:
    "Build your CV by chatting in Bangla, Banglish or English, or upload the one you have. Check it for ATS, match it to a job and tailor it, with AI that only uses facts you gave it.",
};

export default function Home() {
  return <Landing />;
}
