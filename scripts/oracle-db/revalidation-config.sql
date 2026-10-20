-- Run with psql as postgres, outside a transaction. No database restart is needed.
-- Leave capacity under Caddy's admission limit for ordinary page requests.
ALTER SYSTEM SET pg_net.batch_size = '32';
SELECT pg_reload_conf();
