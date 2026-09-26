from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Sum

from .models import StockMove, Product, Location, Category, StockQuant
from .serializers import (
    ProductSerializer, 
    StockMoveSerializer, 
    LocationSerializer, 
    CategorySerializer,
    StockQuantSerializer
)

# -------------------------------------------------------------------
# 1. Product APIs
# -------------------------------------------------------------------
@api_view(['GET', 'POST'])
def product_list(request):
    if request.method == 'GET':
        products = Product.objects.all()
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# -------------------------------------------------------------------
# 2. Stock Moves & Ledger APIs
# -------------------------------------------------------------------
@api_view(['GET', 'POST'])
def stock_move_list(request):
    if request.method == 'GET':
        # Supports dynamic filtering by doc_type and status
        doc_type = request.query_params.get('doc_type')
        doc_status = request.query_params.get('status')
        
        moves = StockMove.objects.all()
        if doc_type:
            moves = moves.filter(doc_type=doc_type)
        if doc_status:
            moves = moves.filter(status=doc_status)
            
        serializer = StockMoveSerializer(moves, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        serializer = StockMoveSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# -------------------------------------------------------------------
# 3. Stock Move Validation (Updates Actual Stock Balances)
# -------------------------------------------------------------------
@api_view(['POST'])
def validate_move(request, move_id):
    try:
        move = StockMove.objects.get(id=move_id)
    except StockMove.DoesNotExist:
        return Response({"error": "Move not found"}, status=status.HTTP_404_NOT_FOUND)
        
    if move.status == 'done':
        return Response({"error": "Move is already validated"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Use database transaction to update quantities safely
    with transaction.atomic():
        # Deduct quantity from source location (unless vendor or adjustment)
        if move.from_location.type != 'vendor':
            src_quant, _ = StockQuant.objects.get_or_create(
                product=move.product, 
                location=move.from_location
            )
            src_quant.quantity -= move.qty
            src_quant.save()

        # Add quantity to destination location (unless customer or adjustment)
        if move.to_location.type != 'customer':
            dest_quant, _ = StockQuant.objects.get_or_create(
                product=move.product, 
                location=move.to_location
            )
            dest_quant.quantity += move.qty
            dest_quant.save()

        # Mark movement state as DONE
        move.status = 'done'
        move.save()

    return Response({"message": "Stock Move validated and ledger updated successfully"})


# -------------------------------------------------------------------
# 4. Dashboard KPIs Endpoint
# -------------------------------------------------------------------
@api_view(['GET'])
def get_dashboard_kpis(request):
    total_products = Product.objects.count()
    pending_receipts = StockMove.objects.filter(doc_type='receipt', status__in=['draft', 'ready']).count()
    pending_deliveries = StockMove.objects.filter(doc_type='delivery', status__in=['draft', 'ready']).count()
    internal_transfers = StockMove.objects.filter(doc_type='internal', status__in=['draft', 'ready']).count()
    
    # Count products where total internal stock is at or below reorder level
    low_stock_count = 0
    products = Product.objects.all()
    for product in products:
        total_qty = StockQuant.objects.filter(
            product=product, 
            location__type='internal'
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        if total_qty <= product.reorder_level:
            low_stock_count += 1

    return Response({
        "total_products": total_products,
        "low_stock_items": low_stock_count,
        "pending_receipts": pending_receipts,
        "pending_deliveries": pending_deliveries,
        "internal_transfers_scheduled": internal_transfers,
    })


# -------------------------------------------------------------------
# 5. Metadata APIs (Locations & Categories)
# -------------------------------------------------------------------
@api_view(['GET'])
def location_list(request):
    locations = Location.objects.all()
    serializer = LocationSerializer(locations, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def category_list(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)