from flask import Blueprint, render_template, request

# Create a blueprint for the application
app_routes = Blueprint('app_routes', __name__)

@app_routes.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')  # Render the dashboard page

@app_routes.route('/sales')
def sales():
    return render_template('sales.html')  # Render the sales management page

@app_routes.route('/purchases')
def purchases():
    return render_template('purchases.html')  # Render the purchases management page

@app_routes.route('/debts')
def debts():
    return render_template('debts.html')  # Render the debts management page
