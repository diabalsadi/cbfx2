import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def test_auth_module_requires_jwt_secret_from_env(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    sys.modules.pop("app.utils.auth", None)

    try:
        importlib.import_module("app.utils.auth")
    except RuntimeError as exc:
        assert "JWT_SECRET" in str(exc)
    else:
        raise AssertionError("Expected RuntimeError when JWT_SECRET is missing")
