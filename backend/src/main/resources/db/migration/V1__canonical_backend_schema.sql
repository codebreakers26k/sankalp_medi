CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mobile TEXT,
    patient_id TEXT UNIQUE NOT NULL,
    last_visit TIMESTAMPTZ,
    hospital_visited TEXT[],
    treatment_type TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    departments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS license_expiry DATE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS license_document_url TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS hospital_type TEXT DEFAULT 'private';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS bed_count INTEGER DEFAULT 0;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS accreditation TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    floor TEXT,
    counter_numbers INTEGER[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    specialization TEXT NOT NULL,
    qualification TEXT NOT NULL,
    experience INTEGER NOT NULL DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    availability JSONB DEFAULT '[]'::jsonb,
    is_on_leave BOOLEAN DEFAULT FALSE,
    leave_from TIMESTAMPTZ,
    leave_to TIMESTAMPTZ,
    average_treatment_time INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    otp_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS hospital_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS department_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS previous_status TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_from JSONB;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reschedule_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show'));

CREATE TABLE IF NOT EXISTS queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_number INTEGER NOT NULL,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    treatment_type TEXT NOT NULL DEFAULT 'general',
    is_emergency BOOLEAN DEFAULT FALSE,
    qr_code TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'waiting',
    estimated_wait_time INTEGER DEFAULT 0,
    position INTEGER,
    counter_number INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE queue ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'regular';
ALTER TABLE queue ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'general';
ALTER TABLE queue ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'default';
ALTER TABLE queue ADD COLUMN IF NOT EXISTS counter_id UUID;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE queue ADD COLUMN IF NOT EXISTS service_start_time TIMESTAMPTZ;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS service_end_time TIMESTAMPTZ;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS skip_reason TEXT;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS skip_time TIMESTAMPTZ;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS transfer_time TIMESTAMPTZ;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS transfer_from_counter UUID;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT FALSE;
ALTER TABLE queue DROP CONSTRAINT IF EXISTS queue_status_check;
ALTER TABLE queue ADD CONSTRAINT queue_status_check
    CHECK (status IN ('waiting', 'in-treatment', 'completed', 'cancelled', 'skipped'));

CREATE TABLE IF NOT EXISTS counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    counter_number INTEGER NOT NULL,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'busy')),
    current_patient_id TEXT,
    location_id TEXT DEFAULT 'default',
    staff_id TEXT,
    average_service_time INTEGER DEFAULT 5,
    last_service_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE counters ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE;
ALTER TABLE counters ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE CASCADE;
ALTER TABLE counters ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
ALTER TABLE counters ADD COLUMN IF NOT EXISTS current_patient_id TEXT;
ALTER TABLE counters ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'default';
ALTER TABLE counters ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE counters ADD COLUMN IF NOT EXISTS average_service_time INTEGER DEFAULT 5;
ALTER TABLE counters ADD COLUMN IF NOT EXISTS last_service_time TIMESTAMPTZ;
ALTER TABLE counters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE counters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE queue DROP CONSTRAINT IF EXISTS queue_counter_id_fkey;
DO $$
BEGIN
    IF (SELECT data_type='uuid' FROM information_schema.columns
        WHERE table_schema='public' AND table_name='queue' AND column_name='counter_id')
       AND (SELECT data_type='uuid' FROM information_schema.columns
        WHERE table_schema='public' AND table_name='counters' AND column_name='id') THEN
        ALTER TABLE queue ADD CONSTRAINT queue_counter_id_fkey
            FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS emergency_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_number INTEGER NOT NULL,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    emergency_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium')),
    qr_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in-treatment', 'completed')),
    counter_number INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS appointment_waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    position INTEGER NOT NULL,
    priority TEXT DEFAULT 'regular',
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'offered', 'accepted', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    offered_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL
);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_from_waitlist UUID REFERENCES appointment_waitlist(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE otps ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE otps ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'appointment';
ALTER TABLE otps ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE otps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS queue_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id TEXT NOT NULL UNIQUE,
    priority_weights JSONB NOT NULL DEFAULT '{"emergency":100,"vip":80,"elderly":60,"regular":40}'::jsonb,
    average_service_time INTEGER NOT NULL DEFAULT 5,
    max_queue_length INTEGER NOT NULL DEFAULT 50,
    overflow_threshold INTEGER NOT NULL DEFAULT 15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO queue_config (location_id) VALUES ('default') ON CONFLICT (location_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_hospital ON departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_department ON doctors(hospital_id, department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status ON appointments(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_queue_scope_status_position ON queue(hospital_id, department_id, status, position);
CREATE INDEX IF NOT EXISTS idx_queue_patient ON queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_waitlist_slot ON appointment_waitlist(doctor_id, date, time_slot, status, position);
CREATE INDEX IF NOT EXISTS idx_otps_lookup ON otps(email, purpose, verified, expires_at);

CREATE OR REPLACE FUNCTION mediqueue_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE target_table TEXT;
BEGIN
    FOREACH target_table IN ARRAY ARRAY['users','hospitals','departments','doctors','appointments','queue','counters','emergency_queue','queue_config']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS mediqueue_updated_at ON %I', target_table);
        EXECUTE format('CREATE TRIGGER mediqueue_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION mediqueue_set_updated_at()', target_table);
    END LOOP;
END $$;
