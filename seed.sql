-- TransFleet Pro - Database Schema & Seed Data
-- Run this file against your PostgreSQL database (Neon or local)
-- Usage: psql $DATABASE_URL -f seed.sql

BEGIN;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT '',
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  vehicle_no VARCHAR(255) UNIQUE NOT NULL,
  vehicle_reg VARCHAR(255) DEFAULT '',
  vehicle_type VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) DEFAULT '',
  fc_expiry VARCHAR(255) DEFAULT '',
  pollution_expiry VARCHAR(255) DEFAULT '',
  insurance_expiry VARCHAR(255) DEFAULT '',
  tax_expiry VARCHAR(255) DEFAULT '',
  permit_expiry VARCHAR(255) DEFAULT '',
  status VARCHAR(50) DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'Maintenance', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mobile_no VARCHAR(255) UNIQUE NOT NULL,
  license_no VARCHAR(255) DEFAULT '',
  vehicle_no VARCHAR(255) DEFAULT '',
  status VARCHAR(50) DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'On Leave', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) UNIQUE NOT NULL,
  trip_date VARCHAR(255) NOT NULL,
  branch VARCHAR(255) DEFAULT '',
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  trip_type VARCHAR(255) DEFAULT '',
  trip_base VARCHAR(255) DEFAULT '',
  vehicle_type VARCHAR(255) NOT NULL,
  vendor VARCHAR(255) NOT NULL,
  vehicle_no VARCHAR(255) DEFAULT '',
  vehicle_reg VARCHAR(255) DEFAULT '',
  driver_name VARCHAR(255) DEFAULT '',
  mobile_no VARCHAR(255) DEFAULT '',
  weight DECIMAL DEFAULT 0,
  total_packages INTEGER DEFAULT 0,
  pickup_plant VARCHAR(255) DEFAULT '',
  delivery_plant VARCHAR(255) DEFAULT '',
  distance_km DECIMAL DEFAULT 0,
  rate_per_km DECIMAL DEFAULT 0,
  trip_amount DECIMAL DEFAULT 0,
  is_manual_amount INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Not Closed' CHECK (status IN ('Not Closed', 'Closed', 'Cancelled')),
  remarks TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS plants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_bases (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_trip_date ON trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_vendor ON trips(vendor);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);
CREATE INDEX IF NOT EXISTS idx_trips_date_status ON trips(trip_date, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default admin user (password: admin123) — change after first login
INSERT INTO users (username, password, full_name, email, role)
VALUES ('admin', '$2a$10$V/5w04IcYNoSBNLQwGjZjeSxTycSoMxyM/tQsAtmQnLaJOKcT4NXi', 'Administrator', 'admin@transfleet.com', 'admin')
ON CONFLICT (username) DO NOTHING;

COMMIT;
