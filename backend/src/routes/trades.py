from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Literal

from ..ai_generator import generate_challenge_with_ai
from ..database.db import (
    get_trades_by_user,
    create_trade,
    update_trade,
    get_challenge_quota,
    create_challenge,
    create_challenge_quota,
    reset_quota_if_needed,
    get_user_challenges
)
from ..utils import authenticate_and_get_user_details
from ..database.models import get_db
from ..database import models
import json
from datetime import datetime

router = APIRouter()

class TradeTransactionIn(BaseModel):
    type: Literal["buy", "sell"]
    date: datetime
    amount: float
    price: float
    commissions: float

class TradeCreateRequest(BaseModel):
    ticker: str
    mistake: str
    notes: str = ""
    transactions: List[TradeTransactionIn]

@router.post("/trades")
async def add_trade(request: TradeCreateRequest, request_obj: Request, db:Session = Depends(get_db)):
    user_details = authenticate_and_get_user_details(request_obj)
    user_id = user_details.get("user_id")

    trade = create_trade(
        db=db,
        user_id = user_id,
        ticker=request.ticker,
        mistake=request.mistake,
        notes=request.notes,
        transactions=[tx.dict() for tx in request.transactions]
    )

    return {"status": "success", "trade_id":trade.id}

@router.put("/trades/{trade_id}")
async def edit_trade(trade_id: int ,request: TradeCreateRequest, request_obj: Request, db:Session = Depends(get_db)):
    user_details = authenticate_and_get_user_details(request_obj)
    user_id = user_details.get("user_id")

    updated = update_trade(
        db=db,
        trade_id=trade_id,
        user_id = user_id,
        data={
            "ticker": request.ticker,
            "mistake": request.mistake,
            "notes": request.notes,
            "transactions": [tx.dict() for tx in request.transactions]
        }
    )

    return {"status": "updated", "trade_id":updated.id}

def summarise_trade(trade: models.Trade):
    buys = [tx for tx in trade.transactions if tx.type == "buy"]
    sells = [tx for tx in trade.transactions if tx.type == "sell"]

    total_bought = sum(tx.amount for tx in buys)
    total_sold = sum(tx.amount for tx in sells)

    net_shares = total_bought - total_sold

    if net_shares == 0:
        buy_total = sum(tx.amount * tx.price for tx in buys)
        sell_total = sum(tx.amount * tx.price for tx in sells)
        total_commissions = sum(tx.commissions for tx in trade.transactions)
        pnl = sell_total - buy_total - total_commissions
        return {"status": "Closed", "pnl": pnl}
    else:
        return {"status": "Open", "pnl": None}


@router.get("/trades")
async def get_trades(request: Request, db:Session = Depends(get_db)):
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    trades = get_trades_by_user(db, user_id)

    summarised = []
    for trade in trades:
        summary = summarise_trade(trade)
        summarised.append({
            "id": trade.id,
            "ticker": trade.ticker,
            "mistake": trade.mistake,
            "trade_type": trade.trade_type,
            "earliest_transaction": trade.earliest_transaction,
            "latest_transaction": trade.latest_transaction,
            "notes": trade.notes,
            "status": summary["status"],
            "pnl": summary["pnl"]
        })

    return {"trades": summarised}

@router.get("/trades/{trade_id}")
async def get_trade(trade_id: int, request: Request, db:Session = Depends(get_db)):
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    trade = db.query(models.Trade).filter_by(id=trade_id, user_id=user_id).first()
    summary = summarise_trade(trade)

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    return {
        "trade": {
            "id": trade.id,
            "ticker": trade.ticker,
            "status": summary["status"],
            "pnl": summary["pnl"],
            "mistake": trade.mistake,
            "notes": trade.notes,
            "trade_type": trade.trade_type,
            "earliest_transaction": trade.earliest_transaction,
            "latest_transaction": trade.latest_transaction,
            "transactions": [
                {
                    "type": tx.type,
                    "amount": tx.amount,
                    "price": tx.price,
                    "commissions": tx.commissions,
                    "date": tx.date,
                }
                for tx in trade.transactions
            ]
        }
    }

@router.delete("/trades/{trade_id}")
async def delete_trade(trade_id: int, request: Request, db:Session = Depends(get_db)):
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    trade = db.query(models.Trade).filter(models.Trade.id == trade_id, models.Trade.user_id == user_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    try:
        db.delete(trade)
        db.commit()
    except Exception as e:
        db.rollback()
        print("DELETE FAILED:", e)
        raise HTTPException(status_code=500, detail="Deletion failed")
    return {"message": "Trade deleted"}



###

class ChallengeRequest(BaseModel):
    difficulty: str

    class Config:
        json_schema_extra = {"example": {"difficulty": "easy"}}


@router.post("/generate-challenge")
async def generate_challenge(request: ChallengeRequest, request_obj: Request, db: Session = Depends(get_db)):
    try:
        user_details = authenticate_and_get_user_details(request_obj)
        user_id = user_details.get("user_id")

        quota = get_challenge_quota(db, user_id)
        if not quota:
            quota = create_challenge_quota(db, user_id)

        quota = reset_quota_if_needed(db, quota)

        if quota.quota_remaining <= 0:
            raise HTTPException(status_code=429, detail="Quota exhausted")

        challenge_data = generate_challenge_with_ai(request.difficulty)

        new_challenge = create_challenge(
            db=db,
            difficulty=request.difficulty,
            created_by=user_id,
            title=challenge_data["title"],
            options=json.dumps(challenge_data["options"]),
            correct_answer_id=challenge_data["correct_answer_id"],
            explanation=challenge_data["explanation"]
        )

        quota.quota_remaining -= 1
        db.commit()

        return {
            "id": new_challenge.id,
            "difficulty": request.difficulty,
            "title": new_challenge.title,
            "options": json.loads(new_challenge.options),
            "correct_answer_id": new_challenge.correct_answer_id,
            "explanation": new_challenge.explanation,
            "timestamp": new_challenge.date_created.isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-history")
async def my_history(request: Request, db: Session = Depends(get_db)):
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    challenges = get_user_challenges(db, user_id)
    return {"challenges": challenges}


@router.get("/quota")
async def get_quota(request: Request, db: Session = Depends(get_db)):
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    quota = get_challenge_quota(db, user_id)
    if not quota:
        return {
            "user_id": user_id,
            "quota_remaining": 0,
            "last_reset_date": datetime.now()
        }

    quota = reset_quota_if_needed(db, quota)
    return quota