"""Tests for the sourcing / assessment / AI-interview / evaluation services."""

from app.models.schemas import (
    AiInterviewTurnRequest,
    AssessmentAnswer,
    AssessmentGenerateRequest,
    AssessmentGradeRequest,
    AssessmentQuestion,
    EvaluationSummaryRequest,
    InterviewEvaluateRequest,
    InterviewScoreInput,
    OutreachRequest,
    SourcingCandidate,
    SourcingMatchRequest,
    TranscriptTurn,
)
from app.services.assessment import generate_assessment, grade_assessment
from app.services.evaluation import summarize_evaluation
from app.services.interview_assistant import evaluate_transcript, next_turn
from app.services.sourcing import draft_outreach, match_candidates


class TestSourcing:
    def test_ranks_full_skill_coverage_above_partial(self):
        result = match_candidates(
            SourcingMatchRequest(
                jdText="Backend role",
                skills=["Python", "MongoDB"],
                candidates=[
                    SourcingCandidate(candidateId="a", name="A", skills=["Python"]),
                    SourcingCandidate(
                        candidateId="b", name="B", skills=["Python", "MongoDB"]
                    ),
                ],
            )
        )
        assert [m.candidateId for m in result.matches] == ["b", "a"]
        assert result.matches[0].missingSkills == []
        assert result.matches[1].missingSkills == ["MongoDB"]

    def test_location_match_and_experience_lift_the_score(self):
        base = match_candidates(
            SourcingMatchRequest(
                skills=["Python"],
                location="Berlin",
                candidates=[SourcingCandidate(candidateId="a", skills=["Python"])],
            )
        ).matches[0]
        boosted = match_candidates(
            SourcingMatchRequest(
                skills=["Python"],
                location="Berlin",
                candidates=[
                    SourcingCandidate(
                        candidateId="a",
                        skills=["Python"],
                        location="berlin",
                        totalYears=8,
                    )
                ],
            )
        ).matches[0]
        assert boosted.score > base.score
        assert boosted.score <= 100

    def test_falls_back_to_jd_tokens_when_no_skills_tagged(self):
        result = match_candidates(
            SourcingMatchRequest(
                jdText="We need strong python and docker skills",
                candidates=[SourcingCandidate(candidateId="a", skills=["python"])],
            )
        )
        assert result.matches[0].matchedSkills == ["python"]

    def test_outreach_names_the_candidate_and_role(self):
        draft = draft_outreach(
            OutreachRequest(
                candidateName="Ada",
                jobTitle="Staff Engineer",
                matchedSkills=["Python"],
                applyUrl="/careers/staff-engineer-abc123",
            )
        )
        assert "Ada" in draft.body
        assert "Staff Engineer" in draft.subject
        assert "/careers/staff-engineer-abc123" in draft.body


class TestAssessmentGeneration:
    def test_generates_the_requested_number_of_questions(self):
        result = generate_assessment(
            AssessmentGenerateRequest(
                jobTitle="Backend Engineer",
                skills=["Python", "MongoDB", "Docker"],
                numQuestions=6,
            )
        )
        assert len(result.questions) == 6
        assert result.title.startswith("Backend Engineer")

    def test_difficulty_drives_duration_and_pass_mark(self):
        easy = generate_assessment(
            AssessmentGenerateRequest(skills=["Python"], difficulty="easy")
        )
        hard = generate_assessment(
            AssessmentGenerateRequest(skills=["Python"], difficulty="hard")
        )
        assert hard.durationMinutes > easy.durationMinutes
        assert hard.passingScore > easy.passingScore

    def test_pads_when_the_jd_lists_few_skills(self):
        result = generate_assessment(
            AssessmentGenerateRequest(skills=["Python"], numQuestions=5)
        )
        assert len(result.questions) == 5


class TestAssessmentGrading:
    def _mcq(self, weight: float = 1) -> AssessmentQuestion:
        return AssessmentQuestion(
            prompt="Pick", type="mcq", options=["a", "b"], correctIndex=0, weight=weight
        )

    def test_all_correct_mcqs_score_100(self):
        result = grade_assessment(
            AssessmentGradeRequest(
                questions=[self._mcq(), self._mcq()],
                answers=[
                    AssessmentAnswer(questionIndex=0, selectedIndex=0),
                    AssessmentAnswer(questionIndex=1, selectedIndex=0),
                ],
            )
        )
        assert result.score == 100
        assert all(q.correct for q in result.perQuestion)

    def test_wrong_and_unanswered_earn_nothing(self):
        result = grade_assessment(
            AssessmentGradeRequest(
                questions=[self._mcq(), self._mcq()],
                answers=[AssessmentAnswer(questionIndex=0, selectedIndex=1)],
            )
        )
        assert result.score == 0
        assert result.perQuestion[1].feedback == "Unanswered."

    def test_weights_shift_the_final_score(self):
        result = grade_assessment(
            AssessmentGradeRequest(
                questions=[self._mcq(weight=3), self._mcq(weight=1)],
                answers=[AssessmentAnswer(questionIndex=0, selectedIndex=0)],
            )
        )
        assert result.score == 75

    def test_free_text_earns_partial_credit_for_rubric_overlap(self):
        question = AssessmentQuestion(
            prompt="Describe a trade-off",
            type="short",
            expected="performance maintainability testing",
            weight=2,
        )
        strong = grade_assessment(
            AssessmentGradeRequest(
                questions=[question],
                answers=[
                    AssessmentAnswer(
                        questionIndex=0,
                        response=(
                            "I traded raw performance for maintainability, and kept "
                            "testing coverage high to protect the change."
                        ),
                    )
                ],
            )
        )
        weak = grade_assessment(
            AssessmentGradeRequest(
                questions=[question],
                answers=[AssessmentAnswer(questionIndex=0, response="dunno")],
            )
        )
        assert strong.score > weak.score
        assert weak.score < 60

    def test_empty_free_text_scores_zero(self):
        result = grade_assessment(
            AssessmentGradeRequest(
                questions=[AssessmentQuestion(prompt="Why?", type="short")],
                answers=[AssessmentAnswer(questionIndex=0, response="   ")],
            )
        )
        assert result.score == 0

    def test_no_questions_scores_zero_without_dividing_by_zero(self):
        result = grade_assessment(AssessmentGradeRequest())
        assert result.score == 0


class TestAiInterviewTurns:
    def test_first_turn_asks_the_first_planned_question(self):
        turn = next_turn(
            AiInterviewTurnRequest(plannedQuestions=["Q1", "Q2"], maxQuestions=2)
        )
        assert turn.question == "Q1"
        assert turn.isFinal is False

    def test_probes_deeper_after_a_thin_answer(self):
        turn = next_turn(
            AiInterviewTurnRequest(
                plannedQuestions=["Q1", "Q2"],
                transcript=[TranscriptTurn(question="Q1", answer="yes")],
                maxQuestions=2,
            )
        )
        assert "deeper" in turn.question

    def test_advances_the_plan_after_a_substantive_answer(self):
        turn = next_turn(
            AiInterviewTurnRequest(
                plannedQuestions=["Q1", "Q2"],
                transcript=[TranscriptTurn(question="Q1", answer=" ".join(["word"] * 40))],
                maxQuestions=2,
            )
        )
        assert turn.question == "Q2"
        assert turn.isFinal is True

    def test_signals_the_end_once_the_plan_is_exhausted(self):
        turn = next_turn(
            AiInterviewTurnRequest(
                plannedQuestions=["Q1"],
                transcript=[TranscriptTurn(question="Q1", answer=" ".join(["word"] * 40))],
                maxQuestions=1,
            )
        )
        assert turn.question == ""
        assert turn.isFinal is True

    def test_generates_a_plan_when_none_was_supplied(self):
        turn = next_turn(AiInterviewTurnRequest(jdText="Backend", skills=["Python"]))
        assert turn.question


class TestInterviewEvaluation:
    def test_empty_transcript_is_a_no(self):
        result = evaluate_transcript(InterviewEvaluateRequest())
        assert result.recommendation == "no"
        assert result.technical == 0

    def test_detailed_skill_backed_answers_beat_thin_ones(self):
        detailed = evaluate_transcript(
            InterviewEvaluateRequest(
                skills=["Python", "MongoDB"],
                transcript=[
                    TranscriptTurn(
                        question=f"Q{i}",
                        answer=(
                            "I built the Python service and tuned MongoDB indexes "
                            "with the team, mentoring two engineers along the way. "
                        )
                        * 4,
                    )
                    for i in range(5)
                ],
            )
        )
        thin = evaluate_transcript(
            InterviewEvaluateRequest(
                skills=["Python", "MongoDB"],
                transcript=[TranscriptTurn(question="Q1", answer="ok")],
            )
        )
        assert detailed.technical > thin.technical
        assert detailed.recommendation in ("yes", "strong_yes")
        assert detailed.strengths

    def test_flags_skills_with_no_evidence(self):
        result = evaluate_transcript(
            InterviewEvaluateRequest(
                skills=["Rust"],
                transcript=[TranscriptTurn(question="Q1", answer="I write Python.")],
            )
        )
        assert any("Rust" in c for c in result.concerns)

    def test_scores_stay_inside_the_five_point_scale(self):
        result = evaluate_transcript(
            InterviewEvaluateRequest(
                skills=["Python"],
                transcript=[
                    TranscriptTurn(question="Q", answer="Python team collaborate " * 200)
                ],
            )
        )
        for value in (result.technical, result.communication, result.culture):
            assert 0 <= value <= 5


class TestEvaluationSummary:
    def test_no_signal_holds_the_candidate(self):
        result = summarize_evaluation(EvaluationSummaryRequest())
        assert result.recommendation == "hold"
        assert result.overallScore == 0

    def test_strong_signals_recommend_a_hire(self):
        result = summarize_evaluation(
            EvaluationSummaryRequest(
                jobTitle="Backend Engineer",
                screeningScore=85,
                assessmentScore=90,
                interviews=[
                    InterviewScoreInput(
                        technical=4.5, communication=4.5, culture=4.5, recommendation="yes"
                    )
                ],
            )
        )
        assert result.recommendation == "hire"
        assert result.overallScore >= 75

    def test_weak_signals_recommend_a_reject(self):
        result = summarize_evaluation(
            EvaluationSummaryRequest(screeningScore=30, assessmentScore=25)
        )
        assert result.recommendation == "reject"

    def test_a_single_signal_is_not_diluted_by_the_missing_ones(self):
        result = summarize_evaluation(EvaluationSummaryRequest(assessmentScore=90))
        assert result.overallScore == 90
        assert any("No screening signal" in c for c in result.concerns)

    def test_negative_interviewer_recommendations_surface_as_concerns(self):
        result = summarize_evaluation(
            EvaluationSummaryRequest(
                screeningScore=80,
                interviews=[
                    InterviewScoreInput(
                        technical=2, communication=2, culture=2, recommendation="strong_no"
                    )
                ],
            )
        )
        assert any("recommended against" in c for c in result.concerns)

    def test_missing_skills_are_listed_as_gaps(self):
        result = summarize_evaluation(
            EvaluationSummaryRequest(screeningScore=70, missingSkills=["Kubernetes"])
        )
        assert any("Kubernetes" in c for c in result.concerns)
