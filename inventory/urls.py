from django.urls import path
from . import views

urlpatterns = [
    path('products/', views.product_list, name='product-list'),
    path('moves/', views.stock_move_list, name='move-list'),
    path('moves/<int:move_id>/validate/', views.validate_move, name='validate-move'),
    path('kpis/', views.get_dashboard_kpis, name='dashboard-kpis'),
    path('locations/', views.location_list, name='location-list'),
    path('categories/', views.category_list, name='category-list'),
]