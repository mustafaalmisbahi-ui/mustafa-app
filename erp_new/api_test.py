import os
import unittest

from app import app


class ApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db_path = os.path.join(os.path.dirname(__file__), "erp.db")
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        app.config["TESTING"] = True
        self.client = app.test_client()

    def login(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        token = payload["token"]
        return {"Authorization": f"Bearer {token}"}

    def test_health(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["status"], "ok")

    def test_customers_orders_employees_flow(self) -> None:
        headers = self.login()

        customer = self.client.post(
            "/api/customers",
            json={"name": "شركة النور", "phone": "777777"},
            headers=headers,
        )
        self.assertEqual(customer.status_code, 201)

        order = self.client.post(
            "/api/orders",
            json={"customer_id": 1, "title": "علب شحن", "quantity": 500, "total_amount": 25000},
            headers=headers,
        )
        self.assertEqual(order.status_code, 201)

        employee = self.client.post(
            "/api/employees",
            json={"name": "محمد", "email": "m@test.com", "role": "production"},
            headers=headers,
        )
        self.assertEqual(employee.status_code, 201)

        dashboard = self.client.get("/api/dashboard", headers=headers)
        self.assertEqual(dashboard.status_code, 200)
        payload = dashboard.get_json()
        self.assertGreaterEqual(payload["stats"]["customers"], 1)
        self.assertGreaterEqual(payload["stats"]["orders"], 1)
        self.assertGreaterEqual(payload["stats"]["employees"], 1)

    def test_suppliers_inventory_invoices_payments(self) -> None:
        headers = self.login()

        supplier = self.client.post(
            "/api/suppliers",
            json={"name": "مورد الورق", "phone": "700000", "type": "paper"},
            headers=headers,
        )
        self.assertEqual(supplier.status_code, 201)

        item = self.client.post(
            "/api/inventory",
            json={"name": "ورق A4", "category": "paper", "unit": "sheet", "quantity": 1000, "unit_cost": 1.5},
            headers=headers,
        )
        self.assertEqual(item.status_code, 201)

        movement = self.client.post(
            "/api/inventory/1/movement",
            json={"movement_type": "out", "quantity": 100, "reason": "production"},
            headers=headers,
        )
        self.assertEqual(movement.status_code, 200)

        customer = self.client.post(
            "/api/customers",
            json={"name": "عميل الفاتورة", "phone": "711111"},
            headers=headers,
        )
        self.assertEqual(customer.status_code, 201)

        invoice = self.client.post(
            "/api/invoices",
            json={"customer_id": 1, "subtotal": 5000, "tax_amount": 0, "total": 5000, "status": "sent"},
            headers=headers,
        )
        self.assertEqual(invoice.status_code, 201)

        payment = self.client.post(
            "/api/invoices/1/payments",
            json={"amount": 2000, "payment_method": "cash"},
            headers=headers,
        )
        self.assertEqual(payment.status_code, 200)

        summary = self.client.get("/api/bootstrap", headers=headers)
        self.assertEqual(summary.status_code, 200)
        payload = summary.get_json()
        self.assertIn("data", payload)
        self.assertIn("inventory_items", payload["data"])
        self.assertIn("invoices", payload["data"])


if __name__ == "__main__":
    unittest.main()
