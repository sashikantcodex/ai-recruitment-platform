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
