

# Register your models here.
from django.contrib import admin
from .models import Warehouse, Category, Location, Product, StockMove, StockQuant, PasswordResetOTP

admin.site.register(Warehouse)
admin.site.register(Category)
admin.site.register(Location)
admin.site.register(Product)
admin.site.register(StockMove)
admin.site.register(StockQuant)
admin.site.register(PasswordResetOTP)