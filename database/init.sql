-- ─────────────────────────────────────────────────────────
--  Radiology Triage Platform · Database Schema
--  This file runs automatically when the PostgreSQL
--  container starts for the first time.
-- ─────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ── 1. users ─────────────────────────────────────────────
-- Doctors and technicians who can access the system.

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       VARCHAR(128) NOT NULL,
  email           VARCHAR(128) NOT NULL UNIQUE,
  password        VARCHAR(255) NOT NULL,
  phone_number    VARCHAR(32),
  role            VARCHAR(32) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'System users: doctors and technicians only.';
COMMENT ON COLUMN users.role IS 'Allowed values: doctor, technician.';


-- ── 2. patients ──────────────────────────────────────────
-- Patients who have X-ray studies.

CREATE TABLE IF NOT EXISTS patient (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             VARCHAR(128) NOT NULL,
  age                   INTEGER,
  gender                VARCHAR(32),
  phone_number          VARCHAR(32),
  medical_record_number VARCHAR(64),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE patients IS 'Patient information related to uploaded X-ray studies.';


-- ── 3. studies ───────────────────────────────────────────
-- One row per uploaded chest X-ray.

CREATE TABLE IF NOT EXISTS studies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  patient_id      VARCHAR(64) NOT NULL,
  image_path      TEXT NOT NULL,
  original_name   VARCHAR(255),
  status          VARCHAR(32) NOT NULL DEFAULT 'pending',

  patientId       UUID REFERENCES patient(id) ON DELETE SET NULL,
  uploadedById    UUID REFERENCES users(id) ON DELETE SET NULL,

  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE studies IS 'One row per uploaded chest X-ray study.';
COMMENT ON COLUMN studies.status IS 'Lifecycle: pending, processing, completed, approved, rejected, failed.';


-- ── 4. ai_results ────────────────────────────────────────
-- AI simulation result for each study.

CREATE TABLE IF NOT EXISTS ai_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id        UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  label           VARCHAR(32) NOT NULL,
  confidence      NUMERIC(5,4) NOT NULL,
  priority        VARCHAR(32) NOT NULL,
  message         TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_results IS 'Local AI simulation output for each uploaded X-ray.';
COMMENT ON COLUMN ai_results.priority IS 'High, Medium, Low, or Needs Review.';


-- ── 5. reports ───────────────────────────────────────────
-- Final doctor report.

CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id        UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  content         TEXT NOT NULL,
  authored_by     VARCHAR(128),
  is_final        BOOLEAN NOT NULL DEFAULT FALSE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE reports IS 'Final radiologist report authored by a human doctor.';


-- ── 6. feedback ──────────────────────────────────────────
-- Doctor approve/reject feedback.

CREATE TABLE IF NOT EXISTS feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  study_id        UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  decision        VARCHAR(32) NOT NULL,
  comment         TEXT DEFAULT '',

  doctorId        UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE feedback IS 'Doctor feedback and decision for a study.';


-- ── Indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email        ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role         ON users (role);

CREATE INDEX IF NOT EXISTS idx_patients_phone     ON patients (phone_number);
CREATE INDEX IF NOT EXISTS idx_patients_mrn       ON patients (medical_record_number);

CREATE INDEX IF NOT EXISTS idx_studies_patient    ON studies (patient_id);
CREATE INDEX IF NOT EXISTS idx_studies_status     ON studies (status);
CREATE INDEX IF NOT EXISTS idx_studies_uploaded   ON studies (uploaded_at);

CREATE INDEX IF NOT EXISTS idx_ai_results_study   ON ai_results (study_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_prio    ON ai_results (priority);

CREATE INDEX IF NOT EXISTS idx_reports_study      ON reports (study_id);

CREATE INDEX IF NOT EXISTS idx_feedback_study     ON feedback (study_id);


-- ── Seed Data ────────────────────────────────────────────

INSERT INTO users (full_name, email, password, phone_number, role)
VALUES
  ('Test Doctor', 'doctor@test.com', '123456', '00000000', 'doctor'),
  ('Test Technician', 'technician@test.com', '123456', '00000001', 'technician')
ON CONFLICT (email) DO NOTHING;

INSERT INTO patient (
  id,
  full_name,
  age,
  gender,
  phone_number,
  medical_record_number
)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'Test Patient',
  35,
  'Unknown',
  '00000002',
  'MRN-0001'
)
ON CONFLICT DO NOTHING;

INSERT INTO studies (patient_id, image_path, original_name, status)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '/uploads/test_placeholder.png',
  'chest_xray_sample.png',
  'pending'
)
ON CONFLICT DO NOTHING;
