# API Specification - JoClinicsFlows

## Base URL
```
Production: https://api.joclinicsflows.com/v1
Local: http://localhost:3001/v1
```

## Authentication
All endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### Auth (التسجيل والدخول)

#### POST /auth/login
```json
{
  "phone": "+962795716713",
  "password": "******"
}
```
Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "full_name_ar": "اسم المستخدم",
    "role": "secretary",
    "clinic_id": "uuid"
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

---

### Clinics (العيادات)

#### GET /clinics/:id
Get clinic details and settings.

#### PATCH /clinics/:id
Update clinic settings (admin only).

---

### Patients (المرضى)

#### GET /patients
Query params: `search`, `phone`, `page`, `limit`

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### POST /patients
```json
{
  "full_name": "محمد أحمد",
  "phone": "+962795716713",
  "email": "test@example.com",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "address": "عمان",
  "notes": "حساسية من البنسلين"
}
```

#### GET /patients/:id
Get patient with appointment history.

#### PATCH /patients/:id
Update patient details.

#### GET /patients/:id/appointments
Get all appointments for patient.

#### GET /patients/:id/packages
Get all packages for patient.

---

### Services (الخدمات)

#### GET /services
List all services for clinic.

#### POST /services
Create new service (admin only).

#### PATCH /services/:id
Update service.

#### DELETE /services/:id
Soft delete service.

---

### Appointments (المواعيد)

#### GET /appointments
Query params:
- `date_from` (YYYY-MM-DD)
- `date_to` (YYYY-MM-DD)
- `staff_id` - filter by doctor/technician
- `patient_id`
- `status`
- `page`, `limit`

#### POST /appointments
```json
{
  "patient_id": "uuid",
  "staff_id": "uuid",
  "service_id": "uuid",
  "appointment_date": "2026-02-01",
  "start_time": "10:00",
  "end_time": "10:30",
  "notes": "ملاحظات",
  "appointment_type": "single"
}
```

#### POST /appointments/package
Create recurring package appointments:
```json
{
  "patient_id": "uuid",
  "staff_id": "uuid",
  "service_id": "uuid",
  "start_date": "2026-02-01",
  "start_time": "10:00",
  "total_sessions": 6,
  "interval_days": 28,
  "notes": "حزمة ليزر كامل الجسم"
}
```

#### GET /appointments/:id
Get appointment details.

#### PATCH /appointments/:id
Update appointment (time, notes, status).

#### POST /appointments/:id/cancel
Cancel appointment:
```json
{
  "reason": "cancelled_by_patient",
  "check_waitlist": true  // automatically check and fill from waitlist
}
```

#### POST /appointments/:id/confirm
Confirm pending appointment.

#### POST /appointments/:id/complete
Mark as completed.

#### POST /appointments/:id/no-show
Mark as no-show.

---

### Calendar (التقويم)

#### GET /calendar/availability
Get available slots for booking:
```
Query params:
- date=2026-02-01
- staff_id=uuid (optional)
- service_id=uuid
- duration=30 (minutes)
```

Response:
```json
{
  "date": "2026-02-01",
  "staff_id": "uuid",
  "available_slots": [
    {"start": "09:00", "end": "09:30"},
    {"start": "10:00", "end": "10:30"},
    {"start": "14:00", "end": "14:30"}
  ]
}
```

#### GET /calendar/staff/:id
Get staff schedule for date range:
```
Query params:
- date_from=2026-02-01
- date_to=2026-02-07
```

Response:
```json
{
  "staff_id": "uuid",
  "staff_name": "أحمد",
  "schedule": {
    "2026-02-01": {
      "working_hours": {"start": "09:00", "end": "17:00"},
      "appointments": [...],
      "blocked_slots": [...]
    }
  }
}
```

---

### Waitlist (قائمة الانتظار)

#### GET /waitlist
List waitlist entries.

Query params:
- `status` (active, filled, expired)
- `service_id`
- `date_from`, `date_to`

#### POST /waitlist
Add to waitlist:
```json
{
  "patient_id": "uuid",
  "service_id": "uuid",
  "preferred_staff_id": "uuid",
  "preferred_date_start": "2026-02-01",
  "preferred_date_end": "2026-02-15",
  "preferred_time_start": "09:00",
  "preferred_time_end": "17:00",
  "preferred_days_of_week": [1, 3, 5],
  "priority": 1,
  "notes": "مستعجل"
}
```

#### POST /waitlist/:id/cancel
Cancel waitlist request.

#### POST /waitlist/check-and-fill
Trigger waitlist check (internal/cron use):
```json
{
  "appointment_id": "uuid",  // cancelled appointment
  "auto_notify": true
}
```

---

### Packages (الحزم)

#### GET /packages
List packages.

#### POST /packages
Create new package.

#### GET /packages/:id
Get package with all appointments.

#### PATCH /packages/:id
Update package (pause, resume).

#### POST /packages/:id/cancel
Cancel remaining sessions.

#### POST /packages/:id/reschedule-session
Reschedule a specific session:
```json
{
  "session_number": 3,
  "new_date": "2026-03-15",
  "new_time": "11:00"
}
```

---

### WhatsApp (الواتساب)

#### POST /whatsapp/send-message
Send manual message:
```json
{
  "patient_id": "uuid",
  "message": "نص الرسالة",
  "message_type": "manual"
}
```

#### POST /whatsapp/webhook
Incoming webhook from WhatsApp Cloud API.

#### GET /whatsapp/templates
Get available message templates.

---

### Dashboard (لوحة التحكم)

#### GET /dashboard/stats
Get dashboard statistics:
```json
{
  "today": {
    "total_appointments": 25,
    "completed": 15,
    "pending": 8,
    "cancelled": 2
  },
  "week": {
    "total": 120,
    "new_patients": 12
  },
  "waitlist_count": 8,
  "unconfirmed_count": 3
}
```

#### GET /dashboard/upcoming
Get today's and tomorrow's appointments.

---

### Reports (التقارير)

#### GET /reports/appointments
Query params:
- `date_from`
- `date_to`
- `group_by` (day, week, month)
- `staff_id`
- `service_id`

Response:
```json
{
  "summary": {
    "total_appointments": 150,
    "completed": 120,
    "cancelled": 20,
    "no_show": 10,
    "completion_rate": 80
  },
  "breakdown": [...]
}
```

#### GET /reports/revenue
Financial reports.

#### GET /reports/patients
Patient statistics.

---

## Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "phone": ["Phone number is required"]
    }
  }
}
```

### Error Codes
- `VALIDATION_ERROR` - 400
- `UNAUTHORIZED` - 401
- `FORBIDDEN` - 403
- `NOT_FOUND` - 404
- `CONFLICT` - 409 (e.g., slot already booked)
- `INTERNAL_ERROR` - 500
