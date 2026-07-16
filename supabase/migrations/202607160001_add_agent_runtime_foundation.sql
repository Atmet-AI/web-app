BEGIN;

DO $$ BEGIN
  CREATE TYPE agent_status AS ENUM ('draft', 'active', 'paused', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_trigger_status AS ENUM ('inactive', 'active', 'error');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_run_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_step_status AS ENUM ('pending', 'running', 'succeeded', 'failed', 'skipped', 'waiting_for_approval');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS agent_template (
  id             uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid                              REFERENCES workspace(id) ON DELETE CASCADE,
  created_by     uuid                              REFERENCES users(id) ON DELETE SET NULL,
  name           text                     NOT NULL,
  description    text,
  category       text,
  blueprint_json jsonb                    NOT NULL DEFAULT '{"version":1,"steps":[]}'::jsonb,
  status         text                     NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at     timestamp with time zone NOT NULL DEFAULT now(),
  updated_at     timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(blueprint_json) = 'object'),
  CHECK (
    (workspace_id IS NULL AND created_by IS NULL)
    OR
    (workspace_id IS NOT NULL AND created_by IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS agent (
  id                   uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid                     NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  created_by           uuid                     NOT NULL REFERENCES users(id),
  template_id          uuid                              REFERENCES agent_template(id) ON DELETE SET NULL,
  legacy_automation_id uuid                              UNIQUE REFERENCES automation(id) ON DELETE SET NULL,
  name                 text                     NOT NULL,
  description          text,
  goal                 text,
  status               agent_status             NOT NULL DEFAULT 'draft',
  instructions         text,
  blueprint_json       jsonb                    NOT NULL DEFAULT '{"version":1,"steps":[],"required_apps":[],"approval_policy":{}}'::jsonb,
  runtime_config_json  jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  activated_at         timestamp with time zone,
  created_at           timestamp with time zone NOT NULL DEFAULT now(),
  updated_at           timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(blueprint_json) = 'object'),
  CHECK (jsonb_typeof(runtime_config_json) = 'object')
);

CREATE TABLE IF NOT EXISTS agent_tool (
  id               uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         uuid                     NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  provider         text                     NOT NULL,
  tool_name        text                     NOT NULL,
  connection_id    uuid                              REFERENCES workspace_integration(id) ON DELETE SET NULL,
  permissions_json jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(permissions_json) = 'object'),
  UNIQUE (agent_id, provider, tool_name, connection_id)
);

CREATE TABLE IF NOT EXISTS agent_trigger (
  id           uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     uuid                     NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  type         text                     NOT NULL,
  config_json  jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  status       agent_trigger_status     NOT NULL DEFAULT 'inactive',
  cursor_json  jsonb,
  last_run_at  timestamp with time zone,
  error        text,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  updated_at   timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(config_json) = 'object')
);

CREATE TABLE IF NOT EXISTS agent_memory (
  id         uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   uuid                     NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  scope      text                     NOT NULL DEFAULT 'workspace',
  key        text                     NOT NULL,
  value_json jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(value_json) = 'object'),
  UNIQUE (agent_id, scope, key)
);

CREATE TABLE IF NOT EXISTS agent_run (
  id              uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid                     NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  trigger_id      uuid                              REFERENCES agent_trigger(id) ON DELETE SET NULL,
  idempotency_key text                     UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status          agent_run_status         NOT NULL DEFAULT 'queued',
  input_json      jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  output_json     jsonb,
  error           text,
  queued_at       timestamp with time zone NOT NULL DEFAULT now(),
  started_at      timestamp with time zone,
  finished_at     timestamp with time zone,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(input_json) = 'object')
);

CREATE TABLE IF NOT EXISTS agent_run_step (
  id          uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid                     NOT NULL REFERENCES agent_run(id) ON DELETE CASCADE,
  step_index  integer                  NOT NULL CHECK (step_index >= 0),
  step_name   text                     NOT NULL,
  tool_called text,
  status      agent_step_status        NOT NULL DEFAULT 'pending',
  input_json  jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  output_json jsonb,
  error       text,
  duration_ms integer                           CHECK (duration_ms IS NULL OR duration_ms >= 0),
  started_at  timestamp with time zone,
  finished_at timestamp with time zone,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(input_json) = 'object'),
  UNIQUE (run_id, step_index)
);

CREATE TABLE IF NOT EXISTS agent_approval (
  id                  uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            uuid                     NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  run_id              uuid                              REFERENCES agent_run(id) ON DELETE CASCADE,
  requested_by_run_step_id uuid                         REFERENCES agent_run_step(id) ON DELETE SET NULL,
  action_json         jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  status              agent_approval_status    NOT NULL DEFAULT 'pending',
  requested_at        timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at         timestamp with time zone,
  resolved_by_user_id uuid                              REFERENCES users(id) ON DELETE SET NULL,
  CHECK (jsonb_typeof(action_json) = 'object')
);

CREATE INDEX IF NOT EXISTS agent_template_workspace_status_idx
  ON agent_template (workspace_id, status);
CREATE INDEX IF NOT EXISTS agent_workspace_status_idx
  ON agent (workspace_id, status);
CREATE INDEX IF NOT EXISTS agent_created_by_idx
  ON agent (created_by);
CREATE INDEX IF NOT EXISTS agent_tool_agent_idx
  ON agent_tool (agent_id);
CREATE INDEX IF NOT EXISTS agent_tool_connection_idx
  ON agent_tool (connection_id);
CREATE INDEX IF NOT EXISTS agent_trigger_agent_status_idx
  ON agent_trigger (agent_id, status);
CREATE INDEX IF NOT EXISTS agent_memory_agent_scope_idx
  ON agent_memory (agent_id, scope);
CREATE INDEX IF NOT EXISTS agent_run_agent_created_idx
  ON agent_run (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_run_queue_idx
  ON agent_run (status, queued_at);
CREATE INDEX IF NOT EXISTS agent_run_step_run_idx
  ON agent_run_step (run_id, step_index);
CREATE INDEX IF NOT EXISTS agent_approval_agent_status_idx
  ON agent_approval (agent_id, status);

DROP TRIGGER IF EXISTS trg_agent_template_updated_at ON agent_template;
CREATE TRIGGER trg_agent_template_updated_at
  BEFORE UPDATE ON agent_template
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS trg_agent_updated_at ON agent;
CREATE TRIGGER trg_agent_updated_at
  BEFORE UPDATE ON agent
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS trg_agent_trigger_updated_at ON agent_trigger;
CREATE TRIGGER trg_agent_trigger_updated_at
  BEFORE UPDATE ON agent_trigger
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS trg_agent_memory_updated_at ON agent_memory;
CREATE TRIGGER trg_agent_memory_updated_at
  BEFORE UPDATE ON agent_memory
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE agent_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trigger ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_run_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_approval ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_template: members can view" ON agent_template;
CREATE POLICY "agent_template: members can view"
  ON agent_template FOR SELECT
  USING (workspace_id IS NULL OR is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "agent_template: members can create" ON agent_template;
CREATE POLICY "agent_template: members can create"
  ON agent_template FOR INSERT
  WITH CHECK (workspace_id IS NOT NULL AND is_workspace_member(workspace_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "agent_template: creator or admin can update" ON agent_template;
CREATE POLICY "agent_template: creator or admin can update"
  ON agent_template FOR UPDATE
  USING (workspace_id IS NOT NULL AND (created_by = auth.uid() OR is_workspace_admin(workspace_id)));

DROP POLICY IF EXISTS "agent_template: creator or admin can delete" ON agent_template;
CREATE POLICY "agent_template: creator or admin can delete"
  ON agent_template FOR DELETE
  USING (workspace_id IS NOT NULL AND (created_by = auth.uid() OR is_workspace_admin(workspace_id)));

DROP POLICY IF EXISTS "agent: members can view" ON agent;
CREATE POLICY "agent: members can view"
  ON agent FOR SELECT
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "agent: members can create" ON agent;
CREATE POLICY "agent: members can create"
  ON agent FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "agent: creator or admin can update" ON agent;
CREATE POLICY "agent: creator or admin can update"
  ON agent FOR UPDATE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "agent: creator or admin can delete" ON agent;
CREATE POLICY "agent: creator or admin can delete"
  ON agent FOR DELETE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "agent_tool: members can view" ON agent_tool;
CREATE POLICY "agent_tool: members can view"
  ON agent_tool FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_tool.agent_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

DROP POLICY IF EXISTS "agent_tool: editors can manage" ON agent_tool;
CREATE POLICY "agent_tool: editors can manage"
  ON agent_tool FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_tool.agent_id
        AND (agent.created_by = auth.uid() OR is_workspace_admin(agent.workspace_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_tool.agent_id
        AND (agent.created_by = auth.uid() OR is_workspace_admin(agent.workspace_id))
    )
  );

DROP POLICY IF EXISTS "agent_trigger: members can view" ON agent_trigger;
CREATE POLICY "agent_trigger: members can view"
  ON agent_trigger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_trigger.agent_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

DROP POLICY IF EXISTS "agent_trigger: editors can manage" ON agent_trigger;
CREATE POLICY "agent_trigger: editors can manage"
  ON agent_trigger FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_trigger.agent_id
        AND (agent.created_by = auth.uid() OR is_workspace_admin(agent.workspace_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_trigger.agent_id
        AND (agent.created_by = auth.uid() OR is_workspace_admin(agent.workspace_id))
    )
  );

DROP POLICY IF EXISTS "agent_memory: members can view" ON agent_memory;
CREATE POLICY "agent_memory: members can view"
  ON agent_memory FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_memory.agent_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

DROP POLICY IF EXISTS "agent_memory: editors can manage" ON agent_memory;
CREATE POLICY "agent_memory: editors can manage"
  ON agent_memory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_memory.agent_id
        AND (agent.created_by = auth.uid() OR is_workspace_admin(agent.workspace_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_memory.agent_id
        AND (agent.created_by = auth.uid() OR is_workspace_admin(agent.workspace_id))
    )
  );

DROP POLICY IF EXISTS "agent_run: members can view" ON agent_run;
CREATE POLICY "agent_run: members can view"
  ON agent_run FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_run.agent_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

DROP POLICY IF EXISTS "agent_run_step: members can view" ON agent_run_step;
CREATE POLICY "agent_run_step: members can view"
  ON agent_run_step FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM agent_run
      JOIN agent ON agent.id = agent_run.agent_id
      WHERE agent_run.id = agent_run_step.run_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

DROP POLICY IF EXISTS "agent_approval: members can view" ON agent_approval;
CREATE POLICY "agent_approval: members can view"
  ON agent_approval FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_approval.agent_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

DROP POLICY IF EXISTS "agent_approval: admins can resolve" ON agent_approval;
CREATE POLICY "agent_approval: admins can resolve"
  ON agent_approval FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_approval.agent_id
        AND is_workspace_admin(agent.workspace_id)
    )
  );

INSERT INTO agent (
  workspace_id,
  created_by,
  legacy_automation_id,
  name,
  description,
  status,
  blueprint_json,
  created_at,
  updated_at
)
SELECT
  automation.workspace_id,
  automation.created_by,
  automation.id,
  automation.name,
  automation.description,
  CASE automation.status
    WHEN 'active' THEN 'active'::agent_status
    WHEN 'draft' THEN 'draft'::agent_status
    ELSE 'paused'::agent_status
  END,
  jsonb_build_object(
    'version', 1,
    'source', 'legacy_automation',
    'legacyAutomationId', automation.id,
    'scriptKey', automation.script_key,
    'steps', '[]'::jsonb,
    'required_apps', '[]'::jsonb,
    'approval_policy', '{}'::jsonb
  ),
  automation.created_at,
  automation.updated_at
FROM automation
WHERE NOT EXISTS (
  SELECT 1 FROM agent
  WHERE agent.legacy_automation_id = automation.id
);

COMMIT;
