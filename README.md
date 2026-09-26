# StockSense — Modular Inventory Management System

StockSense is an Odoo-inspired Inventory Management System (IMS) built to digitize warehouse operations, stock movements, and real-time ledger tracking[cite: 1].

## 🚀 Tech Stack
- **Backend:** Python (Django, Django REST Framework)
- **Frontend:** React.js (Vite, React Router, Axios)
- **Database:** PostgreSQL / SQLite
- **Architecture:** Double-entry stock transaction ledger

## 🛠️ Features
- **Dashboard KPIs:** Real-time tracking of total products, low stock items, pending receipts, and pending deliveries[cite: 1].
- **Product Management:** Dynamic creation and categorization of products with custom reorder levels[cite: 1].
- **Operations Engine:** Process receipts, delivery orders, internal transfers, and stock adjustments[cite: 1].
- **Automated Ledger:** Stock quant updates per location when operations are validated[cite: 1].

## 🏁 How to Run Locally

### Backend Setup
```bash
# Navigate to backend directory
cd stocksense-backend

# Install dependencies & migrate DB
pip install -r requirements.txt
python manage.py migrate

# Run server
python manage.py runserver