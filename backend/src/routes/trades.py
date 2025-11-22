from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Literal

from ..ai_generator import parse_trades_from_csv_with_ai
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

@router.post("/trades/import-csv")
async def import_trades_from_csv(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a CSV of executions, let AI turn it into trades,
    then insert those trades into the database for the current user.
    """
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    # Read the uploaded file into text
    content_bytes = await file.read()
    csv_text = content_bytes.decode("utf-8", errors="ignore")

    # Ask the AI to parse it into structured trades
    try:
        ai_trades = parse_trades_from_csv_with_ai(csv_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {e}")

    inserted = 0
    created_trade_ids = []

    for t in ai_trades:
        try:
            ticker = t["ticker"]
            mistake = t.get("mistake", "None")
            notes = t.get("notes", "")
            transactions = t["transactions"]

            # Ensure required transaction fields exist
            normalized_txs = []
            for tx in transactions:
                normalized_txs.append(
                    {
                        "type": tx["type"],  # "buy" / "sell"
                        "date": tx["date"],  # ISO string
                        "amount": float(tx["amount"]),
                        "price": float(tx["price"]),
                        "commissions": float(tx.get("commissions", 0.0)),
                    }
                )

            trade = create_trade(
                db=db,
                user_id=user_id,
                ticker=ticker,
                mistake=mistake,
                notes=notes,
                transactions=normalized_txs,
            )

            inserted += 1
            created_trade_ids.append(trade.id)
        except Exception as e:
            # Skip bad entries but keep going
            print("Error inserting trade from AI:", e)
            continue

    return {
        "status": "success",
        "inserted": inserted,
        "trade_ids": created_trade_ids,
    }
