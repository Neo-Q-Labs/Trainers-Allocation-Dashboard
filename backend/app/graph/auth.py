from __future__ import annotations

import msal

from app.config import settings


def get_access_token() -> str:
    authority = f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}"
    scope = ["https://graph.microsoft.com/.default"]
    client = msal.ConfidentialClientApplication(
        client_id=settings.AZURE_CLIENT_ID,
        client_credential=settings.AZURE_CLIENT_SECRET,
        authority=authority,
    )

    result = client.acquire_token_silent(scopes=scope, account=None)
    if not result:
        result = client.acquire_token_for_client(scopes=scope)

    if "access_token" not in result:
        raise RuntimeError(f"MSAL token error: {result.get('error_description') or result}")
    return result["access_token"]
