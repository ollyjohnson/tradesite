from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Request, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Literal
from io import StringIO
from collections import defaultdict
import csv

from ..ai_generator import parse_trades_from_csv_with_ai
from ..parse_broker_statement import parse_tradezero_csv

from ..database.db import (
    get_trades_by_user,
    create_trade,
    update_trade,
    upsert_trade_from_import,
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

class TradeNotesUpdate(BaseModel):
    mistake: str
    notes: str = ""


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

@router.delete("/trades")
async def delete_all_trades(request: Request, db: Session = Depends(get_db)):
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    try:
        q = db.query(models.Trade).filter(models.Trade.user_id == user_id)
        deleted_count = q.count()
        q.delete(synchronize_session=False)
        db.commit()
        return {"deleted": deleted_count}
    except Exception as e:
        db.rollback()
        print("DELETE ALL FAILED:", e)
        raise HTTPException(status_code=500, detail="Failed to delete all trades")


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

            normalized_txs = []
            for tx in transactions:
                normalized_txs.append(
                    {
                        "type": tx["type"],
                        "date": tx["date"],
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
            print("Error inserting trade from AI:", e)
            continue

    return {
        "status": "success",
        "inserted": inserted,
        "trade_ids": created_trade_ids,
    }

@router.post("/trades/import-broker-csv")
async def import_broker_csv(
    request: Request,
    broker: str = Query(..., description="Broker name, e.g. 'tradezero'"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    content = await file.read()
    try:
      text = content.decode("utf-8", errors="ignore")
    except Exception:
      raise HTTPException(status_code=400, detail="Could not read CSV file")

    if broker.lower() == "tradezero":
        trades = parse_tradezero_csv(text)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported broker: {broker}")

    if not trades:
        raise HTTPException(status_code=400, detail="No trades parsed from CSV")

    created_ids = []
    for t in trades:
        trade = upsert_trade_from_import(
            db=db,
            user_id=user_id,
            ticker=t["ticker"],
            mistake=t.get("mistake", "Imported from broker CSV"),
            notes=t.get("notes", ""),
            transactions=t["transactions"],
        )
        created_ids.append(trade.id)

    return {"created_trade_ids": created_ids, "count": len(created_ids)}

@router.patch("/trades/{trade_id}/notes")
async def update_trade_notes(
    trade_id: int,
    request_data: TradeNotesUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    trade = (
        db.query(models.Trade)
        .filter(models.Trade.id == trade_id, models.Trade.user_id == user_id)
        .first()
    )
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    trade.mistake = request_data.mistake
    trade.notes = request_data.notes

    db.add(trade)
    db.commit()
    db.refresh(trade)

    return {
        "status": "updated",
        "trade_id": trade.id,
        "mistake": trade.mistake,
        "notes": trade.notes,
    }

@router.get("/trades/export-csv")
async def export_trades_csv(
    request: Request,
    db: Session = Depends(get_db),
) -> Response:
    """
    Export all trades for the current user as a CSV file.

    Columns:
    Trade, Side, Buy Date, Buy Price,
    Sell Date 1, Sell Price 1, ..., Sell Date N, Sell Price N, Profit/Loss

    N is the maximum number of sells on any trade.
    """
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    trades: List[models.Trade] = get_trades_by_user(db, user_id)

    output = StringIO()
    writer = csv.writer(output)

    max_sells = 0
    trade_data = []

    for trade in trades:
        txs = sorted(trade.transactions, key=lambda t: t.date)
        buys = [t for t in txs if t.type == "buy"]
        sells = [t for t in txs if t.type == "sell"]
        max_sells = max(max_sells, len(sells))

        trade_data.append((trade, txs, buys, sells))

    header = ["Trade", "Side", "Buy Date", "Buy Price"]
    for i in range(1, max_sells + 1):
        header.append(f"Sell Date {i}")
        header.append(f"Sell Price {i}")
    header.append("Profit/Loss")
    writer.writerow(header)

    for trade, txs, buys, sells in trade_data:
        side = trade.trade_type or "Long"

        buy_date_str = ""
        buy_price_str = ""
        if buys:
            total_shares = sum(b.amount for b in buys)
            if total_shares > 0:
                avg_buy_price = sum(b.amount * b.price for b in buys) / total_shares
                buy_price_str = f"{avg_buy_price:.4f}"
            first_buy_date = buys[0].date
            buy_date_str = first_buy_date.strftime("%Y-%m-%d %H:%M:%S")

        sell_cells: List[str] = []
        for s in sells:
            sell_cells.append(s.date.strftime("%Y-%m-%d %H:%M:%S"))
            sell_cells.append(f"{s.price:.4f}")

        while len(sell_cells) < max_sells * 2:
            sell_cells.append("")
            sell_cells.append("")

        if buys and sells and sum(b.amount for b in buys) == sum(s.amount for s in sells):
            buy_total = sum(b.amount * b.price for b in buys)
            sell_total = sum(s.amount * s.price for s in sells)
            total_commissions = sum(tx.commissions for tx in txs)
            pnl = sell_total - buy_total - total_commissions
        else:
            pnl = 0.0

        row = [
            trade.ticker,
            side,
            buy_date_str,
            buy_price_str,
            *sell_cells,
            f"{pnl:.2f}",
        ]
        writer.writerow(row)

    csv_data = output.getvalue()
    output.close()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="trades_export.csv"'
        },
    )

@router.get("/trades/{trade_id}")
async def get_trade(trade_id: int, request: Request, db:Session = Depends(get_db)):
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    trade = db.query(models.Trade).filter_by(id=trade_id, user_id=user_id).first()

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    summary = summarise_trade(trade)
    
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

def _trade_is_closed(trade: models.Trade):
    buys = [tx for tx in trade.transactions if tx.type == "buy"]
    sells = [tx for tx in trade.transactions if tx.type == "sell"]
    return abs(sum(b.amount for b in buys) - sum(s.amount for s in sells)) < 1e-9

def _trade_pnl_and_base(trade: models.Trade):
    txs = sorted(trade.transactions, key=lambda t: t.date)
    buys = [tx for tx in txs if tx.type == "buy"]
    sells = [tx for tx in txs if tx.type == "sell"]

    buy_total = sum(tx.amount * tx.price for tx in buys)
    sell_total = sum(tx.amount * tx.price for tx in sells)
    commissions = sum(tx.commissions for tx in txs)

    pnl = sell_total - buy_total - commissions

    if (trade.trade_type or "Long").lower() == "short":
        base = sell_total
    else:
        base = buy_total
    
    return pnl, base

@router.get("/dashboard")
async def get_dashboard(request: Request, db: Session = Depends(get_db)):
    user_details = authenticate_and_get_user_details(request)
    user_id = user_details.get("user_id")

    trades = get_trades_by_user(db, user_id)

    closed = [t for t in trades if _trade_is_closed(t)]

    pnl_by_day = defaultdict(float)
    for t in closed:
        close_dt = t.latest_transaction or t.earliest_transaction
        if not close_dt:
            continue
        day = close_dt.date().isoformat()

        pnl, _base = _trade_pnl_and_base(t)
        pnl_by_day[day] += float(pnl)
    
    days_sorted = sorted(pnl_by_day.keys())
    equity_curve = []
    running = 0.0

    for d in days_sorted:
        running += pnl_by_day[d]
        equity_curve.append({"time":d, "value": round(running, 2)})
    
    pnls = []
    rets = []
    for t in closed:
        pnl, base = _trade_pnl_and_base(t)
        pnl = float(pnl)
        pnls.append(pnl)

        if base and abs(base) > 1e-12:
            rets.append((pnl/ float(base)) * 100.0)
        else:
            rets.append(0.0)
        
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]
    win_rets = [r for (p,r) in zip(pnls, rets) if p > 0]
    loss_rets = [r for (p, r) in zip(pnls,rets) if p < 0]

    total_pnl = sum(pnls)
    avg_win = (sum(wins) / len(wins)) if wins else 0.0
    avg_loss = (sum(losses) / len(losses)) if losses else 0.0
    max_win = max(pnls) if pnls else 0.0
    max_loss = min(pnls) if pnls else 0.0
    win_pct = (len(wins) / len(pnls) * 100.0) if pnls else 0.0

    sum_wins = sum(wins)
    sum_losses_abs = abs(sum(losses))
    profit_factor = (sum_wins / sum_losses_abs) if sum_losses_abs > 1e-12 else (None if sum_wins == 0 else "∞")

    avg_gain_pct = sum(win_rets) / len(win_rets) if win_rets else 0.0
    avg_loss_pct = sum(loss_rets) / len(loss_rets) if loss_rets else 0.0
    max_gain_pct = max(rets) if rets else 0.0
    max_loss_pct = min(rets) if rets else 0.0

    stats = {
        "total_pnl": round(total_pnl, 2),
        "avg_loss": round(avg_loss, 2),
        "avg_win": round(avg_win, 2),
        "max_loss": round(max_loss, 2),
        "max_win": round(max_win, 2),
        "win_pct": round(win_pct, 2),
        "profit_factor": None if profit_factor is None else (profit_factor if profit_factor == float("inf") else round(profit_factor, 2)),
        "avg_loss_pct": round(avg_loss_pct, 2),
        "avg_gain_pct": round(avg_gain_pct, 2),
        "max_loss_pct": round(max_loss_pct, 2),
        "max_gain_pct": round(max_gain_pct, 2),
    }

    mistake_map = defaultdict(lambda: {"count": 0, "pnl":0.0})
    for t in closed:
        m = (t.mistake or "None").strip() or "None"
        pnl, _base = _trade_pnl_and_base(t)
        mistake_map[m]["count"] += 1
        mistake_map[m]["pnl"] += float(pnl)
    
    mistakes = [
        {"mistake": k, "count": v["count"], "pnl": round(v["pnl"], 2)}
        for k, v in mistake_map.items()
    ]
    mistakes.sort(key=lambda x: x["count"], reverse=True)

    return {"equity_curve": equity_curve, "stats": stats, "mistakes": mistakes}
