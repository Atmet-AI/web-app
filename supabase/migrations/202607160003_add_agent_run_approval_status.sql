BEGIN;

ALTER TYPE agent_run_status ADD VALUE IF NOT EXISTS 'waiting_for_approval';

COMMIT;
