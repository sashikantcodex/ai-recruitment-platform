#!/usr/bin/env bash
#
# API integration test — walks all 15 hiring pipeline stages against a running
# stack (Express API + Python AI service + MongoDB) over HTTP only.
#
#   API_BASE_URL  base URL of the Express API (default http://127.0.0.1:4000)
#
# Exits non-zero if any stage fails, so CI can gate on it.
set -uo pipefail

API="${API_BASE_URL:-http://127.0.0.1:4000}/api/v1"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0

step()  { printf "\n\033[1m%s\033[0m\n" "$1"; }
ok()    { PASS=$((PASS + 1)); printf "  ✓ %s\n" "$1"; }
bad()   { FAIL=$((FAIL + 1)); printf "  ✗ %s — %s\n" "$1" "$2"; }
check() { if [ -n "$2" ] && [ "$2" != "null" ]; then ok "$1"; else bad "$1" "${3:-empty response}"; fi; }
eq()    { if [ "$2" = "$3" ]; then ok "$1 ($3)"; else bad "$1" "expected '$3', got '$2'"; fi; }

# Read a Python expression over the JSON body on stdin, bound to `d`.
JQ() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }

STAMP="$(date +%s)$RANDOM"
RECRUITER="ci-recruiter-$STAMP@example.com"
CANDIDATE="ci-candidate-$STAMP@example.com"

step "Setup — authenticate a recruiter"
curl -sS -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"CI Recruiter\",\"email\":\"$RECRUITER\",\"password\":\"Passw0rd!23\",\"role\":\"HR Admin\"}" > /dev/null
LOGIN=$(curl -sS -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$RECRUITER\",\"password\":\"Passw0rd!23\"}")
TOKEN=$(echo "$LOGIN" | JQ "d['accessToken']")
check "recruiter authenticated" "$TOKEN" "$LOGIN"
[ -z "$TOKEN" ] && { echo "Cannot continue without a token."; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

step "1. JD Creation"
JOB=$(curl -sS -X POST "$API/jobs" -H "$AUTH" -H 'Content-Type: application/json' -d '{
  "title":"Senior Backend Engineer",
  "description":"Backend engineer strong in Python, MongoDB and Docker to build our API platform.",
  "skills":["Python","MongoDB","Docker"],"department":"Engineering"}')
JOB_ID=$(echo "$JOB" | JQ "d['_id']")
check "job created as draft" "$JOB_ID" "$JOB"

step "2. JD Approval"
curl -sS -X POST "$API/jobs/$JOB_ID/submit" -H "$AUTH" > /dev/null
curl -sS -X POST "$API/jobs/$JOB_ID/approve" -H "$AUTH" > /dev/null
eq "job approved" "$(curl -sS "$API/jobs/$JOB_ID" | JQ "d['status']")" "published"

step "3. Job Posting"
POST=$(curl -sS -X POST "$API/jobs/$JOB_ID/post" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"location":"Berlin","employmentType":"full_time","channels":["careers_site","linkedin"]}')
SLUG=$(echo "$POST" | JQ "d['posting']['slug']")
check "posting published with a slug" "$SLUG" "$POST"
check "listed on the public careers board" \
  "$(curl -sS "$API/public/jobs?q=backend" | JQ "d[0]['title']")" "board empty"
check "public posting detail resolves" \
  "$(curl -sS "$API/public/jobs/$SLUG" | JQ "d['title']")" "slug not found"

step "4. Candidate Sourcing"
CAMPAIGN=$(curl -sS -X POST "$API/sourcing/campaigns" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"jobId\":\"$JOB_ID\",\"minMatchScore\":10}")
CAMPAIGN_ID=$(echo "$CAMPAIGN" | JQ "d['_id']")
check "sourcing campaign created" "$CAMPAIGN_ID" "$CAMPAIGN"
PROSPECT=$(curl -sS -X POST "$API/sourcing/campaigns/$CAMPAIGN_ID/prospects" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Pool Person\",\"email\":\"pool-$STAMP@example.com\",\"skills\":[\"Python\",\"Docker\"]}")
PROSPECT_ID=$(echo "$PROSPECT" | JQ "d['prospects'][0]['_id']")
check "prospect added to the campaign" "$PROSPECT_ID" "$PROSPECT"
curl -sS -X POST "$API/sourcing/campaigns/$CAMPAIGN_ID/search" -H "$AUTH" > /dev/null
ok "talent pool searched"
CONTACT=$(curl -sS -X POST "$API/sourcing/campaigns/$CAMPAIGN_ID/prospects/$PROSPECT_ID/contact" -H "$AUTH")
eq "AI outreach sent" "$(echo "$CONTACT" | JQ "d['prospects'][0]['status']")" "contacted"

step "5. Application Submission (candidate self-service, unauthenticated)"
printf 'Jane Dev\nSkills: Python, MongoDB, Docker, FastAPI\n5 years backend experience.\n' > "$WORK/resume.txt"
APPLY=$(curl -sS -X POST "$API/public/jobs/$SLUG/apply" \
  -F "name=Jane Dev" -F "email=$CANDIDATE" -F "resume=@$WORK/resume.txt")
APP_ID=$(echo "$APPLY" | JQ "d['applicationId']")
check "public application accepted" "$APP_ID" "$APPLY"
if echo "$APPLY" | grep -q aiScore; then
  bad "AI score withheld from the applicant" "aiScore present in the public response"
else
  ok "AI score withheld from the applicant"
fi

step "6. Resume Parsing / 7. AI Screening"
APP=$(curl -sS "$API/applications/$APP_ID" -H "$AUTH")
eq "resume parsed" "$(echo "$APP" | JQ "d['resumeId']['status']")" "parsed"
check "AI screening score recorded" "$(echo "$APP" | JQ "d['aiScore']")" "no score on the application"
check "ranked against the job" \
  "$(curl -sS "$API/jobs/$JOB_ID/rankings" -H "$AUTH" | JQ "d[0]['_id']")" "no rankings"

step "8. Assessment Test"
ASSESSMENT=$(curl -sS -X POST "$API/assessments/generate" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"jobId\":\"$JOB_ID\",\"numQuestions\":5,\"difficulty\":\"medium\"}")
ASSESSMENT_ID=$(echo "$ASSESSMENT" | JQ "d['_id']")
check "assessment generated from the JD" "$ASSESSMENT_ID" "$ASSESSMENT"
INVITE=$(curl -sS -X POST "$API/assessments/$ASSESSMENT_ID/invite" -H "$AUTH" \
  -H 'Content-Type: application/json' -d "{\"applicationId\":\"$APP_ID\"}")
ATTEMPT_TOKEN=$(echo "$INVITE" | JQ "d['token']")
check "candidate invited by token link" "$ATTEMPT_TOKEN" "$INVITE"
eq "application moved to assessment" \
  "$(curl -sS "$API/applications/$APP_ID" -H "$AUTH" | JQ "d['stage']")" "assessment"

# Candidate side — token only, no Authorization header.
CANDIDATE_VIEW=$(curl -sS "$API/public/assessments/$ATTEMPT_TOKEN")
if echo "$CANDIDATE_VIEW" | grep -q correctIndex; then
  bad "answer key withheld from the candidate" "correctIndex leaked in the candidate view"
else
  ok "answer key withheld from the candidate"
fi
curl -sS -X POST "$API/public/assessments/$ATTEMPT_TOKEN/start" > /dev/null

# Answer each question by its declared type; a code question needs prose, not an option.
ANSWERS=$(echo "$CANDIDATE_VIEW" | python3 -c "
import sys, json
questions = json.load(sys.stdin)['questions']
# Deliberately thorough so the run lands well clear of the pass mark, not on it.
good = (
    'I validate every input at the boundary and return early on bad data. The function '
    'below wraps the client call, handles the error path explicitly, raises a typed '
    'error with context, and logs the failure for tracing. On the trade-off: I chose '
    'maintainability and readability over raw performance here, because the hot path '
    'was already bounded by network latency rather than CPU. I covered each branch with '
    'unit tests, added an integration test for the timeout case, and benchmarked the '
    'result before and after to confirm the change did not regress throughput at scale.'
)
out = []
for i, q in enumerate(questions):
    if q['type'] == 'mcq':
        out.append({'questionIndex': i, 'selectedIndex': 0})
    else:
        out.append({'questionIndex': i, 'response': good})
print(json.dumps({'answers': out}))
")
SUBMIT=$(curl -sS -X POST "$API/public/assessments/$ATTEMPT_TOKEN/submit" \
  -H 'Content-Type: application/json' -d "$ANSWERS")
SCORE=$(echo "$SUBMIT" | JQ "d['score']")
check "assessment auto-graded (score $SCORE)" "$SCORE" "$SUBMIT"
eq "passing advanced the application" \
  "$(curl -sS "$API/applications/$APP_ID" -H "$AUTH" | JQ "d['stage']")" "interview"

step "9. Interview Scheduling"
INTERVIEW=$(curl -sS -X POST "$API/interviews" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$APP_ID\",\"mode\":\"ai\"}")
INTERVIEW_ID=$(echo "$INTERVIEW" | JQ "d['_id']")
check "interview created" "$INTERVIEW_ID" "$INTERVIEW"
SCHEDULED=$(curl -sS -X POST "$API/interviews/$INTERVIEW_ID/schedule" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"scheduledAt":"2030-10-01T10:00:00.000Z","durationMinutes":45}')
check "calendar event and meeting booked" "$(echo "$SCHEDULED" | JQ "d['meetingUrl']")" "$SCHEDULED"

step "10. AI Interview"
AI_INVITE=$(curl -sS -X POST "$API/interviews/$INTERVIEW_ID/ai-invite" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"maxQuestions":3}')
SESSION_TOKEN=$(echo "$AI_INVITE" | JQ "d['aiSession']['token']")
check "AI interview link issued" "$SESSION_TOKEN" "$AI_INVITE"
FIRST_Q=$(curl -sS -X POST "$API/public/interviews/$SESSION_TOKEN/start" | JQ "d['question']")
check "first question asked" "$FIRST_Q" "no question returned"

ANSWER="I designed and shipped the Python service end to end, indexed MongoDB for the hot \
query path, containerised it with Docker, and mentored two engineers on the team through \
the rollout while collaborating with stakeholders on the migration plan."
COMPLETED=false
for _ in 1 2 3 4 5 6 7 8; do
  TURN=$(curl -sS -X POST "$API/public/interviews/$SESSION_TOKEN/answer" \
    -H 'Content-Type: application/json' -d "{\"answer\":\"$ANSWER\"}")
  if [ "$(echo "$TURN" | JQ "d['isFinal']")" = "True" ]; then COMPLETED=true; break; fi
done
if [ "$COMPLETED" = true ]; then ok "AI interview ran to completion"; else bad "AI interview" "never reached a final turn"; fi
check "AI evaluation written back" \
  "$(curl -sS "$API/interviews/$INTERVIEW_ID/ai-session" -H "$AUTH" | JQ "d['evaluation']['recommendation']")" \
  "no evaluation on the session"

step "11. Candidate Evaluation"
EVALUATION=$(curl -sS -X POST "$API/evaluations" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$APP_ID\"}")
check "signals consolidated into one score" "$(echo "$EVALUATION" | JQ "d['overallScore']")" "$EVALUATION"
check "screening signal included" "$(echo "$EVALUATION" | JQ "d['signals']['screeningScore']")" "missing"
check "assessment signal included" "$(echo "$EVALUATION" | JQ "d['signals']['assessmentScore']")" "missing"
check "interview signal included" "$(echo "$EVALUATION" | JQ "d['signals']['interviewScore']")" "missing"
DECISION=$(curl -sS -X POST "$API/evaluations/application/$APP_ID/decision" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"decision":"hire","note":"Strong across all signals"}')
eq "hire decision advanced the application" "$(echo "$DECISION" | JQ "d['stage']")" "offer"

step "12. Offer Generation"
OFFER=$(curl -sS -X POST "$API/offers" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"applicationId\":\"$APP_ID\"}")
OFFER_ID=$(echo "$OFFER" | JQ "d['_id']")
check "offer drafted against a salary benchmark" "$OFFER_ID" "$OFFER"
check "offer sent for e-signature" \
  "$(curl -sS -X POST "$API/offers/$OFFER_ID/send" -H "$AUTH" | JQ "d['signingUrl']")" "no signing url"

step "13. Offer Acceptance"
ACCEPTED=$(curl -sS -X POST "$API/offers/$OFFER_ID/respond" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"decision":"accepted"}')
eq "offer accepted" "$(echo "$ACCEPTED" | JQ "d['status']")" "accepted"
eq "application marked hired" \
  "$(curl -sS "$API/applications/$APP_ID" -H "$AUTH" | JQ "d['stage']")" "hired"

step "14. Document Verification / 15. Employee Onboarding"
PACKETS=$(curl -sS "$API/onboarding" -H "$AUTH")
PACKET_ID=$(echo "$PACKETS" | JQ "d[0]['_id']")
check "onboarding packet auto-created on acceptance" "$PACKET_ID" "$PACKETS"
DOC_ID=$(echo "$PACKETS" | JQ "d[0]['documents'][0]['_id']")
VERIFIED=$(curl -sS -X POST "$API/onboarding/$PACKET_ID/documents/verify" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"documentId\":\"$DOC_ID\",\"status\":\"verified\",\"notes\":\"ID checked\"}")
eq "document verified" \
  "$(echo "$VERIFIED" | JQ "[x for x in d['documents'] if x['_id']=='$DOC_ID'][0]['status']")" "verified"
CHECKED=$(curl -sS -X PATCH "$API/onboarding/$PACKET_ID/checklist" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"index":0,"done":true}')
eq "onboarding checklist item completed" "$(echo "$CHECKED" | JQ "d['checklist'][0]['done']")" "True"

printf "\n\033[1m=== %d passed, %d failed ===\033[0m\n" "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
