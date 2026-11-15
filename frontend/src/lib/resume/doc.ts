import { emptyData, normaliseData, SAMPLE_DATA } from "./defaults";
import { normaliseDesign } from "./design";
import { DEFAULT_TEMPLATE_ID, getTemplate } from "./templates";
import type { ResumeDoc } from "./types";

/** A new, empty resume using a template's own starting design. */
export function newDoc(templateId: string = DEFAULT_TEMPLATE_ID, title = "Untitled resume"): ResumeDoc {
  const template = getTemplate(templateId);
  return { title, templateId: template.id, data: emptyData(), design: template.design };
}

/** The sample content drawn with a template. Used for the gallery and for blank resumes. */
export function sampleDoc(templateId: string): ResumeDoc {
  const template = getTemplate(templateId);
  return { title: "Sample", templateId: template.id, data: SAMPLE_DATA, design: template.design };
}

type ServerResume = { title: string; templateId: string; data: unknown; design: unknown };

/** Builds a valid document from whatever the server returned. */
export function docFromServer(r: ServerResume): ResumeDoc {
  const template = getTemplate(r.templateId);
  return {
    title: r.title,
    templateId: template.id,
    data: normaliseData(r.data),
    design: normaliseDesign(r.design, template.design),
  };
}
