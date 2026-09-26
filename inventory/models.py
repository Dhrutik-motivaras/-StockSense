from django.db import models
from django.contrib.auth.models import User

# 1. Product Category Model
class Category(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

# 2. Product Model (Matches Odoo specifications)
class Product(models.Model):
    name = models.CharField(max_length=200) #
    sku = models.CharField(max_length=100, unique=True) #[cite: 1]
    category = models.ForeignKey(Category, on_delete=models.CASCADE) #[cite: 1]
    uom = models.CharField(max_length=50, default="Units")  # Unit of Measure[cite: 1]
    reorder_level = models.IntegerField(default=10) # Reordering rule[cite: 1]

    def __str__(self):
        return f"{self.name} ({self.sku})"

# 3. Location Model (Warehouses, Racks, Customers, Vendors)
class Location(models.Model):
    LOCATION_TYPES = [
        ('vendor', 'Vendor Location'), #[cite: 1]
        ('internal', 'Internal Location'), #[cite: 1]
        ('customer', 'Customer Location'), #[cite: 1]
        ('adjustment', 'Inventory Adjustment'), #[cite: 1]
    ]
    name = models.CharField(max_length=100) # e.g., Main Store, Rack A, Production Floor[cite: 1]
    type = models.CharField(max_length=20, choices=LOCATION_TYPES)

    def __str__(self):
        return f"{self.name} [{self.type}]"

# 4. Stock Quant (Tracks actual stock quantity available in each specific location)
class StockQuant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) #[cite: 1]

    class Meta:
        unique_together = ('product', 'location')

    def __str__(self):
        return f"{self.product.name} at {self.location.name}: {self.quantity}"

# 5. Stock Move Ledger Model (Receipts, Deliveries, Transfers, Adjustments)
class StockMove(models.Model):
    DOC_TYPES = [
        ('receipt', 'Receipt'), # Incoming[cite: 1]
        ('delivery', 'Delivery Order'), # Outgoing[cite: 1]
        ('internal', 'Internal Transfer'), # Internal[cite: 1]
        ('adjustment', 'Stock Adjustment'), # Adjustment[cite: 1]
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'), #[cite: 1]
        ('ready', 'Ready'), #[cite: 1]
        ('done', 'Done'), #[cite: 1]
        ('canceled', 'Canceled'), #[cite: 1]
    ]
    
    doc_type = models.CharField(max_length=20, choices=DOC_TYPES) #[cite: 1]
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    qty = models.DecimalField(max_digits=10, decimal_places=2) #[cite: 1]
    from_location = models.ForeignKey(Location, related_name='moves_from', on_delete=models.CASCADE) #[cite: 1]
    to_location = models.ForeignKey(Location, related_name='moves_to', on_delete=models.CASCADE) #[cite: 1]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft') #[cite: 1]
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.doc_type.upper()} - {self.product.name} ({self.qty})"