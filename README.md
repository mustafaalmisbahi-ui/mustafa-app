# دفتر الحسابات المنتظم

هيكل أولي لتطبيق **دفتر الحسابات المنتظم** باللغة العربية باستخدام Python و Flask، مع واجهة تدعم اتجاه الكتابة من اليمين إلى اليسار (RTL).

## الميزات المتوفرة في هذه النسخة

- واجهة سهلة لإدخال:
  - المبيعات
  - المشتريات
  - الديون (عملاء/موردون)
- لوحة تحكم تعرض:
  - إجمالي المبيعات
  - إجمالي المشتريات
  - صافي الربح/الخسارة
  - ملخص الديون
- تصدير CSV لصفحات:
  - المبيعات
  - المشتريات
  - الديون
  - ملخص لوحة التحكم
- صفحة تقارير بسيطة قابلة للطباعة.

## هيكل المشروع

```text
.
├── app.py
├── config.py
├── requirements.txt
└── app
    ├── __init__.py
    ├── extensions.py
    ├── services.py
    ├── models
    │   ├── __init__.py
    │   ├── debts.py
    │   └── entries.py
    ├── routes
    │   ├── __init__.py
    │   └── web.py
    ├── static
    │   ├── css/style.css
    │   └── js/main.js
    └── templates
        ├── base.html
        ├── dashboard.html
        ├── sales.html
        ├── purchases.html
        ├── debts.html
        └── reports.html
```

## المتطلبات

- Python 3.10+
- pip

## طريقة التشغيل

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

بعد التشغيل، افتح:

`http://127.0.0.1:5000`

## ملاحظات

- قاعدة البيانات الافتراضية: SQLite (`instance/accounting.db`).
- تم إعداد الجداول تلقائيًا عند التشغيل الأول.
- هذه النسخة تمثل **هيكلًا جاهزًا للتطوير** ويمكن توسيعها لاحقًا بإضافة:
  - نظام مستخدمين وصلاحيات
  - ترحيل قواعد البيانات (Alembic/Flask-Migrate)
  - تقارير مالية أكثر تفصيلًا.