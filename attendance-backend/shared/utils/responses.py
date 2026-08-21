from typing import Any, Optional
from pydantic import BaseModel


class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


def success_response(message: str, data: Any = None) -> dict:
    return APIResponse(success=True, message=message, data=data).model_dump()


def error_response(message: str, data: Any = None) -> dict:
    return APIResponse(success=False, message=message, data=data).model_dump()
