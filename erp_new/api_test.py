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

    def test_health(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["status"], "ok")

    def test_customers_orders_employees_flow(self) -> None:
        self.login()

        customer = self.client.post(
            "/api/customers",
            json={"name": "شركة النور", "phone": "777777"},
        )
        self.assertEqual(customer.status_code, 201)

        order = self.client.post(
            "/api/orders",
            json={"customer_id": 1, "title": "علب شحن", "quantity": 500, "total_amount": 25000},
        )
        self.assertEqual(order.status_code, 201)

        employee = self.client.post(
            "/api/employees",
            json={"name": "محمد", "email": "m@test.com", "role": "production"},
        )
        self.assertEqual(employee.status_code, 201)

        dashboard = self.client.get("/api/dashboard")
        self.assertEqual(dashboard.status_code, 200)
        payload = dashboard.get_json()
        self.assertGreaterEqual(payload["stats"]["customers"], 1)
        self.assertGreaterEqual(payload["stats"]["orders"], 1)
        self.assertGreaterEqual(payload["stats"]["employees"], 1)


if __name__ == "__main__":
    unittest.main()
