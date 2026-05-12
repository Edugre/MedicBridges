from httpx import AsyncClient


async def test_healthz_returns_ok(http_client: AsyncClient):
    response = await http_client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_healthz_includes_env_for_non_production(http_client: AsyncClient):
    # APP_ENV=test (set by conftest) is not "production", so env should appear.
    assert "env" in (await http_client.get("/healthz")).json()


async def test_healthz_db_returns_one(http_client: AsyncClient):
    response = await http_client.get("/healthz/db")
    assert response.status_code == 200
    assert response.json()["db"] == 1
