# JoClinicsFlows

نظام إدارة العيادات والمراكز التجميلية - Clinic Management System

## 🚀 Quick Start

```bash
# 1. تثبيت الاعتماديات
npm install

# 2. إعداد المتغيرات البيئية
cp .env.example .env
# عدل .env ببياناتك

# 3. تشغيل قاعدة البيانات (Docker)
docker-compose up -d postgres

# 4. تشغيل المايكراشن
npm run db:migrate

# 5. تشغيل السيرفر
npm run dev
```

## 📁 Structure

```
joclinicsflows/
├── apps/
│   ├── web/                 # Next.js Frontend
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── admin/
│   │   │   │   ├── doctor/
│   │   │   │   ├── technician/
│   │   │   │   └── secretary/
│   │   │   ├── (landing)/
│   │   │   └── api/
│   │   └── components/
│   └── api/                 # Express Backend
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── models/
│       │   ├── middleware/
│       │   └── utils/
│       └── tests/
├── packages/
│   ├── shared/              # Types, utilities مشتركة
│   └── database/            # Prisma schema + migrations
├── docs/                    # التوثيق
└── docker-compose.yml
```

## 🧪 Testing

```bash
# تشغيل كل الـ Tests
npm test

# Tests مع coverage
npm run test:coverage

# Tests لموديول معين
npm run test -- --testPathPattern=appointments
```

## 📚 Documentation

- [Flows](./docs/FLOWS.md) - سير العمل
- [Schema](./docs/SCHEMA.md) - هيكل قاعدة البيانات
- [API](./docs/API.md) - مواصفات الـ API

## 🏗️ Tech Stack

- **Frontend:** Next.js 15, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express
- **Database:** PostgreSQL + Prisma ORM
- **WhatsApp:** WhatsApp Cloud API
- **Auth:** JWT

## 📝 License

Private - JoClinicsFlows Team
