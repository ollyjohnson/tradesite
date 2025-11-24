from __future__ import annotations

import csv
from datetime import datetime
from typing import List, Dict, Any


def parse_tradezero_csv(csv_text: str) -> List[Dict[str, Any]]:
    """
    Parse a TradeZero 'Trade History' CSV export into the unified trade
    structure used by the app.

    Input
    -----
    csv_text : str
        The raw CSV content as a single string (e.g. decoded from UploadFile).

    Output
    ------
    List[Dict[str, Any]] with shape:

        [
          {
            "ticker": "NG",
            "mistake": "Imported from TradeZero CSV",
            "notes": "",
            "transactions": [
              {
                "type": "buy" | "sell",
                "date": "YYYY-MM-DDTHH:MM:SS",
                "amount": float,
                "price": float,
                "commissions": float,
              },
              ...
            ],
          },
          ...
        ]

    Notes
    -----
    - Rows are grouped by Symbol into a single trade per symbol.
      (So all NG rows become one trade, all BBAR rows one trade, etc.)
    - Date/time is built from the Trade Date (T/D) + Exec Time columns.
    - Commissions come from the 'Comm' column.
    """

    # TradeZero columns:
    # Account, T/D, S/D, Currency, Type, Side, Symbol, Qty, Price, Exec Time,
    # Comm, SEC, TAF, NSCC, Nasdaq, ECN Remove, ECN Add,
    # Gross Proceeds, Net Proceeds, Clr Broker, Liq, Note

    reader = csv.DictReader(csv_text.splitlines())
    trades_by_symbol: Dict[str, List[Dict[str, Any]]] = {}

    for row in reader:
        # Skip completely blank lines
        symbol_raw = (row.get("Symbol") or "").strip()
        if not symbol_raw:
            continue

        symbol = symbol_raw.upper()
        side = (row.get("Side") or "").strip().upper()

        qty_raw = (row.get("Qty") or "").strip()
        price_raw = (row.get("Price") or "").strip()
        comm_raw = (row.get("Comm") or "").strip()
        trade_date_raw = (row.get("T/D") or "").strip()
        time_raw = (row.get("Exec Time") or "").strip()

        # Basic sanity checks
        if not qty_raw or not price_raw or not trade_date_raw:
            continue

        # Parse numeric fields
        try:
            qty = float(qty_raw)
            price = float(price_raw)
        except ValueError:
            # Skip rows with bad numbers
            continue

        try:
            commissions = float(comm_raw) if comm_raw else 0.0
        except ValueError:
            commissions = 0.0

        # Parse date: TradeZero uses "MM/DD/YYYY" for T/D in your sample
        try:
            base_date = datetime.strptime(trade_date_raw, "%m/%d/%Y").date()
        except ValueError:
            # Fallback: try ISO-style date if format ever changes
            try:
                base_date = datetime.fromisoformat(trade_date_raw).date()
            except Exception:
                # If we still can't parse, skip the row
                continue

        # Parse time "HH:MM:SS" (Exec Time)
        if time_raw:
            try:
                t = datetime.strptime(time_raw, "%H:%M:%S").time()
            except ValueError:
                # If time is malformed, default to midnight
                t = datetime.min.time()
        else:
            t = datetime.min.time()

        dt = datetime.combine(base_date, t)
        iso_dt = dt.isoformat(timespec="seconds")

        tx_type = "buy" if side == "B" else "sell"

        tx = {
            "type": tx_type,
            "date": iso_dt,
            "amount": qty,
            "price": price,
            "commissions": commissions,
        }

        trades_by_symbol.setdefault(symbol, []).append(tx)

    # Build final trade list
    trades: List[Dict[str, Any]] = []
    for symbol, txs in trades_by_symbol.items():
        # Ensure chronological order
        txs_sorted = sorted(txs, key=lambda x: x["date"])
        trades.append(
            {
                "ticker": symbol,
                "mistake": "",
                "notes": "",
                "transactions": txs_sorted,
            }
        )

    return trades
