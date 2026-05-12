from app.db.session import _prepare_asyncpg_url


def test_sslmode_require_sets_ssl_true():
    url, args = _prepare_asyncpg_url(
        "postgresql+asyncpg://user:pw@host/db?sslmode=require"
    )
    assert "sslmode" not in url
    assert args["ssl"] is True


def test_sslmode_verify_full_sets_ssl_true():
    url, args = _prepare_asyncpg_url(
        "postgresql+asyncpg://user:pw@host/db?sslmode=verify-full"
    )
    assert args["ssl"] is True


def test_no_sslmode_no_ssl_arg():
    _, args = _prepare_asyncpg_url("postgresql+asyncpg://user:pw@host/db")
    assert "ssl" not in args


def test_channel_binding_stripped():
    url, _ = _prepare_asyncpg_url(
        "postgresql+asyncpg://user:pw@host/db?channel_binding=require"
    )
    assert "channel_binding" not in url


def test_pooler_host_sets_statement_cache_size_zero():
    _, args = _prepare_asyncpg_url(
        "postgresql+asyncpg://user:pw@aws-0-us-east-1-pooler.neon.tech/db"
    )
    assert args["statement_cache_size"] == 0


def test_non_pooler_host_no_statement_cache_size():
    _, args = _prepare_asyncpg_url(
        "postgresql+asyncpg://user:pw@regular.host.com/db"
    )
    assert "statement_cache_size" not in args


def test_unrelated_query_params_preserved():
    url, _ = _prepare_asyncpg_url(
        "postgresql+asyncpg://user:pw@host/db?connect_timeout=10"
    )
    assert "connect_timeout=10" in url


def test_combined_sslmode_and_channel_binding():
    url, args = _prepare_asyncpg_url(
        "postgresql+asyncpg://user:pw@host/db?sslmode=require&channel_binding=require"
    )
    assert "sslmode" not in url
    assert "channel_binding" not in url
    assert args["ssl"] is True
