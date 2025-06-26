import os
import requests
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

API_KEY = os.getenv("ALPHA_VANTAGE_KEY")
if not API_KEY:
    raise RuntimeError("Missing ALPHA_VANTAGE_API_KEY in .env")

@router.get("/stock-data")
def get_stock_data(symbol: str, start_date: str, end_date: str):
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    url = f"https://www.alphavantage.co/query"
    params = {
        "function": "TIME_SERIES_DAILY_ADJUSTED",
        "symbol": symbol,
        "outputsize": "full",
        "apikey": api_key
    }
    response = requests.get(url, params=params)
    data = response.json()

    return {
        "data": {
            k: v for k, v in data.get("Time Series (Daily)", {}).items()
            if start_date <= k <= end_date
        }
    }