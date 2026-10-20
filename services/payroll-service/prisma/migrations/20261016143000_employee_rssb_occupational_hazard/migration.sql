-- Employee RSSB / RAMA flags
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "rssb_number" VARCHAR(32);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "rama_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Payroll config: occupational hazard rate (employer)
ALTER TABLE "payroll_configurations" ADD COLUMN IF NOT EXISTS "occupational_hazard_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.02;

-- Payroll run records
ALTER TABLE "payroll_records" ADD COLUMN IF NOT EXISTS "occupational_hazard" DECIMAL(15,2) NOT NULL DEFAULT 0;
