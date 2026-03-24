import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash

from app.config import Config
from app.utils.db import db, jwt
from app.models.user import User
from app.models.expense import ExpenseCategory


def seed_admin_and_categories():
    admin_email = "dhruvtandel8068@gmail.com"
    admin_password = "Dhruv@8068"

    existing = User.query.filter_by(email=admin_email).first()
    if not existing:
        admin = User(
            full_name="Admin",
            email=admin_email,
            password_hash=generate_password_hash(admin_password),
            role="admin",
            must_change_password=False,
        )
        db.session.add(admin)

    default_categories = [
        "Vegetables",
        "Groceries",
        "Milk",
        "Gas",
        "Cleaning",
        "Other",
    ]

    for name in default_categories:
        if not ExpenseCategory.query.filter_by(name=name).first():
            db.session.add(ExpenseCategory(name=name))

    db.session.commit()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Create upload folder
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                ]
            }
        },
        supports_credentials=True,
    )

    db.init_app(app)
    jwt.init_app(app)

    # Import routes here to avoid circular imports
    from app.routes.auth_routes import auth_bp
    from app.routes.user_routes import user_bp
    from app.routes.expense_routes import expense_bp
    from app.routes.report_routes import report_bp
    from app.routes.menu_routes import menu_bp
    from app.routes.inventory_routes import inventory_bp
    from app.routes.complaint_routes import complaint_bp
    from app.routes.notification_routes import notification_bp
    from app.routes.billing_routes import billing_bp

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api")
    app.register_blueprint(expense_bp, url_prefix="/api/expenses")
    app.register_blueprint(report_bp, url_prefix="/api/reports")
    app.register_blueprint(menu_bp, url_prefix="/api/menu")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(complaint_bp, url_prefix="/api/complaints")
    app.register_blueprint(notification_bp, url_prefix="/api/notifications")
    app.register_blueprint(billing_bp, url_prefix="/api/billing")

    @app.get("/api/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Create tables
    with app.app_context():
        from app.models.attendance import Attendance
        from app.models.bill import Bill
        from app.models.menu import MenuItem
        from app.models.inventory import Inventory
        from app.models.complaint import Complaint
        from app.models.notification import Notification
        from app.models.payment import Payment

        db.create_all()
        seed_admin_and_categories()

    return app