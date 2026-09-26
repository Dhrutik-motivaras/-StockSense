from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Sum
from .models import Warehouse, Category, Location, Product, StockQuant, StockMove, PasswordResetOTP

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

class WarehouseSerializer(serializers.ModelSerializer):
    location_count = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'code', 'address', 'location_count']

    def get_location_count(self, obj):
        return obj.locations.count()

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'product_count']

    def get_product_count(self, obj):
        return obj.products.count()

class LocationSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True, default='')
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True, default='')

    class Meta:
        model = Location
        fields = ['id', 'name', 'code', 'type', 'warehouse', 'warehouse_name', 'warehouse_code']

class StockQuantSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_uom = serializers.CharField(source='product.uom', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    location_type = serializers.CharField(source='location.type', read_only=True)

    class Meta:
        model = StockQuant
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'product_uom',
            'location', 'location_name', 'location_type', 'quantity'
        ]

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    total_stock = serializers.SerializerMethodField()
    stock_by_location = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()
    # write‑only fields for initial stock handling (not persisted on Product)
    initial_stock = serializers.CharField(write_only=True, required=False, allow_blank=True)
    initial_location = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'category', 'category_name', 'uom',
            'reorder_level', 'description', 'price', 'total_stock',
            'stock_by_location', 'is_low_stock', 'initial_stock', 'initial_location'
        ]

    def get_total_stock(self, obj):
        res = obj.quants.filter(location__type='internal').aggregate(total=Sum('quantity'))['total']
        return float(res) if res is not None else 0.0

    def get_is_low_stock(self, obj):
        total = self.get_total_stock(obj)
        return total <= obj.reorder_level

    def get_stock_by_location(self, obj):
        return [
            {
                'location_id': q.location.id,
                'location_name': q.location.name,
                'location_code': q.location.code,
                'location_type': q.location.type,
                'quantity': float(q.quantity)
            }
            for q in obj.quants.all()
        ]

    def create(self, validated_data):
        # Pop write-only fields before they reach Product.objects.create()
        initial_stock_raw = validated_data.pop('initial_stock', None)
        initial_location_id = validated_data.pop('initial_location', None)

        with transaction.atomic():
            product = Product.objects.create(**validated_data)

            # Optionally seed opening stock balance
            try:
                initial_qty = Decimal(str(initial_stock_raw)) if initial_stock_raw else Decimal('0')
            except Exception:
                initial_qty = Decimal('0')

            if initial_qty > 0 and initial_location_id:
                to_loc = Location.objects.filter(id=initial_location_id, type='internal').first()
                if to_loc:
                    adj_loc, _ = Location.objects.get_or_create(
                        type='adjustment',
                        defaults={'name': 'Inventory Adjustment Virtual', 'code': 'VIRT/ADJ'}
                    )
                    request = self.context.get('request')
                    StockMove.objects.create(
                        doc_type='receipt',
                        product=product,
                        qty=initial_qty,
                        from_location=adj_loc,
                        to_location=to_loc,
                        status='done',
                        partner_name='Initial Stock Setup',
                        created_by=request.user if request and request.user.is_authenticated else None,
                        notes='Initial inventory opening balance',
                    )
                    quant, _ = StockQuant.objects.get_or_create(product=product, location=to_loc)
                    quant.quantity += initial_qty
                    quant.save()

        return product

class StockMoveSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_uom = serializers.CharField(source='product.uom', read_only=True)
    from_location_name = serializers.CharField(source='from_location.name', read_only=True)
    from_location_type = serializers.CharField(source='from_location.type', read_only=True)
    to_location_name = serializers.CharField(source='to_location.name', read_only=True)
    to_location_type = serializers.CharField(source='to_location.type', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, default='')

    class Meta:
        model = StockMove
        fields = [
            'id', 'reference', 'doc_type', 'product', 'product_name', 'product_sku', 'product_uom',
            'qty', 'from_location', 'from_location_name', 'from_location_type',
            'to_location', 'to_location_name', 'to_location_type',
            'status', 'partner_name', 'created_by', 'created_by_name',
            'notes', 'created_at'
        ]
        read_only_fields = ['reference', 'created_at']