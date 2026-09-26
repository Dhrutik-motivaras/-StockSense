import random
import string
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q, F
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.tokens import RefreshToken


from .models import (
    Warehouse, Category, Location, Product, StockQuant, StockMove, PasswordResetOTP
)
from .serializers import (
    UserSerializer, RegisterSerializer, WarehouseSerializer, CategorySerializer,
    LocationSerializer, StockQuantSerializer, ProductSerializer, StockMoveSerializer
)

# -------------------------------------------------------------------
# 1. Authentication & User Profile Views
# -------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    # Support login via email or username
    user = None
    if '@' in username:
        try:
            user_obj = User.objects.get(email=username)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None
    else:
        user = authenticate(username=username, password=password)

    if not user:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'tokens': {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        },
        'message': 'Login successful'
    })

@api_view(['GET'])
def me_view(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(UserSerializer(request.user).data)

@api_view(['POST'])
@permission_classes([AllowAny])
def request_otp_view(request):
    identifier = request.data.get('identifier', '').strip()
    if not identifier:
        return Response({'error': 'Email or username is required'}, status=status.HTTP_400_BAD_REQUEST)

    user = None
    if '@' in identifier:
        user = User.objects.filter(email=identifier).first()
    else:
        user = User.objects.filter(username=identifier).first()

    if not user:
        return Response({'error': 'User not found with provided identifier'}, status=status.HTTP_404_NOT_FOUND)

    # Generate 6-digit OTP
    otp = ''.join(random.choices(string.digits, k=6))
    PasswordResetOTP.objects.create(user=user, otp=otp)

    # Log to server console for development demo
    print(f"\n==========================================")
    print(f" [StockSense AUTH] Password Reset OTP for {user.username}: {otp}")
    print(f"==========================================\n")

    return Response({
        'message': f'OTP sent successfully for {user.username}. (Check console for mock OTP)',
        'otp_preview': otp, # Sent for immediate hackathon testing convenience
        'username': user.username
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    username = request.data.get('username')
    otp = request.data.get('otp')
    new_password = request.data.get('new_password')

    if not all([username, otp, new_password]):
        return Response({'error': 'Username, OTP, and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(username=username).first()
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    otp_record = PasswordResetOTP.objects.filter(user=user, otp=otp, is_used=False).order_by('-created_at').first()
    if not otp_record:
        return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    otp_record.is_used = True
    otp_record.save()

    return Response({'message': 'Password has been reset successfully. You can now log in.'})


# -------------------------------------------------------------------
# 2. Warehouse APIs
# -------------------------------------------------------------------
@api_view(['GET', 'POST'])
def warehouse_list(request):
    if request.method == 'GET':
        warehouses = Warehouse.objects.all().order_by('name')
        return Response(WarehouseSerializer(warehouses, many=True).data)
    elif request.method == 'POST':
        serializer = WarehouseSerializer(data=request.data)
        if serializer.is_valid():
            wh = serializer.save()
            # Automatically create default Internal Location for new warehouse
            Location.objects.create(
                warehouse=wh,
                name=f"{wh.name} - Stock",
                code=f"{wh.code}/STOCK",
                type='internal'
            )
            return Response(WarehouseSerializer(wh).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def warehouse_detail(request, pk):
    try:
        warehouse = Warehouse.objects.get(pk=pk)
    except Warehouse.DoesNotExist:
        return Response({'error': 'Warehouse not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(WarehouseSerializer(warehouse).data)
    elif request.method == 'PUT':
        serializer = WarehouseSerializer(warehouse, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        warehouse.delete()
        return Response({'message': 'Warehouse deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


# -------------------------------------------------------------------
# 3. Category APIs
# -------------------------------------------------------------------
@api_view(['GET', 'POST'])
def category_list(request):
    if request.method == 'GET':
        categories = Category.objects.all().order_by('name')
        return Response(CategorySerializer(categories, many=True).data)
    elif request.method == 'POST':
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def category_detail(request, pk):
    try:
        category = Category.objects.get(pk=pk)
    except Category.DoesNotExist:
        return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(CategorySerializer(category).data)
    elif request.method == 'PUT':
        serializer = CategorySerializer(category, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        category.delete()
        return Response({'message': 'Category deleted'}, status=status.HTTP_204_NO_CONTENT)


# -------------------------------------------------------------------
# 4. Location APIs
# -------------------------------------------------------------------
@api_view(['GET', 'POST'])
def location_list(request):
    if request.method == 'GET':
        locations = Location.objects.all().select_related('warehouse').order_by('type', 'name')
        
        loc_type = request.query_params.get('type')
        wh_id = request.query_params.get('warehouse')
        if loc_type:
            locations = locations.filter(type=loc_type)
        if wh_id:
            locations = locations.filter(warehouse_id=wh_id)

        serializer = LocationSerializer(locations, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = LocationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def location_detail(request, pk):
    try:
        loc = Location.objects.get(pk=pk)
    except Location.DoesNotExist:
        return Response({'error': 'Location not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(LocationSerializer(loc).data)
    elif request.method == 'PUT':
        serializer = LocationSerializer(loc, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        loc.delete()
        return Response({'message': 'Location deleted'}, status=status.HTTP_204_NO_CONTENT)


# -------------------------------------------------------------------
# 5. Product Management APIs
# -------------------------------------------------------------------
@api_view(['GET', 'POST'])
def product_list(request):
    if request.method == 'GET':
        products = Product.objects.all().select_related('category').prefetch_related('quants__location').order_by('name')
        
        # Search filter
        query = request.query_params.get('q')
        category_id = request.query_params.get('category')
        low_stock_only = request.query_params.get('low_stock')

        if query:
            products = products.filter(Q(name__icontains=query) | Q(sku__icontains=query))
        if category_id:
            products = products.filter(category_id=category_id)

        serializer = ProductSerializer(products, many=True)
        data = serializer.data

        if low_stock_only == 'true':
            data = [p for p in data if p['is_low_stock']]

        return Response(data)
        
    elif request.method == 'POST':
        serializer = ProductSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            product = serializer.save()
            return Response(
                ProductSerializer(
                    product,
                    context={'request': request}
                ).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def product_detail(request, pk):
    try:
        product = Product.objects.select_related('category').prefetch_related('quants__location').get(pk=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ProductSerializer(product).data)
    elif request.method == 'PUT':
        serializer = ProductSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        product.delete()
        return Response({'message': 'Product deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


# -------------------------------------------------------------------
# 6. Stock Quants API
# -------------------------------------------------------------------
@api_view(['GET'])
def stock_quant_list(request):
    quants = StockQuant.objects.all().select_related('product', 'location').order_by('product__name')
    
    product_id = request.query_params.get('product')
    location_id = request.query_params.get('location')
    location_type = request.query_params.get('location_type')
    
    if product_id:
        quants = quants.filter(product_id=product_id)
    if location_id:
        quants = quants.filter(location_id=location_id)
    if location_type:
        quants = quants.filter(location__type=location_type)

    serializer = StockQuantSerializer(quants, many=True)
    return Response(serializer.data)


# -------------------------------------------------------------------
# 7. Stock Move & Ledger APIs
# -------------------------------------------------------------------
@api_view(['GET', 'POST'])
def stock_move_list(request):
    if request.method == 'GET':
        moves = StockMove.objects.all().select_related(
            'product', 'from_location', 'to_location', 'created_by'
        ).order_by('-created_at')
        
        # Filtering parameters
        doc_type = request.query_params.get('doc_type')
        doc_status = request.query_params.get('status')
        product_id = request.query_params.get('product')
        location_id = request.query_params.get('location')
        search = request.query_params.get('q')

        if doc_type:
            moves = moves.filter(doc_type=doc_type)
        if doc_status:
            moves = moves.filter(status=doc_status)
        if product_id:
            moves = moves.filter(product_id=product_id)
        if location_id:
            moves = moves.filter(Q(from_location_id=location_id) | Q(to_location_id=location_id))
        if search:
            moves = moves.filter(
                Q(reference__icontains=search) | 
                Q(product__name__icontains=search) | 
                Q(product__sku__icontains=search) |
                Q(partner_name__icontains=search)
            )

        serializer = StockMoveSerializer(moves, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        data = request.data.copy()
        if request.user.is_authenticated:
            data['created_by'] = request.user.id

        serializer = StockMoveSerializer(data=data)
        if serializer.is_valid():
            move = serializer.save()

            # If user chose to validate immediately upon creation
            if request.data.get('auto_validate') is True:
                validation_res = execute_move_validation(move)
                if validation_res is not True:
                    return Response({'error': validation_res}, status=status.HTTP_400_BAD_REQUEST)

            return Response(StockMoveSerializer(move).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def execute_move_validation(move):
    """
    Executes a stock move atomically with negative stock protection.
    Returns True on success, or an error string on failure.
    """
    if move.status == 'done':
        return "Move is already validated."
    if move.status == 'canceled':
        return "Cannot validate a canceled move."
    if move.qty <= 0:
        return "Movement quantity must be greater than zero."

    with transaction.atomic():
        # Check source stock if moving out of an internal location
        if move.from_location.type == 'internal':
            src_quant, _ = StockQuant.objects.select_for_update().get_or_create(
                product=move.product,
                location=move.from_location,
                defaults={'quantity': Decimal('0.00')}
            )
            if src_quant.quantity < move.qty:
                return (
                    f"Insufficient stock for '{move.product.name}' at '{move.from_location.name}'. "
                    f"Available: {src_quant.quantity} {move.product.uom}, Requested: {move.qty} {move.product.uom}"
                )
            src_quant.quantity -= move.qty
            src_quant.save()

        # Add to destination if moving into an internal location
        if move.to_location.type == 'internal':
            dest_quant, _ = StockQuant.objects.select_for_update().get_or_create(
                product=move.product,
                location=move.to_location,
                defaults={'quantity': Decimal('0.00')}
            )
            dest_quant.quantity += move.qty
            dest_quant.save()

        move.status = 'done'
        move.save()

    return True


@api_view(['POST'])
def validate_move(request, move_id):
    try:
        move = StockMove.objects.get(id=move_id)
    except StockMove.DoesNotExist:
        return Response({"error": "Move not found"}, status=status.HTTP_404_NOT_FOUND)
        
    result = execute_move_validation(move)
    if result is True:
        return Response({
            "message": f"Stock move {move.reference} validated successfully!",
            "move": StockMoveSerializer(move).data
        })
    else:
        return Response({"error": result}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def cancel_move(request, move_id):
    try:
        move = StockMove.objects.get(id=move_id)
    except StockMove.DoesNotExist:
        return Response({"error": "Move not found"}, status=status.HTTP_404_NOT_FOUND)

    if move.status == 'done':
        return Response({"error": "Cannot cancel a move that is already completed/done"}, status=status.HTTP_400_BAD_REQUEST)

    move.status = 'canceled'
    move.save()
    return Response({"message": f"Move {move.reference} canceled successfully", "move": StockMoveSerializer(move).data})


# -------------------------------------------------------------------
# 8. Dedicated Stock Adjustments API (Counted Quantity Workflow)
# -------------------------------------------------------------------
@api_view(['POST'])
def create_stock_adjustment(request):
    """
    Odoo-style stock adjustment:
    Receives product_id, location_id, and counted_quantity.
    Calculates discrepancy and auto-creates/validates the adjustment move.
    """
    product_id = request.data.get('product')
    location_id = request.data.get('location')
    counted_qty_raw = request.data.get('counted_quantity')
    notes = request.data.get('notes', 'Physical inventory count adjustment')

    if not all([product_id, location_id, counted_qty_raw is not None]):
        return Response({'error': 'product, location, and counted_quantity are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        product = Product.objects.get(pk=product_id)
        location = Location.objects.get(pk=location_id)
        counted_qty = Decimal(str(counted_qty_raw))
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    if counted_qty < 0:
        return Response({'error': 'Counted physical quantity cannot be negative'}, status=status.HTTP_400_BAD_REQUEST)

    # Get virtual adjustment location
    adj_location, _ = Location.objects.get_or_create(
        type='adjustment',
        defaults={'name': 'Inventory Adjustment Virtual', 'code': 'VIRT/ADJ'}
    )

    with transaction.atomic():
        quant, _ = StockQuant.objects.select_for_update().get_or_create(
            product=product,
            location=location,
            defaults={'quantity': Decimal('0.00')}
        )
        current_qty = quant.quantity
        diff = counted_qty - current_qty

        if diff == 0:
            return Response({
                'message': f"Counted quantity matches recorded quantity ({current_qty} {product.uom}). No adjustment needed.",
                'discrepancy': 0,
                'current_stock': float(current_qty)
            })

        if diff > 0:
            # Physical count is higher -> Increase stock (from Virtual Adjustment to Location)
            move = StockMove.objects.create(
                doc_type='adjustment',
                product=product,
                qty=diff,
                from_location=adj_location,
                to_location=location,
                status='done',
                partner_name='Inventory Count Gain',
                created_by=request.user if request.user.is_authenticated else None,
                notes=f"Stock gain: Physical count {counted_qty}, System had {current_qty}. {notes}"
            )
            quant.quantity = counted_qty
            quant.save()
        else:
            # Physical count is lower -> Decrease stock (from Location to Virtual Adjustment)
            diff_abs = abs(diff)
            move = StockMove.objects.create(
                doc_type='adjustment',
                product=product,
                qty=diff_abs,
                from_location=location,
                to_location=adj_location,
                status='done',
                partner_name='Inventory Count Loss/Shrinkage',
                created_by=request.user if request.user.is_authenticated else None,
                notes=f"Stock loss: Physical count {counted_qty}, System had {current_qty}. {notes}"
            )
            quant.quantity = counted_qty
            quant.save()

    return Response({
        'message': f"Stock adjusted successfully for {product.name} at {location.name} to {counted_qty} {product.uom}",
        'previous_quantity': float(current_qty),
        'new_quantity': float(counted_qty),
        'discrepancy': float(diff),
        'move': StockMoveSerializer(move).data
    }, status=status.HTTP_201_CREATED)


# -------------------------------------------------------------------
# 9. Dashboard KPIs Endpoint with Dynamic Global Filters
# -------------------------------------------------------------------
@api_view(['GET'])
def get_dashboard_kpis(request):
    doc_type = request.query_params.get('doc_type')
    status_filter = request.query_params.get('status')
    warehouse_id = request.query_params.get('warehouse')
    location_id = request.query_params.get('location')
    category_id = request.query_params.get('category')

    # Base queries
    moves = StockMove.objects.all()
    products = Product.objects.all()

    if category_id:
        products = products.filter(category_id=category_id)
        moves = moves.filter(product__category_id=category_id)

    if warehouse_id:
        moves = moves.filter(Q(from_location__warehouse_id=warehouse_id) | Q(to_location__warehouse_id=warehouse_id))

    if location_id:
        moves = moves.filter(Q(from_location_id=location_id) | Q(to_location_id=location_id))

    if doc_type:
        moves = moves.filter(doc_type=doc_type)

    if status_filter:
        moves = moves.filter(status=status_filter)

    # Calculate pending operations
    pending_receipts = StockMove.objects.filter(doc_type='receipt', status__in=['draft', 'waiting', 'ready'])
    pending_deliveries = StockMove.objects.filter(doc_type='delivery', status__in=['draft', 'waiting', 'ready'])
    internal_transfers = StockMove.objects.filter(doc_type='internal', status__in=['draft', 'waiting', 'ready'])

    if warehouse_id:
        pending_receipts = pending_receipts.filter(to_location__warehouse_id=warehouse_id)
        pending_deliveries = pending_deliveries.filter(from_location__warehouse_id=warehouse_id)
        internal_transfers = internal_transfers.filter(from_location__warehouse_id=warehouse_id)

    # Product stock summary
    total_products = products.count()
    
    # In stock / low stock calculation
    low_stock_count = 0
    in_stock_count = 0
    out_of_stock_count = 0

    product_quants = StockQuant.objects.filter(location__type='internal')
    if warehouse_id:
        product_quants = product_quants.filter(location__warehouse_id=warehouse_id)
    if location_id:
        product_quants = product_quants.filter(location_id=location_id)

    for p in products:
        qty = product_quants.filter(product=p).aggregate(total=Sum('quantity'))['total'] or Decimal('0.00')
        if qty > 0:
            in_stock_count += 1
        else:
            out_of_stock_count += 1

        if qty <= p.reorder_level:
            low_stock_count += 1

    # Recent 6 movements for dashboard preview
    recent_moves = moves.select_related('product', 'from_location', 'to_location').order_by('-created_at')[:6]

    return Response({
        "total_products": total_products,
        "in_stock_products": in_stock_count,
        "out_of_stock_products": out_of_stock_count,
        "low_stock_items": low_stock_count,
        "pending_receipts": pending_receipts.count(),
        "pending_deliveries": pending_deliveries.count(),
        "internal_transfers_scheduled": internal_transfers.count(),
        "recent_moves": StockMoveSerializer(recent_moves, many=True).data
    })


# -------------------------------------------------------------------
# 10. Database Seed API for Instant Hackathon Demonstration
# -------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def seed_demo_data(request):
    """
    Populates full initial setup for Odoo Hackathon judges:
    - Warehouses (Main Warehouse, Secondary Hub)
    - Locations (Vendor, Customer, Main Store, Rack A, Rack B, Production)
    - Categories (Raw Materials, Electronics, Furniture, Consumables)
    - Products with initial stock & quants
    - Sample Receipts, Transfers, and Deliveries
    """
    with transaction.atomic():
        # 1. Warehouses
        wh1, _ = Warehouse.objects.get_or_create(
            code='WH1',
            defaults={'name': 'Main Central Warehouse', 'address': 'Building A, Industrial Area, Sector 5'}
        )
        wh2, _ = Warehouse.objects.get_or_create(
            code='WH2',
            defaults={'name': 'Production & Assembly Plant', 'address': 'Building B, Technopark'}
        )

        # 2. Locations
        loc_vendor, _ = Location.objects.get_or_create(
            type='vendor',
            defaults={'name': 'Partner Vendors (Suppliers)', 'code': 'VEND/SUPPLIER'}
        )
        loc_customer, _ = Location.objects.get_or_create(
            type='customer',
            defaults={'name': 'Partner Customers (Outbound)', 'code': 'CUST/CLIENTS'}
        )
        loc_adj, _ = Location.objects.get_or_create(
            type='adjustment',
            defaults={'name': 'Inventory Adjustment (Virtual Loss/Gain)', 'code': 'VIRT/ADJ'}
        )

        # Physical internal locations
        loc_stock, _ = Location.objects.get_or_create(
            code='WH1/STOCK',
            defaults={'name': 'Main Store Shelves', 'warehouse': wh1, 'type': 'internal'}
        )
        loc_rack_a, _ = Location.objects.get_or_create(
            code='WH1/RACK-A',
            defaults={'name': 'Storage Rack A', 'warehouse': wh1, 'type': 'internal'}
        )
        loc_rack_b, _ = Location.objects.get_or_create(
            code='WH1/RACK-B',
            defaults={'name': 'Storage Rack B', 'warehouse': wh1, 'type': 'internal'}
        )
        loc_prod, _ = Location.objects.get_or_create(
            code='WH2/PROD',
            defaults={'name': 'Production Floor Rack', 'warehouse': wh2, 'type': 'internal'}
        )

        # 3. Categories
        cat_raw, _ = Category.objects.get_or_create(name='Raw Materials')
        cat_furn, _ = Category.objects.get_or_create(name='Office Furniture')
        cat_elec, _ = Category.objects.get_or_create(name='Electronics & Hardware')
        cat_pkg, _ = Category.objects.get_or_create(name='Packaging & Boxes')

        # 4. Products
        demo_products = [
            {
                'name': 'High-Tensile Steel Rods',
                'sku': 'STL-ROD-01',
                'category': cat_raw,
                'uom': 'kg',
                'reorder_level': 50,
                'price': Decimal('45.00'),
                'description': 'Industrial grade steel rods for heavy construction',
                'initial_qty': Decimal('150.00'),
                'loc': loc_stock
            },
            {
                'name': 'Ergonomic Executive Chair',
                'sku': 'CHR-ERG-90',
                'category': cat_furn,
                'uom': 'Units',
                'reorder_level': 10,
                'price': Decimal('180.00'),
                'description': 'Mesh high-back swivel chair with lumbar support',
                'initial_qty': Decimal('25.00'),
                'loc': loc_stock
            },
            {
                'name': 'Aluminum Extrusion Bar (2m)',
                'sku': 'ALU-EXT-2M',
                'category': cat_raw,
                'uom': 'Units',
                'reorder_level': 30,
                'price': Decimal('22.50'),
                'description': 'Anodized 2020 T-slot aluminum frame rails',
                'initial_qty': Decimal('8.00'), # Intentionally low stock for KPI demo
                'loc': loc_rack_a
            },
            {
                'name': 'IoT Smart Sensor Hub v2',
                'sku': 'IOT-HUB-02',
                'category': cat_elec,
                'uom': 'Units',
                'reorder_level': 15,
                'price': Decimal('95.00'),
                'description': 'LoRaWAN and WiFi telemetry sensor controller',
                'initial_qty': Decimal('40.00'),
                'loc': loc_rack_b
            },
            {
                'name': 'Cardboard Shipping Box (Large)',
                'sku': 'BOX-SHP-LG',
                'category': cat_pkg,
                'uom': 'Units',
                'reorder_level': 100,
                'price': Decimal('2.20'),
                'description': 'Heavy-duty 5-ply corrugated carton',
                'initial_qty': Decimal('250.00'),
                'loc': loc_stock
            },
        ]

        for p_data in demo_products:
            prod, _ = Product.objects.get_or_create(
                sku=p_data['sku'],
                defaults={
                    'name': p_data['name'],
                    'category': p_data['category'],
                    'uom': p_data['uom'],
                    'reorder_level': p_data['reorder_level'],
                    'price': p_data['price'],
                    'description': p_data['description'],
                }
            )

            # Update quant
            quant, _ = StockQuant.objects.get_or_create(
                product=prod,
                location=p_data['loc'],
                defaults={'quantity': Decimal('0.00')}
            )
            if quant.quantity == 0:
                quant.quantity = p_data['initial_qty']
                quant.save()

                # Record an initial incoming receipt move
                StockMove.objects.get_or_create(
                    product=prod,
                    doc_type='receipt',
                    status='done',
                    from_location=loc_vendor,
                    to_location=p_data['loc'],
                    qty=p_data['initial_qty'],
                    defaults={
                        'partner_name': 'Premier Industrial Supplies Ltd',
                        'notes': 'Initial opening stock intake'
                    }
                )

        # 5. Add a pending receipt and pending delivery to showcase dashboard KPIs
        prod_chair = Product.objects.get(sku='CHR-ERG-90')
        StockMove.objects.get_or_create(
            reference='WH/IN/0099',
            defaults={
                'doc_type': 'receipt',
                'product': prod_chair,
                'qty': Decimal('15.00'),
                'from_location': loc_vendor,
                'to_location': loc_stock,
                'status': 'ready',
                'partner_name': 'Global Furniture Logistics',
                'notes': 'Pending delivery arriving this afternoon'
            }
        )

        StockMove.objects.get_or_create(
            reference='WH/OUT/0088',
            defaults={
                'doc_type': 'delivery',
                'product': prod_chair,
                'qty': Decimal('5.00'),
                'from_location': loc_stock,
                'to_location': loc_customer,
                'status': 'ready',
                'partner_name': 'Apex Corporate Offices',
                'notes': 'Sales order #SO-2026-91'
            }
        )

        StockMove.objects.get_or_create(
            reference='WH/INT/0077',
            defaults={
                'doc_type': 'internal',
                'product': Product.objects.get(sku='STL-ROD-01'),
                'qty': Decimal('20.00'),
                'from_location': loc_stock,
                'to_location': loc_prod,
                'status': 'ready',
                'partner_name': 'Internal Production Transfer',
                'notes': 'Staging material for Line 3 assembly'
            }
        )

    return Response({
        'message': 'Demo database seeded successfully with Warehouses, Locations, Products, Stock Quants, and Moves!',
        'warehouses': Warehouse.objects.count(),
        'locations': Location.objects.count(),
        'categories': Category.objects.count(),
        'products': Product.objects.count(),
        'stock_moves': StockMove.objects.count(),
    })