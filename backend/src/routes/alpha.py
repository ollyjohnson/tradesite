import os
import requests
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
import time

load_dotenv()
router = APIRouter()
_CACHE = {}

TTL_SECONDS = 60 * 10

API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
if not API_KEY:
    raise RuntimeError("Missing ALPHA_VANTAGE_API_KEY in .env")


@router.get("/stock-data")
def get_stock_data(symbol: str, start_date: str, end_date: str):
    """
    Return OHLC candles with padding around the trade window:
    - 20 bars before the first trade date
    - 20 bars after the last trade date (or as many as available)
    Using Alpha Vantage TIME_SERIES_DAILY (compact).
    """
    key = (symbol.upper(), start_date[:10], end_date[:10])
    now = time.time()

    cached = _CACHE.get(key)
    if cached and cached[0] > now:
        return cached[1]
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ALPHA_VANTAGE_API_KEY not set")

    url = "https://www.alphavantage.co/query"
    params = {
        "function": "TIME_SERIES_DAILY",
        "symbol": symbol,
        "outputsize": "compact",
        "apikey": api_key,
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Alpha Vantage request failed: {e}")

    data = response.json()
    print("AlphaVantage raw response:", data)

    time_series = data.get("Time Series (Daily)")
    if not time_series:
        raise HTTPException(
            status_code=502,
            detail=data.get("Note") or data.get("Error Message") or "Unexpected Alpha Vantage response.",
        )

    # Normalise incoming dates to YYYY-MM-DD
    start = start_date[:10]
    end = end_date[:10]

    all_dates = sorted(time_series.keys())

    if not all_dates:
        return []

    # Find index of first candle on/after trade start
    first_idx = None
    for i, d in enumerate(all_dates):
        if d >= start:
            first_idx = i
            break

    # Find index of last candle on/before trade end
    last_idx = None
    for i in range(len(all_dates) - 1, -1, -1):
        d = all_dates[i]
        if d <= end:
            last_idx = i
            break

    # If we cant find the trade window, return empty
    if first_idx is None or last_idx is None:
        return []

    PADDING_BEFORE = 100
    PADDING_AFTER = 20

    from_idx = max(0, first_idx - PADDING_BEFORE)
    to_idx = min(len(all_dates) - 1, last_idx + PADDING_AFTER)

    candles = []
    for d in all_dates[from_idx : to_idx + 1]:
        bar = time_series[d]
        candles.append(
            {
                "time": d,
                "open": float(bar["1. open"]),
                "high": float(bar["2. high"]),
                "low": float(bar["3. low"]),
                "close": float(bar["4. close"]),
            }
        )
    
    _CACHE[key] = (now + TTL_SECONDS, candles)

    return candles

