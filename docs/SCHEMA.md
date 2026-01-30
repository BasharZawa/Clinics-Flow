# Database Schema - JoClinicsFlows

## Overview
PostgreSQL database schema for clinic management system with multi-tenant support.

---

## الجداول الأساسية

### 1. clinics (العيادات)
```sql
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    subdomain VARCHAR(100) UNIQUE NOT NULL, -- clinic.joclinicsflows.com
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    logo_url TEXT,
    subscription_status VARCHAR(20) DEFAULT 'trial', -- trial, active, suspended, cancelled
    subscription_ends_at TIMESTAMP,
    trial_ends_at TIMESTAMP,
    settings JSONB DEFAULT '{}', -- إعدادات مخصصة للعيادة
    timezone VARCHAR(50) DEFAULT 'Asia/Amman',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. users (المستخدمون)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'technician', 'secretary')),
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255),
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(clinic_id, phone)
);

CREATE INDEX idx_users_clinic ON users(clinic_id);
CREATE INDEX idx_users_role ON users(role);
```

### 3. patients (المرضى)
```sql
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    address TEXT,
    notes TEXT,
    whatsapp_opt_in BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(clinic_id, phone)
);

CREATE INDEX idx_patients_clinic ON patients(clinic_id);
CREATE INDEX idx_patients_phone ON patients(phone);
```

### 4. services (الخدمات)
```sql
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    price DECIMAL(10,2),
    color VARCHAR(7) DEFAULT '#3B82F6', -- لون في التقويم
    is_active BOOLEAN DEFAULT true,
    requires_doctor BOOLEAN DEFAULT false, -- هل يحتاج طبيب؟
    requires_technician BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_clinic ON services(clinic_id);
```

### 5. staff_services (الخدمات التي يقدمها كل موظف)
```sql
CREATE TABLE staff_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(staff_id, service_id)
);
```

### 6. appointments (المواعيد)
```sql
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES users(id), -- الدكتور أو الفني
    service_id UUID NOT NULL REFERENCES services(id),
    
    -- تاريخ ووقت الموعد
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- الحالة
    status VARCHAR(30) DEFAULT 'confirmed' CHECK (
        status IN ('pending', 'confirmed', 'completed', 'no_show', 'cancelled_by_patient', 'cancelled_by_clinic')
    ),
    
    -- النوع
    appointment_type VARCHAR(20) DEFAULT 'single' CHECK (appointment_type IN ('single', 'package')),
    package_id UUID, -- لو جزء من حزمة
    package_session_number INTEGER, -- رقم الجلسة في الحزمة
    
    -- ملاحظات
    notes TEXT,
    patient_notes TEXT, -- ملاحظات المريض
    internal_notes TEXT, -- ملاحظات داخلية للموظفين
    
    -- مصدر الحجز
    source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'whatsapp', 'online')),
    
    -- التذكيرات
    reminder_24h_sent BOOLEAN DEFAULT false,
    reminder_1h_sent BOOLEAN DEFAULT false,
    confirmation_sent BOOLEAN DEFAULT false,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_staff ON appointments(staff_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date_staff ON appointments(appointment_date, staff_id);
```

### 7. packages (الحزم)
```sql
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    staff_id UUID NOT NULL REFERENCES users(id), -- الفني المسؤول
    
    name VARCHAR(255) NOT NULL, -- مثال: "حزمة ليزر 6 جلسات"
    total_sessions INTEGER NOT NULL,
    interval_days INTEGER DEFAULT 28, -- الفاصل بين الجلسات (بالأيام)
    
    -- الأسعار
    total_price DECIMAL(10,2),
    price_per_session DECIMAL(10,2),
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'paused')),
    
    -- التواريخ
    start_date DATE NOT NULL,
    expected_end_date DATE,
    completed_at TIMESTAMP,
    
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_packages_clinic ON packages(clinic_id);
CREATE INDEX idx_packages_patient ON packages(patient_id);
CREATE INDEX idx_packages_status ON packages(status);
```

### 8. waitlist (قائمة الانتظار)
```sql
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    preferred_staff_id UUID REFERENCES users(id), -- تفضيل معين (اختياري)
    
    -- التفضيلات الزمنية
    preferred_date_start DATE,
    preferred_date_end DATE,
    preferred_time_start TIME,
    preferred_time_end TIME,
    preferred_days_of_week INTEGER[], -- [1,3,5] = السبت، الاثنين، الأربعاء
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'filled', 'expired', 'cancelled')),
    
    -- لو تم تعبئته
    filled_appointment_id UUID REFERENCES appointments(id),
    filled_at TIMESTAMP,
    
    priority INTEGER DEFAULT 0, -- أولوية أعلى = رقم أكبر
    notes TEXT,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_waitlist_clinic ON waitlist(clinic_id);
CREATE INDEX idx_waitlist_patient ON waitlist(patient_id);
CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_waitlist_service ON waitlist(service_id);
```

### 9. whatsapp_logs (سجل رسائل الواتساب)
```sql
CREATE TABLE whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id),
    phone VARCHAR(20) NOT NULL,
    
    message_type VARCHAR(50) NOT NULL, -- booking_confirmation, reminder_24h, reminder_1h, waitlist_offer, etc.
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
    
    content TEXT NOT NULL,
    media_url TEXT,
    
    -- حالة الإرسال
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    external_message_id VARCHAR(255), -- ID من WhatsApp API
    error_message TEXT,
    
    -- الروابط
    appointment_id UUID REFERENCES appointments(id),
    
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whatsapp_logs_clinic ON whatsapp_logs(clinic_id);
CREATE INDEX idx_whatsapp_logs_patient ON whatsapp_logs(patient_id);
CREATE INDEX idx_whatsapp_logs_phone ON whatsapp_logs(phone);
CREATE INDEX idx_whatsapp_logs_created ON whatsapp_logs(created_at);
```

### 10. working_hours (ساعات العمل)
```sql
CREATE TABLE working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES users(id), -- لو null = ساعات العيادة العامة
    
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = الأحد
    is_working BOOLEAN DEFAULT true,
    
    open_time TIME,
    close_time TIME,
    break_start TIME,
    break_end TIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(clinic_id, staff_id, day_of_week)
);
```

### 11. blocked_slots (الفترات المحجوبة)
```sql
CREATE TABLE blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES users(id), -- لو null = محجوب للعيادة كلها
    
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    reason VARCHAR(255),
    is_recurring BOOLEAN DEFAULT false,
    recurring_until DATE,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blocked_slots_clinic ON blocked_slots(clinic_id);
CREATE INDEX idx_blocked_slots_staff ON blocked_slots(staff_id);
CREATE INDEX idx_blocked_slots_date ON blocked_slots(block_date);
```

### 12. audit_logs (سجل التغييرات)
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    patient_id UUID REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    
    action VARCHAR(50) NOT NULL, -- created, updated, deleted, cancelled, confirmed, etc.
    entity_type VARCHAR(50) NOT NULL, -- appointment, patient, etc.
    entity_id UUID NOT NULL,
    
    old_values JSONB,
    new_values JSONB,
    
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_clinic ON audit_logs(clinic_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

## العلاقات (Relationships)

```
clinics
├── users (many)
├── patients (many)
├── services (many)
├── appointments (many)
├── packages (many)
├── waitlist (many)
└── working_hours (many)

users
├── appointments (as staff) (many)
├── staff_services (many-to-many with services)
└── working_hours (many)

patients
├── appointments (many)
├── packages (many)
└── waitlist (many)

services
├── appointments (many)
├── packages (many)
└── staff_services (many-to-many with users)

appointments
├── whatsapp_logs (many)
└── waitlist (as filled_appointment) (one-to-one)
```

---

## Views مفيدة

### view_available_slots (الفترات المتاحة)
```sql
-- سيتم إنشاؤها لاحقاً ديناميكياً في الكود
```

### view_today_appointments (مواعيد اليوم)
```sql
CREATE VIEW view_today_appointments AS
SELECT 
    a.*,
    p.full_name as patient_name,
    p.phone as patient_phone,
    s.name_ar as service_name,
    u.full_name_ar as staff_name
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN services s ON a.service_id = s.id
JOIN users u ON a.staff_id = u.id
WHERE a.appointment_date = CURRENT_DATE
ORDER BY a.start_time;
```
