import json
import os
import urllib.parse
import urllib.request
from typing import Optional

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


def verify_recaptcha(token: Optional[str], remote_ip: Optional[str] = None) -> bool:
    """Verify a reCAPTCHA v2 response token against Google's siteverify API.
    Raises RuntimeError if RECAPTCHA_SECRET_KEY isn't configured, so callers
    can surface that as a 503 rather than silently letting requests through."""
    secret = os.getenv("RECAPTCHA_SECRET_KEY")
    if not secret:
        raise RuntimeError("RECAPTCHA_SECRET_KEY environment variable is required")
    if not token:
        return False

    data = {"secret": secret, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip

    encoded = urllib.parse.urlencode(data).encode("utf-8")
    request = urllib.request.Request(VERIFY_URL, data=encoded, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
    except Exception:
        return False

    return bool(result.get("success"))
