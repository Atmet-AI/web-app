BEGIN;

ALTER TYPE integration_status ADD VALUE IF NOT EXISTS 'pending';

ALTER TABLE integration_provider
  ADD COLUMN IF NOT EXISTS connector_provider text NOT NULL DEFAULT 'native'
    CHECK (connector_provider IN ('native', 'composio', 'mcp', 'external_api')),
  ADD COLUMN IF NOT EXISTS external_toolkit text,
  ADD COLUMN IF NOT EXISTS external_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE workspace_integration
  ADD COLUMN IF NOT EXISTS connector_provider text NOT NULL DEFAULT 'native'
    CHECK (connector_provider IN ('native', 'composio', 'mcp', 'external_api')),
  ADD COLUMN IF NOT EXISTS external_connection_id text,
  ADD COLUMN IF NOT EXISTS external_user_id text,
  ADD COLUMN IF NOT EXISTS external_auth_config_id text,
  ADD COLUMN IF NOT EXISTS external_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE workflow_trigger
  ADD COLUMN IF NOT EXISTS external_provider text,
  ADD COLUMN IF NOT EXISTS external_trigger_id text,
  ADD COLUMN IF NOT EXISTS external_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE workflow_event
  ADD COLUMN IF NOT EXISTS external_provider text,
  ADD COLUMN IF NOT EXISTS external_event_id text,
  ADD COLUMN IF NOT EXISTS external_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS integration_provider_connector_idx
  ON integration_provider (connector_provider, external_toolkit);

CREATE INDEX IF NOT EXISTS workspace_integration_external_connection_idx
  ON workspace_integration (connector_provider, external_connection_id);

CREATE INDEX IF NOT EXISTS workflow_trigger_external_idx
  ON workflow_trigger (external_provider, external_trigger_id);

CREATE INDEX IF NOT EXISTS workflow_event_external_idx
  ON workflow_event (external_provider, external_event_id);

COMMIT;
