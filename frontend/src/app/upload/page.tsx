import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadResume } from "@/components/app/UploadResume";

export const metadata: Metadata = { title: "Upload your CV" };

export default function UploadPage() {
  return (
    <Suspense>
      <UploadResume />
    </Suspense>
  );
}
