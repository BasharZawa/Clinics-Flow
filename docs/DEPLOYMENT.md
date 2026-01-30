# دليل النشر - Deployment Guide

## 🎯 ملخص سريع

| البيئة | السيرفر | التكلفة | الرابط |
|--------|---------|---------|--------|
| Development | Local/Docker | مجاني | localhost |
| Staging | Railway/Render | $5-20/شهر | auto-generated |
| Production | Hetzner CPX21 | €7.74/شهر | your-domain.com |

---

## 🖥️ الخطوة 1: اختيار السيرفر

### للتجربة (Staging):
**Railway** أو **Render** - ما في إعدادات، connect بس!

### للإنتاج (Production):
**Hetzner** - أفضل قيمة بالسوق

| Plan | السعر | المواصفات | يكفي لـ |
|------|-------|-----------|---------|
| CX11 | €3.79 | 1 CPU, 2GB RAM | Testing فقط |
| **CX21** ✅ | **€4.51** | **2 CPU, 4GB RAM** | **تجربة حقيقية** |
| **CPX21** ✅ | **€7.74** | **2 CPU, 8GB RAM** | **Production** |
| CPX31 | €14.10 | 4 CPU, 16GB RAM | Scale كبير |

سجل: https://www.hetzner.com/cloud

---

## 🔧 الخطوة 2: إعداد السيرفر (Ubuntu 22.04)

```bash
# دخول السيرفر
ssh root@YOUR_SERVER_IP

# تحديث النظام
apt update && apt upgrade -y

# تثبيت الأساسيات
apt install -y curl git vim htop

# تثبيت Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # v20.x.x

# تثبيت Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# تثبيت Docker Compose
apt install -y docker-compose-plugin
docker compose version

# تثبيت PM2
npm install -g pm2

# تثبيت Nginx
apt install -y nginx
ufw allow 'Nginx Full'
```

---

## 📦 الخطوة 3: نشر التطبيق

### 3.1 تحميل المشروع

```bash
cd /var/www
git clone https://github.com/BasharZawa/Clinics-Flow.git joclinicsflows
cd joclinicsflows
```

### 3.2 إعداد Environment Variables

```bash
cp .env.example .env
nano .env
```

```env
# Production Database
DATABASE_URL=postgresql://joclinics:STRONG_PASSWORD@localhost:5432/joclinicsflows

# Security (غيّرها!)
JWT_SECRET=your-256-bit-secret-key-here-min-32-chars

# WhatsApp (من Meta Dashboard)
WHATSAPP_ACCESS_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_WEBHOOK_SECRET=webhook-secret-123
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify-token-123

# App
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
```

### 3.3 تشغيل Database

```bash
# تعديل docker-compose للـ Production
nano docker-compose.yml
```

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: joclinics-db
    environment:
      POSTGRES_USER: joclinics
      POSTGRES_PASSWORD: STRONG_PASSWORD
      POSTGRES_DB: joclinicsflows
    volumes:
      - /var/lib/postgresql/data:/var/lib/postgresql/data  # Persist data
    ports:
      - "127.0.0.1:5432:5432"  # Local only for security
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    container_name: joclinics-redis
    volumes:
      - /var/lib/redis:/data
    ports:
      - "127.0.0.1:6379:6379"
    restart: unless-stopped
```

```bash
# تشغيل
docker compose up -d

# تأكد إنها شغالة
docker ps
docker logs joclinics-db
```

### 3.4 تثبيت Dependencies

```bash
# Root
npm install

# Database package
cd packages/database
npm install
npx prisma generate

# Migrate
cd /var/www/joclinicsflows
npx prisma migrate deploy

# Seed (اختياري)
# npx tsx packages/database/seed.ts
```

### 3.5 بناء Backend

```bash
cd apps/api
npm install
npm run build
```

### 3.6 تشغيل بـ PM2

```bash
cd /var/www/joclinicsflows/apps/api

# تشغيل
pm2 start dist/index.js --name "joclinics-api" \
  --instances 1 \
  --env production \
  --log /var/log/joclinics/api.log

# حفظ الـ config
pm2 startup systemd
pm2 save

# مشاهدة الـ logs
pm2 logs joclinics-api
pm2 monit
```

---

## 🌐 الخطوة 4: Nginx + SSL

### 4.1 إعداد Nginx

```bash
nano /etc/nginx/sites-available/joclinicsflows
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL (Certbot هيضيف هنا)
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/joclinics-access.log;
    error_log /var/log/nginx/joclinics-error.log;

    # API
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WhatsApp Webhook (لو بدك path منفصل)
    location /webhook {
        proxy_pass http://localhost:3001/webhook;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
# تفعيل
ln -s /etc/nginx/sites-available/joclinicsflows /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 4.2 SSL Certificate

```bash
apt install -y certbot python3-certbot-nginx

certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal تلقائي
systemctl status certbot.timer
```

---

## 🔄 الخطوة 5: التحديثات المستقبلية

```bash
# دخول السيرفر
ssh root@YOUR_SERVER_IP
cd /var/www/joclinicsflows

# سحب التحديثات
git pull origin main

# تحديث dependencies
npm install
cd packages/database && npm install && cd ../..
cd apps/api && npm install && cd ../..

# تشغيل migrations
npx prisma migrate deploy

# إعادة بناء
npm run build

# restart
pm2 restart joclinics-api

# شيك الـ status
pm2 status
```

---

## 📊 Monitoring

### PM2
```bash
pm2 status
pm2 logs
pm2 monit
```

### Docker
```bash
docker stats
docker logs -f joclinics-db
```

### Disk usage
```bash
df -h
du -sh /var/www/joclinicsflows
```

---

## 🆘 Troubleshooting

### مشكلة: السيرفر ما بيشتغل
```bash
# شيك الـ logs
pm2 logs

# شيك الـ port
netstat -tlnp | grep 3001

# إعادة تشغيل
pm2 restart joclinics-api
```

### مشكلة: Database connection error
```bash
# شيك إن Postgres شغال
docker ps
docker logs joclinics-db

# اختبار الاتصال
docker exec -it joclinics-db psql -U joclinics -d joclinicsflows -c "\dt"
```

### مشكلة: Nginx 502 error
```bash
# شيك إن الـ backend شغال
curl http://localhost:3001/health

# شيك Nginx logs
tail -f /var/log/nginx/joclinics-error.log
```

---

## 💰 تقدير التكلفة الشهرية (Production)

| البند | التكلفة |
|-------|---------|
| Hetzner CPX21 | €7.74 (~$8.5) |
| Domain (.com) | ~$10/سنة = ~$0.8/شهر |
| Backups (Hetzner) | €1.2 |
| **المجموع** | **~$10/شهر** |

مقارنة مع AWS:
- EC2 t3.small: ~$15/شهر
- RDS PostgreSQL: ~$15/شهر
- **AWS المجموع: ~$30/شهر**
- **Hetzner: ~$10/شهر** ✅ توفير 70%!

---

## 📞 روابط مهمة

- Hetzner: https://www.hetzner.com/cloud
- Certbot: https://certbot.eff.org
- PM2: https://pm2.io
- WhatsApp Business: https://business.facebook.com
