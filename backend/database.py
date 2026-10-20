import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "platform.db")
DATABASE_URL = os.environ.get("DATABASE_URL") or f"sqlite:///{DB_PATH}"

# Connection arguments for UTF-8 standardization across SQLite, PostgreSQL, and MySQL
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
elif DATABASE_URL.startswith(("postgresql", "postgres")):
    connect_args["client_encoding"] = "utf8"
elif DATABASE_URL.startswith("mysql"):
    connect_args["charset"] = "utf8mb4"

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA encoding = 'UTF-8'")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

try:
    from mojibake_guard import setup_sqlalchemy_mojibake_guard
    setup_sqlalchemy_mojibake_guard(Base)
except ImportError:
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
