# ERP Print Shop API (New Clean Start)

مشروع جديد بالكامل لإدارة المطابع الورقية، منفصل عن المشروع السابق.

## المميزات الحالية

- واجهة ويب أساسية (لوحة، عملاء، طلبات، موظفين)
- API JSON جاهز لتطبيق الهاتف
- تسجيل دخول API عبر Session
- إدارة العملاء عبر API
- إدارة الطلبات عبر API + تغيير الحالة
- إدارة الموظفين عبر API (إضافة + تفعيل/تعطيل)
- لوحة إحصائيات API

## المسارات المهمة

### واجهة الويب
- `GET /login`
- `GET /`
- `GET /customers`
- `GET /orders`
- `GET /employees`

### API
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET /api/customers`
- `POST /api/customers`
- `DELETE /api/customers/<id>`
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/<id>/status`
- `GET /api/employees`
- `POST /api/employees`
- `PATCH /api/employees/<id>/toggle`

## التشغيل

```bash
python3 -m pip install --user -r requirements.txt
python3 app.py
```

ثم افتح:
`http://127.0.0.1:5000`

## اختبار الـ API

```bash
python3 api_test.py
```

## بيانات الدخول الافتراضية
- username: `admin`
- password: `admin123`

## ملاحظات
- قاعدة البيانات SQLite داخل الملف: `erp.db`
- هذا الإصدار بداية نظيفة، والخطوة التالية الموصى بها: ربط Flutter app على هذا الـ API.
