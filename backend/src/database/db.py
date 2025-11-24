from sqlalchemy.orm import Session
from sqlalchemy import desc, nullsfirst
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from . import models

def parse_datetime_to_utc(dt_input):
    """
    Normalise various datetime formats to a naive UTC datetime
    suitable for storing in SQLite.

    Accepts:
    - Python datetime objects (naive or tz-aware)
    - Strings like:
        "2024-01-02"
        "2024-01-02T14:30:00"
        "2024-01-02T14:30:00Z"
        "2024-01-02T14:30:00+00:00"
        "2024-01-02 14:30:00 UTC"
    """

    # If it's already a datetime, just normalise to UTC
    if isinstance(dt_input, datetime):
        dt = dt_input
    elif isinstance(dt_input, str):
        s = dt_input.strip()

        # Handle trailing " UTC"
        if s.endswith(" UTC"):
            s = s[:-4].strip()

        # Convert trailing 'Z' to a proper offset
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"

        # If it looks like a bare date ("YYYY-MM-DD"), add time
        if len(s) == 10 and s[4] == "-" and s[7] == "-":
            s = s + "T00:00:00"

        dt = datetime.fromisoformat(s)
    else:
        raise TypeError("Unsupported datetime input")

    # If there's no tzinfo, assume it's already UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)

    # Store as naive UTC in the DB
    return dt.replace(tzinfo=None)

def normalise_transactions_for_compare(transactions):
    """
    Turn a list of transactions (dicts or ORM objects) into a
    sorted, hashable representation so we can detect duplicates.
    """
    norm = []

    for tx in transactions:
        # handle both dicts (from API/AI) and ORM objects (from DB)
        if isinstance(tx, dict):
            dt_in = tx["date"]
            tx_type = tx["type"]
            amount = float(tx["amount"])
            price = float(tx["price"])
            commissions = float(tx.get("commissions") or 0)
        else:
            dt_in = tx.date
            tx_type = tx.type
            amount = float(tx.amount)
            price = float(tx.price)
            commissions = float(tx.commissions)

        dt = parse_datetime_to_utc(dt_in)

        norm.append(
            (
                dt.isoformat(timespec="microseconds"),
                tx_type.lower(),
                round(amount, 8),
                round(price, 8),
                round(commissions, 8),
            )
        )

    # order doesn’t matter, so sort then freeze as a tuple
    norm.sort()
    return tuple(norm)


    
def create_trade(db: Session, user_id: str, ticker: str, mistake: str, notes: str, transactions: list):
    # --- DUPLICATE CHECK ---
    new_norm = normalise_transactions_for_compare(transactions)

    existing_trades = (
        db.query(models.Trade)
        .filter(models.Trade.user_id == user_id, models.Trade.ticker == ticker)
        .all()
    )

    for existing in existing_trades:
        existing_norm = normalise_transactions_for_compare(existing.transactions)
        if existing_norm == new_norm:
            print("Duplicate trade detected for user", user_id, "ticker", ticker, "- skipping insert")
            # Just return the existing trade instead of creating a new one
            return existing
    # --- END DUPLICATE CHECK ---

    latest_transaction = None
    earliest_transaction = None
    trade_type = "Long"
    trade = models.Trade(user_id=user_id, ticker=ticker, mistake=mistake, notes=notes)
    db.add(trade)
    db.flush()

    for tx in transactions:
        date = parse_datetime_to_utc(tx["date"])
        transaction = models.TradeTransaction(
            trade_id=trade.id,
            type=tx["type"],
            date=date,
            amount=tx["amount"],
            price=tx["price"],
            commissions=tx["commissions"]
        )
        if latest_transaction is None or date > latest_transaction:
            latest_transaction = date
        if earliest_transaction is None or date < earliest_transaction:
            earliest_transaction = date
            if tx["type"] == "buy":
                trade_type = "Long"
            else:
                trade_type = "Short"

        db.add(transaction)

    trade.latest_transaction = latest_transaction
    trade.earliest_transaction = earliest_transaction
    trade.trade_type = trade_type

    db.commit()
    db.refresh(trade)
    return trade


def get_trades_by_user(db:Session, user_id: str):
    return db.query(models.Trade).filter(models.Trade.user_id == user_id).order_by(nullsfirst(desc(models.Trade.latest_transaction))).all()

def update_trade(db:Session, trade_id: int, user_id: str, data: dict):
    trade = db.query(models.Trade).filter(models.Trade.id == trade_id, models.Trade.user_id == user_id).first()

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    trade.ticker = data["ticker"]
    trade.notes = data["notes"]
    trade.mistake = data["mistake"]
    db.query(models.TradeTransaction).filter(models.TradeTransaction.trade_id == trade_id).delete()

    parsed_transactions = []
    for tx in data["transactions"]:
        date = parse_datetime_to_utc(tx["date"])
        parsed_transactions.append((date, tx["type"]))

        transaction = models.TradeTransaction(
            trade_id=trade_id,
            type=tx["type"],
            date=date,
            amount=tx["amount"],
            price=tx["price"],
            commissions=tx["commissions"]
        )
        db.add(transaction)

    dates = [dt for dt, _ in parsed_transactions]
    types = {dt: t for dt, t in parsed_transactions}
    earliest_transaction = min(dates)
    latest_transaction = max(dates)

    trade_type = "Long" if types[earliest_transaction] == "buy" else "Short"

    trade.earliest_transaction = earliest_transaction
    trade.latest_transaction = latest_transaction
    trade.trade_type = trade_type


    db.commit()
    db.refresh(trade)
    return trade

