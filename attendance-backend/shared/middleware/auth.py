from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from shared.utils.jwt import decode_access_token

security = HTTPBearer()


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    FastAPI dependency — attach to any route that requires authentication.
    Usage:
        @router.get("/protected", dependencies=[Depends(require_auth)])
    """
    payload = decode_access_token(credentials.credentials)
    return payload