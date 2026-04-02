from httpx import AsyncClient


async def test_list_tags_public(client: AsyncClient):
    resp = await client.get("/tags")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_create_tag_unauthorized(client: AsyncClient):
    resp = await client.post("/tags", json={"name": "Unauthorized Tag"})
    assert resp.status_code == 401


async def test_create_tag(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/tags", json={"name": "Test Tag"}, headers=auth_headers)
    assert resp.status_code == 201
    tag = resp.json()
    assert tag["name"] == "Test Tag"
    assert tag["slug"] == "test-tag"
    assert "id" in tag

    # cleanup
    await client.delete(f"/tags/{tag['id']}", headers=auth_headers)


async def test_delete_tag(client: AsyncClient, auth_headers: dict):
    create = await client.post("/tags", json={"name": "Tag To Delete"}, headers=auth_headers)
    assert create.status_code == 201
    tag_id = create.json()["id"]

    resp = await client.delete(f"/tags/{tag_id}", headers=auth_headers)
    assert resp.status_code == 204


async def test_delete_tag_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.delete(
        "/tags/00000000-0000-0000-0000-000000000000", headers=auth_headers
    )
    assert resp.status_code == 404


async def test_delete_tag_unauthorized(client: AsyncClient):
    resp = await client.delete("/tags/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 401
