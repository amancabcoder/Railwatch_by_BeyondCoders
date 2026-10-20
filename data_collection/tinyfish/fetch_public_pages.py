"""
RailWatch - TinyFetch Page Content Extractor
Fetches rendered content from known public URLs into clean structured records.
Includes SSRF safeguards and domain allowlisting.
"""

import os
import requests
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("TINYFISH_API_KEY", "")
FETCH_ENDPOINT = os.getenv("TINYFISH_FETCH_URL", "https://api.fetch.tinyfish.ai")

ALLOWED_DOMAINS = [
    "indianrailways.gov.in",
    "nr.indianrailways.gov.in",
    "delhi.gov.in",
    "cwc.gov.in",
    "imd.gov.in",
    "pib.gov.in"
]

def is_allowed_domain(url: str) -> bool:
    try:
        host = urlparse(url).netloc.lower()
        return any(host == d or host.endswith("." + d) for d in ALLOWED_DOMAINS)
    except Exception:
        return False

def tinyfish_fetch(urls: list[str]):
    """Fetches public pages via TinyFetch API."""
    if not API_KEY:
        print("[!] Warning: TINYFISH_API_KEY not configured. Please set in .env file.")
        return None

    # Validate against SSRF
    safe_urls = [u for u in urls if is_allowed_domain(u)]
    if not safe_urls:
        raise ValueError("None of the provided URLs matched the allowed public domains.")

    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    payload = {"urls": safe_urls}

    print(f"[*] Fetching {len(safe_urls)} public page(s)...")
    response = requests.post(FETCH_ENDPOINT, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    sample_urls = ["https://nr.indianrailways.gov.in/"]
    try:
        pages = tinyfish_fetch(sample_urls)
        print("[+] TinyFetch Result:", pages)
    except Exception as e:
        print(f"[-] Error: {e}")

