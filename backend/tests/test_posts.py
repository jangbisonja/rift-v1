import uuid

from httpx import AsyncClient


def make_post(title: str | None = None) -> dict:
    return {
        "type": "ARTICLE",
        "title": title or f"Test Article {uuid.uuid4().hex[:8]}",
        "content": {"type": "doc", "content": []},
        "post_metadata": {},
        "tag_ids": [],
    }


async def test_list_posts_public(client: AsyncClient):
    resp = await client.get("/posts")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_list_posts_filter_by_type(client: AsyncClient):
    resp = await client.get("/posts", params={"post_type": "ARTICLE"})
    assert resp.status_code == 200
    assert all(p["type"] == "ARTICLE" for p in resp.json())


async def test_create_post_unauthorized(client: AsyncClient):
    resp = await client.post("/posts", json=make_post())
    assert resp.status_code == 401


async def test_create_and_get_post(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/posts", json=make_post(), headers=auth_headers)
    assert resp.status_code == 201
    post = resp.json()
    assert post["type"] == "ARTICLE"
    assert post["status"] == "DRAFT"
    assert "slug" in post
    post_id = post["id"]

    get_resp = await client.get(f"/posts/{post_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == post_id

    # cleanup
    await client.delete(f"/posts/{post_id}", headers=auth_headers)


async def test_update_post(client: AsyncClient, auth_headers: dict):
    create = await client.post("/posts", json=make_post(), headers=auth_headers)
    assert create.status_code == 201
    post_id = create.json()["id"]

    new_title = f"Updated {uuid.uuid4().hex[:8]}"
    resp = await client.put(
        f"/posts/{post_id}",
        json={"title": new_title},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == new_title

    # cleanup
    await client.delete(f"/posts/{post_id}", headers=auth_headers)


async def test_publish_post(client: AsyncClient, auth_headers: dict):
    create = await client.post("/posts", json=make_post(), headers=auth_headers)
    assert create.status_code == 201
    post_id = create.json()["id"]

    resp = await client.patch(f"/posts/{post_id}/publish", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "PUBLISHED"
    assert data["published_at"] is not None

    # cleanup
    await client.delete(f"/posts/{post_id}", headers=auth_headers)


async def test_delete_post(client: AsyncClient, auth_headers: dict):
    create = await client.post("/posts", json=make_post(), headers=auth_headers)
    assert create.status_code == 201
    post_id = create.json()["id"]

    resp = await client.delete(f"/posts/{post_id}", headers=auth_headers)
    assert resp.status_code == 204


async def test_delete_post_unauthorized(client: AsyncClient):
    resp = await client.delete("/posts/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 401


async def test_get_post_not_found(client: AsyncClient):
    resp = await client.get("/posts/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


async def test_create_post_with_tags(client: AsyncClient, auth_headers: dict):
    tag_name = f"Post Tag {uuid.uuid4().hex[:8]}"
    tag = await client.post("/tags", json={"name": tag_name}, headers=auth_headers)
    assert tag.status_code == 201
    tag_id = tag.json()["id"]

    post_data = {**make_post(), "tag_ids": [tag_id]}
    resp = await client.post("/posts", json=post_data, headers=auth_headers)
    assert resp.status_code == 201
    post = resp.json()
    assert any(t["id"] == tag_id for t in post["tags"])
    post_id = post["id"]

    # cleanup
    await client.delete(f"/posts/{post_id}", headers=auth_headers)
    await client.delete(f"/tags/{tag_id}", headers=auth_headers)
