from typing import Literal

from pydantic import BaseModel, Field


class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    years: float = 0


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""


class ParseRequest(BaseModel):
    resumeId: str
    filePath: str
    mimeType: str


class ParsedResume(BaseModel):
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    totalYears: float = 0


class ScoreRequest(BaseModel):
    jobId: str
    jdText: str
    parsedResume: ParsedResume


class ScoreResult(BaseModel):
    score: float
    matchedSkills: list[str] = Field(default_factory=list)
    missingSkills: list[str] = Field(default_factory=list)
    rationale: str = ""


class InterviewQuestionsRequest(BaseModel):
    jdText: str
    skills: list[str] = Field(default_factory=list)


class InterviewQuestionsResponse(BaseModel):
    questions: list[str]


class NotesSummaryRequest(BaseModel):
    notes: str = ""
    questions: list[str] = Field(default_factory=list)


class NotesSummaryResponse(BaseModel):
    summary: str


class RagIngestRequest(BaseModel):
    title: str
    content: str
    category: str = "general"


class RagIngestResponse(BaseModel):
    id: str
    chunks: int


class RagQueryRequest(BaseModel):
    query: str
    topK: int = 5


class RagHit(BaseModel):
    title: str
    category: str
    excerpt: str
    score: float


class RagQueryResponse(BaseModel):
    answer: str
    hits: list[RagHit]


class SalaryBenchmarkRequest(BaseModel):
    title: str
    location: str = "Remote"
    years: float = 3


class SalaryBenchmarkResponse(BaseModel):
    min: float
    mid: float
    max: float
    currency: str = "USD"
    rationale: str


class AgentRunResponse(BaseModel):
    agent: str
    status: str
    result: dict


# --- Candidate sourcing -------------------------------------------------


class SourcingCandidate(BaseModel):
    candidateId: str
    name: str = ""
    skills: list[str] = Field(default_factory=list)
    summary: str = ""
    location: str = ""
    totalYears: float = 0


class SourcingMatchRequest(BaseModel):
    jdText: str = ""
    skills: list[str] = Field(default_factory=list)
    location: str = ""
    candidates: list[SourcingCandidate] = Field(default_factory=list)


class SourcingMatch(BaseModel):
    candidateId: str
    name: str = ""
    score: float
    matchedSkills: list[str] = Field(default_factory=list)
    missingSkills: list[str] = Field(default_factory=list)
    rationale: str = ""


class SourcingMatchResponse(BaseModel):
    matches: list[SourcingMatch] = Field(default_factory=list)


class OutreachRequest(BaseModel):
    candidateName: str = "there"
    jobTitle: str = "an open role"
    company: str = "our team"
    matchedSkills: list[str] = Field(default_factory=list)
    applyUrl: str = ""


class OutreachResponse(BaseModel):
    subject: str
    body: str


# --- Assessments --------------------------------------------------------

QuestionType = Literal["mcq", "short", "code"]


class AssessmentQuestion(BaseModel):
    prompt: str
    type: QuestionType = "mcq"
    options: list[str] = Field(default_factory=list)
    correctIndex: int | None = None
    expected: str = ""
    weight: float = 1
    skill: str = ""


class AssessmentGenerateRequest(BaseModel):
    jobTitle: str = "Role"
    jdText: str = ""
    skills: list[str] = Field(default_factory=list)
    numQuestions: int = 8
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class AssessmentGenerateResponse(BaseModel):
    title: str
    durationMinutes: int
    passingScore: float
    questions: list[AssessmentQuestion] = Field(default_factory=list)


class AssessmentAnswer(BaseModel):
    questionIndex: int
    selectedIndex: int | None = None
    response: str = ""


class AssessmentGradeRequest(BaseModel):
    questions: list[AssessmentQuestion] = Field(default_factory=list)
    answers: list[AssessmentAnswer] = Field(default_factory=list)


class GradedQuestion(BaseModel):
    questionIndex: int
    awarded: float
    max: float
    correct: bool
    feedback: str = ""


class AssessmentGradeResponse(BaseModel):
    score: float
    perQuestion: list[GradedQuestion] = Field(default_factory=list)
    summary: str = ""


# --- AI interview -------------------------------------------------------


class TranscriptTurn(BaseModel):
    question: str = ""
    answer: str = ""


class AiInterviewTurnRequest(BaseModel):
    jdText: str = ""
    skills: list[str] = Field(default_factory=list)
    plannedQuestions: list[str] = Field(default_factory=list)
    transcript: list[TranscriptTurn] = Field(default_factory=list)
    maxQuestions: int = 8


class AiInterviewTurnResponse(BaseModel):
    question: str = ""
    isFinal: bool = False
    turnIndex: int = 0


class InterviewEvaluateRequest(BaseModel):
    jdText: str = ""
    skills: list[str] = Field(default_factory=list)
    transcript: list[TranscriptTurn] = Field(default_factory=list)


class InterviewEvaluateResponse(BaseModel):
    technical: float
    communication: float
    culture: float
    recommendation: Literal["strong_yes", "yes", "no", "strong_no"]
    strengths: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    summary: str = ""


# --- Consolidated candidate evaluation ----------------------------------


class InterviewScoreInput(BaseModel):
    technical: float = 0
    communication: float = 0
    culture: float = 0
    recommendation: str = ""
    source: str = "live"


class EvaluationSummaryRequest(BaseModel):
    jobTitle: str = "Role"
    screeningScore: float | None = None
    assessmentScore: float | None = None
    interviews: list[InterviewScoreInput] = Field(default_factory=list)
    matchedSkills: list[str] = Field(default_factory=list)
    missingSkills: list[str] = Field(default_factory=list)


class EvaluationSummaryResponse(BaseModel):
    overallScore: float
    recommendation: Literal["hire", "hold", "reject"]
    strengths: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    summary: str = ""
