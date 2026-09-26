from rest_framework import serializers
from .models import Product, Location, StockMove, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'

class StockMoveSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMove
        fields = '__all__'