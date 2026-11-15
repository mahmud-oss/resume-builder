import { Suspense } from "react";

import { NewResume } from "@/components/app/NewResume";

export default function NewPage() {
  return (
    <Suspense>
      <NewResume />
    </Suspense>
  );
}
