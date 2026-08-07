from app.models.schemas import SalaryBenchmarkRequest, SalaryBenchmarkResponse


def benchmark_salary(payload: SalaryBenchmarkRequest) -> SalaryBenchmarkResponse:
    title = payload.title.lower()
    base = 90000.0
    if "senior" in title or "lead" in title:
        base = 140000.0
    elif "principal" in title or "staff" in title:
        base = 180000.0
    elif "intern" in title or "junior" in title:
        base = 65000.0

    years_bump = min(payload.years, 15) * 2500
    mid = base + years_bump
    return SalaryBenchmarkResponse(
        min=round(mid * 0.85, 2),
        mid=round(mid, 2),
        max=round(mid * 1.2, 2),
        currency="USD",
        rationale=(
            f"Mock benchmark for '{payload.title}' in {payload.location} "
            f"with ~{payload.years} years experience."
        ),
    )
