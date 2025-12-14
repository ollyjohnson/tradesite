from __future__ import annotations

import csv
from datetime import datetime
from typing import List, Dict, Any
from itertools import groupby


def parse_tradezero_csv(csv_text: str) -> List[Dict[str, Any]]:
    """
    Parse a TradeZero 'Trade History' CSV export into the unified trade
    structure used by the app.

    - Splits executions into *multiple* trades per symbol.
      Each time the running position goes back to 0, a trade is closed.
    """

    reader = csv.DictReader(csv_text.splitlines())

    rows: List[Dict[str, Any]] = []

    for row in reader:
        symbol_raw = (row.get("Symbol") or "").strip()
        if not symbol_raw:
            continue

        symbol = symbol_raw.upper()
        side_raw = (row.get("Side") or "").strip().upper()

        if side_raw not in {"B", "S"}:
            continue

        qty_raw = (row.get("Qty") or "").strip()
        price_raw = (row.get("Price") or "").strip()
        comm_raw = (row.get("Comm") or "").strip()
        trade_date_raw = (row.get("T/D") or "").strip()
        time_raw = (row.get("Exec Time") or "").strip()

        if not qty_raw or not price_raw or not trade_date_raw:
            continue

        try:
            qty = float(qty_raw)
            price = float(price_raw)
        except ValueError:
            continue

        try:
            commissions = float(comm_raw) if comm_raw else 0.0
        except ValueError:
            commissions = 0.0

        try:
            base_date = datetime.strptime(trade_date_raw, "%m/%d/%Y").date()
        except ValueError:
            try:
                base_date = datetime.fromisoformat(trade_date_raw).date()
            except Exception:
                continue

        if time_raw:
            try:
                t = datetime.strptime(time_raw, "%H:%M:%S").time()
            except ValueError:
                t = datetime.min.time()
        else:
            t = datetime.min.time()

        dt = datetime.combine(base_date, t)

        side = "buy" if side_raw == "B" else "sell"

        rows.append(
            {
                "symbol": symbol,
                "side": side,
                "qty": qty,
                "price": price,
                "commissions": commissions,
                "dt": dt,
            }
        )

    # Sort rows by symbold and date time
    rows.sort(key=lambda r: (r["symbol"], r["dt"]))

    trades: List[Dict[str, Any]] = []

    for symbol, group in groupby(rows, key=lambda r: r["symbol"]):
        position = 0.0
        current_txs: List[Dict[str, Any]] = []

        for r in group:
            qty = r["qty"]
            if r["side"] == "buy":
                position += qty
            else:
                position -= qty

            current_txs.append(
                {
                    "type": r["side"],
                    "date": r["dt"].isoformat(timespec="seconds"),
                    "amount": qty,
                    "price": r["price"],
                    "commissions": r["commissions"],
                }
            )

            # If position is flat, close the trade
            if abs(position) < 1e-8:
                trades.append(
                    {
                        "ticker": symbol,
                        "mistake": "",
                        "notes": "",
                        "transactions": current_txs,
                    }
                )
                current_txs = []

        if current_txs:
            trades.append(
                {
                    "ticker": symbol,
                    "mistake": "",
                    "notes": "",
                    "transactions": current_txs,
                }
            )

    return trades
