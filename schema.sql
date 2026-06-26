-- ============================================================
-- Atmet WebApp — Complete Supabase Schema
-- Run this in Supabase SQL Editor (or add to your schema repo)
--
-- IMPORTANT: This drops existing tables and rebuilds from scratch.
-- Only run on a fresh/dev database. Comment out the DROP section
-- if you need to preserve existing data.
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Storage bucket for public user/workspace avatars.
-- Supabase Storage owns the objects table; this only ensures the bucket exists.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ============================================================
-- 1. DROP EXISTING TABLES (reverse dependency order)
-- ============================================================

DROP TABLE IF EXISTS chats_skill      CASCADE;
DROP TABLE IF EXISTS chats_schedule   CASCADE;
DROP TABLE IF EXISTS chats_automation CASCADE;
DROP TABLE IF EXISTS chats_users      CASCADE;
DROP TABLE IF EXISTS file             CASCADE;
DROP TABLE IF EXISTS api_key          CASCADE;
DROP TABLE IF EXISTS message          CASCADE;
DROP TABLE IF EXISTS chat             CASCADE;
DROP TABLE IF EXISTS schedule         CASCADE;
DROP TABLE IF EXISTS automation       CASCADE;
DROP TABLE IF EXISTS skill            CASCADE;
DROP TABLE IF EXISTS integration      CASCADE;
DROP TABLE IF EXISTS invitation       CASCADE;
DROP TABLE IF EXISTS waitlist         CASCADE;
DROP TABLE IF EXISTS workspace_member CASCADE;
DROP TABLE IF EXISTS "user"           CASCADE;
DROP TABLE IF EXISTS users            CASCADE;
DROP TABLE IF EXISTS workspace        CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS workspace_status        CASCADE;
DROP TYPE IF EXISTS workspace_plan          CASCADE;
DROP TYPE IF EXISTS workspace_member_role   CASCADE;
DROP TYPE IF EXISTS user_status             CASCADE;
DROP TYPE IF EXISTS invitation_status       CASCADE;
DROP TYPE IF EXISTS invitation_role         CASCADE;
DROP TYPE IF EXISTS chat_status             CASCADE;
DROP TYPE IF EXISTS message_role            CASCADE;
DROP TYPE IF EXISTS automation_status       CASCADE;
DROP TYPE IF EXISTS schedule_status         CASCADE;
DROP TYPE IF EXISTS skill_status            CASCADE;
DROP TYPE IF EXISTS skill_type              CASCADE;
DROP TYPE IF EXISTS integration_status      CASCADE;
DROP TYPE IF EXISTS integration_auth_type   CASCADE;


-- ============================================================
-- 2. ENUMS
-- ============================================================

CREATE TYPE workspace_status      AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE workspace_plan        AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE workspace_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE user_status           AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE invitation_status     AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE invitation_role       AS ENUM ('admin', 'member');
CREATE TYPE chat_status           AS ENUM ('active', 'archived');
CREATE TYPE message_role          AS ENUM ('system', 'user', 'assistant', 'tool');
CREATE TYPE automation_status     AS ENUM ('active', 'inactive', 'draft');
CREATE TYPE schedule_status       AS ENUM ('active', 'paused', 'disabled');
CREATE TYPE skill_status          AS ENUM ('active', 'inactive');
CREATE TYPE skill_type            AS ENUM ('action', 'trigger', 'tool', 'agent');
CREATE TYPE integration_status    AS ENUM ('active', 'expired', 'error');
CREATE TYPE integration_auth_type AS ENUM ('oauth', 'apikey');


-- ============================================================
-- 3. CORE TABLES
-- ============================================================

-- workspace is created first; owner_id FK is added after users
CREATE TABLE workspace (
  id         uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text                     NOT NULL,
  plan       workspace_plan           NOT NULL DEFAULT 'free',
  status     workspace_status         NOT NULL DEFAULT 'active',
  owner_id   uuid,                    -- FK added below after users table
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- users is a profile extension of auth.users — no password column
-- Supabase Auth owns all auth logic; this table holds display data only
CREATE TABLE users (
  id                   uuid                     PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                text                     NOT NULL,
  full_name            text,
  avatar_url           text,
  status               user_status              NOT NULL DEFAULT 'active',
  platform_role        text                     NOT NULL DEFAULT 'user' CHECK (platform_role IN ('user', 'super_admin')),
  onboarding_completed boolean                  NOT NULL DEFAULT false,
  created_at           timestamp with time zone NOT NULL DEFAULT now(),
  updated_at           timestamp with time zone NOT NULL DEFAULT now()
);

-- waitlist: public sign-up requests reviewed by super admins before access is granted
CREATE TABLE waitlist (
  id          uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text                     NOT NULL,
  email       text                     NOT NULL,
  company     text,
  role        text,
  company_size text,
  country     text,
  referral    text,
  notes       text,
  profile_type text,
  status      text                     NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid                     REFERENCES users(id),
  reviewed_at timestamp with time zone,
  created_at  timestamp with time zone NOT NULL DEFAULT now()
);

-- Now that users exists, add the FK on workspace.owner_id
ALTER TABLE workspace
  ADD CONSTRAINT workspace_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- workspace_member replaces workspace_id column in user table
-- allows one user to belong to multiple workspaces with different roles
CREATE TABLE workspace_member (
  workspace_id uuid                     NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  user_id      uuid                     NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  role         workspace_member_role    NOT NULL DEFAULT 'member',
  joined_at    timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- invitation: token-based invite links with an explicit role
CREATE TABLE invitation (
  id           uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid                     NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  invited_by   uuid                     NOT NULL REFERENCES users(id),
  email        text                     NOT NULL,
  role         invitation_role          NOT NULL DEFAULT 'member',
  token        text                     UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status       invitation_status        NOT NULL DEFAULT 'pending',
  expires_at   timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at   timestamp with time zone NOT NULL DEFAULT now()
);

-- integration: persistent record of connected third-party services
-- credentials stored as jsonb — encrypt sensitive fields at app layer
CREATE TABLE integration (
  id           uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid                     NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  created_by   uuid                     NOT NULL REFERENCES users(id),
  slug         text                     NOT NULL,  -- e.g. 'gmail', 'slack'
  auth_type    integration_auth_type    NOT NULL,
  credentials  jsonb,                             -- store encrypted token/key data
  status       integration_status       NOT NULL DEFAULT 'active',
  connected_at timestamp with time zone,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  updated_at   timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);


-- ============================================================
-- 4. CHAT & MESSAGING
-- ============================================================

CREATE TABLE chat (
  id           uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid                     NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  created_by   uuid                     NOT NULL REFERENCES users(id),
  title        text                     NOT NULL,
  status       chat_status              NOT NULL DEFAULT 'active',
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  updated_at   timestamp with time zone NOT NULL DEFAULT now()
);

-- message: role enum ensures only valid LLM roles are stored
CREATE TABLE message (
  id         uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    uuid                     NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
  role       message_role             NOT NULL,
  content    text                     NOT NULL,
  metadata   jsonb,                             -- token counts, model, latency, finish_reason
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);


-- ============================================================
-- 5. SKILLS, AUTOMATIONS, SCHEDULES
-- ============================================================

-- skill: definition column renamed from 'skill' to avoid name clash with table
CREATE TABLE skill (
  id           uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid                     NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  created_by   uuid                     NOT NULL REFERENCES users(id),
  name         text                     NOT NULL,
  description  text,
  definition   jsonb,                             -- was 'skill jsonb' — renamed to avoid conflict
  type         skill_type               NOT NULL,
  status       skill_status             NOT NULL DEFAULT 'active',
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  updated_at   timestamp with time zone NOT NULL DEFAULT now()
);

-- automation: no direct chat_id — use chats_automation junction table
CREATE TABLE automation (
  id           uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid                     NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  created_by   uuid                     NOT NULL REFERENCES users(id),
  name         text                     NOT NULL,
  description  text,
  script_key   text,
  status       automation_status        NOT NULL DEFAULT 'draft',
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  updated_at   timestamp with time zone NOT NULL DEFAULT now()
);

-- schedule: now has name, created_by, and automation_id so it knows what to trigger
CREATE TABLE schedule (
  id              uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid                     NOT NULL REFERENCES workspace(id)    ON DELETE CASCADE,
  created_by      uuid                     NOT NULL REFERENCES users(id),
  automation_id   uuid                              REFERENCES automation(id)  ON DELETE SET NULL,
  name            text                     NOT NULL,
  cron_expression text                     NOT NULL,
  timezone        text                     NOT NULL DEFAULT 'UTC',
  status          schedule_status          NOT NULL DEFAULT 'active',
  last_run_at     timestamp with time zone,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now()
);


-- ============================================================
-- 6. API KEYS & FILES
-- ============================================================

-- api_key: store only the hash — never the raw key
CREATE TABLE api_key (
  id           uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid                     NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  created_by   uuid                     NOT NULL REFERENCES users(id),
  name         text                     NOT NULL,
  key_hash     text                     UNIQUE NOT NULL,
  last_used_at timestamp with time zone,
  expires_at   timestamp with time zone,
  created_at   timestamp with time zone NOT NULL DEFAULT now()
);

-- file: references Supabase Storage; message_id is optional (files can be standalone)
CREATE TABLE file (
  id           uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid                     NOT NULL REFERENCES workspace(id)  ON DELETE CASCADE,
  uploaded_by  uuid                     NOT NULL REFERENCES users(id),
  message_id   uuid                              REFERENCES message(id)    ON DELETE SET NULL,
  name         text                     NOT NULL,
  mime_type    text                     NOT NULL,
  size_bytes   bigint                   NOT NULL,
  storage_path text                     NOT NULL,  -- Supabase Storage bucket path
  created_at   timestamp with time zone NOT NULL DEFAULT now()
);


-- ============================================================
-- 7. JUNCTION TABLES (all with composite primary keys)
-- ============================================================

-- which users participate in a chat
CREATE TABLE chats_users (
  chat_id uuid NOT NULL REFERENCES chat(id)  ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, user_id)
);

-- which automations are linked to a chat (fixed: was user_id, now automation_id)
CREATE TABLE chats_automation (
  chat_id       uuid NOT NULL REFERENCES chat(id)       ON DELETE CASCADE,
  automation_id uuid NOT NULL REFERENCES automation(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, automation_id)
);

-- which schedules are linked to a chat (fixed: was user_id, now schedule_id)
CREATE TABLE chats_schedule (
  chat_id     uuid NOT NULL REFERENCES chat(id)     ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, schedule_id)
);

-- which skills are linked to a chat (fixed: was user_id, now skill_id)
CREATE TABLE chats_skill (
  chat_id  uuid NOT NULL REFERENCES chat(id)  ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, skill_id)
);


-- ============================================================
-- 8. INDEXES
-- ============================================================

CREATE INDEX ON workspace_member (user_id);

CREATE INDEX ON chat (workspace_id);
CREATE INDEX ON chat (created_by);

CREATE INDEX ON message (chat_id);
CREATE INDEX ON message (chat_id, created_at);

CREATE INDEX ON automation (workspace_id);
CREATE INDEX ON automation (created_by);

CREATE INDEX ON schedule (workspace_id);
CREATE INDEX ON schedule (automation_id);

CREATE INDEX ON skill (workspace_id);

CREATE INDEX ON integration (workspace_id);

CREATE INDEX ON api_key (workspace_id);

CREATE INDEX ON file (workspace_id);
CREATE INDEX ON file (message_id);

CREATE INDEX ON invitation (workspace_id);
CREATE INDEX ON invitation (token);


-- ============================================================
-- 9. UPDATED_AT AUTO-TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workspace_updated_at  BEFORE UPDATE ON workspace  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_users_updated_at      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_integration_updated_at BEFORE UPDATE ON integration FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_chat_updated_at       BEFORE UPDATE ON chat       FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_message_updated_at    BEFORE UPDATE ON message    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_skill_updated_at      BEFORE UPDATE ON skill      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_automation_updated_at BEFORE UPDATE ON automation FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_schedule_updated_at   BEFORE UPDATE ON schedule   FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ============================================================
-- 10. AUTH TRIGGER — auto-create user profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 10b. TEMP SUPER ADMIN BOOTSTRAP
-- ============================================================

-- Usage after creating the account in Supabase Auth:
--   SELECT promote_user_to_super_admin('admin@example.com', 'Super Admin');
--
-- Super admins are platform-level users. They intentionally do not need
-- workspace_member rows.
CREATE OR REPLACE FUNCTION promote_user_to_super_admin(
  target_email text,
  target_full_name text DEFAULT 'Super Admin'
)
RETURNS uuid AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id
  INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(target_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users row found for %', target_email;
  END IF;

  INSERT INTO public.users (
    id,
    email,
    full_name,
    platform_role,
    onboarding_completed,
    status
  )
  VALUES (
    target_user_id,
    target_email,
    target_full_name,
    'super_admin',
    true,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    platform_role = 'super_admin',
    onboarding_completed = true,
    status = 'active',
    updated_at = now();

  RETURN target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE workspace       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation      ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat            ENABLE ROW LEVEL SECURITY;
ALTER TABLE message         ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill           ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation      ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule        ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key         ENABLE ROW LEVEL SECURITY;
ALTER TABLE file            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats_automation ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats_schedule  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats_skill     ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a member of this workspace?
CREATE OR REPLACE FUNCTION is_workspace_member(wid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_member
    WHERE workspace_id = wid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is the current user an admin or owner of this workspace?
CREATE OR REPLACE FUNCTION is_workspace_admin(wid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_member
    WHERE workspace_id = wid
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── workspace ──────────────────────────────────────────────
CREATE POLICY "workspace: members can view"
  ON workspace FOR SELECT
  USING (is_workspace_member(id));

CREATE POLICY "workspace: any authed user can create"
  ON workspace FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "workspace: admins can update"
  ON workspace FOR UPDATE
  USING (is_workspace_admin(id));

CREATE POLICY "workspace: owner can delete"
  ON workspace FOR DELETE
  USING (owner_id = auth.uid());

-- ── users ──────────────────────────────────────────────────
CREATE POLICY "users: own profile always visible"
  ON users FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_member a
      JOIN workspace_member b ON a.workspace_id = b.workspace_id
      WHERE a.user_id = auth.uid() AND b.user_id = users.id
    )
  );

CREATE POLICY "users: insert own profile only"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "users: update own profile only"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- ── workspace_member ───────────────────────────────────────
CREATE POLICY "workspace_member: members can view their workspace"
  ON workspace_member FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace_member: admins can add members"
  ON workspace_member FOR INSERT
  WITH CHECK (is_workspace_admin(workspace_id));

CREATE POLICY "workspace_member: admins can remove, members can leave"
  ON workspace_member FOR DELETE
  USING (is_workspace_admin(workspace_id) OR user_id = auth.uid());

-- ── invitation ─────────────────────────────────────────────
CREATE POLICY "invitation: members can view"
  ON invitation FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "invitation: admins can create"
  ON invitation FOR INSERT
  WITH CHECK (is_workspace_admin(workspace_id) AND invited_by = auth.uid());

CREATE POLICY "invitation: admins can update/revoke"
  ON invitation FOR UPDATE
  USING (is_workspace_admin(workspace_id));

-- ── integration ────────────────────────────────────────────
CREATE POLICY "integration: members can view"
  ON integration FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "integration: admins can connect"
  ON integration FOR INSERT
  WITH CHECK (is_workspace_admin(workspace_id) AND created_by = auth.uid());

CREATE POLICY "integration: admins can update"
  ON integration FOR UPDATE
  USING (is_workspace_admin(workspace_id));

CREATE POLICY "integration: admins can disconnect"
  ON integration FOR DELETE
  USING (is_workspace_admin(workspace_id));

-- ── chat ───────────────────────────────────────────────────
CREATE POLICY "chat: members can view workspace chats"
  ON chat FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "chat: members can create chats"
  ON chat FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());

CREATE POLICY "chat: creator or admin can update"
  ON chat FOR UPDATE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

CREATE POLICY "chat: creator or admin can delete"
  ON chat FOR DELETE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

-- ── message ────────────────────────────────────────────────
CREATE POLICY "message: workspace members can view"
  ON message FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = message.chat_id
        AND is_workspace_member(chat.workspace_id)
    )
  );

CREATE POLICY "message: workspace members can insert"
  ON message FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = message.chat_id
        AND is_workspace_member(chat.workspace_id)
    )
  );

-- ── skill ──────────────────────────────────────────────────
CREATE POLICY "skill: members can view"
  ON skill FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "skill: members can create"
  ON skill FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());

CREATE POLICY "skill: creator or admin can update"
  ON skill FOR UPDATE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

CREATE POLICY "skill: creator or admin can delete"
  ON skill FOR DELETE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

-- ── automation ─────────────────────────────────────────────
CREATE POLICY "automation: members can view"
  ON automation FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "automation: members can create"
  ON automation FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());

CREATE POLICY "automation: creator or admin can update"
  ON automation FOR UPDATE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

CREATE POLICY "automation: creator or admin can delete"
  ON automation FOR DELETE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

-- ── schedule ───────────────────────────────────────────────
CREATE POLICY "schedule: members can view"
  ON schedule FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "schedule: members can create"
  ON schedule FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());

CREATE POLICY "schedule: admins can update"
  ON schedule FOR UPDATE
  USING (is_workspace_admin(workspace_id));

CREATE POLICY "schedule: admins can delete"
  ON schedule FOR DELETE
  USING (is_workspace_admin(workspace_id));

-- ── api_key ────────────────────────────────────────────────
CREATE POLICY "api_key: members can view workspace keys"
  ON api_key FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "api_key: members can create keys"
  ON api_key FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id) AND created_by = auth.uid());

CREATE POLICY "api_key: creator or admin can delete"
  ON api_key FOR DELETE
  USING (created_by = auth.uid() OR is_workspace_admin(workspace_id));

-- ── file ───────────────────────────────────────────────────
CREATE POLICY "file: members can view workspace files"
  ON file FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "file: members can upload"
  ON file FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id) AND uploaded_by = auth.uid());

CREATE POLICY "file: uploader or admin can delete"
  ON file FOR DELETE
  USING (uploaded_by = auth.uid() OR is_workspace_admin(workspace_id));

-- ── junction tables ────────────────────────────────────────
CREATE POLICY "chats_users: workspace members can view"
  ON chats_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_users.chat_id
        AND is_workspace_member(chat.workspace_id)
    )
  );

CREATE POLICY "chats_users: workspace members can insert"
  ON chats_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_users.chat_id
        AND is_workspace_member(chat.workspace_id)
    )
  );

CREATE POLICY "chats_users: workspace members can delete"
  ON chats_users FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_users.chat_id
        AND is_workspace_admin(chat.workspace_id)
    )
  );

CREATE POLICY "chats_automation: workspace members can view"
  ON chats_automation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_automation.chat_id
        AND is_workspace_member(chat.workspace_id)
    )
  );

CREATE POLICY "chats_automation: workspace members can insert"
  ON chats_automation FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_automation.chat_id
        AND is_workspace_member(chat.workspace_id)
    )
  );

CREATE POLICY "chats_automation: workspace members can delete"
  ON chats_automation FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_automation.chat_id
        AND is_workspace_admin(chat.workspace_id)
    )
  );

CREATE POLICY "chats_schedule: workspace members can view"
  ON chats_schedule FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_schedule.chat_id
        AND is_workspace_member(chat.workspace_id)
    )
  );

CREATE POLICY "chats_schedule: workspace members can insert"
  ON chats_schedule FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_schedule.chat_id
        AND is_workspace_member(chat.workspace_id)
    )
  );

CREATE POLICY "chats_schedule: workspace members can delete"
  ON chats_schedule FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_schedule.chat_id
        AND is_workspace_admin(chat.workspace_id)
    )
  );

CREATE POLICY "chats_skill: workspace members can view"
  ON chats_skill FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_skill.chat_id
        AND is_workspace_member(chat.workspace_id)
    )
  );

CREATE POLICY "chats_skill: workspace members can insert"
  ON chats_skill FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_skill.chat_id
        AND is_workspace_member(chat.workspace_id)
    )
  );

CREATE POLICY "chats_skill: workspace members can delete"
  ON chats_skill FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat
      WHERE chat.id = chats_skill.chat_id
        AND is_workspace_admin(chat.workspace_id)
    )
  );
