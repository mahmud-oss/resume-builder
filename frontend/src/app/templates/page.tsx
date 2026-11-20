import type { Metadata } from "next";

import Link from "next/link";

import { TemplateGallery } from "@/components/templates/TemplateGallery";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Choose a template</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Pick a design to start. You can change it at any time without losing anything you have written.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Already have a CV?{" "}
        <Link href="/upload" className="font-medium text-brand hover:underline">
          Upload it
        </Link>{" "}
        and we will fill the template for you.
      </p>
      <TemplateGallery />
    </main>
  );
}
