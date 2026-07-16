BEGIN;

DO $$ BEGIN
  CREATE TYPE agent_event_status AS ENUM ('received', 'queued', 'processed', 'ignored', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE agent_trigger
  ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES workspace_integration(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS external_provider text,
  ADD COLUMN IF NOT EXISTS external_trigger_id text,
  ADD COLUMN IF NOT EXISTS external_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_received_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS agent_event (
  id                uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id        uuid                     NOT NULL REFERENCES agent_trigger(id) ON DELETE CASCADE,
  provider_event_id text,
  headers           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  payload           jsonb                    NOT NULL,
  status            agent_event_status       NOT NULL DEFAULT 'received',
  error             text,
  received_at       timestamp with time zone NOT NULL DEFAULT now(),
  processed_at      timestamp with time zone,
  external_provider text,
  external_event_id text,
  external_metadata jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  CHECK (jsonb_typeof(headers) = 'object'),
  CHECK (jsonb_typeof(external_metadata) = 'object'),
  UNIQUE (trigger_id, provider_event_id)
);

CREATE INDEX IF NOT EXISTS agent_trigger_connection_idx
  ON agent_trigger (connection_id);
CREATE INDEX IF NOT EXISTS agent_trigger_external_idx
  ON agent_trigger (external_provider, external_trigger_id);
CREATE INDEX IF NOT EXISTS agent_event_status_received_idx
  ON agent_event (status, received_at);
CREATE INDEX IF NOT EXISTS agent_event_trigger_idx
  ON agent_event (trigger_id, received_at DESC);
CREATE INDEX IF NOT EXISTS agent_event_external_idx
  ON agent_event (external_provider, external_event_id);

ALTER TABLE agent_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_event: members can view" ON agent_event;
CREATE POLICY "agent_event: members can view"
  ON agent_event FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM agent_trigger
      JOIN agent ON agent.id = agent_trigger.agent_id
      WHERE agent_trigger.id = agent_event.trigger_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

COMMIT;
