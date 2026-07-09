BEGIN;

DO $$ BEGIN
  CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_trigger_status AS ENUM ('inactive', 'active', 'error');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_trigger_delivery AS ENUM ('webhook', 'polling', 'persistent', 'schedule');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_event_status AS ENUM ('received', 'queued', 'processed', 'ignored', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_run_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_step_status AS ENUM ('pending', 'running', 'succeeded', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS workflow (
  id                 uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       uuid                     NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  created_by         uuid                     NOT NULL REFERENCES users(id),
  source_chat_id     uuid                              REFERENCES chat(id) ON DELETE SET NULL,
  legacy_automation_id uuid                            UNIQUE REFERENCES automation(id) ON DELETE SET NULL,
  name               text                     NOT NULL,
  description        text,
  definition         jsonb                    NOT NULL DEFAULT '{"version":1,"nodes":[],"edges":[]}'::jsonb,
  current_version    integer                  NOT NULL DEFAULT 1 CHECK (current_version > 0),
  status             workflow_status          NOT NULL DEFAULT 'draft',
  activated_at       timestamp with time zone,
  created_at         timestamp with time zone NOT NULL DEFAULT now(),
  updated_at         timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(definition) = 'object')
);

CREATE TABLE IF NOT EXISTS workflow_version (
  id             uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id    uuid                     NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  version        integer                  NOT NULL CHECK (version > 0),
  definition     jsonb                    NOT NULL,
  change_summary text,
  created_by     uuid                     NOT NULL REFERENCES users(id),
  created_at     timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version),
  UNIQUE (workflow_id, id),
  CHECK (jsonb_typeof(definition) = 'object')
);

CREATE TABLE IF NOT EXISTS workflow_approval (
  id                  uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id         uuid                     NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  workflow_version_id uuid                     NOT NULL,
  approved_by         uuid                     NOT NULL REFERENCES users(id),
  summary             text                     NOT NULL,
  permissions         jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  approved_at         timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at          timestamp with time zone,
  FOREIGN KEY (workflow_id, workflow_version_id)
    REFERENCES workflow_version(workflow_id, id) ON DELETE CASCADE,
  CHECK (jsonb_typeof(permissions) = 'array')
);

CREATE TABLE IF NOT EXISTS workflow_trigger (
  id              uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid                      NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  connection_id   uuid                               REFERENCES workspace_integration(id) ON DELETE CASCADE,
  provider        text                      NOT NULL,
  event_type      text                      NOT NULL,
  filter          jsonb                     NOT NULL DEFAULT '{}'::jsonb,
  delivery        workflow_trigger_delivery NOT NULL,
  status          workflow_trigger_status   NOT NULL DEFAULT 'inactive',
  external_ref    text,
  cursor          jsonb,
  last_received_at timestamp with time zone,
  error           text,
  created_at      timestamp with time zone  NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone  NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(filter) = 'object')
);

CREATE TABLE IF NOT EXISTS workflow_event (
  id                uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id        uuid                     NOT NULL REFERENCES workflow_trigger(id) ON DELETE CASCADE,
  provider_event_id text,
  headers           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  payload           jsonb                    NOT NULL,
  status            workflow_event_status    NOT NULL DEFAULT 'received',
  error             text,
  received_at       timestamp with time zone NOT NULL DEFAULT now(),
  processed_at      timestamp with time zone,
  CHECK (jsonb_typeof(headers) = 'object'),
  UNIQUE (trigger_id, provider_event_id)
);

CREATE TABLE IF NOT EXISTS workflow_run (
  id                  uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id         uuid                     NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  workflow_version_id uuid                     NOT NULL,
  trigger_event_id    uuid                              REFERENCES workflow_event(id) ON DELETE SET NULL,
  idempotency_key     text                     UNIQUE NOT NULL,
  status              workflow_run_status      NOT NULL DEFAULT 'queued',
  attempt             integer                  NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  input               jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  output              jsonb,
  error               text,
  queued_at           timestamp with time zone NOT NULL DEFAULT now(),
  started_at          timestamp with time zone,
  finished_at         timestamp with time zone,
  created_at          timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (workflow_id, workflow_version_id)
    REFERENCES workflow_version(workflow_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS workflow_run_step (
  id          uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid                     NOT NULL REFERENCES workflow_run(id) ON DELETE CASCADE,
  node_id     text                     NOT NULL,
  sequence    integer                  NOT NULL CHECK (sequence >= 0),
  tool_key    text,
  status      workflow_step_status     NOT NULL DEFAULT 'pending',
  attempt     integer                  NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  input       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  output      jsonb,
  error       text,
  duration_ms integer                           CHECK (duration_ms IS NULL OR duration_ms >= 0),
  started_at  timestamp with time zone,
  finished_at timestamp with time zone,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (run_id, node_id, attempt)
);

CREATE INDEX IF NOT EXISTS workflow_workspace_status_idx
  ON workflow (workspace_id, status);
CREATE INDEX IF NOT EXISTS workflow_source_chat_idx
  ON workflow (source_chat_id);
CREATE INDEX IF NOT EXISTS workflow_version_workflow_idx
  ON workflow_version (workflow_id, version DESC);
CREATE INDEX IF NOT EXISTS workflow_trigger_workflow_status_idx
  ON workflow_trigger (workflow_id, status);
CREATE INDEX IF NOT EXISTS workflow_trigger_connection_idx
  ON workflow_trigger (connection_id);
CREATE INDEX IF NOT EXISTS workflow_event_status_received_idx
  ON workflow_event (status, received_at);
CREATE INDEX IF NOT EXISTS workflow_run_queue_idx
  ON workflow_run (status, queued_at);
CREATE INDEX IF NOT EXISTS workflow_run_workflow_idx
  ON workflow_run (workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_run_step_run_idx
  ON workflow_run_step (run_id, sequence);

DROP TRIGGER IF EXISTS trg_workflow_updated_at ON workflow;
CREATE TRIGGER trg_workflow_updated_at
  BEFORE UPDATE ON workflow
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS trg_workflow_trigger_updated_at ON workflow_trigger;
CREATE TRIGGER trg_workflow_trigger_updated_at
  BEFORE UPDATE ON workflow_trigger
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approval ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_trigger ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_run_step ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow: members can view" ON workflow;
CREATE POLICY "workflow: members can view"
  ON workflow FOR SELECT
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "workflow: members can create" ON workflow;
CREATE POLICY "workflow: members can create"
  ON workflow FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "workflow: creator or admin can update" ON workflow;
CREATE POLICY "workflow: creator or admin can update"
  ON workflow FOR UPDATE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "workflow: creator or admin can delete" ON workflow;
CREATE POLICY "workflow: creator or admin can delete"
  ON workflow FOR DELETE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "workflow_version: members can view" ON workflow_version;
CREATE POLICY "workflow_version: members can view"
  ON workflow_version FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflow
      WHERE workflow.id = workflow_version.workflow_id
        AND is_workspace_member(workflow.workspace_id)
    )
  );

DROP POLICY IF EXISTS "workflow_version: workflow editors can create" ON workflow_version;
CREATE POLICY "workflow_version: workflow editors can create"
  ON workflow_version FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workflow
      WHERE workflow.id = workflow_version.workflow_id
        AND (workflow.created_by = auth.uid() OR is_workspace_admin(workflow.workspace_id))
    )
  );

DROP POLICY IF EXISTS "workflow_approval: members can view" ON workflow_approval;
CREATE POLICY "workflow_approval: members can view"
  ON workflow_approval FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflow
      WHERE workflow.id = workflow_approval.workflow_id
        AND is_workspace_member(workflow.workspace_id)
    )
  );

DROP POLICY IF EXISTS "workflow_approval: admins can approve" ON workflow_approval;
CREATE POLICY "workflow_approval: admins can approve"
  ON workflow_approval FOR INSERT
  WITH CHECK (
    approved_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workflow
      WHERE workflow.id = workflow_approval.workflow_id
        AND is_workspace_admin(workflow.workspace_id)
    )
  );

DROP POLICY IF EXISTS "workflow_approval: admins can revoke" ON workflow_approval;
CREATE POLICY "workflow_approval: admins can revoke"
  ON workflow_approval FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workflow
      WHERE workflow.id = workflow_approval.workflow_id
        AND is_workspace_admin(workflow.workspace_id)
    )
  );

DROP POLICY IF EXISTS "workflow_trigger: members can view" ON workflow_trigger;
CREATE POLICY "workflow_trigger: members can view"
  ON workflow_trigger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflow
      WHERE workflow.id = workflow_trigger.workflow_id
        AND is_workspace_member(workflow.workspace_id)
    )
  );

DROP POLICY IF EXISTS "workflow_trigger: editors can manage" ON workflow_trigger;
CREATE POLICY "workflow_trigger: editors can manage"
  ON workflow_trigger FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workflow
      WHERE workflow.id = workflow_trigger.workflow_id
        AND (workflow.created_by = auth.uid() OR is_workspace_admin(workflow.workspace_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflow
      WHERE workflow.id = workflow_trigger.workflow_id
        AND (workflow.created_by = auth.uid() OR is_workspace_admin(workflow.workspace_id))
    )
  );

DROP POLICY IF EXISTS "workflow_event: members can view" ON workflow_event;
CREATE POLICY "workflow_event: members can view"
  ON workflow_event FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workflow_trigger
      JOIN workflow ON workflow.id = workflow_trigger.workflow_id
      WHERE workflow_trigger.id = workflow_event.trigger_id
        AND is_workspace_member(workflow.workspace_id)
    )
  );

DROP POLICY IF EXISTS "workflow_run: members can view" ON workflow_run;
CREATE POLICY "workflow_run: members can view"
  ON workflow_run FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflow
      WHERE workflow.id = workflow_run.workflow_id
        AND is_workspace_member(workflow.workspace_id)
    )
  );

DROP POLICY IF EXISTS "workflow_run_step: members can view" ON workflow_run_step;
CREATE POLICY "workflow_run_step: members can view"
  ON workflow_run_step FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workflow_run
      JOIN workflow ON workflow.id = workflow_run.workflow_id
      WHERE workflow_run.id = workflow_run_step.run_id
        AND is_workspace_member(workflow.workspace_id)
    )
  );

COMMIT;
