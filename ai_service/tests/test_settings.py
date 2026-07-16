import pytest
from app.settings import ApiSettings


def test_require_auth_defaults_on_in_production(monkeypatch):
    monkeypatch.delenv("AI_REQUIRE_AUTH", raising=False)
    monkeypatch.setenv("AI_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "")

    settings = ApiSettings()
    assert settings.require_auth is True


def test_require_auth_defaults_on_when_jwt_secret_set(monkeypatch):
    monkeypatch.delenv("AI_REQUIRE_AUTH", raising=False)
    monkeypatch.setenv("AI_ENV", "development")
    monkeypatch.setenv("JWT_SECRET", "test-secret")

    settings = ApiSettings()
    assert settings.require_auth is True
