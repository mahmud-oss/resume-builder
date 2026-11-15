# Resume Builder — Product Requirements Document (Draft v2)

**AI-assisted resume builder for Bangladesh, with a path to international markets**

| | |
|---|---|
| **Document Owner** | Product Management (owner to be named) |
| **Status** | **Draft for review. Not final. Not yet split into phases.** |
| **Version** | 2.0-draft |
| **Date** | 3 November 2026 |
| **Supersedes** | `Resume_Builder_PRD.md` (v1.0, 27 July 2026), which is out of date |
| **Companion document** | `PRD_Discussion_Notes.md`, the working record of the decisions and reasoning behind this draft |
| **Classification** | Internal / Confidential |

> **How to read this draft.** Every requirement has a **Status**: **Decided** means the product team agreed it in discussion; **Proposed** means it was suggested and not objected to but not explicitly confirmed; **Open** means a decision is still needed. Nothing here is validated with customer research. Items that rest on an assumption say so.

## Contents

1. Document Overview
2. Background and Context
3. Problem Statement
4. Business Objectives
5. Customer Segments
6. User Needs
7. Product Goals
8. Non-Goals and Deferred Items
9. Proposed Solution (overview)
10. User Experience and User Flows
11. Functional Requirements
12. Non-Functional Requirements
13. User Stories and Acceptance Criteria
14. Edge Cases
15. Dependencies
16. Risks and Mitigations
17. Analytics and Tracking Requirements
18. Launch and Rollout Plan
19. Success Metrics
20. Open Questions
21. Appendix A — Coverage of the Previous PRD
22. Appendix B — Glossary

---

## 1. Document Overview

This document defines a web product that helps job seekers in Bangladesh create a professional resume, and then use AI to tailor it to jobs, write cover letters, check it for applicant-tracking-system (ATS) readability, prepare for interviews, and publish a portfolio website. Users pay in small amounts for AI help (credits) and to export.

It is written for product, engineering and design leads. It describes **what** the product must do and **why**, and avoids prescribing technology except where a decision has been made.

**What is in this draft:** all features agreed in discussion so far. **What is not:** a split into delivery phases (deliberately left for a later discussion), exact pricing, the payment provider, and a final template list.

---

## 2. Background and Context

- The previous PRD (v1.0) described a subscription product for an international audience with 50–60 profession-specific templates, Stripe billing, DOCX export, a human expert review service, and no conversational builder.
- Discussion since then changed the direction. **Bangladesh is the launch market**; international comes later. The product is built around **three ways to create a resume**, one of which is a **conversational AI builder** and is the main differentiator. **Pricing is pay-per-use credits**, not weekly/monthly/yearly plans. The launch template set is **5–6 templates**.
- **Benchmark referenced in discussion:** FlowCV (an online resume builder known for a clean editor and design controls). The team wants a similar editing experience. Competitor features in this document come from general knowledge and have not been verified against the live site.

**Assumptions about context (not validated):**
- A meaningful group of users, such as fresh graduates, do not have a CV or struggle to write one, and will pay for AI help.
- Users will accept a mix of free exploration and paid actions.

---

## 3. Problem Statement

Job seekers have trouble producing a CV that looks professional and reads well, and tailoring it for each job takes time. Some, such as people applying for a first job, have no CV at all or find it hard to describe their experience in good professional English.

*Source: this restates the problem in the previous PRD and the team's reasoning during discussion. It has not been tested with customer research.*

---

## 4. Business Objectives

| Objective | Notes |
|---|---|
| Earn revenue from pay-per-use AI help and paid export | Credit model; exact prices undecided |
| Convert free explorers into paying users | Users can explore templates freely; export and AI beyond a free allowance need payment |
| Establish a clear differentiator: AI that builds a CV from a conversation in Bangla or Banglish | The chat builder is the main differentiator per the team |
| Keep AI cost below revenue per user | The main commercial risk (see Risks) |
| Prepare to expand internationally | Architecture should be ready for more languages and currencies; not in the launch scope |

---

## 5. Customer Segments

*These are working hypotheses, not research findings.*

| Segment | Description | Main need |
|---|---|---|
| **Fresh graduates and first-time job seekers** (primary) | Often no CV; may find it hard to write well in English | A finished, professional CV with AI doing the writing |
| **Job seekers with an existing CV** | Have a CV in PDF or DOCX | Convert it into a better template quickly, then tailor it to jobs |
| **Job seekers applying to specific roles** | Have a resume, apply to many jobs | Tailored resume, cover letter, job-fit check, ATS check, interview preparation |
| **Technical or creative users** | Want a public portfolio | A portfolio site built from the resume |

**Not a target:** career coaches or recruiters working on behalf of other people ("For Someone Else"). See Non-Goals.

---

## 6. User Needs

| Need | Served by |
|---|---|
| "I don't have a CV." | AI chat builder |
| "I have a CV but it looks bad, or I don't want to retype it." | Upload and convert, then template |
| "I don't write well in English." | AI chat in Bangla or Banglish; AI-drafted text the user can edit |
| "I want to control how it looks." | Template choice, design controls, section toggles |
| "I need my CV to suit this job." | Job Match, Tailored Resume, Cover Letter |
| "Will an ATS read my CV?" | ATS Checker |
| "I have an interview coming." | Interview Prep |
| "I want somewhere to show my work." | Portfolio |
| "Where are the jobs?" | Job list |

---

## 7. Product Goals

1. A user with no CV can finish a professional CV through a conversation.
2. A user with an existing CV can convert it into a template with little retyping.
3. The user always has final control: everything the AI writes can be edited.
4. The product is honest about AI: it uses only facts the user provides and tells users to verify the output.
5. Free exploration builds trust before the user pays.
6. The team can see who is using the product and who has paid, and can support them.

---

## 8. Non-Goals and Deferred Items

### Non-goals (decided: not part of this product for now)
- **"For Someone Else" flows** (running AI features on another person's CV, for coaches or recruiters).
- Team, enterprise or multi-seat accounts.
- Native mobile apps (the product is a web application).
- In-platform job applications (applying happens on the employer's site).
- Job recommendations (the job list is a simple filtered table).

### Deferred (decided: later, not in the initial scope)
| Item | Notes |
|---|---|
| **DOCX export** | Export is PDF only at first. Likely the first export request after launch |
| **Human expert Resume Review** | Needs reviewers, pricing and an SLA; suggested to start manually when revisited |
| **Guidelines hub** (ATS and resume-writing articles) | After launch, multilingual |
| **Photo-of-a-CV upload** (camera image of a printed CV) | Only PDF and DOCX are accepted at first |
| **Phone-number / OTP login and social login** | Email and password only at first |
| **Custom domains for portfolios** | Platform address only at first |
| **Progress tracking in Interview Prep** | No checklist state |
| **Reviews on the landing page** | None at launch; real reviews added later |
| **Multilingual website and resumes** | Website and resume output are English only at first |
| **International release** (more currencies, languages, compliance) | After the Bangladesh launch |
| **More than 5–6 resume templates, and profession categories** | The template architecture should allow growth |

---

## 9. Proposed Solution (overview)

### 9.1 Core idea

The user picks a **template**, then fills it in one of **three ways**. All three write into **one resume data record** that is independent of the template.

| Path | What the user does | Cost |
|---|---|---|
| **Manual** | Types into a form with a live preview | Free to edit; export is paid |
| **Upload** | Uploads a PDF or DOCX; AI converts it into the fields (Bangla CVs supported) | Paid per upload (credits) |
| **AI chat** | Answers an AI's questions in Bangla, Banglish or English; the AI fills the fields | Basics free; AI-written text uses credits |

### 9.2 Features built on the resume

Job Match, Tailored Resume, Cover Letter, ATS Checker, Interview Prep, Portfolio.

### 9.3 Supporting features

Landing page, account, credits and payment, admin panel, job list.

### 9.4 Design principles

- **Content and design are separate.** Templates are views of the data. Switching template never loses data.
- **The user is in control.** Every AI output is a draft the user can accept, regenerate or edit.
- **Facts only.** The AI does not invent information the user did not give.
- **Free to explore, paid to finish.** Browsing and trying is free; export and heavier AI use are paid.

---

## 10. User Experience and User Flows

### 10.1 Main flow: build a resume

1. The user opens the template gallery (public, no account needed).
2. The user picks a template.
3. The user chooses how to fill it: **manual**, **upload** or **chat**.
4. The editor opens with a form on the left and a live preview on the right. The preview can also be edited directly.
5. The user changes design settings, shows or hides fields and sections, and reorders sections.
6. The user exports a PDF (requires payment).

### 10.2 Switching templates

The user can switch template at any time. It happens **instantly, with no confirmation prompt**. Fields the new template needs but the user never provided appear as empty placeholders in the editor with a small, dismissible hint offering to fill them with AI. Placeholders never appear in the exported PDF.

### 10.3 Upload flow

1. The user selects a PDF or DOCX. The price is shown **before** upload.
2. The file is checked (type, size, page count, readable).
3. AI converts it into the resume fields.
4. The editor opens. Low-confidence fields are flagged for review, and a completeness checklist shows what is missing.
5. The user edits by hand or taps **Fill the gaps with AI chat**, which asks only about what is missing.

### 10.4 Chat flow

1. The AI works through topics in a fixed order (for example contact, education, projects, experience, skills, then others the template has), and a **checklist** shows which are complete. The user can skip a question and revisit any topic.
2. As the user answers, the corresponding fields fill in and the preview updates.
3. For items that need writing (for example a project description), the AI writes a draft. The user can **Accept, Regenerate or Edit by hand**.
4. Questions come from the selected template's fields. The user can always add a field.

### 10.5 Job-based flow

1. The user pastes a job description (or picks a job from the job list).
2. The same job description is reused across Job Match, Tailored Resume, Cover Letter and Interview Prep in the session.

### 10.6 Portfolio flow

1. The user picks a portfolio template.
2. The site fills from the resume data once.
3. The user edits, sets what is public, and publishes to a platform address.

---

## 11. Functional Requirements

Priority is **not yet assigned** because the phase split is pending. **Status** shows the level of agreement.

### 11.1 Templates and the resume data record

| ID | Requirement | Status |
|---|---|---|
| TPL-01 | A gallery of **5–6 resume templates**, browsable and previewable without an account | Decided |
| TPL-02 | Selecting a template opens the builder with that template applied | Decided |
| TPL-03 | Templates are defined as data plus a layout definition, so more templates can be added without changing code | Proposed |
| TPL-04 | All resume data is stored in **one record independent of the template** | Decided |
| TPL-05 | The user can switch template at any time, instantly, with **no confirmation prompts** | Decided |
| TPL-06 | Fields the new template needs but the user has not supplied show as empty placeholders with a dismissible "fill with AI" hint | Decided |
| TPL-07 | Placeholders never appear in exported files | Decided |
| TPL-08 | Fields a template does not use stay saved, hidden, not deleted | Decided |
| TPL-09 | Every template includes an **optional photo** field (a photo on the CV is common in Bangladesh; to be confirmed) | Proposed |
| TPL-10 | Every template passes the ATS Checker before release | Proposed |

### 11.2 Editor

| ID | Requirement | Status |
|---|---|---|
| ED-01 | Split view: form on the left, live preview on the right | Decided |
| ED-02 | The preview can be **edited directly** and stays in sync with the form | Decided |
| ED-03 | In-preview editing covers **text content only**; structural changes (add, remove, reorder, hide) use the form and toggles | Decided |
| ED-04 | Add, remove and drag-reorder sections | Decided |
| ED-05 | **Show/hide toggle** per section and per field. Visibility belongs to the data and carries across resume templates | Decided |
| ED-06 | The user can add a **custom field** (label and value) to any section | Decided |
| ED-07 | Custom **sections** (not only fields) | Decided |
| ED-08 | Design controls: **font from a short list**, font size, accent colour, spacing, section order. Each limited to a range that keeps the template intact | Decided |
| ED-09 | Multi-page resumes with automatic pagination (a section heading is never separated from its text) and manual page breaks | Decided |
| ED-10 | Autosave with a visible "saved" indicator, plus manual save; resumes can be reopened later | Decided |
| ED-11 | **Manual profile photo upload** with crop and size validation. No AI. The photo is not extracted from uploaded CVs | Decided |
| ED-12 | Undo/redo | Decided |
| ED-13 | The editor adapts to smaller screens (stacked or tabbed layout) | Proposed |

### 11.3 Export

| ID | Requirement | Status |
|---|---|---|
| EX-01 | Export a resume as **PDF** that matches the preview | Decided |
| EX-02 | Export requires payment; the user cannot export without paying | Decided |
| EX-03 | The price of export is visible from the template and editor stage, not first shown at export | Proposed |
| EX-04 | DOCX export | **Deferred** |
| EX-05 | Whether the preview should be watermarked for unpaid users. **Decide later** | Open |

### 11.4 Path: Upload

| ID | Requirement | Status |
|---|---|---|
| UP-01 | Accept **PDF and DOCX** files only | Decided |
| UP-02 | AI converts the file into the resume fields | Decided |
| UP-03 | Upload is a **paid** action (credits) | Decided |
| UP-04 | **Charge only when conversion succeeds**; a failed or unreadable file costs nothing | Proposed |
| UP-05 | Show the price before upload | Proposed |
| UP-06 | Support **Bangla CVs**; output is English. Names of people, places and institutions are transliterated, not translated | Decided (Bangla support); Proposed (transliteration) |
| UP-07 | Limit pages per upload (number to be set by testing) | Proposed |
| UP-08 | Flag low-confidence fields for review | Proposed |
| UP-09 | Text that fits no field is kept in an "Other" or custom section, never dropped | Proposed |
| UP-10 | If the user uploads a second file into an existing resume, ask whether to replace or merge | Proposed |
| UP-11 | After conversion, offer "Fill the gaps with AI chat" | Decided |
| UP-12 | Let the user delete the uploaded original after conversion | Proposed |
| UP-13 | Photo-of-a-CV (image) upload | **Deferred** |

### 11.5 Path: AI chat

| ID | Requirement | Status |
|---|---|---|
| CH-01 | The chat understands **Bangla, Banglish (Bangla in English letters) and English** | Decided |
| CH-02 | Resume output is **English** | Decided |
| CH-03 | The AI asks about topics in a **fixed order**, with a **checklist** of completed topics. The user can skip or revisit any topic | Decided (order and checklist); Proposed (skip and revisit) |
| CH-04 | Questions are driven by the selected template's fields; the user can add other fields | Decided |
| CH-05 | Fields fill in live as the user answers, and the preview updates | Proposed |
| CH-06 | AI-written text is a **draft**: Accept / Regenerate / Edit by hand. Edit by hand is always free | Decided (edit); Proposed (flow details) |
| CH-07 | Regenerate: a number of free retries per item, then it costs a credit again (starting point 2; to be tested). The user can give feedback ("shorter", "more formal") and return to an earlier draft | Proposed |
| CH-08 | The AI uses **only facts the user stated** and asks when something is missing | Proposed |
| CH-09 | The AI briefly says why it is asking for an unusual field | Proposed |
| CH-10 | A **skip button** in the chat for questions the user does not want to answer | Proposed |
| CH-11 | Collecting basic information (contact, education, simple lists) is **free**; AI-written items use credits | Decided |
| CH-12 | When the user changes template after chatting, collected data is kept (see TPL-05 to TPL-08) | Decided |
| CH-13 | Collect optional portfolio fields (project screenshots, links, "about me") when the user wants a portfolio | Proposed |

### 11.6 Job description input (shared)

| ID | Requirement | Status |
|---|---|---|
| JD-01 | The user supplies a job description as **pasted text** | Decided |
| JD-02 | Job descriptions may be in **any language**, including Bangla | Decided |
| JD-03 | The same job description is reused across Job Match, Tailored Resume, Cover Letter and Interview Prep in a session | Decided |
| JD-04 | Matching is done in English. Explanations are shown in the language the user is chatting in (Bangla or English). The tailored resume stays English | Decided |
| JD-05 | Uploading a JD file, or pasting a job-post link | **Deferred** |

### 11.7 Job Match

| ID | Requirement | Status |
|---|---|---|
| JM-01 | Compare the saved resume with a job description | Decided |
| JM-02 | Output: an overall match **estimate**, matching skills, missing skills, improvement suggestions | Decided |
| JM-03 | The score is shown as a band or labelled estimate and is not presented as a measurement or as what an employer's system will compute | Proposed |
| JM-04 | For each missing skill, the app can ask "Do you have experience with X?"; if yes, the chat records it as a fact | Proposed |
| JM-05 | Link from the results to the editor and to Tailored Resume | Proposed |
| JM-06 | Uses fewer credits than Tailored Resume | Decided |

### 11.8 Tailored Resume

| ID | Requirement | Status |
|---|---|---|
| TR-01 | Create a **new version** of the resume for a given job. The master resume is never overwritten | Decided |
| TR-02 | The AI rewords the summary, reorders skills and rewrites bullets to match the job, **using only facts already in the resume** | Decided (version); Proposed (rules) |
| TR-03 | Show **what changed**; the user accepts or rejects each change | Proposed |
| TR-04 | Refine step (for example "more concise") using Accept / Regenerate / Edit | Proposed |
| TR-05 | If the match is poor, **warn but still allow** (for example, "tailoring can reword what is there but cannot add missing skills") | Decided |
| TR-06 | **No limit** on the number of tailored versions for now; the user can name and delete versions | Decided (no limit); Proposed (naming, deleting) |
| TR-07 | Export as PDF | Decided |

### 11.9 Cover Letter

| ID | Requirement | Status |
|---|---|---|
| CL-01 | Generate a cover letter from the resume and a job description | Decided |
| CL-02 | Same facts-only rule and Accept / Regenerate / Edit flow as other AI features | Decided |
| CL-03 | English only | Decided |
| CL-04 | A few tone choices (for example formal, friendly, concise) inside "regenerate" | Decided |
| CL-05 | Company name and role come from the job description; if missing the AI asks the user. A generic greeting is acceptable; a wrong company name is not | Decided |
| CL-06 | Refer to specific items in the resume so the letter does not read as boilerplate | Decided |
| CL-07 | Preview, copy, export as PDF | Decided |

### 11.10 ATS Checker

| ID | Requirement | Status |
|---|---|---|
| ATS-01 | Check a **saved resume** (one that went through the builder process) and report formatting issues, missing keywords, readability and section quality | Decided |
| ATS-02 | No standalone file upload for ATS checking. A user with an existing CV uploads it through the paid Upload path first | Decided |
| ATS-03 | A job description is **optional**. Without one: general ATS check. With one: keyword check for that job. The page tells the user that adding one gives a keyword check | Decided |
| ATS-04 | Results split into "OK" and "needs improvement", each with a specific fix; the user can edit and re-check | Decided |
| ATS-05 | The score is labelled as an **estimate** | Decided |
| ATS-06 | Where possible use rule-based checks (cheap) and use AI for keyword relevance and writing quality | Proposed |
| ATS-07 | Whether the ATS Checker is free or paid. **Decide later; build as a setting** | **Open** |

### 11.11 Interview Prep

| ID | Requirement | Status |
|---|---|---|
| IP-01 | The user supplies a job description and **chooses how many days** they can invest | Decided |
| IP-02 | AI generates a plan for that many days: technical topics, HR questions, coding practice where relevant, behavioural questions, company research tasks, and daily tasks | Decided |
| IP-03 | If the profile is a poor fit for the job, **warn but still generate** | Decided |
| IP-04 | Generate **day by day**: the user sees day 1 first and can stop | Proposed |
| IP-05 | Use the resume so questions target the user's own projects | Proposed |
| IP-06 | Company research items tell the user **what to research**, not facts about the company | Proposed |
| IP-07 | Say when the plan is generic (for example for non-technical roles) | Proposed |
| IP-08 | Export as PDF | Decided |
| IP-09 | Progress tracking (a checklist) | **Deferred** |

### 11.12 Portfolio

| ID | Requirement | Status |
|---|---|---|
| PF-01 | **2 portfolio templates** | Decided |
| PF-02 | The site is filled from the resume data **once** when created, then stays independent. A manual "re-sync from resume" button updates it | Decided |
| PF-03 | The user edits content, changes the colour theme, adds, removes and reorders sections, with a live preview | Decided |
| PF-04 | Portfolio has its **own public/private setting** per section and field, separate from the resume | Decided |
| PF-05 | Publish to a **platform address** (for example `yourname.platform.com`); the user can unpublish at any time | Decided (platform address); Proposed (unpublish) |
| PF-06 | Phone number and home address are hidden by default; a clear warning is shown before the first publish | Proposed |
| PF-07 | Extra optional fields for portfolios (project screenshots, links, longer project descriptions, "about me") | Proposed |
| PF-08 | Limits on uploaded image size and count | Open |
| PF-09 | A way for admins to unpublish or take down a portfolio | Proposed |
| PF-10 | Custom domains | **Deferred** |
| PF-11 | Whether publishing is free or paid. **Decide later; build as a setting** | **Open** |

### 11.13 Account

| ID | Requirement | Status |
|---|---|---|
| AC-01 | Sign up and log in with **email and password** | Decided |
| AC-02 | A user can browse the template gallery and the job list without an account | Decided |
| AC-03 | Whether a user can try the editor without an account; when an account becomes necessary (for example, only when saving or using AI) | **Decide later.** Build the rule as a setting so it is easy to introduce later |
| AC-04 | There is no separate "profile" page: "For Myself" uses the saved resume data | Proposed |
| AC-05 | **Account deletion removes** the resume data, uploaded files and any published portfolio | Proposed |
| AC-06 | Show the credit balance and a history of what was spent | Proposed |
| AC-07 | Phone/OTP and social login | **Deferred** |

### 11.14 Credits and payment

| ID | Requirement | Status |
|---|---|---|
| PAY-01 | AI help is charged in **credits**. Each AI-written item or upload uses credits | Decided |
| PAY-02 | New users receive a **free starter allowance** of credits | Decided |
| PAY-03 | Basic information collection in the chat is free | Decided |
| PAY-04 | Export requires payment | Decided |
| PAY-05 | Whether starter credits cover export. **Decide later; build as a setting** | Open |
| PAY-06 | Credits are sold in **bundles**, not single small purchases | Proposed |
| PAY-07 | The platform keeps its **own record** of every purchase and credit spent | Proposed |
| PAY-08 | Payment provider, prices, bundle sizes and the credit cost of each action | **Open** |
| PAY-09 | The previous PRD's weekly/monthly/yearly subscription plans are not used unless the team reverses this | Decided |

### 11.15 Admin panel

| ID | Requirement | Status |
|---|---|---|
| ADM-01 | View and search users: signup date, status, credit balance, last activity | Decided (monitor users); Proposed (fields) |
| ADM-02 | View **what each customer has paid** (total and purchase list) | Decided |
| ADM-03 | Admins see **account information only, not resume content** (may be revisited) | Decided |
| ADM-04 | Create, edit, expire and delete **job postings** and manage **tags** | Decided |
| ADM-05 | Grant or adjust credits, recording who did it and why | Proposed |
| ADM-06 | Suspend a user; unpublish a portfolio | Proposed |
| ADM-07 | Show **AI cost per user** next to what the user paid | Proposed |
| ADM-08 | Admin accounts separate from user accounts, with a log of admin actions | Proposed |

### 11.16 Job list

| ID | Requirement | Status |
|---|---|---|
| JB-01 | A **public** section showing jobs in a **simple table** | Decided |
| JB-02 | Admins create tags; users **filter by tags**. Tag groups: profession or category, location, job type, experience level | Decided (tags, filter); Proposed (groups) |
| JB-03 | **No recommendations** | Decided |
| JB-04 | Applying is an **external link** to the employer | Decided |
| JB-05 | Fields per job: title, company, location, job type, experience level, full description, application link, closing date, tags | Proposed |
| JB-06 | Jobs with a passed closing date are hidden automatically | Proposed |
| JB-07 | A "Match my resume" / "Tailor my resume" button on each job passes its description to Job Match or Tailored Resume; login is required only for this action | Proposed |
| JB-08 | When several tags are selected, a job is shown if it matches **any** of them | Decided |

### 11.17 Landing page

| ID | Requirement | Status |
|---|---|---|
| LP-01 | A landing page with hero, features, how it works, pricing, FAQ | Decided |
| LP-02 | **English only** | Decided |
| LP-03 | **No reviews** at launch | Decided |
| LP-04 | The pricing section follows the credit model: what is free, what costs credits, and the price once set. No plans are invented | Proposed |
| LP-05 | The features section leads with the three ways to build a CV | Proposed |
| LP-06 | FAQ is static content edited by developers; no content-management tool at first | Proposed |
| LP-07 | Direct links into the public template gallery and job list | Proposed |

---

## 12. Non-Functional Requirements

*Numbers below are **proposed targets carried over from the previous PRD or suggested here. None has been validated.** They should be confirmed with engineering.*

### 12.1 Performance
- Landing page and template gallery usable quickly on typical mobile connections in Bangladesh (target to be set after testing; the old PRD proposed a 2.5 s P75 load time).
- Live preview updates within about 150 ms of an edit (proposed).
- AI generations run in the background with a progress indicator; target P95 completion under 20 seconds per generation (proposed; the chat is conversational and should respond faster).

### 12.2 Reliability
- If the AI provider is unavailable or rate-limited, non-AI features (manual editing, preview, export, account) keep working; AI features report temporary unavailability clearly.
- Autosave protects against losing work. Regular backups of the database and uploaded files.
- Uptime target to be set (the old PRD proposed 99.9 percent).

### 12.3 Security
- All traffic over HTTPS; personal data and uploaded files encrypted at rest.
- Role-based access: end users and admins at minimum.
- Rate limiting on AI endpoints and uploads; file type and size validation; malware scanning on uploads.
- Secrets kept in a secrets manager, never in source control.
- Payment details are handled by the payment provider, not stored on our servers.

### 12.4 Privacy
- Resumes contain personal data (name, phone, address). Collect and expose the minimum necessary.
- **Disclose clearly** that resume and job-description content is processed by a third-party AI provider, and avoid sending more personal data than needed.
- Account deletion removes data (AC-05); a retention policy for uploaded files and AI outputs is needed.
- **To verify:** legal requirements for personal data in Bangladesh. Not checked.

### 12.5 AI quality and cost
- Keep a central, versioned set of prompts for each AI feature so changes can be tracked and tested.
- Validate AI output before showing it; retry on failure and show a clear message on repeated failure.
- Track usage and cost per user and per action; enforce credit limits server-side.
- Failed AI actions do not consume credits (at least for upload; confirm for others).

### 12.6 Language and localisation
- The product UI is English only; the chat and job descriptions can be in Bangla or Banglish.
- Build so more languages can be added later: user-facing text kept outside the code, language treated as a setting. This is "multilingual-ready", not a claim that more languages are free to add (each needs its own testing).

### 12.7 Accessibility and devices
- Target WCAG 2.1 AA for core flows (proposed).
- Latest two versions of Chrome, Safari, Edge and Firefox.
- **Mobile web is required** (assumption: many users will use phones; to validate).

---

## 13. User Stories and Acceptance Criteria

Representative stories, not exhaustive. Written in Given–When–Then form.

### 13.1 Chat builder

**Story:** As a fresh graduate with no CV, I want an AI to ask me questions in Bangla so that I get a professional English CV without writing it myself.

- **Given** I selected a template and chose Chat, **when** I answer in Bangla or Banglish, **then** the AI understands, asks the next question, and the matching fields and the preview update.
- **Given** the AI asks for a field I do not want to give, **when** I press skip, **then** the AI moves on and the field stays empty.
- **Given** the AI has written a project description, **when** I press Accept, **then** it is saved in the field; **when** I press Regenerate, **then** I get another draft and I can return to the earlier one; **when** I edit by hand, **then** no credits are used.
- **Given** I only told the AI that I "did a project on a website", **when** it writes the description, **then** it does not add technologies, numbers or results that I did not state.
- **Given** the chat is in progress, **when** I switch template, **then** all collected data is kept and any new fields the template needs show as placeholders.

### 13.2 Upload

**Story:** As a job seeker with an existing CV, I want to upload it and have it fill the template so that I do not retype it.

- **Given** I am about to upload, **then** the price is shown before I confirm.
- **Given** I upload a readable PDF or DOCX, **when** conversion succeeds, **then** fields are filled, low-confidence fields are flagged, and a checklist shows what is missing.
- **Given** the file is unreadable, password-protected, too large or not a resume, **when** conversion fails, **then** I see a clear message, I am not charged, and I can retry or switch to manual or chat.
- **Given** my CV is in Bangla, **when** conversion succeeds, **then** the fields are in English, and names of people, places and institutions are transliterated, not translated.
- **Given** content in the file fits no field, **then** it appears in an "Other" or custom section and is not dropped.

### 13.3 Template switching and visibility

**Story:** As a user, I want to try different templates so that I can see which looks best.

- **Given** I have a filled resume, **when** I choose another template, **then** it switches immediately, with no confirmation.
- **Given** the new template has fields I have not filled, **then** they show as placeholders in the editor with a dismissible hint, and **do not appear in the exported PDF**.
- **Given** I hid a field, **when** I switch templates, **then** it stays hidden.

### 13.4 Export and payment

**Story:** As a user, I want to download my resume as a PDF.

- **Given** I have not paid, **when** I try to export, **then** I am asked to pay; I can still edit and preview.
- **Given** I have paid, **when** I export, **then** I get a PDF that matches the preview, with no placeholders.
- **Given** I am using the editor, **then** the price of export is visible before I reach the export step.

### 13.5 Job Match and Tailored Resume

**Story:** As a job seeker, I want to see how well my resume fits a job and then tailor it.

- **Given** I paste a job description (in any language), **when** I run Job Match, **then** I get an estimate, matching skills, missing skills and suggestions, with explanations in my language.
- **Given** a missing skill, **when** I say I have experience with it, **then** it is recorded as a fact.
- **Given** the match is poor, **when** I run Tailored Resume, **then** I see a warning and can continue.
- **Given** I run Tailored Resume, **then** a new version is created, the master resume is unchanged, I see what changed and can accept or reject each change, and no skill that is not in my resume is added.

### 13.6 ATS Checker

- **Given** I have a saved resume, **when** I run the check without a job description, **then** I get a general check and a note that adding a job description gives a keyword check.
- **Given** I do not have a resume on the platform, **then** I am directed to build or upload one first.

### 13.7 Interview Prep

- **Given** I paste a job description, **then** I am asked how many days I can invest.
- **Given** the job is a poor fit, **then** I see a warning and the plan is still generated.
- **Given** a plan is being generated, **then** it appears day by day and I can stop after any day.

### 13.8 Portfolio

- **Given** I pick a portfolio template, **then** it fills from my resume once; later resume changes do not alter it unless I press re-sync.
- **Given** I am about to publish for the first time, **then** I see a warning, and my phone and address are hidden unless I choose to show them.
- **Given** I unpublish, **then** the page is no longer reachable.

### 13.9 Admin and jobs

- **Given** I am an admin, **then** I can see each user's account details and payment history, and I **cannot** see resume content.
- **Given** an admin posts a job with tags and a closing date, **then** it appears in the public table and is filterable by tag; **after the closing date** it disappears.
- **Given** a user presses "Match my resume" on a job, **then** the job description is passed to Job Match and the user need not paste it.

---

## 14. Edge Cases

- **AI provider down or slow:** non-AI features keep working; AI actions show a clear message and do not charge credits.
- **Credits run out mid-chat:** keep the conversation and data so far; the user can top up and continue, or finish by hand.
- **Payment succeeds but credits are not added** (or the reverse): the platform's own record of purchases allows the admin to correct it.
- **Mixed-language input** (Bangla and English in one message, or Banglish with irregular spelling): the AI should still extract the facts; ambiguous input prompts a question.
- **Contradictory answers** in chat (two different graduation years): the AI asks which is correct.
- **Very long or very short resumes:** pagination handles several pages; a very short resume is not stretched.
- **User edits the preview while a regeneration runs:** the user's edit must not be lost.
- **Unsupported or corrupt file, scanned PDF with no text, or password-protected file:** clear message, no charge.
- **User deletes account with a published portfolio:** the portfolio is removed.
- **A job's closing date passes while a user is viewing it:** it disappears at the next refresh; the page should handle it without error.
- **Unpaid user tries to screenshot or print the preview:** open question (EX-05).

---

## 15. Dependencies

| Dependency | Notes |
|---|---|
| **Payment provider** | Not decided. Phase-independent blocker: credits and export cannot work without it. To verify: the previous PRD assumed Stripe, which may not support Bangladesh-based businesses |
| **AI provider and model** | Must handle Bangla and Banglish and read PDF and DOCX. Not decided (the previous PRD assumed OpenAI) |
| **Template design** | 5–6 resume templates and 2 portfolio templates must be designed |
| **Hosting for published portfolios** | Needed for the platform address |
| **Email delivery** | Account verification and receipts (assumed) |
| **Legal review** | Terms, privacy policy, AI disclosure, refund policy, and data protection requirements in Bangladesh |
| **Content for the job list** | Someone must enter jobs, and keep them fresh |

---

## 16. Risks and Mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **No customer evidence yet** that users want the chat builder (main bet) | High | Short interviews with 5–10 fresh graduates; measure chat completion against the other paths |
| 2 | AI cost per user exceeds revenue | High | Credits; cost per user visible in admin; failed actions are not charged; usage limits; test prompts for cost |
| 3 | AI writes untrue or inflated claims | High | Facts-only rule, drafts the user must accept, edit-anything, clear "verify before sending" notice |
| 4 | Banglish is not understood well (no standard spelling) | High | Build a test set of Bangla, Banglish and English conversations; measure before launch |
| 5 | Bangla PDFs extract badly (older font encodings may produce garbled text) | Medium | Technical test on real CVs; if confirmed, read pages as images |
| 6 | Preview and PDF look different | Medium | Test every template's PDF against its preview before release (5–6 templates makes this possible) |
| 7 | Payment provider unavailable or unsuitable for Bangladesh | High | Decide early; check fees for small payments (a 10-taka charge may cost nearly as much in fees) |
| 8 | Privacy: resumes hold personal data and AI sends it to a third party | High | Data minimisation, clear disclosure, deletion on request, legal check |
| 9 | Hosting user content publicly (portfolios) invites abuse | Medium | Hide contact details by default, takedown tool, unpublish, a reporting route |
| 10 | The job list goes stale or contains fake jobs | Medium | Closing dates, source jobs carefully, assign an owner |
| 11 | Users feel tricked by the export paywall | Medium | Show prices early; free exploration and free starter credits |
| 12 | Scope is large for the first release | High | Split into phases (pending) |
| 13 | Interview Prep and Job List have weak evidence of demand | Low–Medium | Treat as tests; measure usage |

---

## 17. Analytics and Tracking Requirements

Needed so the team can tell whether the product works. *Event names are indicative.*

**Funnel:** visit → template viewed → sign-up → first fill started (which path: manual, upload or chat) → resume completed → first AI action → first payment → first export.

**Per path:** started, completed, abandoned and where; time to complete; number of Accept, Regenerate and Edit actions; credits spent.

**Chat quality:** completion rate, questions skipped, regenerations per item, conversations ended early, language used (Bangla, Banglish, English).

**Upload quality:** success rate, failure reasons, percentage of fields flagged, how much the user edits afterwards.

**AI features:** use of Job Match, Tailored Resume, Cover Letter, ATS Checker, Interview Prep; repeat use; cost per action.

**Portfolio:** created, published, unpublished.

**Job list:** views, filters used, "Match my resume" presses.

**Payments:** purchases, bundle chosen, credits remaining, refund and adjustment counts.

**Privacy:** analytics must avoid sending resume content to analytics tools.

---

## 18. Launch and Rollout Plan

- **Delivery phases are not yet defined.** This draft lists everything agreed; the split will be decided in a later discussion (see Open Questions).
- **Items already outside the initial scope** are listed under Deferred Items (section 8).
- **Gating items before any release:** payment provider decision, AI provider decision, template set designed, legal review, and the validation work below.

**Validation work to schedule**
1. Technical test on real Bangla, English and mixed CVs (extraction quality, the font-encoding concern).
2. A test set of Bangla, Banglish and English chat conversations, with a way to judge the resulting resumes.
3. Short interviews with fresh graduates to test the main assumption behind the chat.
4. Check payment providers available to a Bangladesh business and their fees for small payments.
5. Legal check on data protection in Bangladesh.

---

## 19. Success Metrics

*No targets are set because there is no baseline data. Targets should be agreed after the validation work.*

| Metric | Definition | Why it matters |
|---|---|---|
| Resume completion rate | Share of started resumes that are exported | Core product value |
| Chat completion rate | Share of chat starters who finish a resume, compared with manual and upload | Tests the main differentiator |
| Free → paid conversion | Share of sign-ups who make a first payment | Business viability |
| Time to first export | Time from sign-up to first export | Ease of use |
| Credits spent per paying user | Average credits used | Pricing signal |
| AI cost per paying user vs revenue | Cost divided by revenue | Margin |
| Upload success rate | Share of uploads that convert without failure | Quality of the paid path |
| Regenerate rate | Regenerations per AI draft | Proxy for AI draft quality |
| Repeat use of AI features | Users using a second AI feature | Value of the toolkit |
| Job list usage | Views and "Match my resume" presses | Tests the job list |
| Support volume per user | Contacts about credits, payment or AI quality | Operational burden |

---

## 20. Open Questions

> **Update, 13 November 2026.** Answers to questions 1–10: **(1)** use the suggested template set; **(2)** custom sections and fields are in; **(3)** undo/redo is in; **(4)** in-preview editing is text only; **(5)** account requirement: decide later, built so it is easy to introduce; **(6, 7, 8)** ATS and portfolio pricing, starter credits for export, and watermarking: decide later, built as settings; **(9)** job tags match **any**; **(10)** admin project structure (separate project or the same one) to be confirmed later. All other open questions are flagged for later. Items marked "decide later" should be implemented as configuration, not hard-coded behaviour.

**Product**
1. Which **5–6 templates**? (Untested suggestion: classic ATS-safe, modern, compact one-page, design-led, experienced or academic.)
2. Custom **sections** as well as custom fields? (ED-07)
3. **Undo/redo**? (ED-12)
4. Is in-preview editing **text only**? (ED-03, proposed)
5. When is an **account required**, and can a user try the editor without one? (AC-03)
6. Is the **ATS Checker** free or paid? Is **portfolio publishing** free or paid? (ATS-07, PF-11)
7. Does a **starter allowance cover export**? (PAY-05, proposed: no)
8. **Watermark** the preview for unpaid users? (EX-05)
9. How do several **job tags** combine? (JB-08)
10. Who are the **admins**, and who **enters jobs** and how many per week?

**Business and operations**
11. **Pricing, bundles, and the credit cost of each action.**
12. **Payment provider** for a Bangladesh business.
13. **AI provider and model**, expected cost and budget.
14. **Delivery phases**, and what a smaller first release would contain.
15. **What would show that the first release worked** (which metrics and what targets)?
16. **Bangladesh CV conventions:** photo, date and address formats, and which personal fields are expected. (To confirm.)

**Legal**
17. Data protection requirements in Bangladesh, retention of uploaded files and AI outputs, refund policy and terms.

**Audience and format**
18. Who is this PRD for, and in what form should it be shared?

---

## 21. Appendix A — Coverage of the Previous PRD

Every area of `Resume_Builder_PRD.md` v1.0 is accounted for. Nothing is dropped silently.

| Previous PRD area | IDs | Where it is now |
|---|---|---|
| Landing page | LP-01 to LP-05 | Section 11.17. English only, no reviews, credit-based pricing section, static FAQ |
| Template gallery and builder | RB-01 to RB-10 | Sections 11.1 to 11.3. 5–6 templates, in-preview editing kept, PDF only, undo/redo open |
| Resume parser | RB-02, RB-09 | Section 11.4 (Upload), now paid and including Bangla |
| Tailored Resume | TR-01 to TR-06 | Section 11.8. "For Someone Else" removed; new version per job; warn but allow |
| Cover Letter | CL-01 to CL-04 | Section 11.9. DOCX deferred |
| Job Match | JM-01 to JM-04 | Section 11.7. ATS insights moved to ATS Checker |
| Interview Prep | IP-01 to IP-05 | Section 11.11. User picks days; warn but allow; no tracking |
| Portfolio Builder | PB-01 to PB-05 | Section 11.12. 2 templates; custom domain deferred |
| ATS Checker | ATS-01 to ATS-04 | Section 11.10. No standalone upload |
| Resume Review (human) | RR-01 to RR-04 | **Deferred** (section 8) |
| Resume Guidelines hub | RG-01 to RG-04 | **Deferred** (section 8) |
| Account and subscription | AC-01 to AC-05 | Sections 11.13, 11.14. Subscriptions replaced by credits; payment provider open |
| Non-functional requirements | Section 6 | Section 12. International compliance deferred |
| Pricing structure | Section 9 | Replaced by credits (11.14); details open |
| Success metrics | Section 2.2 | Section 19. Old targets had no source and were removed |
| **New in this draft** | — | Chat builder, credits, Bangla and Banglish, manual photo upload, admin panel, job list |

---

## 22. Appendix B — Glossary

| Term | Meaning |
|---|---|
| **ATS** | Applicant Tracking System: software employers use to scan and rank CVs |
| **Banglish** | Bangla written in English letters, with no standard spelling |
| **Credits** | The unit users buy and spend on AI help and uploads |
| **JD** | Job description |
| **Resume data record** | The single stored copy of a user's resume content, independent of any template |
| **Template** | A design that displays the resume data record |
| **Tailored version** | A copy of the resume rewritten for one job; the master resume is unchanged |
| **Placeholder** | An empty field shown in the editor but never exported |
| **Fit** | How well a resume matches a job |
