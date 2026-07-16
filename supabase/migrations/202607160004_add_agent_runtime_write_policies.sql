BEGIN;

DROP POLICY IF EXISTS "agent_run: members can create" ON agent_run;
CREATE POLICY "agent_run: members can create"
  ON agent_run FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_run.agent_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

DROP POLICY IF EXISTS "agent_run: members can update" ON agent_run;
CREATE POLICY "agent_run: members can update"
  ON agent_run FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_run.agent_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

DROP POLICY IF EXISTS "agent_run_step: members can create" ON agent_run_step;
CREATE POLICY "agent_run_step: members can create"
  ON agent_run_step FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM agent_run
      JOIN agent ON agent.id = agent_run.agent_id
      WHERE agent_run.id = agent_run_step.run_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

DROP POLICY IF EXISTS "agent_run_step: members can update" ON agent_run_step;
CREATE POLICY "agent_run_step: members can update"
  ON agent_run_step FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM agent_run
      JOIN agent ON agent.id = agent_run.agent_id
      WHERE agent_run.id = agent_run_step.run_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

DROP POLICY IF EXISTS "agent_approval: members can create" ON agent_approval;
CREATE POLICY "agent_approval: members can create"
  ON agent_approval FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent
      WHERE agent.id = agent_approval.agent_id
        AND is_workspace_member(agent.workspace_id)
    )
  );

COMMIT;
