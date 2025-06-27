import os
import requests
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
from fastapi.responses import JSONResponse

load_dotenv()
router = APIRouter()

API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
if not API_KEY:
    raise RuntimeError("Missing ALPHA_VANTAGE_API_KEY in .env")


@router.get("/stock-data")
def get_stock_data(symbol: str, start_date: str, end_date: str):
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    url = "https://www.alphavantage.co/query"
    params = {
    "function": "TIME_SERIES_DAILY",
    "symbol": symbol,
    "outputsize": "compact",
    "apikey": api_key
}
    response = requests.get(url, params=params)
    data = response.json()

    # Log full response to debug
    print("AlphaVantage raw response:", data)

    if "Time Series (Daily)" not in data:
        raise HTTPException(status_code=500, detail=data.get("Note") or data.get("Error Message") or "Unexpected API response structure.")

    filtered_data = {
        k: v for k, v in data["Time Series (Daily)"].items()
        if start_date[:10] <= k <= end_date[:10]
    }

    return {"data": filtered_data}
