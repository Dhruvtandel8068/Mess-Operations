import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "mess-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "mess-jwt-secret-key")

    MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DB = os.getenv("MYSQL_DB", "mess_db")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{quote_plus(MYSQL_PASSWORD)}"
        f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")

    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "dhruvtandel8068@gmail.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Dhruv@8068")

    # Auto bill generation settings
    AUTO_BILL_ENABLED = os.getenv("AUTO_BILL_ENABLED", "true").lower() == "true"
    AUTO_BILL_RUN_HOUR = int(os.getenv("AUTO_BILL_RUN_HOUR", "2"))
    AUTO_BILL_RUN_MINUTE = int(os.getenv("AUTO_BILL_RUN_MINUTE", "15"))
    AUTO_BILL_WINDOW_DAYS = int(os.getenv("AUTO_BILL_WINDOW_DAYS", "5"))

    # Mail settings
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
    MAIL_USE_SSL = False
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER")