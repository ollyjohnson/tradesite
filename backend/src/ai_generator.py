import os
import json
from typing import List, Dict, Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def parse_trades_from_csv_with_ai(csv_text: str) -> List[Dict[str, Any]]:
    """
    Uses OpenAI to turn a broker CSV of executions into a list of trades
    that matches our TradeCreateRequest schema:
      {
        "ticker": "AAPL",
        "mistake": "None",
        "notes": "Optional notes",
        "transactions": [
          {
            "type": "buy" or "sell",
            "date": "YYYY-MM-DDTHH:MM:SS",
            "amount": float,
            "price": float,
            "commissions": float
          },
          ...
        ]
      }
    Returns: a list of such trade dicts.
    """
    system_prompt = """
You are an expert trading journal assistant.

You will be given the FULL contents of a CSV file containing one or more trade executions from a broker.

Your job:
1. Interpret the CSV columns (symbol/ticker, side, quantity, price, fees/commissions, date/time, etc.).
2. Group executions into logical TRADES per symbol. One trade should count as when the quantity of the combined transactions equals 0. For example (buy 10 PLTR, buy 10 PLTR, sell 15 PLTR, sell 5 PLTR) is one trade.
3. For each trade, build an object with this exact JSON structure:

{
  "trades": [
    {
      "ticker": "AAPL",
      "mistake": "None",
      "notes": "",
      "transactions": [
        {
          "type": "buy",
          "date": "2025-06-08T09:30:00",
          "amount": 100,
          "price": 180.50,
          "commissions": 1.0
        }
      ]
    }
  ]
}

Rules:
- "ticker": use the symbol column from the CSV (e.g. AAPL, TSLA).
- "mistake": put "None" by default.
- "notes": empty string "".
- Each row becomes one transaction.
- "type" is "buy" or "sell" (all lowercase).
- "amount" is the number of shares/contracts (positive float).
- "price" is the fill price.
- "commissions" includes any per-row fees (0 if none given).
- "date" must be in ISO format like YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ (UTC). Do not include words like UTC or other time zone names
- Only include fields shown above; no extra fields.
- If you are unsure about how to parse something, make your best reasonable guess.
- You MUST return valid JSON matching this shape and nothing else.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": csv_text},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
        )

        content = response.choices[0].message.content

        print("AI CSV raw content:")
        print(content)

        data = json.loads(content)

        print("AI CSV parsed JSON:")
        print(json.dumps(data, indent=2))

        if "trades" not in data or not isinstance(data["trades"], list):
            raise ValueError("AI response missing 'trades' list")

        return data["trades"]

    except Exception as e:
        print("Error parsing trades with AI:", e)
        raise