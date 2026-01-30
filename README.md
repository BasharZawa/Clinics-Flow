# JoClinicsFlows

نظام إدارة العيادات والمراكز التجميلية - Clinic Management System

## 🚀 Quick Start (Local Development)

### المتطلبات
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. تحميل المشروع

```bash
git clone https://github.com/BasharZawa/Clinics-Flow.git
cd Clinics-Flow
```

### 2. تثبيت الاعتماديات

```bash
# تثبيت root dependencies
npm install

# تثبيت database package
cd packages/database && npm install && cd ../..

# تثبيت api package  
cd apps/api && npm install && cd ../..
```

### 3. إعداد المتغيرات البيئية

```bash
cp .env.example .env
```

عدل ملف `.env`:
```env
# Database (Docker)
DATABASE_URL=postgresql://joclinics:secret@localhost:5432/joclinicsflows

# JWT (غيّر السر)
JWT_SECRET=your-super-secret-key-here

# WhatsApp (اختياري للتطوير)
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
```

### 4. تشغيل قاعدة البيانات

```bash
docker-compose up -d postgres redis
```

### 5. تشغيل Prisma Migrate

```bash
cd packages/database
npx prisma migrate dev --name init
cd ../..
```

### 6. تشغيل التطبيق

```bash
# تشغيل Backend فقط (للتطوير)
cd apps/api
npm run dev
# السيرفر يشتغل على: http://localhost:3001

# أو تشغيل الكل مع Turborepo
npm run dev
```

### 7. اختبار الاتصال

```bash
# Health check
curl http://localhost:3001/health

# تشغيل الـ Tests
npm test
```

---

## 🧪 Testing

```bash
# كل الـ Tests
npm test

# Tests مع coverage
npm run test:coverage

# Tests لموديول معين
npm run test -- --testPathPattern=appointment

# Tests بالـ watch mode (للتطوير)
npm run test:watch
```

---

## 🖥️ خيارات الاستضافة (أرخص من AWS)

| المزود | السعر | المواصفات | مميزات |
|--------|-------|-----------|--------|
 **Hetzner** 🇩🇪 | €4.51/شهر | 2 CPU, 4GB RAM, 40GB SSD | ✅ **الأفضل قيمة** |
 **DigitalOcean** | $6/شهر | 1 CPU, 512MB RAM, 10GB SSD | ✅ سهل الاستخدام |
 **Vultr** | $6/شهر | 1 CPU, 1GB RAM, 25GB SSD | ✅ أداء جيد |
 **Linode (Akamai)** | $5/شهر | 1 CPU, 1GB RAM, 25GB SSD | ✅ دعم ممتاز |
 **Railway/Render** | $5/شهر | Serverless | ✅ ما في DevOps |

### 💡 توصيتي: **Hetzner CX21**
- السعر: €4.51 (~$5) شهرياً
- المواصفات: 2 vCPU, 4GB RAM, 40GB SSD
- الموقع: ألمانيا (قريب للشرق الأوسط)
- الباندويث: 20TB/شهر
- **توفر: https://www.hetzner.com/cloud**

### 🎯 للـ Production:
```
Hetzner CPX21 (€7.74):
- 2 vCPU (Intel/AMD)
- 8GB RAM
- 80GB NVMe SSD
- يشغل: PostgreSQL + Backend + Frontend + Redis
```

---

## 🚀 Deployment Guide (Hetzner/DigitalOcean)

### 1. إنشاء السيرفر
- OS: Ubuntu 22.04 LTS
- اختر أقرب location (ألمانيا للأردن)

### 2. إعداد السيرفر

```bash
# دخول السيرفر
ssh root@YOUR_SERVER_IP

# 1. تحديث النظام
apt update && apt upgrade -y

# 2. تثبيت Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. تثبيت Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
usermod -aG docker $USER

# 4. تثبيت Docker Compose
apt install -y docker-compose-plugin

# 5. تثبيت PM2 (لتشغيل Node.js)
npm install -g pm2

# 6. تثبيت Nginx (Reverse Proxy)
apt install -y nginx
```

### 3. نشر المشروع

```bash
# إنشاء مستخدم
cd /home
git clone https://github.com/BasharZawa/Clinics-Flow.git

# إعداد الـ Database
cd Clinics-Flow
docker-compose up -d postgres redis

# تثبيت dependencies
npm install
cd packages/database && npm install && npx prisma generate && cd ../..
cd apps/api && npm install && npm run build && cd ../..

# تشغيل Prisma Migrate
cd packages/database
npx prisma migrate deploy
cd ../..

# تشغيل السيرفر بـ PM2
cd apps/api
pm2 start dist/index.js --name "joclinics-api"
pm2 startup
pm2 save
```

### 4. إعداد Nginx

```bash
# إنشاء config
nano /etc/nginx/sites-available/joclinicsflows
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# تفعيل
ln -s /etc/nginx/sites-available/joclinicsflows /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## 📁 Structure

```
joclinicsflows/
├── apps/
│   ├── api/                 # Express Backend
│   │   ├── src/
│   │   │   ├── routes/      # API Routes
│   │   │   ├── controllers/ # Request handlers
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Auth, validation
│   │   │   └── utils/       # Helpers
│   │   └── tests/           # Unit + Integration tests
│   └── web/                 # Next.js Frontend (لاحقاً)
├── packages/
│   └── database/            # Prisma schema + client
├── docs/                    # التوثيق
│   ├── FLOWS.md
│   ├── SCHEMA.md
│   └── API.md
├── docker-compose.yml       # PostgreSQL + Redis
└── package.json
```

---

## 🏗️ Tech Stack

| الطبقة | التقنية |
|--------|--------|
| **Frontend** | Next.js 15, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Cache/Queue** | Redis, Bull |
| **Auth** | JWT |
| **WhatsApp** | WhatsApp Cloud API (Meta) |
| **Testing** | Jest, Supertest |
| **DevOps** | Docker, PM2, Nginx |

---

## 📚 Documentation

- [Flows](./docs/FLOWS.md) - سير العمل الكامل
- [Schema](./docs/SCHEMA.md) - هيكل قاعدة البيانات
- [API](./docs/API.md) - مواصفات الـ API

---

## 📝 License

Private - JoClinicsFlows Team

---

## 🆘 الدعم

لو واجهت مشكلة:
1. تأكد Docker شغال: `docker ps`
2. تأكد Database شغالة: `docker logs joclinicsflows-db`
3. شيك الـ Logs: `pm2 logs`
4. افتح issue على GitHub
