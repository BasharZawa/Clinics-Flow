-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'doctor', 'technician', 'secretary');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'completed', 'no_show', 'cancelled_by_patient', 'cancelled_by_clinic');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('single', 'package');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('active', 'completed', 'cancelled', 'paused');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('active', 'filled', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('outgoing', 'incoming');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');

-- CreateTable
CREATE TABLE "clinics" (
    "id" UUID NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT,
    "subdomain" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "logo_url" TEXT,
    "subscription_status" TEXT NOT NULL DEFAULT 'trial',
    "subscription_ends_at" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Amman',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT,
    "full_name_ar" TEXT NOT NULL,
    "full_name_en" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" "Gender",
    "address" TEXT,
    "notes" TEXT,
    "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "price" DECIMAL(10,2),
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requires_doctor" BOOLEAN NOT NULL DEFAULT false,
    "requires_technician" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_services" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "appointment_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'confirmed',
    "appointment_type" "AppointmentType" NOT NULL DEFAULT 'single',
    "package_id" UUID,
    "package_session_number" INTEGER,
    "notes" TEXT,
    "patient_notes" TEXT,
    "internal_notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "reminder_24h_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_1h_sent" BOOLEAN NOT NULL DEFAULT false,
    "confirmation_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "total_sessions" INTEGER NOT NULL,
    "interval_days" INTEGER NOT NULL DEFAULT 28,
    "total_price" DECIMAL(10,2),
    "price_per_session" DECIMAL(10,2),
    "status" "PackageStatus" NOT NULL DEFAULT 'active',
    "start_date" DATE NOT NULL,
    "expected_end_date" DATE,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "preferred_staff_id" UUID,
    "preferred_date_start" DATE,
    "preferred_date_end" DATE,
    "preferred_time_start" TIME,
    "preferred_time_end" TIME,
    "preferred_days_of_week" INTEGER[],
    "status" "WaitlistStatus" NOT NULL DEFAULT 'active',
    "filled_appointment_id" UUID,
    "filled_at" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_logs" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID,
    "phone" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'pending',
    "external_message_id" TEXT,
    "error_message" TEXT,
    "appointment_id" UUID,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_hours" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "staff_id" UUID,
    "day_of_week" INTEGER NOT NULL,
    "is_working" BOOLEAN NOT NULL DEFAULT true,
    "open_time" TIME,
    "close_time" TIME,
    "break_start" TIME,
    "break_end" TIME,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_slots" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "staff_id" UUID,
    "block_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "reason" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_until" DATE,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "user_id" UUID,
    "patient_id" UUID,
    "appointment_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinics_subdomain_key" ON "clinics"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "users_clinic_id_phone_key" ON "users"("clinic_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "patients_clinic_id_phone_key" ON "patients"("clinic_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "staff_services_staff_id_service_id_key" ON "staff_services"("staff_id", "service_id");

-- CreateIndex
CREATE INDEX "appointments_clinic_id_idx" ON "appointments"("clinic_id");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_staff_id_idx" ON "appointments"("staff_id");

-- CreateIndex
CREATE INDEX "appointments_appointment_date_idx" ON "appointments"("appointment_date");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_appointment_date_staff_id_idx" ON "appointments"("appointment_date", "staff_id");

-- CreateIndex
CREATE INDEX "packages_clinic_id_idx" ON "packages"("clinic_id");

-- CreateIndex
CREATE INDEX "packages_patient_id_idx" ON "packages"("patient_id");

-- CreateIndex
CREATE INDEX "packages_status_idx" ON "packages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_filled_appointment_id_key" ON "waitlist"("filled_appointment_id");

-- CreateIndex
CREATE INDEX "waitlist_clinic_id_idx" ON "waitlist"("clinic_id");

-- CreateIndex
CREATE INDEX "waitlist_patient_id_idx" ON "waitlist"("patient_id");

-- CreateIndex
CREATE INDEX "waitlist_status_idx" ON "waitlist"("status");

-- CreateIndex
CREATE INDEX "waitlist_service_id_idx" ON "waitlist"("service_id");

-- CreateIndex
CREATE INDEX "whatsapp_logs_clinic_id_idx" ON "whatsapp_logs"("clinic_id");

-- CreateIndex
CREATE INDEX "whatsapp_logs_patient_id_idx" ON "whatsapp_logs"("patient_id");

-- CreateIndex
CREATE INDEX "whatsapp_logs_phone_idx" ON "whatsapp_logs"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_logs_created_at_idx" ON "whatsapp_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "working_hours_clinic_id_staff_id_day_of_week_key" ON "working_hours"("clinic_id", "staff_id", "day_of_week");

-- CreateIndex
CREATE INDEX "blocked_slots_clinic_id_idx" ON "blocked_slots"("clinic_id");

-- CreateIndex
CREATE INDEX "blocked_slots_staff_id_idx" ON "blocked_slots"("staff_id");

-- CreateIndex
CREATE INDEX "blocked_slots_block_date_idx" ON "blocked_slots"("block_date");

-- CreateIndex
CREATE INDEX "audit_logs_clinic_id_idx" ON "audit_logs"("clinic_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_preferred_staff_id_fkey" FOREIGN KEY ("preferred_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_filled_appointment_id_fkey" FOREIGN KEY ("filled_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
