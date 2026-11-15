# Resume Builder Web Application — Product Requirements Document

**AI-Powered Resume, Cover Letter, Portfolio & Career Preparation Platform**
International Release | Multi-language & Multi-currency Ready

| | |
|---|---|
| **Document Owner** | Product Management |
| **Prepared For** | Chief Technology Officer (CTO) |
| **Document Status** | Draft v1.0 — For Review |
| **Version** | 1.0 |
| **Date** | 27 July 2026 |
| **Classification** | Internal / Confidential |

## Version History

| Version | Date | Author | Summary of Changes |
|---|---|---|---|
| 0.1 | 20 Jul 2026 | Product Management | Initial draft based on stakeholder requirements |
| 1.0 | 27 Jul 2026 | Product Management | Full PRD compiled for CTO review — scope, architecture, NFRs, roadmap added |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Target Users & Personas](#3-target-users--personas)
4. [Scope](#4-scope)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [System Architecture Overview](#7-system-architecture-overview)
8. [High-Level Data Model](#8-high-level-data-model)
9. [Subscription & Pricing Structure](#9-subscription--pricing-structure)
10. [Assumptions & Dependencies](#10-assumptions--dependencies)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Release Plan & Milestones](#12-release-plan--milestones)
13. [Open Questions](#13-open-questions)
14. [Appendix — Glossary](#14-appendix--glossary)

---

## 1. Executive Summary

The Resume Builder Web Application is an international, subscription-based SaaS platform that enables job seekers to create, tailor, and optimise professional resumes, cover letters, and portfolios using a combination of guided templates and generative AI (OpenAI API). The platform serves professionals across engineering, medical, and general business disciplines through 50–60 profession-specific templates, and extends beyond resume creation into AI-powered career preparation: job matching, ATS scoring, interview preparation, and expert human resume review.

This document defines the product scope, functional and non-functional requirements, system architecture direction, data model, third-party integrations, success metrics, risks, and phased release plan. It is intended to give engineering leadership (CTO and technical leads) sufficient detail to estimate effort, define technical architecture, and plan sprints.

### 1.1 Problem Statement

Job seekers struggle to produce resumes that are both visually professional and optimised for Applicant Tracking Systems (ATS). Generic resume builders offer limited profession-specific guidance, and manually tailoring a resume and cover letter for each job application is time-consuming. Candidates also lack accessible, affordable interview preparation and expert feedback.

### 1.2 Product Vision

Become the leading international, AI-assisted career document platform — combining professionally designed, profession-specific templates with generative AI to help users create, tailor, and validate resumes, cover letters, and portfolios in minutes, and prepare confidently for interviews.

### 1.3 Key Differentiators

- Profession-specific template library (50–60 templates) spanning Engineering, Medical, and general business roles, rather than generic one-size-fits-all templates.
- End-to-end AI career toolkit in one subscription: tailored resumes, cover letters, job match scoring, ATS checking, and interview preparation — not just a document editor.
- Hybrid AI + human quality assurance via the Resume Review expert feedback feature.
- Resume parsing that allows users to import an existing PDF/DOCX resume and instantly populate a new template, minimising re-entry effort.
- Built for an international audience from day one: multi-currency Stripe billing, localisation-ready UI, and regionally aware ATS/resume guidance.

---

## 2. Goals & Success Metrics

### 2.1 Business Goals

- Launch a subscription-based platform with recurring revenue via weekly, monthly, and yearly Stripe plans.
- Achieve strong free-to-paid conversion by offering a compelling free tier (e.g., limited templates/downloads) and clear upgrade paths at high-value AI features.
- Establish the platform as credible and international, supporting multiple currencies, languages (phased), and profession categories relevant across markets.
- Build a defensible data and AI moat: resume/job-description matching quality that improves conversion and retention.

### 2.2 Success Metrics (KPIs)

| Metric | Target (First 6 Months Post-Launch) | Notes |
|---|---|---|
| Free → Paid conversion rate | ≥ 5% | Measured from signup to first paid subscription |
| Monthly churn rate | < 6% | Tracked per plan (weekly/monthly/yearly) |
| Resume completion rate | ≥ 70% | Users who start a resume and complete/export it |
| Average AI feature usage per paid user / month | ≥ 3 sessions | Tailored Resume, Cover Letter, Job Match, Interview Prep combined |
| ATS Checker → Resume edit rate | ≥ 40% | Users who act on ATS suggestions |
| Page load time (Resume Builder Engine) | < 2.5s (P75) | Time to interactive |
| Platform uptime | ≥ 99.9% | Excluding scheduled maintenance |
| Customer review rating | ≥ 4.5 / 5 | Aggregate across regions |

---

## 3. Target Users & Personas

### 3.1 Primary Personas

**Persona A — Early-Career Engineering Graduate ("Rafi")**
22–26 years old, CSE/EEE/ME/CE graduate applying for first jobs internationally. Needs a professional, ATS-friendly resume fast, has limited resume-writing experience, and wants AI to phrase achievements well.

**Persona B — Mid-Career Professional Switching Roles ("Nadia")**
30–40 years old, has an existing resume but wants to tailor it precisely for each new job application, values time savings from AI tailoring, cover letter generation, and job-match scoring.

**Persona C — Healthcare Professional ("Dr. Amin")**
Doctor, Medical Officer, or Nurse applying domestically or abroad; needs medical-profession-specific resume formatting and terminology, and may need document review by a human expert given the stakes of medical job applications.

**Persona D — Career Coach / Recruiter (Secondary / Future)**
Uses the platform on behalf of clients or candidates ("For Someone Else" flows) to generate tailored resumes, cover letters, and interview prep at scale.

---

## 4. Scope

### 4.1 In Scope (V1 Release)

- Landing page with pricing, reviews, FAQ, and Stripe subscription checkout (Weekly / Monthly / Yearly).
- Resume Templates gallery (50–60 templates) categorised by profession, with tabbed browsing and preview.
- Resume Builder Engine: from-scratch and upload-and-parse flows, dual-pane editing, custom/rearrangeable sections, multi-page support, save/edit-later, PDF/DOCX export.
- Tailored Resume generator (For Myself / For Someone Else) using OpenAI, with PDF/DOCX export.
- Cover Letter generator (For Myself / For Someone Else).
- Job Match analysis (match score, strengths, missing skills, suggestions, ATS insights).
- Interview Preparation generator, including the 10-day preparation plan and profile-fit gating.
- Portfolio Builder with multiple templates and live preview.
- ATS Checker.
- Resume Review by human experts (submission and feedback workflow).
- Resume Guidelines content hub (ATS guidelines and resume-writing guidelines).
- Account management, authentication, and subscription/billing management.

### 4.2 Out of Scope (V1 — Candidates for Later Phases)

- Native mobile applications (iOS/Android) — V1 is responsive web only.
- Team/enterprise/recruiter multi-seat accounts and white-labelling.
- In-app real-time chat with resume experts (V1 uses asynchronous submission/feedback).
- Full multi-language UI localisation (V1 ships in English with an internationalisation-ready architecture; additional languages phased in).
- Job board integrations / one-click job applications.
- LinkedIn profile import/sync.

---

## 5. Functional Requirements

Requirements are prioritised as **P0** (must-have for launch), **P1** (important, launch or fast-follow), and **P2** (nice-to-have / later phase).

### 5.1 Landing Page / Home Screen

- Hero section with product introduction and primary call-to-action (Get Started / Sign Up).
- Feature list section summarising all major modules (Resume Builder, Tailored Resume, Cover Letter, Job Match, Interview Prep, Portfolio, ATS Checker, Resume Review).
- "How It Works" section (step-by-step: choose template → build/upload → tailor with AI → export).
- Pricing Plans section integrated with Stripe Subscriptions: Weekly, Monthly, Yearly plans, with feature comparison and a visible "best value" plan.
- User Reviews section displaying approximately 50 customer reviews (curated/seeded initially, later user-submitted and moderated).
- FAQ section (accordion-style), covering billing, template usage, AI accuracy/data privacy, and export formats.

| ID | Requirement | Priority |
|---|---|---|
| LP-01 | Display responsive hero, feature list, how-it-works, pricing, reviews, and FAQ sections | P0 |
| LP-02 | Stripe Checkout / Billing Portal integration for plan purchase and self-service plan management | P0 |
| LP-03 | Plan comparison table (Weekly / Monthly / Yearly) with feature gating shown clearly | P0 |
| LP-04 | Reviews carousel/grid with rating, name, role, and profession tag; supports pagination | P1 |
| LP-05 | FAQ content manageable via CMS/admin without a code deploy | P1 |

### 5.2 Resume Templates & Resume Builder Engine

**5.2.1 Template Gallery**

- Templates organised by profession category (CSE, EEE, ME, CE, System Engineer, Doctor, Medical Officer, Nurse, Agriculture, HR, Administration, and additional categories).
- Tab-based category switcher; vertically scrollable template grid within each tab.
- Template preview (modal or dedicated preview page) before selection.
- Selecting a template routes the user into the Resume Builder Engine with that template pre-applied.

**5.2.2 Resume Builder Engine**

- Entry choice: "Upload existing resume" (PDF/DOCX) or "Start from scratch."
- Resume Parser extracts structured data (contact info, summary, experience, education, skills, certifications, projects) from an uploaded PDF/DOCX and maps it into the selected template's fields.
- Split-screen editor: left-side structured form (all resume fields, added/removed as sections), right-side live template preview.
- In-place (WYSIWYG) editing directly within the preview pane, synchronised with the form.
- Section management: add custom sections, remove existing sections, drag-and-drop reordering of sections.
- Multi-page support (2, 3+ pages) with automatic pagination and manual page-break control.
- Autosave to the database at defined intervals and on field blur; manual "Save" action; versioned resumes tied to a Template ID so the resume can be reopened and edited later.
- Export to PDF (print-accurate) and DOCX (editable, structurally faithful to the template).

| ID | Requirement | Priority |
|---|---|---|
| RB-01 | Profession-category tabbed template gallery with preview and selection | P0 |
| RB-02 | Upload & parse existing resume (PDF/DOCX) into selected template | P0 |
| RB-03 | Dual-pane builder: form fields (left) + live preview (right) | P0 |
| RB-04 | Direct in-preview editing kept in sync with form state | P1 |
| RB-05 | Add / remove / reorder resume sections, including custom sections | P0 |
| RB-06 | Multi-page resume support with automatic + manual pagination | P0 |
| RB-07 | Save resume data + Template ID to database; resumable editing later | P0 |
| RB-08 | Export to PDF and DOCX, matching the on-screen template design | P0 |
| RB-09 | Parser accuracy fallback: flag low-confidence fields for manual user review after parsing | P1 |
| RB-10 | Undo/redo within the builder session | P2 |

### 5.3 Tailored Resume (AI)

- Entry point offers "For Myself" (uses saved profile) or "For Someone Else" (upload a PDF/DOCX resume).
- User uploads or pastes the target Job Description.
- OpenAI API analyses the job description against the profile/uploaded resume, then generates a tailored resume that emphasises the most relevant skills and experience for that specific job, restructures/rewrites bullet points, and optimises keyword coverage for ATS relevance.
- Output rendered in the selected template design, downloadable as PDF or editable DOCX.
- Additional AI tabs available alongside the tailored resume for the same job description: Cover Letter, Job Match, Interview Preparation — sharing the same job-description context so the user does not need to re-upload it.

| ID | Requirement | Priority |
|---|---|---|
| TR-01 | "For Myself" / "For Someone Else" flow selection | P0 |
| TR-02 | Job description upload (file) or paste (text) input | P0 |
| TR-03 | OpenAI-driven tailoring: relevance analysis, rewrite, keyword optimisation | P0 |
| TR-04 | Rendered tailored resume in chosen template; PDF and editable DOCX export | P0 |
| TR-05 | Shared job-description context across Cover Letter / Job Match / Interview Prep tabs in the same session | P1 |
| TR-06 | Regenerate / refine tailored output with user feedback (e.g. "make it more concise") | P1 |

### 5.4 Cover Letter

- For Myself / For Someone Else selection, consistent with Tailored Resume flow.
- Job description upload; OpenAI generates a tailored, professional cover letter referencing the candidate's relevant experience and the target role/company.
- Preview pane with copy-to-clipboard, and export as PDF/DOCX.

| ID | Requirement | Priority |
|---|---|---|
| CL-01 | For Myself / For Someone Else selection with resume/profile source | P0 |
| CL-02 | Job description input and OpenAI-generated cover letter | P0 |
| CL-03 | Preview, copy, and export (PDF/DOCX) | P0 |
| CL-04 | Tone/length adjustment controls (e.g. formal, concise, enthusiastic) | P2 |

### 5.5 Job Match

- For Myself / For Someone Else selection; resume and job description supplied as required.
- OpenAI analysis returns: Overall Match Score, Matching Skills, Missing Skills, Improvement Suggestions, and ATS Compatibility Insights.
- Results presented visually (e.g. score gauge, skill tag lists) and are actionable — user can jump directly into the Resume Builder to address gaps.

| ID | Requirement | Priority |
|---|---|---|
| JM-01 | For Myself / For Someone Else with resume + job description inputs | P0 |
| JM-02 | OpenAI-generated match score, matching/missing skills, suggestions, ATS insights | P0 |
| JM-03 | Deep-link from Job Match results into Resume Builder to apply suggested edits | P1 |
| JM-04 | Downloadable Job Match report (PDF) | P2 |

### 5.6 Interview Preparation

- User uploads/pastes a job description; system evaluates fit against the user's profile.
- If suitable: generate a detailed 10-day interview preparation plan covering technical topics, HR interview prep, coding practice (where applicable to the role), behavioural questions, and company research tasks, broken into daily preparation tasks.
- If not suitable: display a clear message — "This job does not appear to match your profile. Therefore, an interview preparation plan cannot be generated." — with guidance to adjust profile/resume or choose a different role.
- All generated content downloadable as PDF/DOCX.

| ID | Requirement | Priority |
|---|---|---|
| IP-01 | Job description input and profile-fit evaluation via OpenAI | P0 |
| IP-02 | 10-day preparation plan generation (technical, HR, coding, behavioural, company research, daily tasks) | P0 |
| IP-03 | Explicit rejection message when profile fit is insufficient | P0 |
| IP-04 | Export preparation plan as PDF/DOCX | P1 |
| IP-05 | Progress tracking / checklist against the 10-day plan | P2 |

### 5.7 Portfolio Builder

- Multiple portfolio website templates, browsable with live preview.
- Portfolio Builder Engine auto-populates content from the user's saved profile after template selection.
- Editing capabilities: text/content edits, colour theme changes, add/remove/reorder sections, live preview of all changes.

| ID | Requirement | Priority |
|---|---|---|
| PB-01 | Portfolio template gallery with live preview | P0 |
| PB-02 | Auto-population from saved profile on template selection | P0 |
| PB-03 | Edit content, change colour theme, add/remove/reorder sections with live preview | P0 |
| PB-04 | Publish portfolio to a shareable hosted URL | P1 |
| PB-05 | Custom domain mapping for portfolio | P2 |

### 5.8 ATS Checker

- User uploads a resume; OpenAI analyses ATS Score, formatting issues, missing keywords, readability, and section quality.
- Results clearly segmented into what is correct vs. what needs improvement, with specific, actionable guidance to raise the ATS score.

| ID | Requirement | Priority |
|---|---|---|
| ATS-01 | Resume upload and OpenAI-driven ATS analysis | P0 |
| ATS-02 | ATS score, formatting issues, missing keywords, readability, section quality output | P0 |
| ATS-03 | Clear "correct vs. needs improvement" presentation with actionable fixes | P0 |
| ATS-04 | Re-check flow after applying suggested edits in the Resume Builder | P1 |

### 5.9 Resume Review (Human Expert)

- User submits a resume for review by a professional resume expert.
- Experts (internal team or vetted freelance reviewers) provide structured feedback: resume feedback, ATS improvement suggestions, writing recommendations, and design recommendations.
- Requires an expert-facing review queue/dashboard (internal tool) and a user-facing submission and feedback-viewing flow, including turnaround-time expectations and status tracking (Submitted → In Review → Completed).

| ID | Requirement | Priority |
|---|---|---|
| RR-01 | Resume submission flow for expert review, with plan-based eligibility/limits | P0 |
| RR-02 | Internal expert dashboard: review queue, assignment, structured feedback entry | P0 |
| RR-03 | User-facing status tracking and feedback delivery notification (email/in-app) | P0 |
| RR-04 | SLA configuration (target turnaround time) per plan tier | P1 |

### 5.10 Resume Guidelines (Content Hub)

- ATS Resume Guidelines section answering the specified questions (what is ATS-friendly, how ATS scans/ranks, required sections, optimisation tips, PDF compatibility, best ATS builder, etc.).
- Resume Building Guidelines section (best practices, common mistakes, checklist, formatting tips, skills/experience/education/summary writing guides, action verbs, industry-specific tips).
- Content managed via CMS for SEO and easy updates; internally linked to relevant builder/ATS Checker features as calls-to-action.

| ID | Requirement | Priority |
|---|---|---|
| RG-01 | ATS Guidelines content section covering all specified topics | P0 |
| RG-02 | Resume Building Guidelines content section covering all specified topics | P0 |
| RG-03 | CMS-managed content with SEO metadata per article | P1 |
| RG-04 | Contextual CTAs linking guideline articles to relevant product features | P1 |

### 5.11 Account, Profile & Subscription Management

- Sign up / login (email + password, and social login e.g. Google) and secure session management.
- User Profile: the canonical source of "For Myself" data used across Tailored Resume, Cover Letter, Job Match, Interview Prep, and Portfolio Builder.
- Subscription management: view current plan, upgrade/downgrade/cancel, invoices/receipts, via Stripe Billing Portal.
- Usage limits and feature gating per plan tier (e.g. number of AI generations, number of expert reviews, number of exports).

| ID | Requirement | Priority |
|---|---|---|
| AC-01 | Authentication (email/password + at least one OAuth provider) | P0 |
| AC-02 | Central user profile feeding all "For Myself" AI/document flows | P0 |
| AC-03 | Stripe subscription lifecycle: create, upgrade/downgrade, cancel, renew, dunning on failed payment | P0 |
| AC-04 | Plan-based feature gating and usage quota enforcement | P0 |
| AC-05 | Account deletion / data export (privacy compliance) | P0 |

---

## 6. Non-Functional Requirements

### 6.1 Performance & Scalability

- Core pages (Landing, Template Gallery) must achieve P75 load time under 2.5 seconds on a standard broadband connection.
- Resume Builder Engine must render live preview updates within 150ms of a form edit (client-side rendering, debounced persistence).
- System must support horizontal scaling of the application tier and background AI-job workers independently, to absorb spikes in AI generation demand.
- AI generation requests (Tailored Resume, Cover Letter, Job Match, Interview Prep, ATS Checker) should be processed asynchronously with progress indicators; target P95 completion under 20 seconds per generation.

### 6.2 Availability & Reliability

- Target uptime: 99.9% monthly, excluding scheduled maintenance windows communicated in advance.
- Graceful degradation: if the OpenAI API is unavailable or rate-limited, the Resume Builder (non-AI features) must remain fully functional; AI features should queue or clearly report temporary unavailability.
- Automated backups of the database (minimum daily, with point-in-time recovery) and of user-uploaded documents.

### 6.3 Security

- All traffic served over HTTPS/TLS; encryption at rest for uploaded resumes, generated documents, and PII.
- Role-based access control distinguishing end users, resume-review experts, content/CMS admins, and system admins.
- Secure handling of payment data — no card data touches application servers; Stripe-hosted checkout/elements only, per PCI-DSS SAQ-A scope.
- Rate limiting and abuse protection on AI endpoints and file uploads (file type/size validation, malware scanning on uploads).
- Secrets (OpenAI API keys, Stripe keys) managed via a secrets manager, never committed to source control.

### 6.4 Privacy & Compliance

- GDPR compliance for EU users: lawful basis for processing, data subject access/deletion requests, data processing agreement with OpenAI and Stripe as sub-processors.
- CCPA compliance for California users, and general applicability of comparable data-protection practices across supported regions given the international nature of the product.
- Clear disclosure that resume/job-description content may be processed by a third-party AI provider (OpenAI); avoid retaining sensitive personal data in AI prompts beyond what is necessary.
- Configurable data retention policy for uploaded documents and AI-generated outputs.

### 6.5 Internationalisation & Localisation

- V1 ships in English with an internationalisation (i18n)-ready front-end architecture (externalised strings, locale-aware date/number formatting) to support additional languages in later phases.
- Multi-currency support in Stripe pricing (at minimum USD, with regional currency display) and locale-aware tax/VAT handling where required.
- Resume/CV formatting conventions should be adaptable to regional norms (e.g. inclusion/exclusion of photo, date formats, address formats) where relevant to target markets.

### 6.6 Accessibility

- Target WCAG 2.1 AA conformance across core flows (landing page, builder, checkout): keyboard navigation, sufficient colour contrast, alt text, semantic markup.

### 6.7 Browser & Device Support

- Latest two versions of Chrome, Safari, Edge, and Firefox; responsive layouts for desktop, tablet, and mobile web (the Resume Builder Engine's dual-pane layout should adapt to a tabbed/stacked layout on smaller viewports).

---

## 7. System Architecture Overview

The following is a proposed high-level architecture direction for engineering to validate and refine. Final technology choices remain at the CTO/engineering team's discretion.

### 7.1 High-Level Components

| Layer | Responsibility | Suggested Approach |
|---|---|---|
| Web Client | Landing page, template gallery, builder UI, dashboards | Modern SPA/SSR framework (e.g. React/Next.js) for SEO on marketing pages + rich interactivity in the builder |
| API Layer | Business logic, auth, resume/portfolio CRUD, orchestration of AI jobs | REST or GraphQL API, service-oriented (Node.js/NestJS, or equivalent stack per team expertise) |
| AI Orchestration Service | Builds prompts, calls OpenAI API, post-processes/validates responses, manages retries & cost | Dedicated service/worker layer, decoupled from the main API for independent scaling |
| Document Generation Service | Renders resumes/portfolios/AI outputs to PDF and DOCX matching template design | Template-driven rendering engine (e.g. HTML/CSS to PDF, and a DOCX generation library) shared by manual and AI-generated content |
| Resume Parsing Service | Extracts structured fields from uploaded PDF/DOCX resumes | Text extraction + structured-field parsing (rule-based + AI-assisted) with confidence scoring |
| Background Job Queue | Async processing for AI generation, parsing, exports, email | Message queue / job workers (e.g. Redis-backed queue) for scalability and resilience |
| Database | Users, profiles, resumes, templates, portfolios, subscriptions, reviews, content | Relational database (e.g. PostgreSQL) for structured data; object storage for files |
| File/Object Storage | Uploaded resumes, generated PDFs/DOCX, template assets, portfolio media | Cloud object storage (e.g. S3-compatible) with signed URLs |
| Payments | Subscription billing, invoicing, plan management | Stripe Billing + Stripe Customer Portal |
| CMS | FAQ, Resume Guidelines articles, Reviews content | Headless CMS or admin-managed database tables |
| Admin / Expert Portal | Resume Review queue and feedback authoring | Internal web application with RBAC |

### 7.2 Third-Party Integrations

- **OpenAI API** — powers Tailored Resume, Cover Letter, Job Match, Interview Preparation, ATS Checker, and parsing assistance. Requires prompt/version management, cost monitoring, and content-safety filtering.
- **Stripe** — subscription billing (Weekly/Monthly/Yearly), Checkout, Customer Portal, and webhooks for subscription lifecycle events (payment success/failure, cancellation, renewal).
- **Transactional email provider** — account verification, billing receipts, resume-review status updates, AI-generation completion notices.
- **Optional**: analytics/product-usage platform, error monitoring (e.g. Sentry-class tooling), and CDN for static/template assets.

### 7.3 AI Prompt & Cost Governance

- Centralised prompt templates per feature (Tailored Resume, Cover Letter, Job Match, Interview Prep, ATS Checker, Parsing) with version control, so prompt changes are tracked and testable.
- Token-usage monitoring and per-user/per-plan quota enforcement to control OpenAI API cost exposure.
- Output validation layer to catch malformed/incomplete AI responses before they reach the document generator, with automatic retry and a user-facing fallback message on repeated failure.
- Basic content-safety checks on AI outputs before rendering (e.g. no fabricated credentials/claims beyond source content, no inappropriate content).

---

## 8. High-Level Data Model

Illustrative core entities — final schema to be defined by engineering during technical design.

| Entity | Key Attributes | Notes |
|---|---|---|
| User | id, email, auth provider, name, locale, created_at | Root identity; linked to Profile and Subscription |
| Profile | user_id, contact info, summary, experience[], education[], skills[], certifications[], projects[] | Canonical "For Myself" data source |
| Template | id, name, category (profession), preview_asset, layout_schema | Powers both Resume and Portfolio galleries (separate template sets) |
| Resume | id, user_id, template_id, sections[], page_count, status, updated_at | One or more per user; reopened for editing via Template ID reference |
| TailoredResume | id, resume_id/profile_id, job_description_id, ai_output, created_at | Linked to source job description for reuse across AI tabs |
| JobDescription | id, user_id, source_text, uploaded_file_ref, created_at | Shared context object for Tailored Resume, Cover Letter, Job Match, Interview Prep |
| CoverLetter | id, user_id, job_description_id, ai_output | |
| JobMatchReport | id, user_id, job_description_id, score, matching_skills[], missing_skills[], suggestions[] | |
| InterviewPrepPlan | id, user_id, job_description_id, fit_status, daily_tasks[] | fit_status gates plan generation |
| Portfolio | id, user_id, template_id, sections[], theme, published_url | |
| ATSReport | id, user_id, resume_ref, score, issues[], keywords_missing[] | |
| ResumeReview | id, user_id, resume_ref, expert_id, status, feedback, submitted_at, completed_at | |
| Subscription | id, user_id, stripe_customer_id, plan, status, current_period_end | Synced via Stripe webhooks |
| Review (Testimonial) | id, author_name, profession, rating, content, featured | Landing-page customer reviews |
| GuidelineArticle | id, category, title, slug, body, seo_meta | CMS-managed content |

---

## 9. Subscription & Pricing Structure

Exact pricing figures are a business/finance decision; the structure below defines the plan mechanics for engineering to build against.

| Plan | Billing Cycle | Suggested Positioning |
|---|---|---|
| Weekly | Billed every 7 days | Low-commitment entry point for short, active job-search bursts |
| Monthly | Billed every 30 days | Core plan for standard job-search duration |
| Yearly | Billed annually | Best value, targeted at long-term users and career coaches; discounted vs. monthly-equivalent |

- All plans processed via Stripe Subscriptions with Stripe Checkout for purchase and the Stripe Customer Portal for self-service upgrade/downgrade/cancel.
- A limited free tier is recommended (e.g. access to template gallery and basic builder, capped AI generations) to drive top-of-funnel signups and conversion.
- Feature gating matrix (templates access, AI generation quota, exports, expert reviews) to be finalised jointly by Product and Finance and enforced server-side by plan tier.
- Stripe webhooks must drive subscription state in the application database (source of truth reconciliation) to avoid feature access drifting out of sync with billing status.

---

## 10. Assumptions & Dependencies

- OpenAI API access, quota, and pricing terms are available and budgeted for the anticipated usage volume across all AI-powered features.
- Stripe is approved for use in all target launch markets, including required currency and tax/VAT handling.
- A pool of professional resume-review experts (internal hires or vetted freelancers) will be available at launch to service the Resume Review feature within committed SLAs.
- Initial 50–60 templates (design + layout schema) will be produced by a design team ahead of/alongside engineering build-out; template production is a parallel workstream, not solely an engineering task.
- Approximately 50 customer reviews for the landing page will be sourced via beta users, seed content, or partner testimonials prior to public launch.
- Legal/compliance review (Terms of Service, Privacy Policy, AI usage disclosures, refund policy) is completed before public launch.

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OpenAI API cost scales faster than subscription revenue | High | Per-plan AI usage quotas, prompt/token optimisation, usage monitoring & alerting, caching of repeated analyses |
| Resume parser produces inaccurate extraction from varied resume formats/layouts | Medium | Confidence scoring with manual-review prompts; continuous improvement using parsing failure telemetry |
| AI-generated content contains inaccuracies or fabricated claims | High | Constrain prompts to source-provided facts only; validation layer; clear user disclaimer to review before submitting to employers |
| Data privacy concerns given sensitive personal/career data processed by a third-party AI | High | Transparent privacy policy, data minimisation in prompts, DPAs with OpenAI/Stripe, regional compliance (GDPR/CCPA) |
| Template rendering fidelity differs between preview, PDF, and DOCX outputs | Medium | Shared rendering pipeline / single source of truth per template; automated visual regression testing across export formats |
| Resume-review expert capacity cannot meet SLA at scale | Medium | Tiered SLAs by plan, waitlist/queue transparency, freelance reviewer pool that scales elastically |
| International payment/tax complexity delays launch | Medium | Leverage Stripe Tax and phased market rollout, starting with a small set of well-supported countries/currencies |

---

## 12. Release Plan & Milestones

Phased delivery is recommended so core resume-building value ships first, with AI career-toolkit features following once the core engine and data model are stable.

### Phase 1 — MVP (Core Resume Platform)

- Landing page (excluding full 50-review set), authentication, user profile.
- Template gallery (initial subset of templates, expanding toward 50–60) and Resume Builder Engine (from-scratch + upload/parse, dual-pane editing, sections, multi-page, save, PDF/DOCX export).
- Stripe subscription billing (Monthly plan first, Weekly/Yearly to follow).
- Resume Guidelines content hub (initial article set).

### Phase 2 — AI Career Toolkit

- Tailored Resume, Cover Letter, Job Match, ATS Checker.
- Interview Preparation (10-day plan generator with fit-gating).
- Full Weekly/Yearly plan rollout and plan-based feature gating refinement.

### Phase 3 — Portfolio & Expert Services

- Portfolio Builder (templates, engine, publishing).
- Resume Review expert workflow (submission, expert dashboard, feedback delivery).
- Full landing-page review set (~50 reviews), expanded template library to 50–60.

### Phase 4 — Scale & International Expansion

- Additional language localisation, expanded currency/tax coverage.
- Advanced analytics, A/B testing on pricing/conversion, referral/affiliate program (if pursued).
- Performance hardening and cost optimisation based on production AI-usage data.

---

## 13. Open Questions

- What is the final pricing for Weekly/Monthly/Yearly plans, and which features are gated per tier?
- Which countries/currencies are in scope for launch, and are there region-specific compliance requirements (e.g. data residency)?
- Will resume-review experts be in-house staff, contracted freelancers, or a hybrid — and what SLA is committed per plan?
- Is a free tier required at launch, and if so, what are its exact limits?
- What is the target OpenAI model and expected monthly token budget, and does this need reservation/enterprise terms with OpenAI given anticipated volume?
- Should portfolio publishing use a platform subdomain (e.g. username.platform.com) or support custom domains at launch?

---

## 14. Appendix — Glossary

| Term | Definition |
|---|---|
| ATS | Applicant Tracking System — software used by employers to scan, parse, and rank resumes before human review. |
| Template ID | Unique identifier linking a saved resume/portfolio to the specific design template it uses. |
| Resume Parser | System component that extracts structured data from an uploaded resume file (PDF/DOCX) into template fields. |
| Tailored Resume | A resume automatically customised by AI to align with a specific job description. |
| Job Match Score | AI-generated percentage indicating how well a resume aligns with a given job description. |
| Fit Gating | Logic that determines whether a user's profile is suitable enough for a job to generate an Interview Preparation plan. |
| DPA | Data Processing Agreement — a contract governing how a third-party processor (e.g. OpenAI, Stripe) handles personal data. |
