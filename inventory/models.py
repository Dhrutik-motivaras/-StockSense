from django.db import models
from django.contrib.auth.models import User

# 1. Warehouse Model
class Warehouse(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    address = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.name} ({self.code})"

# 2. Product Category Model
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

# 3. Product Model (Matches Odoo specifications)
class Product(models.Model):
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, unique=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    uom = models.CharField(max_length=50, default="Units")  # Unit of Measure
    reorder_level = models.IntegerField(default=10) # Reordering rule
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.name} ({self.sku})"

# 4. Location Model (Warehouses, Racks, Customers, Vendors)
class Location(models.Model):
    LOCATION_TYPES = [
        ('vendor', 'Vendor Location'),
        ('internal', 'Internal Location'),
        ('customer', 'Customer Location'),
        ('adjustment', 'Inventory Adjustment'),
    ]
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, null=True, blank=True, related_name='locations')
    name = models.CharField(max_length=100) # e.g., Main Store, Rack A, Production Floor
    code = models.CharField(max_length=50, blank=True, default='')
    type = models.CharField(max_length=20, choices=LOCATION_TYPES)

    def __str__(self):
        return f"{self.name} [{self.type}]"

# 5. Stock Quant (Tracks actual stock quantity available in each specific location)
class StockQuant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='quants')
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='quants')
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ('product', 'location')

    def __str__(self):
        return f"{self.product.name} at {self.location.name}: {self.quantity}"

# 6. Stock Move Ledger Model (Receipts, Deliveries, Transfers, Adjustments)
class StockMove(models.Model):
    DOC_TYPES = [
        ('receipt', 'Receipt'), # Incoming
        ('delivery', 'Delivery Order'), # Outgoing
        ('internal', 'Internal Transfer'), # Internal
        ('adjustment', 'Stock Adjustment'), # Adjustment
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('waiting', 'Waiting'),
        ('ready', 'Ready'),
        ('done', 'Done'),
        ('canceled', 'Canceled'),
    ]
    
    reference = models.CharField(max_length=50, blank=True, default='')
    doc_type = models.CharField(max_length=20, choices=DOC_TYPES)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_moves')
    qty = models.DecimalField(max_digits=10, decimal_places=2)
    from_location = models.ForeignKey(Location, related_name='moves_from', on_delete=models.CASCADE)
    to_location = models.ForeignKey(Location, related_name='moves_to', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    partner_name = models.CharField(max_length=150, blank=True, default='') # Supplier or Customer
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_moves')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.reference:
            prefix_map = {
                'receipt': 'WH/IN',
                'delivery': 'WH/OUT',
                'internal': 'WH/INT',
                'adjustment': 'WH/ADJ',
            }
            prefix = prefix_map.get(self.doc_type, 'WH/MOV')
            # Generate reference ID
            count = StockMove.objects.filter(doc_type=self.doc_type).count() + 1
            self.reference = f"{prefix}/{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} - {self.doc_type.upper()} - {self.product.name} ({self.qty})"

# 7. Password Reset OTP Model
class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_otps')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"OTP for {self.user.username} - {self.otp}"