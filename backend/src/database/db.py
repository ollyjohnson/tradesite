from sqlalchemy.orm import Session
from sqlalchemy import desc, nullsfirst
from datetime import datetime, timedelta
from fastapi import HTTPException
from . import models
from zoneinfo import ZoneInfo


def get_challenge_quota(db: Session, user_id: str):
    return (db.query(models.ChallengeQuota)
            .filter(models.ChallengeQuota.user_id == user_id)
            .first())


def create_challenge_quota(db: Session, user_id: str):
    db_quota = models.ChallengeQuota(user_id=user_id)
    db.add(db_quota)
    db.commit()
    db.refresh(db_quota)
    return db_quota


def reset_quota_if_needed(db: Session, quota: models.ChallengeQuota):
    now = datetime.now()
    if now - quota.last_reset_date > timedelta(hours=24):
        quota.quota_remaining = 10
        quota.last_reset_date = now
        db.commit()
        db.refresh(quota)
    return quota


def create_challenge(
    db: Session,
    difficulty: str,
    created_by: str,
    title: str,
    options: str,
    correct_answer_id: int,
    explanation: str
):
    db_challenge = models.Challenge(
        difficulty=difficulty,
        created_by=created_by,
        title=title,
        options=options,
        correct_answer_id=correct_answer_id,
        explanation=explanation
    )
    db.add(db_challenge)
    db.commit()
    db.refresh(db_challenge)
    return db_challenge


def get_user_challenges(db: Session, user_id: str):
    return db.query(models.Challenge).filter(models.Challenge.created_by == user_id).all()

###
def parse_datetime_to_utc(dt_input):
    UTC = ZoneInfo("UTC")
    if isinstance(dt_input, datetime):
        if dt_input.tzinfo is None:
            dt_input = dt_input.replace(tzinfo=UTC)
        return dt_input.astimezone(UTC)
    elif isinstance(dt_input, str):
        dt = datetime.fromisoformat(dt_input)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC)
    else:
        raise TypeError("Unsupported datetime input")
    
def create_trade(db: Session, user_id: str,ticker:str, mistake:str,notes: str, transactions: list):
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

