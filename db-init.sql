-- ============================================================
-- Pinata: fresh-DB consolidated init
-- Paste into Supabase SQL Editor → Run once.
-- Combines all supabase/migrations/*.sql into final state,
-- skipping legacy-cleanup steps that reference pre-existing
-- tables. Safe on an empty database.
-- ============================================================

-- ============================================================
-- 1. Weeks + Lessons (incl. PDF cols, summary cols, FTS, RPC)
-- ============================================================
create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_number integer not null,
  title text not null default '',
  markdown_content text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_number)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.weeks(id) on delete cascade,
  title text not null,
  markdown_content text not null default '',
  sort_order integer not null default 0,
  pdf_path text,
  pdf_name text,
  pdf_size integer,
  summary text,
  summary_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_weeks_user on public.weeks(user_id);
create index idx_lessons_week on public.lessons(week_id);
create index idx_lessons_user on public.lessons(user_id);

alter table public.lessons add column fts tsvector
  generated always as (to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(markdown_content, ''))) stored;
create index idx_lessons_fts on public.lessons using gin(fts);

alter table public.weeks enable row level security;
alter table public.lessons enable row level security;

create policy "Users manage own weeks" on public.weeks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own lessons" on public.lessons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function search_lessons(search_query text)
returns table (
  id uuid,
  title text,
  week_id uuid,
  week_number integer,
  week_title text,
  headline text
)
language sql
security definer
as $$
  select
    l.id,
    l.title,
    l.week_id,
    w.week_number,
    w.title as week_title,
    ts_headline('spanish', l.markdown_content, plainto_tsquery('spanish', search_query),
      'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as headline
  from public.lessons l
  join public.weeks w on w.id = l.week_id
  where l.user_id = auth.uid()
    and l.fts @@ plainto_tsquery('spanish', search_query)
  order by ts_rank(l.fts, plainto_tsquery('spanish', search_query)) desc;
$$;

-- ============================================================
-- 2. lesson-pdfs storage bucket + policies
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-pdfs', 'lesson-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lesson-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lesson-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lesson-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'lesson-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 3. chat_sessions (voice + Carolina text chat shape) + chat_messages
-- ============================================================
CREATE TABLE chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_name TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  duration_seconds INTEGER DEFAULT 0,
  turn_count INTEGER DEFAULT 0,
  transcript JSONB DEFAULT '[]'::jsonb,
  type TEXT NOT NULL DEFAULT 'voice' CHECK (type IN ('voice', 'chat')),
  title TEXT,
  mode TEXT CHECK (mode IN ('essay', 'grammar', 'vocab', 'conversation')),
  starred BOOLEAN NOT NULL DEFAULT false,
  resources JSONB,
  model TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, started_at DESC);
CREATE INDEX idx_chat_sessions_user_type ON chat_sessions (user_id, type, updated_at DESC);
CREATE INDEX idx_chat_sessions_starred ON chat_sessions (user_id, starred) WHERE starred = true;

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('spanish', content)
  ) STORED
);

CREATE INDEX idx_chat_messages_session ON chat_messages (session_id, created_at ASC);
CREATE INDEX idx_chat_messages_search ON chat_messages USING GIN (search_vector);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
  ON chat_messages FOR SELECT
  USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION search_chat_messages(
  search_query TEXT,
  user_id_param UUID,
  max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  message_id UUID,
  session_id UUID,
  session_title TEXT,
  session_mode TEXT,
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id AS message_id,
    cm.session_id,
    cs.title AS session_title,
    cs.mode AS session_mode,
    cm.role,
    cm.content,
    cm.created_at,
    ts_rank(cm.search_vector, plainto_tsquery('spanish', search_query)) AS rank
  FROM chat_messages cm
  JOIN chat_sessions cs ON cs.id = cm.session_id
  WHERE cs.user_id = user_id_param
    AND cs.type = 'chat'
    AND cm.search_vector @@ plainto_tsquery('spanish', search_query)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_generate_chat_title()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE chat_sessions
    SET title = LEFT(NEW.content, 80),
        updated_at = now()
    WHERE id = NEW.session_id
      AND title IS NULL;
  END IF;

  UPDATE chat_sessions
  SET updated_at = now()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_title_and_updated
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_chat_title();

-- ============================================================
-- 4. Vocabulary
-- ============================================================
CREATE TABLE vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  original_input TEXT,
  explanation_es TEXT,
  explanation_en TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vocabulary_user_word ON vocabulary(user_id, word);
CREATE INDEX idx_vocabulary_user_created ON vocabulary(user_id, created_at DESC);

ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own vocabulary" ON vocabulary
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vocabulary" ON vocabulary
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vocabulary" ON vocabulary
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vocabulary" ON vocabulary
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. Conjugar (verbs, drill_packs, drill_attempts) + translation_en
-- ============================================================
CREATE TABLE verbs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  infinitive TEXT NOT NULL,
  verb_type TEXT NOT NULL CHECK (verb_type IN ('ar', 'er', 'ir')),
  translation_en TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, infinitive)
);

CREATE INDEX idx_verbs_user ON verbs(user_id);

ALTER TABLE verbs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verbs_select" ON verbs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "verbs_insert" ON verbs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verbs_update" ON verbs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "verbs_delete" ON verbs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE drill_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verb_id UUID NOT NULL REFERENCES verbs(id) ON DELETE CASCADE,
  tense TEXT NOT NULL CHECK (tense IN (
    'presente', 'preterito_indefinido', 'preterito_imperfecto',
    'preterito_perfecto', 'preterito_pluscuamperfecto',
    'futuro_simple', 'futuro_perfecto',
    'condicional_simple', 'condicional_compuesto',
    'subjuntivo_presente', 'subjuntivo_imperfecto',
    'imperativo'
  )),
  exercises JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, verb_id, tense)
);

CREATE INDEX idx_drill_packs_user ON drill_packs(user_id);
CREATE INDEX idx_drill_packs_verb ON drill_packs(verb_id);

ALTER TABLE drill_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drill_packs_select" ON drill_packs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "drill_packs_insert" ON drill_packs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "drill_packs_update" ON drill_packs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "drill_packs_delete" ON drill_packs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE drill_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_ids UUID[] NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  grade TEXT NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drill_attempts_user ON drill_attempts(user_id, created_at DESC);

ALTER TABLE drill_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drill_attempts_select" ON drill_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "drill_attempts_insert" ON drill_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. user_models (per-feature model preference)
-- ============================================================
CREATE TABLE user_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, feature)
);

ALTER TABLE user_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own rows" ON user_models
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 7. user_prompts (custom prompt overrides per feature)
-- ============================================================
create table user_prompts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  group_key text not null,
  slug text not null,
  name text not null,
  filename text not null,
  content text not null,
  previous_content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, group_key, slug)
);

alter table user_prompts enable row level security;

create policy "Users can read own prompts"
  on user_prompts for select using (auth.uid() = user_id);
create policy "Users can insert own prompts"
  on user_prompts for insert with check (auth.uid() = user_id);
create policy "Users can update own prompts"
  on user_prompts for update using (auth.uid() = user_id);
create policy "Users can delete own prompts"
  on user_prompts for delete using (auth.uid() = user_id);

-- ============================================================
-- 8. lesson_links
-- ============================================================
CREATE TABLE lesson_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  favicon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_links_lesson_id ON lesson_links(lesson_id);

ALTER TABLE lesson_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_links_select ON lesson_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY lesson_links_insert ON lesson_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY lesson_links_delete ON lesson_links FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 9. Quizzes (final shape) + quiz_progress + quiz_results
--     (Legacy saved_quizzes table is intentionally skipped — fresh DB only.)
-- ============================================================
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quiz_data JSONB NOT NULL,
  question_count INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'upload',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quiz_parent_check CHECK (
    (lesson_id IS NOT NULL AND week_id IS NULL) OR
    (lesson_id IS NULL AND week_id IS NOT NULL)
  )
);

CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX idx_quizzes_lesson_id ON quizzes(lesson_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX idx_quizzes_week_id ON quizzes(week_id) WHERE week_id IS NOT NULL;

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quizzes_select ON quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY quizzes_insert ON quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY quizzes_update ON quizzes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY quizzes_delete ON quizzes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE quiz_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  current_index INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quiz_progress_user_quiz_id_unique UNIQUE (user_id, quiz_id)
);

CREATE INDEX idx_quiz_progress_quiz_id ON quiz_progress(quiz_id);
CREATE INDEX idx_quiz_progress_user ON quiz_progress(user_id);

ALTER TABLE quiz_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_progress_select ON quiz_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY quiz_progress_insert ON quiz_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY quiz_progress_update ON quiz_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY quiz_progress_delete ON quiz_progress FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  overrides INTEGER NOT NULL DEFAULT 0,
  question_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX idx_quiz_results_user_created ON quiz_results(user_id, created_at DESC);

ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_results_select ON quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY quiz_results_insert ON quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY quiz_results_update ON quiz_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY quiz_results_delete ON quiz_results FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 10. Redacción: assignments + attempts + corrections
-- ============================================================
create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  scope       text not null check (scope in ('single_lesson', 'unit')),
  title       text not null,
  brief       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_assignments_lesson_user on public.assignments(lesson_id, user_id);
create index idx_assignments_user_created on public.assignments(user_id, created_at desc);

create table public.attempts (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  version_number  integer not null,
  essay           text not null default '',
  word_count      integer not null default 0,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (assignment_id, version_number)
);

create index idx_attempts_assignment on public.attempts(assignment_id);

create table public.corrections (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null unique references public.attempts(id) on delete cascade,
  segments         jsonb not null default '[]'::jsonb,
  summary          text not null default '',
  score_grammar    integer,
  score_vocabulary integer,
  score_structure  integer,
  created_at       timestamptz not null default now()
);

alter table public.assignments enable row level security;
alter table public.attempts    enable row level security;
alter table public.corrections enable row level security;

create policy "Users manage own assignments" on public.assignments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage attempts on own assignments" on public.attempts
  for all
  using (exists (
    select 1 from public.assignments a
    where a.id = assignment_id and a.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.assignments a
    where a.id = assignment_id and a.user_id = auth.uid()
  ));

create policy "Users manage corrections on own attempts" on public.corrections
  for all
  using (exists (
    select 1
    from public.attempts at
    join public.assignments a on a.id = at.assignment_id
    where at.id = attempt_id and a.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.attempts at
    join public.assignments a on a.id = at.assignment_id
    where at.id = attempt_id and a.user_id = auth.uid()
  ));

-- ============================================================
-- Done. Verify with: select tablename from pg_tables where schemaname = 'public';
-- ============================================================
