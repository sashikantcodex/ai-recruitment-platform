from fastapi import APIRouter, Depends

from app.core.security import verify_service_token
from app.models.schemas import SalaryBenchmarkRequest, SalaryBenchmarkResponse
from app.services.salary import benchmark_salary

router = APIRouter(prefix="/internal/v1/salary", tags=["salary"])


@router.post("/benchmark", response_model=SalaryBenchmarkResponse)
def benchmark(
    payload: SalaryBenchmarkRequest,
    _: str = Depends(verify_service_token),
) -> SalaryBenchmarkResponse:
    return benchmark_salary(payload)
