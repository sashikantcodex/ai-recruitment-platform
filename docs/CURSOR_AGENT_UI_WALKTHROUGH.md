# Cursor Agent — UI E2E walkthrough

Use this prompt in **Cursor Agent** (with browser tools enabled) while the app is running locally.

## Preconditions

- UI: http://localhost:3000
- API: http://localhost:4000/health
- AI: http://localhost:8000/health
- User: `admin@aiats.local` / `Password1!`

## Agent prompt (copy/paste)

```text
You are a QA agent. Open a browser and walk the ATS UI end-to-end.

Base URL: http://localhost:3000

Steps:
1. Go to /login. Sign in with admin@aiats.local / Password1!
2. Jobs: create "Senior React Engineer" with a JD mentioning React and TypeScript. Open it → Submit → Approve until status is published.
3. Applications: Apply with Resume for that job (name + email + upload a .txt resume). Confirm an AI score or stage Applied/Screened.
4. Agents page (/agents):
   a. Recruiter: select the job, enable Execute, Run.
   b. Interview: select the application, enable Execute + schedule, Run.
   c. HR: select the application, enable Execute + Send + Accept, Run.
5. Verify Interviews, Offers, and Onboarding show the new records.
6. Knowledge: ask "What is the senior engineer salary band?"
7. Report a short pass/fail checklist with any errors.

Do not invent credentials. If a step fails, capture the error and stop that branch.
```
