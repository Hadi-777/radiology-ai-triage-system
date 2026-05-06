-- ─────────────────────────────────────────────────────────
--  Radiology Triage Platform  ·  Database Schema
--  This file runs automatically when the PostgreSQL
--  container starts for the first time.
-- ─────────────────────────────────────────────────────────

-- Use UUID primary keys everywhere for scalability
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ── 1. studies ──────────────────────────────────────────
--  One row per uploaded chest X-ray.
--  Created the moment the doctor uploads an image.

CREATE TABLE IF NOT EXISTS studies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      VARCHAR(64) NOT NULL,                -- anonymised patient reference
  image_path      TEXT        NOT NULL,                -- path on disk (or S3 key later)
  original_name   VARCHAR(255),                        -- original filename from upload
  status          VARCHAR(32) NOT NULL DEFAULT 'pending',
  --   pending → processing → completed → failed
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  studies                IS 'One row per uploaded chest X-ray study.';
COMMENT ON COLUMN studies.status         IS 'Lifecycle: pending → processing → completed → failed';
COMMENT ON COLUMN studies.patient_id     IS 'Anonymised reference — not a real patient name.';


-- ── 2. ai_results ───────────────────────────────────────
--  Stores everything the FastAPI service returns for a study.
--  One-to-one with studies (each study has at most one AI result).

CREATE TABLE IF NOT EXISTS ai_results (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id        UUID        NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Classification output
  label           VARCHAR(32) NOT NULL,          -- "normal" or "abnormal"
  confidence      NUMERIC(5,4) NOT NULL,         -- 0.0000 – 1.0000
  priority        VARCHAR(32) NOT NULL,
  --   High | Medium | Low | Needs Review
  --   Rules:
  --     High         → abnormal  AND confidence >= 0.85
  --     Medium       → abnormal  AND confidence >= 0.65 AND < 0.85
  --     Low          → normal    AND confidence >= 0.85
  --     Needs Review → confidence < 0.65

  -- Explainability
  heatmap_path    TEXT,                          -- path to Grad-CAM overlay image

  -- AI-generated narrative (non-final, always hedged)
  findings        TEXT,                          -- e.g. "Possible consolidation in right lower lobe"
  draft_report    TEXT,                          -- full draft for doctor to review & edit

  -- Metadata
  model_version   VARCHAR(64) DEFAULT 'resnet50-v1',
  analyzed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  ai_results               IS 'AI inference output for each study. One-to-one with studies.';
COMMENT ON COLUMN ai_results.findings      IS 'Hedged language only — possible, may suggest, suspicious for. Never a definitive diagnosis.';
COMMENT ON COLUMN ai_results.draft_report  IS 'Starting point for the radiologist, not a final report.';
COMMENT ON COLUMN ai_results.confidence    IS 'Model softmax confidence between 0 and 1.';


-- ── 3. reports ──────────────────────────────────────────
--  The radiologist's final report, edited from the AI draft.
--  The doctor is always the final decision-maker.

CREATE TABLE IF NOT EXISTS reports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id        UUID        NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  content         TEXT        NOT NULL,          -- final radiologist-authored text
  authored_by     VARCHAR(128),                  -- doctor identifier (username or ID)
  is_final        BOOLEAN     NOT NULL DEFAULT FALSE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  reports           IS 'Final radiologist report. Always authored by a human.';
COMMENT ON COLUMN reports.is_final  IS 'True when the doctor signs off. Locks the report.';


-- ── 4. feedback ─────────────────────────────────────────
--  Radiologist feedback on AI accuracy.
--  Useful for monitoring model performance over time.

CREATE TABLE IF NOT EXISTS feedback (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_result_id    UUID        NOT NULL REFERENCES ai_results(id) ON DELETE CASCADE,

  is_correct      BOOLEAN     NOT NULL,          -- did the AI get it right?
  correct_label   VARCHAR(32),                   -- if wrong, what was the correct label?
  notes           TEXT,                          -- free-text comment from the doctor

  submitted_by    VARCHAR(128),
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  feedback              IS 'Doctor feedback on AI predictions. Used for quality monitoring.';
COMMENT ON COLUMN feedback.is_correct   IS 'True if AI label matched radiologist conclusion.';


-- ── Indexes ─────────────────────────────────────────────
--  Speed up the most common queries.

CREATE INDEX IF NOT EXISTS idx_studies_patient   ON studies    (patient_id);
CREATE INDEX IF NOT EXISTS idx_studies_status    ON studies    (status);
CREATE INDEX IF NOT EXISTS idx_ai_results_study  ON ai_results (study_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_prio   ON ai_results (priority);
CREATE INDEX IF NOT EXISTS idx_reports_study     ON reports    (study_id);
CREATE INDEX IF NOT EXISTS idx_feedback_result   ON feedback   (ai_result_id);


-- ── Seed: one test study (optional, remove in production) ──
INSERT INTO studies (patient_id, image_path, original_name, status)
VALUES ('TEST-PATIENT-001', '/uploads/test_placeholder.png', 'chest_xray_sample.png', 'pending')
ON CONFLICT DO NOTHING;
