from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Warehouse, Category, Location, Product, StockQuant, StockMove

class StockSenseCompleteLifecycleTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Setup Master Data
        self.wh = Warehouse.objects.create(name="Main Hub", code="WH-MAIN", address="Industrial Zone 1")
        self.vendor_loc = Location.objects.create(name="Supplier Co", code="VEND-01", type="vendor")
        self.customer_loc = Location.objects.create(name="Buyer Corp", code="CUST-01", type="customer")
        self.shelf_a = Location.objects.create(name="Aisle 1 - Shelf A", code="WH/A1", type="internal", warehouse=self.wh)
        self.shelf_b = Location.objects.create(name="Aisle 1 - Shelf B", code="WH/B1", type="internal", warehouse=self.wh)
        self.adj_loc = Location.objects.create(name="Adjustment Virtual", code="VIRT/ADJ", type="adjustment")

        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(
            name="Wireless Barcode Scanner",
            sku="SCN-WL-01",
            category=self.category,
            uom="Units",
            reorder_level=10,
            price=Decimal("120.00")
        )

    def test_01_user_registration_and_login(self):
        # Register user
        reg_data = {
            "username": "tester",
            "email": "tester@stocksense.test",
            "password": "Password123!",
            "first_name": "Test",
            "last_name": "User"
        }
        res_reg = self.client.post("/api/auth/register/", reg_data)
        self.assertEqual(res_reg.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", res_reg.data)

        # Login
        res_login = self.client.post("/api/auth/login/", {"username": "tester", "password": "Password123!"})
        self.assertEqual(res_login.status_code, status.HTTP_200_OK)
        self.assertIn("access", res_login.data["tokens"])

    def test_02_receipt_incoming_stock(self):
        # Create draft receipt
        receipt_data = {
            "doc_type": "receipt",
            "product": self.product.id,
            "qty": "50.00",
            "from_location": self.vendor_loc.id,
            "to_location": self.shelf_a.id,
            "partner_name": "Logistics Vendor Inc",
            "status": "ready"
        }
        res = self.client.post("/api/moves/", receipt_data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        move_id = res.data["id"]

        # Validate receipt
        res_val = self.client.post(f"/api/moves/{move_id}/validate/")
        self.assertEqual(res_val.status_code, status.HTTP_200_OK)

        # Verify StockQuant increased at Shelf A
        quant = StockQuant.objects.get(product=self.product, location=self.shelf_a)
        self.assertEqual(quant.quantity, Decimal("50.00"))

    def test_03_internal_transfer(self):
        # Seed 50 units at Shelf A
        StockQuant.objects.create(product=self.product, location=self.shelf_a, quantity=Decimal("50.00"))

        # Transfer 20 units from Shelf A to Shelf B
        transfer_data = {
            "doc_type": "internal",
            "product": self.product.id,
            "qty": "20.00",
            "from_location": self.shelf_a.id,
            "to_location": self.shelf_b.id,
            "status": "ready"
        }
        res = self.client.post("/api/moves/", transfer_data)
        move_id = res.data["id"]

        # Validate transfer
        res_val = self.client.post(f"/api/moves/{move_id}/validate/")
        self.assertEqual(res_val.status_code, status.HTTP_200_OK)

        # Verify quantities
        quant_a = StockQuant.objects.get(product=self.product, location=self.shelf_a)
        quant_b = StockQuant.objects.get(product=self.product, location=self.shelf_b)
        self.assertEqual(quant_a.quantity, Decimal("30.00"))
        self.assertEqual(quant_b.quantity, Decimal("20.00"))

        # Total stock remains 50
        total = quant_a.quantity + quant_b.quantity
        self.assertEqual(total, Decimal("50.00"))

    def test_04_delivery_and_negative_stock_prevention(self):
        # Seed 10 units at Shelf A
        StockQuant.objects.create(product=self.product, location=self.shelf_a, quantity=Decimal("10.00"))

        # Try to deliver 15 units (exceeding stock)
        invalid_delivery = StockMove.objects.create(
            doc_type="delivery",
            product=self.product,
            qty=Decimal("15.00"),
            from_location=self.shelf_a,
            to_location=self.customer_loc,
            status="ready"
        )
        res_fail = self.client.post(f"/api/moves/{invalid_delivery.id}/validate/")
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient stock", res_fail.data["error"])

        # Deliver 8 units (valid)
        valid_delivery = StockMove.objects.create(
            doc_type="delivery",
            product=self.product,
            qty=Decimal("8.00"),
            from_location=self.shelf_a,
            to_location=self.customer_loc,
            status="ready"
        )
        res_ok = self.client.post(f"/api/moves/{valid_delivery.id}/validate/")
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)

        # Verify remaining stock is 2
        quant = StockQuant.objects.get(product=self.product, location=self.shelf_a)
        self.assertEqual(quant.quantity, Decimal("2.00"))

    def test_05_stock_adjustment(self):
        # Current stock = 100
        StockQuant.objects.create(product=self.product, location=self.shelf_a, quantity=Decimal("100.00"))

        # Physical count is 97 (3 units loss)
        res_adj = self.client.post("/api/adjustments/", {
            "product": self.product.id,
            "location": self.shelf_a.id,
            "counted_quantity": 97.00,
            "notes": "Damaged 3 units during handling"
        })
        self.assertEqual(res_adj.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_adj.data["discrepancy"], -3.00)

        # Verify new quant is 97
        quant = StockQuant.objects.get(product=self.product, location=self.shelf_a)
        self.assertEqual(quant.quantity, Decimal("97.00"))

    def test_06_dashboard_kpis(self):
        # Seed quants and moves
        StockQuant.objects.create(product=self.product, location=self.shelf_a, quantity=Decimal("5.00")) # low stock <= 10
        StockMove.objects.create(
            doc_type="receipt",
            product=self.product,
            qty=Decimal("10.00"),
            from_location=self.vendor_loc,
            to_location=self.shelf_a,
            status="ready"
        )
        res_kpi = self.client.get("/api/kpis/")
        self.assertEqual(res_kpi.status_code, status.HTTP_200_OK)
        self.assertEqual(res_kpi.data["total_products"], 1)
        self.assertEqual(res_kpi.data["low_stock_items"], 1)
        self.assertEqual(res_kpi.data["pending_receipts"], 1)
