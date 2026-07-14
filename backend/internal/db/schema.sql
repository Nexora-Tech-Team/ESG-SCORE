CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS organizations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(120) UNIQUE NOT NULL,
    industry    VARCHAR(120),
    status      VARCHAR(40) NOT NULL DEFAULT 'registered'
                CHECK (status IN ('draft','registered','verified','assessing','completed','disqualified','rejected')),
    email       VARCHAR(255),
    phone       VARCHAR(60),
    website     VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sector VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS license_number VARCHAR(120);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS license_type VARCHAR(40);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS main_service_type VARCHAR(255);

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    position        VARCHAR(120),
    phone           VARCHAR(60),
    role            VARCHAR(30) NOT NULL CHECK (role IN ('admin','asesor','juri','peserta')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliation VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE TABLE IF NOT EXISTS user_credentials (
    user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS award_periods (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year        INT NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    status      VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_id       UUID REFERENCES award_periods(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL DEFAULT 'ESG Mining Award Assessment',
    status          VARCHAR(40) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','in_review','revision_requested','jury_review','finalized')),
    period_year     INT NOT NULL DEFAULT 2026,
    submitted_at    TIMESTAMPTZ,
    finalized_at    TIMESTAMPTZ,
    revision_note   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessor_assignments (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assessor_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status         VARCHAR(40) NOT NULL DEFAULT 'assigned'
                   CHECK (status IN ('assigned','in_review','submitted_to_jury')),
    assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id)
);

CREATE TABLE IF NOT EXISTS checklist_items (
    id                 VARCHAR(80) PRIMARY KEY,
    pillar             VARCHAR(30) NOT NULL CHECK (pillar IN ('environmental','social','governance')),
    category           VARCHAR(120) NOT NULL,
    sub_category       VARCHAR(255) NOT NULL,
    question_number    VARCHAR(30) NOT NULL,
    question           TEXT NOT NULL,
    evidence_required  TEXT NOT NULL,
    applicability_tag  TEXT NOT NULL DEFAULT 'IUP',
    weight             NUMERIC(8,4) NOT NULL,
    sort_order         INT NOT NULL
);
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS applicability_tag TEXT NOT NULL DEFAULT 'IUP';

CREATE TABLE IF NOT EXISTS profile_weight_targets (
    profile_code   VARCHAR(80) PRIMARY KEY,
    environmental  NUMERIC(8,4) NOT NULL,
    social         NUMERIC(8,4) NOT NULL,
    governance     NUMERIC(8,4) NOT NULL,
    rationale      TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO profile_weight_targets (profile_code, environmental, social, governance, rationale)
VALUES
    ('IUP', 0.3500, 0.4000, 0.2500, 'Pemegang izin tambang; kendali penuh atas jejak lingkungan tapak (tailing, biodiversitas, closure).'),
    ('IUJP-KONSULTASI', 0.1000, 0.5000, 0.4000, 'Jasa berbasis kantor/lab; jejak lingkungan operasional minim, governance & kualitas data jadi kunci.'),
    ('IUJP-OPERASIONAL', 0.2500, 0.4500, 0.3000, 'Alat berat & hauling; jejak emisi/BBM signifikan, risiko K3 tinggi.'),
    ('IUJP-DRILLING', 0.2500, 0.4500, 0.3000, 'Pengeboran & peledakan; risiko K3 & lingkungan spesifik (lumpur bor, getaran, kebisingan).'),
    ('IUJP-PENGOLAHAN', 0.3000, 0.4000, 0.3000, 'Kontraktor pengolahan/pemurnian; jejak air & limbah proses mendekati profil IUP.'),
    ('IUJP-PENUNJANG', 0.1000, 0.5500, 0.3500, 'Camp, catering, logistik non-alat berat; dominan isu kesejahteraan pekerja & governance kontraktual.')
ON CONFLICT (profile_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS evidence_items (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id     UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    checklist_item_id VARCHAR(80) NOT NULL REFERENCES checklist_items(id) ON DELETE RESTRICT,
    file_name         VARCHAR(255) NOT NULL,
    file_url          TEXT NOT NULL DEFAULT '#',
    status            VARCHAR(40) NOT NULL DEFAULT 'uploaded'
                      CHECK (status IN ('uploaded','accepted','rejected','revision_requested')),
    reviewer_note     TEXT,
    uploaded_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- Multiple evidence documents per checklist item are allowed (max enforced in app).
);
CREATE INDEX IF NOT EXISTS idx_evidence_assessment_item
    ON evidence_items (assessment_id, checklist_item_id);

CREATE TABLE IF NOT EXISTS score_items (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id     UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    checklist_item_id VARCHAR(80) NOT NULL REFERENCES checklist_items(id) ON DELETE RESTRICT,
    score             SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 5),
    weighted_score    NUMERIC(10,4) NOT NULL,
    normalized_weight NUMERIC(10,6) NOT NULL DEFAULT 0,
    note              TEXT,
    assessed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    assessed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, checklist_item_id)
);

-- Self-heal for databases created before normalized_weight existed (was previously
-- applied only via migration_add_normalized_weight.sql). Idempotent: safe every boot.
ALTER TABLE score_items
    ADD COLUMN IF NOT EXISTS normalized_weight NUMERIC(10,6) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS red_flags (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    type          VARCHAR(80) NOT NULL CHECK (type IN ('fatality_or_tailing_failure','severe_regulatory_sanction','false_evidence')),
    description   TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, type)
);

CREATE TABLE IF NOT EXISTS jury_decisions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
    award_level   VARCHAR(40) NOT NULL CHECK (award_level IN ('foundation','integration','leadership','grand_champion','not_eligible')),
    note          TEXT,
    decided_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    decided_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80),
    entity_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_award_periods_updated_at ON award_periods;
CREATE TRIGGER trg_award_periods_updated_at BEFORE UPDATE ON award_periods FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_assessments_updated_at ON assessments;
CREATE TRIGGER trg_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_evidence_updated_at ON evidence_items;
CREATE TRIGGER trg_evidence_updated_at BEFORE UPDATE ON evidence_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_assessments_org ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assessor ON assessor_assignments(assessor_id);
CREATE INDEX IF NOT EXISTS idx_evidence_assessment ON evidence_items(assessment_id);
CREATE INDEX IF NOT EXISTS idx_scores_assessment ON score_items(assessment_id);
CREATE INDEX IF NOT EXISTS idx_profile_weight_targets_code ON profile_weight_targets(profile_code);

CREATE TABLE IF NOT EXISTS maturity_levels (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    score       SMALLINT NOT NULL UNIQUE CHECK (score BETWEEN 0 AND 5),
    level       VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO maturity_levels (score, level, description)
VALUES
    (0, 'Tidak Ada', 'Tidak ada kebijakan, praktik, atau bukti sama sekali terkait kriteria ini.'),
    (1, 'Ad-hoc', 'Praktik dilakukan secara tidak konsisten/reaktif, tanpa dokumentasi formal.'),
    (2, 'Foundational', 'Kebijakan/prosedur tertulis sudah ada, implementasi masih terbatas atau baru dimulai.'),
    (3, 'Integration', 'Diterapkan secara konsisten di seluruh unit terkait, dengan monitoring rutin.'),
    (4, 'Advanced', 'Terintegrasi dalam sistem manajemen, ada target terukur dan evaluasi berkala.'),
    (5, 'Leadership', 'Praktik terbaik industri, terverifikasi independen, menjadi acuan/benchmark sektor.')
ON CONFLICT (score) DO NOTHING;

CREATE TABLE IF NOT EXISTS maturity_bands (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    range_label VARCHAR(80) NOT NULL UNIQUE,
    band_label  VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO maturity_bands (range_label, band_label)
VALUES
    ('0.0 - < 2.0', 'Belum Memenuhi (Not Yet Qualified)'),
    ('2.0 - < 3.0', 'Foundation'),
    ('3.0 - < 4.0', 'Integration'),
    ('4.0 - 5.0', 'Leadership')
ON CONFLICT (range_label) DO NOTHING;
