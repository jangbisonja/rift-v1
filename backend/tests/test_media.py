import io
import uuid

import pytest
from httpx import AsyncClient
from PIL import Image


def _make_png() -> bytes:
    img = Image.new("RGB", (10, 10), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _png_file(name: str | None = None) -> dict:
    return {
        "file": (
            name or f"test_{uuid.uuid4().hex[:8]}.png",
            _make_png(),
            "image/png",
        )
    }


@pytest.mark.asyncio
async def test_upload_no_auth(client: AsyncClient):
    resp = await client.post("/media/upload", files=_png_file())
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_upload_invalid_type(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/media/upload",
        files={"file": ("doc.pdf", b"%PDF-fake", "application/pdf")},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upload_and_delete(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/media/upload", files=_png_file(), headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert data["path"].endswith(".webp")

    media_id = data["id"]
    del_resp = await client.delete(f"/media/{media_id}", headers=auth_headers)
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_not_found(client: AsyncClient, auth_headers: dict):
    fake_id = uuid.uuid4()
    resp = await client.delete(f"/media/{fake_id}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_no_auth(client: AsyncClient, auth_headers: dict):
    # Upload first so we have a real ID
    up = await client.post("/media/upload", files=_png_file(), headers=auth_headers)
    assert up.status_code == 201
    media_id = up.json()["id"]

    resp = await client.delete(f"/media/{media_id}")
    assert resp.status_code == 401

    # Cleanup
    await client.delete(f"/media/{media_id}", headers=auth_headers)


@pytest.mark.asyncio
async def test_attach_to_post(client: AsyncClient, auth_headers: dict):
    # Create a post to attach to
    post_resp = await client.post(
        "/posts",
        json={
            "type": "ARTICLE",
            "title": f"Media Test Post {uuid.uuid4().hex[:8]}",
            "content": {"type": "doc", "content": []},
            "post_metadata": {},
            "tag_ids": [],
        },
        headers=auth_headers,
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json()["id"]

    # Upload media
    up = await client.post("/media/upload", files=_png_file(), headers=auth_headers)
    assert up.status_code == 201
    media_id = up.json()["id"]

    # Attach
    attach = await client.post(f"/media/{media_id}/attach/{post_id}", headers=auth_headers)
    assert attach.status_code == 200
    assert attach.json()["post_id"] == post_id

    # Cleanup
    await client.delete(f"/media/{media_id}", headers=auth_headers)
    await client.delete(f"/posts/{post_id}", headers=auth_headers)
