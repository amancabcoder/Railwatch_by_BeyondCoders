"""
RailWatch - TinySearch Public Intelligence Collector
Discovers public notices, drainage work bulletins, and flood alerts
concerning the Delhi Railway Network.
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("TINYFISH_API_KEY", "")
SEARCH_ENDPOINT = os.getenv("TINYFISH_SEARCH_URL", "https://api.search.tinyfish.ai")

def tinyfish_search(query: str):
    """Executes TinySearch for Delhi railway infrastructure updates."""
    if not API_KEY:
        print("[!] Warning: TINYFISH_API_KEY not configured. Please set in .env file.")
        return None

    headers = {"X-API-Key": API_KEY}
    params = {"query": query}
    
    print(f"[*] Querying TinySearch: '{query}'...")
    response = requests.get(SEARCH_ENDPOINT, params=params, headers=headers, timeout=60)
    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    test_query = "Delhi railway drainage flood public notice"
    try:
        results = tinyfish_search(test_query)
        print("[+] TinySearch Results:", results)
    except Exception as e:
        print(f"[-] Error: {e}")

