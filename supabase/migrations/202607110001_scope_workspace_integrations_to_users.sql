CREATE INDEX IF NOT EXISTS workspace_integration_workspace_provider_user_idx
  ON workspace_integration (workspace_id, provider_id, created_by);

DROP POLICY IF EXISTS "workspace_integration: members can view"
  ON workspace_integration;

DROP POLICY IF EXISTS "workspace_integration: users can view own and admins can view workspace"
  ON workspace_integration;

CREATE POLICY "workspace_integration: users can view own and admins can view workspace"
  ON workspace_integration FOR SELECT
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));
