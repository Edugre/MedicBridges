-- PostgREST RPC calls inherit role statement_timeout (~8–10s default on API pool).
-- Bulk transforms need longer; function-local set_config is not always honored via pooler.

ALTER ROLE authenticator SET statement_timeout = '600s';
ALTER ROLE service_role SET statement_timeout = '600s';
ALTER ROLE postgres SET statement_timeout = '600s';
