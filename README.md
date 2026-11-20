# Resume Builder

AI-assisted resume builder. See `Resume_Builder_PRD_v2_Draft.md` for the product requirements and
`PRD_Discussion_Notes.md` for the decisions behind them.

| Folder | What it is |
|---|---|
| `backend/` | Spring Boot 4 (Java 21) REST API, PostgreSQL, Flyway migrations |
| `frontend/` | Next.js 16 (React 19, TypeScript, Tailwind) |

## Requirements
Java 21, Node 24, PostgreSQL 14+.

## Run the backend
```
createdb resume_builder          # once
cd backend
./mvnw spring-boot:run           # http://localhost:8080
```
The database schema is created automatically on startup (Flyway).

Optional environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/resume_builder` | Database connection |
| `DB_USERNAME` / `DB_PASSWORD` | current OS user / empty | Database login |
| `JWT_SECRET` | random per start | Signs login tokens. **Set it (32+ characters) anywhere shared**; without it all logins end on restart |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `localhost` / `5432` / `resume_builder` | Used to build `DB_URL` when it is not set |
| `ALLOW_REGISTRATION` | `false` | Set `true` to let people create accounts |
| `PORT` | `8080` | Backend port |

## Run the frontend
```
cd frontend
npm install
npx playwright install chromium  # once; used to make PDFs and for visual checks
npm run dev                      # http://localhost:3000
npm test                         # unit tests
```
The browser talks only to the frontend; `/api/*` is passed on to the backend
(`BACKEND_URL`, default `http://localhost:8080`).

**Troubleshooting:** if `npm test` fails with "Cannot find native binding" (a known npm bug with
optional dependencies), run `npm install --no-save @rolldown/binding-darwin-arm64` on Apple Silicon
(use the binding that matches your platform).

## AI chat builder
The editor's floating **✨ Build with AI** button (bottom-right; a bottom sheet on phones) opens an assistant that builds the CV by conversation (English, Bangla or
Banglish). It asks one topic at a time and fills the CV in live; descriptive text arrives as a draft the
user can accept, edit or have redone. The key lives only on the backend; the browser never sees it.

**Set it up (once):**
1. Copy `backend/.env.example` to `backend/.env` (git ignores it) and put your key after `ANTHROPIC_API_KEY=`.
2. Restart the backend. The log says which model it uses. Without a key it says it is in **DEMO mode**: a
   scripted stand-in answers (marked "Demo mode" in the chat), nothing is sent anywhere, and nothing costs money.

| Setting (backend) | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | none (demo mode) | Your Anthropic key |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Which model answers. Cheaper ones: `claude-sonnet-5-5`, `claude-haiku-5-5` |
| `ANTHROPIC_EFFORT` | `low` | How hard it thinks: `low`, `medium`, `high` |
| `app.ai.max-turns-per-minute` / `-per-day` | 12 / 400 | Per-user limits (application.yml) |

Measured with `claude-haiku-5-5` at effort `low` (real conversations in English, Bangla and Banglish):
about 3 to 5 seconds and roughly US$0.0006 per chat turn, so a whole CV conversation costs a few cents.
Opus costs about 40 times more per token, so check quality on your own test messages before choosing it.

Every AI call is logged in the `ai_usage` table (user, model, token counts; never the conversation).
The assistant may only use facts the user gave: a draft containing a number the user never mentioned is
retried once and, if still wrong, shown with a warning. Messages and CV details (never the photo) are sent
to Anthropic to write the answers; the chat says so on screen.

## Upload an existing CV
**Upload a CV** (dashboard, or the link on the templates page) takes a PDF or Word (.docx) file and turns it into an
editable resume. The browser posts the file to `POST /api/ai/upload`; the backend checks it (type by its bytes, up to
4 MB, up to 4 pages), has Claude read it, and returns the content as the editor's fields. The page then creates the
resume, opens the editor, and shows what to double-check, with a button to fill the gaps in the AI chat.

- PDFs are sent to Claude as documents (so scans and Bangla fonts work); Word files are read on the server and sent as text.
- Bangla CVs are fine; the result is English, with names transliterated. Text that fits no field goes into an
  "Other information" section, never dropped. Instructions hidden in the file are ignored and flagged.
- The file is read in memory and never stored. Free for now; limited to 3 per minute and 5 per day per user
  (`app.ai.max-uploads-per-day`), logged in `ai_usage` as `upload` / `upload_failed`.
- `ANTHROPIC_UPLOAD_MODEL` (default `claude-sonnet-5-5`) picks the model. Without an API key it runs in demo mode
  and returns a fixed sample CV, so the flow can be tried at no cost.
- Not built yet: replacing or merging into an existing resume, per-field confidence, charging credits.

## ATS checker
**ATS checker** (side navigation, `/ats-checker`) tells a user whether an applicant tracking system can read their CV and
what to fix. It checks one of their saved resumes or any uploaded PDF/DOCX, and shows an estimate band (Strong, Good,
Fair, Needs work), never a percentage.

- **Content rules** (`frontend/src/lib/ats/rules.ts`): fixed code, no AI, free. Critical (name, email, phone, experience
  or education), warnings (summary, bullets, date styles, length, section names, skills, very short, Bangla script) and
  notes (photo, icons, sidebar template). Band thresholds are in `bandFor`.
- **File checks** for uploads (`FileChecks.java`, `POST /api/ai/ats-file`): no extractable text (a scan), signs of
  columns or tables, graphics, unembedded fonts (PDF); layout tables, text boxes, columns, contact details in the header
  or footer, pictures (DOCX). These are heuristics and the page says so. The same call has Claude read the CV once; the
  page keeps that result in the browser session (never stored on the server) so it can be re-checked or imported into
  the builder without reading it again.
- **Review my writing** (`POST /api/ai/writing-review`, labelled Pro): suggested rewrites of the summary and bullets.
  The server drops feedback about text that is not in the CV and any rewrite that adds a number.
- Not built yet: the keyword check against a job description (it arrives with Job match).

| Setting (backend) | Default | What it does |
|---|---|---|
| `ANTHROPIC_REVIEW_MODEL` | `claude-haiku-5-5` | Model for the writing review |
| `MAX_UPLOADS_PER_DAY`, `MAX_ATS_FILES_PER_DAY`, `MAX_REVIEWS_PER_DAY` | `0` (none) | Daily caps per user for CV upload, ATS file checks and writing reviews; a per-minute guard of 6 always applies |

## Job match
**Job match** (`/job-match`, labelled Pro) compares a CV with a pasted job description: an estimate band (Strong, Good,
Partial, Low match), what the CV already shows, what the job asks for that it does not (required vs nice to have), and
what to do about it. Like the ATS checker it takes a saved resume or an uploaded file, and explanations can be in English
or Bangla (the matching is always English).

- **One shared analysis** (`POST /api/ai/job-match`): the same call serves Job match, the ATS checker's keyword check and
  (next) Tailor. The browser keeps the latest result for the session, keyed to the CV text and the job description, so
  another tool reuses it instead of asking the AI again.
- **Truthfulness check** (`MatchService.checked`): a "matching" skill needs a quote that is really in the CV; a "missing"
  skill needs a quote that is really in the job description and must not already be in the CV. Anything else is dropped.
  If nothing matches, the band is capped at Low.
- **"I have this"** on a missing skill (saved resumes only) opens the editor with the AI chat ready and a first message
  typed in for the user to finish. Nothing is added to the CV automatically.
- The job description is pasted text, up to 10,000 characters, kept in the browser tab and shared by the tools.

| Setting (backend) | Default | What it does |
|---|---|---|
| `ANTHROPIC_MATCH_MODEL` | `claude-sonnet-5-5` | Model for the analysis |
| `MAX_MATCHES_PER_DAY` | `0` (none) | Daily cap per user; the per-minute guard of 6 always applies |

## Tailor my resume
**Tailor my resume** (`/tailor`, labelled Pro) makes a version of one of the user's resumes for one job. It needs a resume in
the builder (saved or imported), a pasted job description, and works on **original** resumes only.

1. The shared Job match analysis runs first (or is reused). A **Low** match shows a warning with *Continue anyway*.
2. `POST /api/ai/tailor` proposes changes. The user **accepts, rejects, edits or regenerates** each one
   (`POST /api/ai/tailor/regenerate`, with hints like "More concise").
3. *Create version* makes a new resume from the accepted changes only, linked to its original. The original is never changed.

**What may change** (`TailorService`): the summary wording, experience and project bullet points, and the order of skills.
Never job titles, companies, dates, degrees, names or contact details. The server drops any proposed change that adds a number
the resume does not have, adds, removes or renames a skill, or uses a specific term (an acronym such as SAP, or a name like
C++ or Node.js) that the job description has and the resume lacks. The "before" text is read from the resume on the server.

**Versions** are ordinary resumes with a `tailored_from` link (migration `V3`). The dashboard lists them under their original;
deleting the original keeps them as standalone resumes. The server refuses to tailor a version or someone else's resume.

| Setting (backend) | Default | What it does |
|---|---|---|
| `ANTHROPIC_TAILOR_MODEL` | `claude-sonnet-5-5` | Model for the changes |
| `MAX_TAILORS_PER_DAY` | `0` (none) | Daily cap per user; the per-minute guard of 6 always applies |

## PDF export
The editor's **Download PDF** button posts the CV to `POST /export/pdf` (a route in the frontend, not the
backend). The route checks the login token with the backend, then opens the app's own `/print` page in
headless Chromium (Playwright), prints it to A4, and returns the file. The PDF is drawn by the same code
as the preview, so they match; placeholders and editing tools are never in it.

| Variable (frontend) | Default | What it does |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` | Where the Java backend is |
| `EXPORT_BASE_URL` | the request's own address | Set when the app sits behind a proxy and cannot reach itself by its public address |
| `EXPORT_REQUIRES_PAYMENT` | off | Set to `true` to block export (HTTP 402) until credits exist. Payment is not built yet |

On a server: run `npx playwright install --with-deps chromium` once (Chromium and its system libraries).
On Vercel nothing needs installing: when `VERCEL` is set the route uses the `@sparticuz/chromium` build that ships with the app.
One browser is kept running and reused; at most two PDFs are made at the same time. Emoji are drawn with
the machine's emoji font, so install one (for example Noto Color Emoji) on a Linux server.

## Deploy (Render + Vercel)
**Backend on Render.** `render.yaml` describes the Java service (built from `backend/Dockerfile`) and a Postgres
database. In Render choose New > Blueprint and pick this repo. Then add `ANTHROPIC_API_KEY` on the service's
Environment tab (it is deliberately not in the file; until you do, the chat runs in demo mode). `JWT_SECRET` is generated for you. Flyway creates the tables on
first start. The free plan sleeps after about 15 minutes idle (the first request then takes ~50 s) and its
database expires after 30 days.

**Frontend on Vercel.** Import the repo, set the *Root Directory* to `frontend`, and add the environment
variable `BACKEND_URL` = your Render service URL (for example `https://resume-builder-backend.onrender.com`).

**Accounts.** Signup is closed by default (`ALLOW_REGISTRATION=false`) so strangers cannot spend your AI key.
To make the first account, set `ALLOW_REGISTRATION=true` on Render, register, then set it back to `false`.
Locally, put `ALLOW_REGISTRATION=true` in `backend/.env` to sign up.

## API (so far)
`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/me`, `GET /api/health`,
and `GET/POST /api/resumes`, `GET/PUT/DELETE /api/resumes/{id}` (login required; a user can only
reach their own resumes).
