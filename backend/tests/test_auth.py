import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_valid(client: AsyncClient):
    resp = await client.post(
        "/auth/login",
        data={"username": "admin@rift.dev", "password": "admin123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    resp = await client.post(
        "/auth/login",
        data={"username": "admin@rift.dev", "password": "wrongpassword"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    resp = await client.post(
        "/auth/login",
        data={"username": "nobody@rift.dev", "password": "admin123"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/users/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@rift.dev"
    assert data["is_superuser"] is True


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/users/me")
    assert resp.status_code == 401
