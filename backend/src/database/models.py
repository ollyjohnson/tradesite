from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    create_engine,
    Enum,
    Text,
    ForeignKey,
    Float,
    event,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.engine import Engine
from datetime import datetime

# --- Engine & Base ---------------------------------------------------------

engine = create_engine("sqlite:///database.db", echo=True)


# Ensure SQLite actually enforces foreign-key constraints
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()


Base = declarative_base()

# --- Trade models ----------------------------------------------------------


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False)
    ticker = Column(String, nullable=False)
    trade_type = Column(String, nullable=True)
    mistake = Column(String, nullable=False, default="None")
    notes = Column(Text)
    latest_transaction = Column(DateTime, nullable=True)
    earliest_transaction = Column(DateTime, nullable=True)
    transactions = relationship(
        "TradeTransaction",
        back_populates="trade",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class TradeTransaction(Base):
    __tablename__ = "trade_transactions"

    id = Column(Integer, primary_key=True)
    trade_id = Column(Integer, ForeignKey("trades.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum("buy", "sell", name="transation_type"), nullable=False)
    date = Column(DateTime, nullable=False)
    amount = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    commissions = Column(Float, nullable=False, default=0.00)

    trade = relationship("Trade", back_populates="transactions")


# --- Challenge models (unchanged) -----------------------------------------


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True)
    difficulty = Column(String, nullable=False)
    date_created = Column(DateTime, default=datetime.now)
    created_by = Column(String, nullable=False)
    title = Column(String, nullable=False)
    options = Column(String, nullable=False)
    correct_answer_id = Column(Integer, nullable=False)
    explanation = Column(String, nullable=False)


class ChallengeQuota(Base):
    __tablename__ = "challenge_quotas"

    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False, unique=True)
    quota_remaining = Column(Integer, nullable=False, default=50)
    last_reset_date = Column(DateTime, default=datetime.now)


# --- Session helper --------------------------------------------------------

Base.metadata.create_all(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
