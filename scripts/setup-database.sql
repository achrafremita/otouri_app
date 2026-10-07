-- Otouri Activation System Supabase Database Schema
-- Run this in your Supabase SQL Editor if table or columns do not exist yet.

CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT,
    email TEXT,
    purchase_type TEXT DEFAULT 'first', -- 'first', 'monthly', 'yearly'
    plan TEXT DEFAULT 'FULL',           -- 'FULL', 'MONTHLY', 'YEARLY'
    activation_type TEXT DEFAULT 'تلقائي', -- 'تلقائي' or 'يدوي'
    status TEXT DEFAULT 'active',        -- 'active', 'expired', 'pending'
    amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expiry TEXT,
    license TEXT,
    license_key TEXT,
    customer_name TEXT,
    paid BOOLEAN DEFAULT false,
    checkout_id TEXT,
    machine_id TEXT,
    revoked BOOLEAN DEFAULT false
);

-- Ensure all necessary columns exist if table already existed
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'first';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FULL';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS activation_type TEXT DEFAULT 'تلقائي';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS expiry TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_key TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT false;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS checkout_id TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS machine_id TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT false;

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS licenses_phone_idx ON licenses (phone);
CREATE INDEX IF NOT EXISTS licenses_email_idx ON licenses (email);
CREATE INDEX IF NOT EXISTS licenses_activation_type_idx ON licenses (activation_type);
CREATE INDEX IF NOT EXISTS licenses_status_idx ON licenses (status);
CREATE INDEX IF NOT EXISTS licenses_created_at_idx ON licenses (created_at DESC);
CREATE INDEX IF NOT EXISTS licenses_checkout_id_idx ON licenses (checkout_id) WHERE checkout_id IS NOT NULL;
