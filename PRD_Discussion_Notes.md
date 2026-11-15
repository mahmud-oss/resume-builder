# Resume Builder — PRD Discussion Notes

**Date:** 2 November 2026
**Purpose:** Record of the discussion held before writing the new PRD, so decisions, reasoning, open questions and next steps are not lost.
**Status:** Discovery in progress. Features covered so far: the Resume Builder core and its three input paths (sections 1–7), and Job Match and Tailored Resume (section 12). Cover Letter and ATS Checker (section 13). and Interview Prep (section 14). Editor and export (section 15), and Portfolio Builder (section 16). Human Resume Review (deferred, section 17), Account and access rules (section 18), Admin panel (section 19) and the Job list (section 20). Landing page and guidelines (section 21). Credits and billing details, phases and PRD audience are still to be discussed. Last updated 3 November 2026.

**Reference document:** `Resume_Builder_PRD.md` (v1.0 draft, 27 July 2026). It is a reference only. The new PRD must cover every feature in it, but is written fresh, with deferred items marked as deferred, never silently dropped.

**Labels used below**
- **Decided**: agreed in discussion.
- **Assumption**: stated or assumed but not validated with evidence.
- **To verify**: a factual claim or technical question that must be checked before relying on it.
- **Open**: still needs a decision.

---

## 1. Product Concept (as clarified in discussion)

The user picks a template first, then fills it using one of three input paths. All three paths write into one shared resume data record.

1. **Manual:** form on the left, live preview on the right. The user edits content, fonts, colours and spacing, and can add, remove and reorder sections (similar to FlowCV).
2. **Upload:** the user uploads a PDF or DOCX. AI converts it into the fields. Anything missing is typed manually or filled using the AI chat.
3. **AI chat:** an AI asks for the information needed to build the CV and fills the same fields internally.

**Decided**
- Template selection comes first, but it is not a lock-in. The user can switch templates at any time.
- V1 launches with **5–6 templates**, not 50–60. Profession tabs are not needed in V1.
- **Launch market: Bangladesh first**, international later.
- **Chat is the main differentiator and ships in Phase 1.**
- The resume output is **English only** in V1. Templates do not need Bangla fonts. The user may chat in Bangla or Banglish.
- **Payment provider is undecided** and will be decided later. Billing is written as "provider TBD" so it does not block the rest.

**Assumption:** the main audience for chat is users with no CV or who struggle to write well (for example fresh graduates). No research supports this yet.

---

## 2. Shared Data Model (Decided)

- All collected data is stored in **one record, independent of the template**.
- A template only controls how the data is displayed. Switching template never loses data.
- **Template switching is instant, with no permission popups.** Users may switch just to see how a template looks, and prompts would discourage that.
- Fields the new template needs but the user never provided appear as **empty placeholders in the editor**, with a small non-blocking hint (for example "3 fields empty. Fill with AI?"). The user can ignore it.
- **Empty placeholders must never appear in the exported PDF or DOCX.** A warning, if any, belongs at export time, not at switch time.
- **Show/hide toggle** per section and per field. Hiding removes the item from preview and export; the data stays saved.
- **Visibility belongs to the user's data, not the template.** If the user hides "Father's name" once, it stays hidden after switching templates. (Recommended by Claude, accepted.)
- Fields a template does not use stay saved and hidden, not deleted.
- The user can always **add a custom field** (label + value) to any section.

**Open:** are custom *sections* (not just custom fields) in V1? The old PRD includes custom sections (RB-05).

---

## 3. Path 1 — Manual Entry

Carried over from the old PRD (RB-01 to RB-08):
- Dual-pane editor with live preview.
- Add, remove and drag-reorder sections.
- Multi-page support with automatic pagination and manual page breaks.
- Autosave plus manual save; reopen and edit later.
- Export to PDF (print-accurate) and DOCX (editable, faithful to the template).
- In-preview (WYSIWYG) editing synced with the form (P1 in the old PRD).

**Decided:** the user can edit anything the AI generates, on every path.

Editor design controls and export were discussed on 3 November (section 15). Undo/redo is still not discussed.

---

## 4. Path 2 — Upload

### How it works (Decided)
1. User chooses Upload and selects a file.
2. App validates the file (type, size, readable).
3. AI reads the file and extracts fields into the shared data record.
4. The user lands in the editor. Low-confidence fields are flagged for review. Missing fields appear in the same completeness checklist as the chat.
5. The user edits by hand, or taps "Fill the gaps with AI chat", which asks only about what is missing.

This is the main link between paths: upload a half-finished CV, then let chat complete it.

### Decisions
- **V1 accepts PDF and DOCX only.** Photos of a CV (phone camera) are deferred to a later phase. Reason: photo quality varies too much, and users with only a paper CV can use the chat path.
- **Upload is paid** (needs AI conversion). Pricing model is credit-based; see section 6.
- **Bangla CVs are supported.** The extracted output is English.
- **The profile photo is a manual upload** into the photo field (with crop and size validation). No AI is used, and the photo is **not** extracted from an uploaded CV (unreliable and unnecessary).

### Error handling (proposed, not yet reviewed in detail)
| Case | Behaviour |
|---|---|
| File unreadable, too large or password-protected | Clear message; retry, or switch to manual or chat |
| File is not a resume | Message saying so; same options |
| Some fields extracted wrongly | Flagged as low confidence; user fixes in the editor |
| Text that fits no field | Kept in an "Other"/custom section, never silently dropped |
| Very little extracted | App suggests chat to fill the gaps |
| Extraction fails or times out | Retry option; manual and chat remain available |
| User uploads a second file into an existing resume | Ask whether to replace or merge; never overwrite silently |

### Suggestions on paid upload (proposed)
- **Charge only when extraction succeeds.** A failed or unreadable file costs the user nothing.
- **Cap the page count** (for example 5 pages, an untested number) so a flat price stays fair against AI cost.
- **Free signup credits should cover at least one upload**, so a new user sees it work before paying.
- **Show the price before upload**, not after.

### Suggestions for Bangla CVs (proposed)
- **To verify:** many Bangla PDFs use legacy font encodings (Bijoy / SutonnyMJ style) that produce garbled text when copied. If confirmed, render each page as an image and have the AI read the image to avoid the encoding problem.
- Transliterate (do not translate) names of people, places and institutions.
- Include mixed Bangla/English CVs in the test set.
- Treat translated text as a draft. The user can edit everything.

### Privacy (proposed)
- Let users delete the uploaded original after extraction.
- **To verify:** what Bangladeshi data-protection law requires. Not yet checked.

---

## 5. Path 3 — AI Chat

### Concept (Decided)
- The AI follows a **fixed order of topics**: contact info, education, projects, recommendations/references and so on.
- A **checklist** shows which sections are completed.
- **Questions are driven by the selected template.** If the template has "Father's name", the AI asks for it. If it does not, the user can still add the field manually.
- The user can chat in **Bangla or Banglish**; the resume is generated in English.
- Intended for users who have no CV or cannot articulate well. The AI handles grammar and professional tone.
- Slower than typing for some users is **accepted**, because the AI does the writing.

### AI draft handling (Decided)
- Whatever the AI generates, the user can edit.
- Suggested retry flow (accepted in principle, numbers to test): each AI draft offers **Accept / Regenerate / Edit by hand**.
  - Edit by hand is always free.
  - Suggested starting point: 2 free regenerations per item, then a credit. This is untested.
  - The user can give feedback on a retry ("shorter", "more formal").
  - The user can return to a previous draft.

### Behaviour suggestions (proposed)
- Include a **skip button inside the chat** for questions the user does not want to answer. This is separate from template switching, which has no prompts. Confirm this is wanted.
- The checklist lets users **skip or revisit** any section. The order is guidance, not a gate.
- The AI should briefly say why it is asking for an unusual field, so the user does not feel interrogated.
- The AI should use **only facts the user stated** and ask when something is missing. Claude recommended keeping this one-line rule even though users can edit, because editing only helps if the user notices a problem. A disclaimer ("AI can make mistakes. Verify before sending.") is also shown. The team's position is that the disclaimer plus editing is the main safeguard, and the facts-only rule is an inexpensive addition. Treat this as accepted unless the team says otherwise.

### Template-driven questions and switching (Decided)
- If the user switches template after chatting, data is kept. Fields the new template needs appear as placeholders. See section 2.

---

## 6. Monetisation for AI Features (partly decided)

**Decided in principle:** users pay for AI help in small amounts. Example from the discussion: paying 10 taka gives help with about 2 project descriptions.

**Recommended structure (Claude's suggestion, pricing not final):**
- **Credits**, not per-conversation billing. Conversation length is unpredictable (5 or 50 messages), which makes per-conversation pricing hard to predict for users.
- **Free:** collecting structured basics (contact, education, simple skill lists), which costs little and builds trust.
- **Paid:** each AI-written item (one project description, one experience entry, the summary, one upload) uses credits.
- **A few free credits at signup**, so users see the value before paying. *(Accepted 3 Nov. See section 18.)*
- **Sell bundles**, not single 10-taka purchases.

**Open**
- Exact credit prices and the credit cost of each action.
- Whether chat basics are fully free (recommended).
- Whether and how paid AI features relate to subscription plans from the old PRD (weekly/monthly/yearly). The old PRD is subscription-based; this discussion points to credits. This must be reconciled.

**To verify:** a 10-taka charge may cost nearly as much in gateway fees as it earns. This is another reason for bundles and depends on the payment provider chosen.

---

## 7. Language and Localisation (Decided / Open)

**Decided**
- Chat understands **Bangla and Banglish** at launch.
- Multilingual support comes later.
- Resume output is English only in V1.

**Challenge noted:** the team's view is that if the AI understands Bangla and Banglish, multilingual is not hard. Claude's response: the model handling more languages is the easy part. Remaining work per added language includes:
- Banglish has no standard spelling ("bhalo", "valo", "bhaalo"), so it needs its own test set.
- Quality varies by language, so each needs its own evaluation.
- UI text, question wording, fonts and layout all change for a new language or script.
- Recommended wording in the PRD: "multilingual-ready" (strings externalised, language as a setting), not "free".

**Bangladesh-first implications (to confirm with the team)**
- A photo on the CV is common in Bangladesh, so templates should support an **optional photo**.
- Date and address formats, and fields such as father's name, may matter. This is Claude's understanding of local norms and has not been validated.
- Multi-currency, VAT and GDPR-style compliance move to the later international phase.

---

## 8. Challenges and Risks Raised

| # | Challenge | Status |
|---|---|---|
| 1 | No evidence yet that users want the chat over upload or manual. Rationale offered: freshers with no CV who cannot articulate well. | Assumption. Suggested 5–10 short interviews with fresh graduates to validate. |
| 2 | Chat is the most expensive path to build: conversation design, live field filling, vague or contradictory answers, cost control for long conversations. | Accepted. Chat is Phase 1 regardless. |
| 3 | Fabrication risk: the AI may strengthen achievements or invent metrics. | Mitigated by facts-only rule, user editing and disclaimer. |
| 4 | Chat can be slower than typing for users who know their history. | Accepted trade-off; value is in the AI writing quality. |
| 5 | Chat quality is hard to test (many ways a conversation can fail). | Needs a test set of conversations in Bangla, Banglish and English, plus a success measure. Proposed: share of chat users who finish and export compared with other paths. |
| 6 | Banglish understanding has no standard spelling. | Needs its own test set. |
| 7 | Bangla PDF font-encoding may produce garbled extracted text. | To verify in a technical spike. |
| 8 | Payment: Stripe (assumed in the old PRD) may not support Bangladesh-based businesses. | **To verify.** Local gateways such as bKash, Nagad, SSLCommerz are likely options. Decision deferred. |
| 9 | Micro-payment fees may consume the revenue from small charges. | To verify once the provider is chosen. Bundles proposed. |
| 10 | Template-driven questions vs. template switching: questions depend on the template but users may switch. | Resolved by the shared data model (section 2). |
| 11 | Scope of the old PRD is very large for a V1 (8 AI modules, human review, portfolio). | To be handled by phasing, which is yet to be discussed. |
| 12 | The old PRD's success targets (for example ≥5% conversion) have no source. | The new PRD should label them "proposals to be validated". |

---

## 9. Old PRD Coverage Map (to be completed when drafting)

Every requirement ID in the old PRD must map to the new PRD or be marked deferred.

| Old PRD area | IDs | Discussed so far | Notes |
|---|---|---|---|
| Landing page | LP-01 to LP-05 | Yes (section 21) | English only. No reviews at launch (LP-04 deferred). Pricing section follows the credit model, not weekly/monthly/yearly plans (LP-02, LP-03 change). FAQ editing via CMS (LP-05) proposed for removal in V1. |
| Templates and builder | RB-01 to RB-10 | Yes (sections 2–5, 15) | Gallery simplified to 5–6 templates. Parser (RB-02, RB-09) discussed under Upload. RB-08 changed: PDF only in V1, DOCX deferred. RB-04 (in-preview editing) kept in V1. RB-10 (undo/redo) not yet discussed. |
| Tailored Resume | TR-01 to TR-06 | Yes (section 12) | "For Someone Else" (TR-01) dropped. JD input is pasted text only in V1 (TR-02 file upload deferred). |
| Cover Letter | CL-01 to CL-04 | Yes (section 13) | "For Someone Else" (CL-01) dropped. Tone options folded into "regenerate". |
| Job Match | JM-01 to JM-04 | Yes (section 12) | "For Someone Else" dropped. ATS insights split out to the ATS Checker (to confirm). |
| Interview Prep | IP-01 to IP-05 | Yes (section 14) | IP-03 changed: warn but allow, no refusal. IP-02 changed: plan length chosen by user. IP-05 (progress tracking) deferred. |
| Portfolio Builder | PB-01 to PB-05 | Yes (section 16) | 2 templates in V1. PB-05 (custom domain) deferred. Publishing scope and cost still open. |
| ATS Checker | ATS-01 to ATS-04 | Yes (section 13) | ATS-01 changed: no standalone file upload. Runs only on resumes that went through the builder process. |
| Resume Review (human) | RR-01 to RR-04 | Yes (section 17) | **Deferred: not in V1.** To be revisited later. Needs reviewers, SLA and a staffing decision. |
| Resume Guidelines | RG-01 to RG-04 | Yes (section 21) | **Deferred: after launch**, multilingual. |
| Account and subscription | AC-01 to AC-05 | Partly (section 18) | AC-01: email and password only in V1. AC-02 simplified (no separate profile page, to confirm). AC-03 and AC-04: Stripe and subscription assumptions need rework (provider TBD, credits). AC-05 not yet discussed. |
| NFRs | Section 6 of old PRD | No | GDPR/CCPA and multi-currency move to the international phase. |
| New in this discussion | — | Yes | Chat builder, credit-based AI pricing, Bangla and Banglish, manual photo upload, admin panel (section 19), job list (section 20). |

---

## 10. Open Questions (consolidated)

1. ~~**"For Someone Else"** flows~~ **Resolved (3 Nov): out of scope. List under non-goals.**
2. **Profile:** is it created automatically from the first resume (Claude's assumption) or filled separately? With "For Someone Else" removed, the proposal is that "For Myself" uses the saved resume data directly, with no separate profile page. **Asked on 3 Nov, not yet confirmed.**
3. **Custom sections:** in V1, or only custom fields?
4. **Chat skip button:** keep it?
5. **Credit pricing** and which actions cost what; whether chat basics are free.
6. **Credits vs. subscriptions:** how the old subscription plans and the new credit model relate.
7. **Payment provider** (deferred).
8. **Template set:** which 5–6 templates? Claude's untested suggestion: one classic ATS-safe, one modern, one compact one-page, one design-led, one for experienced or academic profiles.
9. **Bangladesh CV conventions** (photo, date and address formats, personal fields) — to be confirmed.
10. **PRD audience** (CTO and engineering, or broader) and **format/location** (markdown file or editable doc). Deferred by the team until after features and phases.

---

## 11. Next Steps

**Discussion order agreed by the team:** features first, then phases, then audience.

1. **Walk through the remaining features and how each works.** Suggested order:
   - AI toolkit: Tailored Resume and Job Match first (the others build on them), then Cover Letter, ATS Checker, Interview Prep.
   - Editor and export: design controls, pagination, PDF/DOCX fidelity.
   - Account, credits and billing.
   - Landing page and guidelines.
   - Portfolio Builder and human Resume Review.
2. **Split features into phases.** Starting point from the old PRD: Phase 1 core builder, Phase 2 AI toolkit, Phase 3 portfolio and expert review, Phase 4 international. Phase 1 now includes chat and paid upload, so this needs revisiting.
3. **Decide the PRD audience and format**, then write the new PRD using the structure in `SKILL.md`: problem statement, non-goals, user stories with Given-When-Then acceptance criteria, edge cases, analytics and tracking, assumptions log, and success metrics.

**Validation work to schedule (not discussion items):**
- Technical spike on real Bangla, English and mixed CVs (extraction quality, font-encoding problem).
- Test set of Bangla, Banglish and English chat conversations, and a success measure for chat.
- 5–10 short interviews with fresh graduates to test the main assumption behind chat.
- Check payment providers available for a Bangladesh business, and their fees for small payments.
- Legal check on data-protection requirements in Bangladesh.

---

## 12. AI Toolkit — Job Match and Tailored Resume (discussed 3 November 2026)

### Shared behaviour (Decided)
- Both features take the user's **saved resume data plus a job description (JD)**.
- **"For Someone Else" is out of scope.** It is a non-goal, not a deferred item.
- **JD input in V1 is pasted text only.** JD file upload and pasting a job-post link are deferred. (Link pulling from job sites was flagged as unreliable.)
- **JDs can be in any language** (including Bangla). Matching is done in English. Explanations are shown in the language the user chats in (Bangla or English). The tailored resume itself stays English.
- The JD is entered once and **reused across Job Match, Tailored Resume, Cover Letter and Interview Prep** in the same session (old PRD TR-05).
- **Credits:** Job Match costs less than Tailored Resume. Exact prices and billing are left for later.

### Job Match (proposed flow, accepted)
1. User adds a JD.
2. AI compares it with the resume data.
3. Output: overall match score, matching skills, missing skills, improvement suggestions.
4. The user can jump to the editor or to Tailored Resume.

Accepted suggestions:
- **Link to chat:** for each missing skill, the app can ask "Do you have experience with X?". If yes, the chat records it as a real fact. If no, it stays a gap.
- **The score is an AI estimate, not a measurement.** Show it as a band or labelled estimate based on the listed skills. Do not present it as what an employer's system will compute. The same input may score differently on two runs.
- **Split from the ATS Checker (to confirm when discussing ATS):** Job Match answers "how relevant is this resume to this job?". ATS Checker answers "can a machine read this resume?". The old PRD put ATS insights in both.

### Tailored Resume (proposed flow, accepted)
1. User adds a JD.
2. AI identifies what the job emphasises and what the resume already offers.
3. AI produces a **new version** (reworded summary, reordered skills, rewritten bullets) in the user's chosen template.
4. The user can edit everything.

Accepted suggestions:
- **New version, never overwrite.** One master resume plus one version per job.
- **Show what changed**, with accept or reject per change.
- **Tailor only from facts in the resume.** Missing skills are shown as gaps, not added. This is the same facts-only rule as the chat, and tailoring is where the risk is highest because the AI is pushed to match the JD.
- **Refine step** ("more concise", "emphasise leadership") using Accept / Regenerate / Edit.

### Decided on 3 November
- **No limit on the number of tailored versions for now.** A limit may be introduced later. Suggested: a simple list where users can name and delete versions.
- **Poor match: warn but still allow tailoring.** Example message: the resume matches only a few requirements, and tailoring can reword what is there but cannot add missing skills. This differs from Interview Prep, which blocks when the profile does not fit (old PRD IP-03).

### Still open from this section
- Confirm that "For Myself" uses the saved resume data directly (see open question 2).
- Exact credit prices (billing is deferred).

### Next in the walkthrough
Interview Prep (section 14, not yet discussed).

---

## 13. AI Toolkit — Cover Letter and ATS Checker (discussed 3 November 2026)

### Cover Letter (Decided: suggestions accepted)
Flow: the user adds a JD or reuses the one already entered in the session. AI writes a letter from the resume data and the JD. The user gets a preview, can edit, copy, and export as PDF or DOCX.

- Same **facts-only rule** and same **Accept / Regenerate / Edit** flow as the other AI features.
- **English only**, like the resume.
- **A few tone choices** (for example formal, friendly, concise) live inside "regenerate", not on a separate screen.
- **Company name and role are taken from the JD.** If missing, the AI asks the user. A wrong company name is not acceptable. A generic "Dear Hiring Manager" greeting is acceptable.
- Likely the **cheapest AI feature** in credits (short output). Billing is deferred.
- **Challenge:** cover letters tend to sound generic. The AI should refer to specific items from the resume (a named project, a real result) so the letter does not read as boilerplate.

### ATS Checker (Decided)
Flow: the user picks a saved resume. AI checks it and reports formatting issues, missing keywords, readability and section quality. Results are split into "OK" and "needs improvement", each with a specific fix. The user edits and re-checks.

- **The job description is optional.** Without one, it is a general ATS-friendliness check. The page should **tell the user that adding a JD gives a keyword check for that job.** Job Match still covers overall relevance, so the two stay separate.
- **No standalone upload.** The checker runs only on resumes that have been through the builder process: template, then one of the three input paths (manual, upload, chat), then saved in the data record. A user with an existing CV uploads it through the normal (paid) Upload path first.
- **The score is an estimate**, labelled as such. Real ATS systems differ and do not publish their scoring.
- Format checks matter less because the platform's own templates are built to be ATS-safe. Most value is in content (keywords, readability, section quality). Some format checks remain for custom fields and exported PDF/DOCX.
- **Our own templates must pass our own checker.** Test every template against it before launch.
- **To verify technically:** many checks (missing sections, structure that breaks parsing, unusual fonts) can be rule-based and cheap, with AI used mainly for keyword relevance and writing quality. This could lower the cost per check.

### Consequences to note
- Anonymous visitors cannot try the checker (accepted trade-off).
- An existing CV costs two charges: upload, then check. Billing may need to bundle them (decide in the billing discussion).

### Open
- **ATS Checker free or paid?** Open. It could be a good way to bring in new users, but it costs AI calls. Decide with billing.

---

## 14. AI Toolkit — Interview Prep (discussed 3 November 2026)

### Flow (Decided)
1. The user adds a JD or reuses the one already entered in the session.
2. The app **asks how many days the user can invest** before the interview.
3. AI generates a preparation plan for that number of days, covering technical topics, HR questions, coding practice (where the role calls for it), behavioural questions, company research tasks and daily tasks.
4. The plan can be edited and exported as PDF or DOCX.

### Decisions
- **Poor fit: warn but allow.** No refusal. This replaces the old PRD's IP-03 (fixed message, no plan), and matches the Tailored Resume behaviour. Reasoning: a user applying for a stretch job is the one who most needs preparation.
- **The number of days is chosen by the user**, not fixed at 10.
- **No progress tracking for now** (old PRD IP-05 deferred). Plans do not need a checklist state.
- **Interview Prep stays in Phase 1.** Claude had suggested it could move out, because it is not connected to building the resume. The team decided to keep it. Build order inside Phase 1 can still put it last.

### Accepted suggestions
- **Generate day by day.** The user sees Day 1 first and can stop, which also avoids paying for output they never read.
- **Use the resume** so questions target the user's own projects (for example "be ready to explain your final-year project").
- **Company research items tell the user what to research, not what is true.** The AI does not know facts about a specific company, and must not state them.
- **Be open when the plan is generic.** For non-technical roles (banking, HR, sales) the plan may be less specific, and it should say so.

### Concerns recorded
- It is the most expensive output to generate (long, structured).
- There is no evidence yet that users want it. Treat it as something to test, for example by tracking how many users generate a second day or export the plan.
- Quality varies by field: strongest for software roles.

### Open
- Credit cost (billing deferred).
- **Phase 1 size.** With the three input paths, paid upload, chat, Job Match, Tailored Resume, Cover Letter, ATS Checker and Interview Prep all possibly in Phase 1, it is getting large. To address in the phases discussion.

### Next in the walkthrough
Editor and export (section 15), then account and access rules (section 18), credits and billing (deferred), landing page and guidelines (section 21). Next: phases. (Portfolio Builder is covered in section 16 and human Resume Review is deferred, section 17.)

---

## 15. Editor and Export (discussed 3 November 2026)

### Decisions
- **Export is PDF only in V1. DOCX is deferred.** This applies everywhere the old PRD mentions DOCX: resume (RB-08), tailored resume (TR-04), cover letter (CL-03), interview plan (IP-04). Reason given: PDF is enough to start. Claude noted that some employers ask for Word, so DOCX is the likely first export request after launch.
- **In-preview editing (click the text in the preview and type) is in V1** (old PRD RB-04, P1). The preview and the form stay in sync.
- **Design controls in V1 (accepted from Claude's suggestion):**
  - font, chosen from a short list of fonts that support English well and print reliably
  - font size
  - accent colour
  - spacing
  - section order
- **Each control is limited to a sensible range**, not a free slider, so a user cannot push a template out of shape.
- **Autosave with a visible "saved" indicator.** A lost CV would be a serious failure.
- Carried over from earlier decisions: show/hide toggles per section and field, custom fields, manual profile photo upload, Accept / Regenerate / Edit for AI drafts, add/remove/reorder sections, multi-page with automatic pagination and manual page breaks.

### Concerns recorded
- **The preview and the PDF must match.** This was the main technical risk in the old PRD. With PDF only and 5–6 templates, every template can be tested thoroughly. Visual checks of each template's PDF against its preview should be part of the release checks.
- **Pagination:** content must break across pages without separating a section heading from its text.
- **In-preview editing plus the form must stay in sync.** Proposed approach: one data source; the preview renders from the data; edits made in the preview write back to the data. This is the largest engineering item in the editor.
- **In-preview editing interacts with pagination and with AI drafts** (for example, a user editing text while a regenerate is running). These are edge cases to specify.

### Proposed, not yet confirmed
- **In V1, in-preview editing covers text content only.** Structure changes (add, remove, reorder sections, hide fields) happen through the form and toggles. This limits the sync problem. To confirm with the team.

### Open
- Undo/redo (old PRD RB-10, P2) has not been discussed.
- Whether DOCX comes in Phase 2 or later.
- Whether in-preview editing in V1 is text-only (proposed, awaiting team confirmation; see "Proposed, not yet confirmed" above).

---

## 16. Portfolio Builder (discussed 3 November 2026)

This is the Portfolio Builder from the old PRD (PB-01 to PB-05), now explicitly generated from the resume data.

### Flow (Decided)
1. The user picks a portfolio template.
2. The site is filled automatically from the resume data: name, summary, experience, education, skills, projects.
3. The user edits content, changes the colour theme, and adds, removes or reorders sections, with a live preview.
4. The user publishes it to a shareable URL.

### Decisions
- **2 portfolio templates in V1.**
- **Copy once, then independent.** The portfolio takes the resume data when it is created, then stays separate. A manual "re-sync from resume" button updates it. It does not update automatically, because that could publish an edit the user did not mean to make public.
- **Portfolio visibility is separate from the resume.** Each field and section has its own public/private setting for the portfolio. This differs from the resume rule (visibility belongs to the data) because the audience is public.
- A portfolio template is another **view of the shared data record**, consistent with the resume design.

### Accepted suggestions
- **The data record needs extra optional fields for portfolios:** project screenshots, links (GitHub, live demo), longer project descriptions, and a short "about me". The AI chat can collect these in the same way as other fields. Without them the generated site will look thin.
- **Publish to a platform address only** (for example `yourname.platform.com`). Custom domains (PB-05) are deferred.
- **Public page protection:**
  - Phone number and home address are hidden by default; the user chooses what to show.
  - A clear warning is shown before the first publish.
  - The user can unpublish at any time.
  - A takedown process is needed for abusive or fake pages, because the platform hosts user content.

### Concerns recorded
- **Weak evidence.** A portfolio is valuable for developers and designers and less so for other professions. This is a candidate for a later phase and will be raised in the phases discussion.
- **It is effectively a second product.** Responsive websites behave differently from fixed-size resume pages, so the resume editor cannot be reused directly.
- **Publishing has an ongoing hosting cost**, unlike a one-time export.

### Open
- **Is publishing free or paid?** Decide with billing.
- Whether portfolio editing also supports in-preview (click and type) editing, as the resume does in V1.
- Exact limits on uploaded images (size and count), since they are hosted publicly.

---

## 17. Human Resume Review (discussed 3 November 2026)

### Decision
- **Deferred. Not in V1.** The team decided human review will be done later. It stays in the PRD as a deferred feature (old PRD RR-01 to RR-04), not deleted.

### Notes kept for when it is revisited
- Unlike the other features it needs **people**: reviewers, pay, a turnaround promise, quality control and a team to manage them. The old PRD assumed reviewers exist at launch.
- **Staffing is undecided** (in-house, freelance or both).
- **No demand evidence and no price.** A human review costs far more than the small AI credit purchases, so it should be priced separately from credits.
- **Suggested way to start when the time comes:** run it manually first (user submits, reviewer gets an email or shared sheet, feedback goes back through a simple structured form) to test demand and pricing before building the internal dashboard.
- Keep feedback in a **fixed structured form** (resume, ATS, writing, design) so reviews are consistent.
- Set the turnaround as a stated promise and show status (Submitted, In Review, Completed).
- The old PRD's "AI plus human check" differentiator is reasonable, but it conflicts a little with the AI-first positioning.

### Open for later
- Reviewer sourcing and capacity.
- Price and turnaround promise.
- Which phase it joins.

---

## 18. Account and Access Rules (discussed 3 November 2026)

### Decisions
- **Login in V1: email and password only.** No social login and no phone/OTP login for now. Phone-number login with an OTP was suggested as common in Bangladesh, and is a candidate for later (it adds SMS cost and a provider).
- **Payment is required to export and to use the AI features** (for example cover letter generation). Without payment the user **can browse and play with templates and explore the product.** (Stated by the team as "one thing is sure".)

### Flagged for later (proposed, not decided)
- **When an account is required.** Proposal: a user can pick a template and try the editor without signing up, and an account is required only when saving or using AI. Team agreed in principle and asked to flag it for later. Open details: where unsaved work lives before sign-up, and what happens to it when the user signs up.

### Suggestions recorded (not yet confirmed)
- **Account deletion must really delete** the resume data, uploaded files and any published portfolio. This matters more because the platform stores personal data and hosts public pages.
- **Show credit balance and history** (what was spent on what) so users can see where credits went. With pay-per-use, hidden charges would destroy trust.

### Resolved (3 Nov): starter credits and free chat basics
- The team **accepted both earlier suggestions:** **free starter credits** at signup (so a new user can see an upload or a chat result work before paying) and **free chat basics** (contact, education, simple lists).
- So "payment is required" applies **after the free starter allowance and the free basics**, not from the first AI action.

### Open (billing)
- **Do starter credits cover export, or only AI actions?** Proposal: starter credits cover AI actions only, and export always requires payment, which matches the rule above that a user cannot export without paying. To confirm.
- **Export is paywalled.** Common pattern, and it converts well because the user has already invested effort. The risk is users feeling tricked if they discover the paywall only at the end. Show what is paid early (price visible from the template and editor stage).
- Possible leak to check: users can screenshot or print the preview. Whether to watermark the preview, and how much to care, is open.
- AC-05 (account deletion and data export for privacy) and its legal basis in Bangladesh not yet discussed.

---

## 19. Admin Panel (new feature, discussed 3 November 2026)

Not in the old PRD (which had only an expert portal for human review, now deferred).

### Requested by the team
- Monitor users.
- See which customer has paid how much.
- Post jobs and manage job tags (see section 20).

### Decisions
- **Admins see account information only, not users' resume content.** The team said this "can change later". Reason: resumes contain phone numbers and addresses, and limiting what admins can see limits what a mistake or leak can expose.

### Proposed by Claude (not yet confirmed)
- **User list:** search, signup date, status, credit balance, last activity.
- **Payments per customer:** total paid and a list of purchases. The platform keeps **its own record of every purchase and credit spent**, instead of reading it from the payment provider on demand. The provider is undecided, so the admin panel must not depend on it.
- **Grant or adjust credits** (for refunds and failed payments), recording who did it and why.
- **Unpublish a portfolio and suspend a user.** This is where the portfolio takedown route (section 16) lives.
- **AI cost per user** shown next to what the user paid. The old PRD's biggest risk was AI cost growing faster than revenue; this shows it early.
- **Admin accounts separate from user accounts**, with a log of admin actions.

### Concerns recorded
- **Scope can grow without end.** Keep V1 to the items above.
- Admin access to account data still needs a policy in the legal and privacy review.

### Open
- Who the admins are, and how many.
- Whether FAQ and landing-page reviews are also edited from the admin panel (the old PRD wanted a way to change the FAQ without a deploy, LP-05).

---

## 20. Job List for Users (new feature, discussed 3 November 2026)

Not in the old PRD.

### What was asked
- Admins post jobs from the admin panel.
- Users see them in a separate section as a **simple table of jobs**.
- **No recommendations for now.**
- Admins create **tags**, and users **filter by tags**.

### Decisions
- **The job list is public.** Anyone can browse it without an account (consistent with the rule that users can explore without paying).
- **Applying is an external link** to the employer, for now. No applications are handled inside the platform.

### Proposed by Claude (not yet confirmed)
- **A "Match my resume" / "Tailor my resume" button on each job** that sends the job description straight into Job Match or Tailored Resume, so the user does not paste it. This connects the job list to the paid AI features. It is a hypothesis to test, not a proven benefit. Login would be required only for this action, not for browsing.
- **Closing date on every job**, with expired jobs hidden automatically so the list does not look stale.
- **Fields per job:** title, company, location, job type (full-time, internship and so on), experience level, full description, how to apply (link), closing date, tags. The full description is stored so it can be handed to the AI features.
- **Four tag groups:** profession or category, location, job type, experience level. Admin-managed, several per job.

### Concerns recorded
- **Admins enter every job by hand.** That is ongoing work. It needs an owner and an expected number of jobs per week, and the list is only useful if it stays fresh.
- **Trust:** users will assume jobs are real. A fake or misleading posting would damage the product, so the source of jobs matters.
- **No evidence yet** that users want a job list inside a resume tool. Treat it as a retention test, not a core feature.

### Open
- Filter logic with several tags (match all, or match any).
- Whether the job list affects the SEO plan (public pages can bring search traffic).
- Whether a bulk import (for example from a spreadsheet) is needed later.
- Which phase it belongs to (phases discussion).

---

## 21. Landing Page and Guidelines Hub (discussed 3 November 2026)

### Decisions
- **The website is English only in V1.** The chat itself understands Bangla and Banglish (section 7), but the landing page and product UI text are English.
- **No reviews at launch.** The old PRD wanted about 50 "curated or seeded" reviews. Claude objected: invented testimonials are dishonest and carry legal and trust risk. Reviews can be added later from real users (or real beta-user quotes).
- **The guidelines hub (ATS and resume-writing articles, old PRD RG-01 to RG-04) is deferred until after launch**, and will be multilingual when it is built.

### Landing page content (proposed, not objected to)
- **Hero:** what the product does and one main button.
- **Features:** lead with the three ways to build a CV (type it, upload it, chat with the AI), then the AI toolkit.
- **How it works:** pick a template, fill it in one of three ways, edit, export.
- **Pricing section:** follows the credit model. Shows what is free (templates, chat basics, starter credits), what costs credits, and the price once it is set. Written as "to be filled when billing is decided"; no plans are invented. This replaces the old PRD's weekly/monthly/yearly plan comparison.
- **FAQ:** no CMS in V1. FAQ text rarely changes and a developer can edit it. This keeps content editing out of the admin panel.
- **Direct links** to the template gallery and the job list, both public.

### Tracking to include in the new PRD (proposed)
- A minimal funnel: visit, template viewed, sign-up, first AI action, first payment, first export. Without it the team cannot tell where users drop off.

### Notes kept for the guidelines hub (for when it is built)
- Someone has to write the content and it needs an owner. It pays off slowly (search traffic takes months) and is not on the critical path.
- Suggested launch set when the time comes: 5–8 articles for freshers and general graduates; no CMS (articles live in the codebase); AI may draft but a person reviews.
- Hypothesis (unchecked): people in Bangladesh may search for CV help in Bangla or Banglish, so Bangla articles may help.

### Open
- Copy for the pricing section depends on the billing decision.
- Whether a basic admin-editable FAQ is needed later.
