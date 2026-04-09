-- =============================================================
-- Codeint – Dentist Clinic Management System
-- PostgreSQL Schema  (Neon serverless PostgreSQL)
-- Version: 1.1
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- ENUM TYPES
-- =============================================================

CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'receptionist');

CREATE TYPE appointment_status AS ENUM (
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
);

CREATE TYPE treatment_record_status AS ENUM (
    'planned', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE image_file_type AS ENUM ('jpeg', 'png', 'dicom', 'pdf');

CREATE TYPE image_category AS ENUM (
    'pre_treatment', 'during_treatment', 'post_treatment', 'follow_up', 'other'
);

CREATE TYPE image_type AS ENUM (
    'periapical', 'bitewing', 'panoramic', 'cbct',
    'intraoral_photo', 'document', 'other'
);

CREATE TYPE treatment_plan_status AS ENUM (
    'proposed', 'approved', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE plan_item_status AS ENUM (
    'planned', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE audit_action AS ENUM (
    'view', 'create', 'update', 'delete',
    'upload', 'download', 'share', 'login', 'logout'
);

CREATE TYPE audit_entity AS ENUM (
    'user', 'patient', 'appointment', 'treatment_record',
    'patient_image', 'treatment_plan', 'treatment_type', 'dental_chart'
);

-- =============================================================
-- TABLES
-- =============================================================

-- -------------------------------------------------------
-- 1. users
-- -------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100)  NOT NULL,
    mobile          VARCHAR(15)   UNIQUE NOT NULL,
    pin_hash        VARCHAR(255)  NOT NULL,           -- bcrypt hash of 4-digit PIN
    role            user_role     NOT NULL DEFAULT 'receptionist',
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 2. treatment_types  (master list)
-- -------------------------------------------------------
CREATE TABLE treatment_types (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                     VARCHAR(100)  NOT NULL,
    description              TEXT,
    default_duration_minutes INTEGER       NOT NULL DEFAULT 30,
    color                    VARCHAR(7),              -- hex color for calendar
    is_active                BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 3. patients
-- -------------------------------------------------------
CREATE TABLE patients (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_number           VARCHAR(20)   UNIQUE,    -- clinic-assigned ID e.g. PT-00123
    name                     VARCHAR(100)  NOT NULL,
    mobile                   VARCHAR(15)   UNIQUE NOT NULL,
    email                    VARCHAR(255),
    date_of_birth            DATE,
    gender                   VARCHAR(10),
    address                  TEXT,
    blood_group              VARCHAR(5),
    allergies                TEXT,
    current_medications      TEXT,
    medical_history          TEXT,
    emergency_contact_name   VARCHAR(100),
    emergency_contact_mobile VARCHAR(15),
    is_active                BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 4. appointments
-- -------------------------------------------------------
CREATE TABLE appointments (
    id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id                     UUID         NOT NULL REFERENCES patients(id),
    doctor_id                      UUID         NOT NULL REFERENCES users(id),
    treatment_type_id              UUID         REFERENCES treatment_types(id),
    appointment_date               DATE         NOT NULL,
    appointment_time               TIME         NOT NULL,
    duration_minutes               INTEGER      NOT NULL DEFAULT 30,
    status                         appointment_status NOT NULL DEFAULT 'scheduled',
    notes                          TEXT,
    -- WhatsApp tracking
    whatsapp_confirmation_sent     BOOLEAN      NOT NULL DEFAULT FALSE,
    whatsapp_confirmation_sent_at  TIMESTAMPTZ,
    whatsapp_reminder_sent         BOOLEAN      NOT NULL DEFAULT FALSE,
    whatsapp_reminder_sent_at      TIMESTAMPTZ,
    -- Audit fields
    created_by                     UUID         NOT NULL REFERENCES users(id),
    is_deleted                     BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at                     TIMESTAMPTZ,
    deleted_by                     UUID         REFERENCES users(id),
    created_at                     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 5. treatment_records  (clinical notes per visit)
-- -------------------------------------------------------
CREATE TABLE treatment_records (
    id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id                   UUID         NOT NULL REFERENCES patients(id),
    appointment_id               UUID         REFERENCES appointments(id),  -- nullable: can be independent
    doctor_id                    UUID         NOT NULL REFERENCES users(id),
    treatment_type_id            UUID         REFERENCES treatment_types(id),
    -- Tooth targeting (FDI notation: 11-18, 21-28, 31-38, 41-48)
    tooth_numbers                JSONB        NOT NULL DEFAULT '[]',         -- e.g. [11, 12]
    quadrant                     VARCHAR(10),                                -- e.g. "UL", "LR"
    -- Clinical content
    notes                        TEXT,                                       -- rich text (HTML from TipTap/Quill)
    diagnosis                    TEXT,
    procedure_performed          TEXT,
    medications_prescribed       JSONB        NOT NULL DEFAULT '[]',         -- [{name, dosage, duration}]
    next_followup_recommendation TEXT,
    status                       treatment_record_status NOT NULL DEFAULT 'completed',
    doctor_initials              VARCHAR(10),
    -- Soft delete
    is_deleted                   BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_reason               TEXT,
    deleted_by                   UUID         REFERENCES users(id),
    deleted_at                   TIMESTAMPTZ,
    created_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 6. patient_images  (X-rays, photos, documents)
-- -------------------------------------------------------
CREATE TABLE patient_images (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID          NOT NULL REFERENCES patients(id),
    treatment_record_id UUID          REFERENCES treatment_records(id),
    -- Storage
    file_url            VARCHAR(1000) NOT NULL,    -- S3 object key (NOT a public URL)
    file_name           VARCHAR(255)  NOT NULL,
    file_type           image_file_type NOT NULL,
    file_size_bytes     BIGINT,
    -- Classification
    image_category      image_category NOT NULL DEFAULT 'other',
    image_type          image_type     NOT NULL DEFAULT 'other',
    tooth_numbers       JSONB          NOT NULL DEFAULT '[]',
    description         TEXT,
    metadata            JSONB          NOT NULL DEFAULT '{}',  -- EXIF / DICOM tags
    -- Audit
    uploaded_by         UUID          NOT NULL REFERENCES users(id),
    is_deleted          BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_reason      TEXT,
    deleted_by          UUID          REFERENCES users(id),
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 7. treatment_plans
-- -------------------------------------------------------
CREATE TABLE treatment_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID          NOT NULL REFERENCES patients(id),
    doctor_id       UUID          NOT NULL REFERENCES users(id),
    title           VARCHAR(200)  NOT NULL,
    description     TEXT,
    status          treatment_plan_status NOT NULL DEFAULT 'proposed',
    patient_consent BOOLEAN       NOT NULL DEFAULT FALSE,
    consent_date    TIMESTAMPTZ,
    -- Soft delete
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_reason  TEXT,
    deleted_by      UUID          REFERENCES users(id),
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 8. treatment_plan_items
-- -------------------------------------------------------
CREATE TABLE treatment_plan_items (
    id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treatment_plan_id          UUID          NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    treatment_type_id          UUID          REFERENCES treatment_types(id),
    tooth_numbers              JSONB         NOT NULL DEFAULT '[]',
    description                TEXT,
    phase_number               INTEGER       NOT NULL DEFAULT 1,
    sequence_order             INTEGER       NOT NULL DEFAULT 1,
    estimated_cost             DECIMAL(10,2),
    estimated_duration_minutes INTEGER,
    status                     plan_item_status NOT NULL DEFAULT 'planned',
    appointment_id             UUID          REFERENCES appointments(id),   -- set when converted
    created_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 9. dental_chart  (latest tooth state per patient)
-- -------------------------------------------------------
CREATE TABLE dental_chart (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id   UUID        NOT NULL REFERENCES patients(id),
    tooth_number INTEGER     NOT NULL,   -- FDI: 11-18, 21-28, 31-38, 41-48
    -- Conditions: ["caries","filling","crown","extraction","root_canal","bridge","implant","missing","veneer","sealant"]
    conditions   JSONB       NOT NULL DEFAULT '[]',
    -- Per-surface state: mesial | distal | occlusal | buccal | lingual
    surfaces     JSONB       NOT NULL DEFAULT '{}',
    notes        TEXT,
    recorded_by  UUID        NOT NULL REFERENCES users(id),
    is_deleted   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (patient_id, tooth_number)
);

-- -------------------------------------------------------
-- 10. audit_logs
-- -------------------------------------------------------
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID          REFERENCES users(id),     -- NULL if system action
    action      audit_action  NOT NULL,
    entity_type audit_entity  NOT NULL,
    entity_id   UUID,
    patient_id  UUID          REFERENCES patients(id),  -- denormalized for fast patient-level queries
    changes     JSONB         NOT NULL DEFAULT '{}',    -- {before: {}, after: {}} for updates
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    timestamp   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================

-- appointments
CREATE INDEX idx_appointments_date        ON appointments(appointment_date);
CREATE INDEX idx_appointments_doctor      ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient     ON appointments(patient_id);
CREATE INDEX idx_appointments_status      ON appointments(status);
CREATE INDEX idx_appointments_date_doctor ON appointments(appointment_date, doctor_id);

-- patients
CREATE INDEX idx_patients_mobile          ON patients(mobile);
CREATE INDEX idx_patients_name_fts        ON patients USING gin(to_tsvector('simple', name));

-- treatment_records
CREATE INDEX idx_treatment_records_patient     ON treatment_records(patient_id);
CREATE INDEX idx_treatment_records_doctor      ON treatment_records(doctor_id);
CREATE INDEX idx_treatment_records_appointment ON treatment_records(appointment_id);
CREATE INDEX idx_treatment_records_created     ON treatment_records(created_at DESC);

-- patient_images
CREATE INDEX idx_patient_images_patient          ON patient_images(patient_id);
CREATE INDEX idx_patient_images_treatment_record ON patient_images(treatment_record_id);

-- treatment_plans
CREATE INDEX idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_doctor  ON treatment_plans(doctor_id);

-- dental_chart
CREATE INDEX idx_dental_chart_patient ON dental_chart(patient_id);

-- audit_logs
CREATE INDEX idx_audit_logs_user      ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity    ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_patient   ON audit_logs(patient_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- =============================================================
-- SEED DATA – admin user (PIN: 1234  →  replace hash in prod)
-- pin_hash below is bcrypt of "1234"
-- =============================================================
INSERT INTO users (name, mobile, pin_hash, role)
VALUES (
    'System Admin',
    '0000000000',
    '$2b$12$KIX/3wLFnQOVFJAMkGc4j.qLrCHScOFDPbx5h/EQ/PXTOVgKV.GFi',
    'admin'
);
