-- Schema migration for TheraWay
CREATE TYPE user_role AS ENUM ('CLIENT','THERAPIST','CLINIC_OWNER','ADMIN');

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  roles user_role[] NOT NULL,
  name TEXT,
  profile_picture_url TEXT,
  bio TEXT,
  specializations TEXT[],
  languages TEXT[],
  is_demo_account BOOLEAN,
  custom_claims JSONB,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL,
  membership_application JSONB,
  membership_renewal_date TIMESTAMPTZ
);

CREATE TABLE therapists (
  id TEXT PRIMARY KEY REFERENCES users(id),
  email TEXT,
  name TEXT NOT NULL,
  profile_picture_url TEXT NOT NULL,
  intro_video_url TEXT,
  specializations TEXT[] NOT NULL,
  other_specializations TEXT[],
  languages TEXT[] NOT NULL,
  other_languages TEXT[],
  qualifications TEXT[] NOT NULL,
  bio TEXT NOT NULL,
  locations JSONB,
  whatsapp_number TEXT NOT NULL,
  is_favorite BOOLEAN,
  profile_views INT,
  likes INT,
  certifications JSONB,
  is_verified BOOLEAN,
  availability TEXT[],
  account_status TEXT NOT NULL,
  admin_notes TEXT,
  membership_application JSONB,
  membership_renewal_date TIMESTAMPTZ,
  is_demo_account BOOLEAN
);

CREATE TABLE practice_locations (
  id TEXT PRIMARY KEY,
  therapist_id TEXT NOT NULL REFERENCES therapists(id),
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_primary BOOLEAN
);
CREATE INDEX idx_practice_locations_therapist_id ON practice_locations(therapist_id);

CREATE TABLE certifications (
  id TEXT PRIMARY KEY,
  therapist_id TEXT NOT NULL REFERENCES therapists(id),
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  is_verified BOOLEAN NOT NULL,
  verification_notes TEXT,
  country TEXT
);
CREATE INDEX idx_certifications_therapist_id ON certifications(therapist_id);

CREATE TABLE clinics (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  profile_picture_url TEXT,
  photos TEXT[],
  amenities TEXT[] NOT NULL,
  operating_hours JSONB NOT NULL,
  services JSONB,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  whatsapp_number TEXT NOT NULL,
  description TEXT NOT NULL,
  is_verified BOOLEAN,
  thera_way_membership JSONB,
  account_status TEXT NOT NULL,
  admin_notes TEXT,
  is_demo_account BOOLEAN
);

CREATE TABLE clinic_services (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  name TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  duration_minutes INT NOT NULL
);
CREATE INDEX idx_clinic_services_clinic_id ON clinic_services(clinic_id);

CREATE TABLE clinic_space_listings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  photos TEXT[] NOT NULL,
  description TEXT NOT NULL,
  rental_price DOUBLE PRECISION NOT NULL,
  rental_duration TEXT NOT NULL,
  rental_terms TEXT NOT NULL,
  features TEXT[] NOT NULL,
  clinic_id TEXT REFERENCES clinics(id),
  clinic_name TEXT,
  clinic_address TEXT,
  is_demo_account BOOLEAN
);
CREATE INDEX idx_clinic_space_listings_clinic_id ON clinic_space_listings(clinic_id);

CREATE TABLE membership_status (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  status TEXT NOT NULL,
  tier_name TEXT,
  renewal_date TIMESTAMPTZ,
  application_date TIMESTAMPTZ,
  payment_receipt_url TEXT
);
CREATE INDEX idx_membership_status_clinic_id ON membership_status(clinic_id);

CREATE TABLE membership_history (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  date TIMESTAMPTZ NOT NULL,
  action TEXT NOT NULL,
  details TEXT
);
CREATE INDEX idx_membership_history_clinic_id ON membership_history(clinic_id);

CREATE TABLE system_health_metrics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  user_id TEXT REFERENCES users(id),
  user_name TEXT,
  user_role user_role,
  details JSONB,
  action TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT
);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);

CREATE TABLE user_inquiries (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  user_email TEXT NOT NULL,
  user_name TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  admin_reply TEXT,
  priority TEXT,
  category TEXT
);
CREATE INDEX idx_user_inquiries_user_id ON user_inquiries(user_id);

CREATE TABLE favorite_therapists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  therapist_id TEXT NOT NULL REFERENCES therapists(id),
  added_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX idx_favorite_therapists_user_therapist ON favorite_therapists(user_id, therapist_id);
