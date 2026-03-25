-- Conjugar feature: verb conjugation drill exercises
-- Tables: verbs, drill_packs, drill_attempts

-- ==========================================================
-- verbs — reusable verb entities, one per user+infinitive
-- ==========================================================
CREATE TABLE verbs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  infinitive TEXT NOT NULL,
  verb_type TEXT NOT NULL CHECK (verb_type IN ('ar', 'er', 'ir')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, infinitive)
);

CREATE INDEX idx_verbs_user ON verbs(user_id);

ALTER TABLE verbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verbs_select" ON verbs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "verbs_insert" ON verbs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verbs_update" ON verbs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "verbs_delete" ON verbs FOR DELETE USING (auth.uid() = user_id);

-- ==========================================================
-- drill_packs — one pack = one verb + one tense, 15 exercises
-- ==========================================================
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

-- ==========================================================
-- drill_attempts — history of completed drill sessions
-- ==========================================================
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
