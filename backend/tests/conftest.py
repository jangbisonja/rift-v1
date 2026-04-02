import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app, _create_admin


@pytest.fixture(scope="session", autouse=True)
async def seed_db():
    """ASGITransport does not trigger ASGI lifespan, so admin must be seeded explicitly."""
    await _create_admin()


@pytest.fixture(scope="session")
async def client(seed_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture(scope="session")
async def superuser_token(client: AsyncClient) -> str:
    resp = await client.post(
        "/auth/login",
        data={"username": "admin@rift.dev", "password": "admin123"},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers(superuser_token: str) -> dict:
    return {"Authorization": f"Bearer {superuser_token}"}
