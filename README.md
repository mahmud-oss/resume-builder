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

## API (so far)
`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/me`, `GET /api/health`,
and `GET/POST /api/resumes`, `GET/PUT/DELETE /api/resumes/{id}` (login required; a user can only
reach their own resumes).
