from django.urls import path
from . import views

urlpatterns = [
    # Authentication & User
    path('auth/register/', views.register_view, name='auth-register'),
    path('auth/login/', views.login_view, name='auth-login'),
    path('auth/me/', views.me_view, name='auth-me'),
    path('auth/request-otp/', views.request_otp_view, name='auth-request-otp'),
    path('auth/reset-password/', views.reset_password_view, name='auth-reset-password'),

    # Products & Categories
    path('products/', views.product_list, name='product-list'),
    path('products/<int:pk>/', views.product_detail, name='product-detail'),
    path('categories/', views.category_list, name='category-list'),
    path('categories/<int:pk>/', views.category_detail, name='category-detail'),

    # Warehouses & Locations
    path('warehouses/', views.warehouse_list, name='warehouse-list'),
    path('warehouses/<int:pk>/', views.warehouse_detail, name='warehouse-detail'),
    path('locations/', views.location_list, name='location-list'),
    path('locations/<int:pk>/', views.location_detail, name='location-detail'),

    # Stock Quants & Double-Entry Ledger Moves
    path('quants/', views.stock_quant_list, name='stock-quants'),
    path('moves/', views.stock_move_list, name='move-list'),
    path('moves/<int:move_id>/validate/', views.validate_move, name='validate-move'),
    path('moves/<int:move_id>/cancel/', views.cancel_move, name='cancel-move'),
    
    # Adjustments
    path('adjustments/', views.create_stock_adjustment, name='create-adjustment'),

    # Dashboard KPIs
    path('kpis/', views.get_dashboard_kpis, name='dashboard-kpis'),

    # Instant Demo Seeder for Judges
    path('seed/', views.seed_demo_data, name='seed-demo-data'),
]