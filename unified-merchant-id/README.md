# Unified Merchant ID (MVP)

لوحة تشغيل داخلية لإدارة التجار والفروع وحسابات المحافظ الإلكترونية المرتبطة بالفروع، مع دعم طباعة لوحات الدفع وبطاقات التشغيل وسجل تحديثات (Audit Log).

> هذا النظام **ليس** بوابة دفع، وليس تطبيق محفظة، ولا يحتوي أي منطق معالجة مالية.

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma ORM
- SQLite (MVP)
- Zod validation
- Server Actions

## Core Features Implemented

- تسجيل دخول إداري بسيط (مستخدم واحد افتراضي)
- لوحة Dashboard بإحصائيات رئيسية
- إدارة كاملة للتجار (CRUD + بحث + فلترة)
- إدارة الفروع داخل صفحة التاجر (CRUD)
- إدارة المحافظ الإلكترونية داخل كل فرع (CRUD + منع التكرار على نفس الفرع)
- سجل تدقيق للعمليات (إنشاء/تحديث/حذف/طباعة)
- بحث عام في:
  - رمز التاجر
  - رمز الفرع
  - اسم المتجر
  - الهاتف
  - رقم المحفظة
- صفحات طباعة:
  - لوحة الدفع: "وسائل الدفع المتاحة"
  - بطاقة التشغيل: "بطاقة تشغيل"
- دعم RTL + واجهات عربية افتراضية

## Authentication (MVP)

- Username: `admin`
- Password: `admin123`

> مهم: غيّر كلمة المرور الافتراضية فورًا عند أول تشغيل في بيئة حقيقية.

## Run Locally

1) Install dependencies:

```bash
npm install
```

2) Run migrations:

```bash
npm run db:migrate
```

3) Seed database with sample Arabic data:

```bash
npm run db:seed
```

4) Start dev server:

```bash
npm run dev
```

5) Open:

`http://localhost:3000`

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run eslint
- `npm run db:migrate` - run Prisma migrations
- `npm run db:generate` - regenerate Prisma client
- `npm run db:seed` - seed sample data

## Project Structure (high-level)

```txt
src/
  app/
    login/
    dashboard/
      merchants/
        [id]/
          print/sign
          print/cashier-card
  actions/
    auth.ts
    merchant.ts
  components/
    dashboard/
    print/
    ui/
  lib/
    auth.ts
    data.ts
    schemas.ts
    prisma.ts
prisma/
  schema.prisma
  seed.ts
```

## Domain Constraints

هذا التطبيق مخصص للإدارة التشغيلية والتنظيم فقط، ولا يتضمن:

- تكامل API للمحافظ
- تحويلات مالية
- تسويات مالية
- معالجة مدفوعات أو Gateway

## Migration to PostgreSQL Later

الهيكل الحالي جاهز للترحيل، والخطوات العامة:

1. غيّر `provider` في `prisma/schema.prisma` إلى `postgresql`
2. حدّث `DATABASE_URL` إلى رابط PostgreSQL
3. نفّذ:
   - `npx prisma migrate deploy` (بيئات الإنتاج)
   - أو `npx prisma migrate dev` (التطوير)
4. راجع فهارس البحث والـ collation حسب اللغة العربية
5. أضف pooling (مثل PgBouncer) عند التوسع

## Phase 2 Suggestions

- نظام مستخدمين وأدوار (RBAC) بدل مستخدم إداري واحد
- سجل نشاط أوسع مع معلومات المستخدم والجهاز
- تصدير PDF احترافي (server-side)
- تحسين UX للنماذج (step forms + auto-complete مناطق)
- تنبيهات للبيانات القديمة التي تحتاج تحديث
- دعم سلاسل المتاجر بشكل هرمي أوسع
- تكاملات تشغيلية مستقبلية (شاشة عرض/تنبيه صوتي) بدون منطق مالي
