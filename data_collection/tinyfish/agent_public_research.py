"""
RailWatch - TinyAgent Multi-Step Autonomous Public Web Researcher
Streams real-time SSE execution steps for complex public railway portal navigation.
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("TINYFISH_API_KEY", "")
AGENT_ENDPOINT = os.getenv("TINYFISH_AGENT_URL", "https://agent.tinyfish.ai/v1/automation/run-sse")

def run_tinyfish_agent(url: str, goal: str):
    """Executes TinyAgent workflow with Server-Sent Events (SSE) streaming."""
    if not API_KEY:
        print("[!] Warning: TINYFISH_API_KEY not configured. Please set in .env file.")
        return

    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "url": url,
        "goal": goal
    }

    print(f"[*] Dispatching TinyAgent to {url} with goal: '{goal[:60]}...'")
    response = requests.post(AGENT_ENDPOINT, headers=headers, json=payload, stream=True, timeout=300)
    response.raise_for_status()

    for line in response.iter_lines(decode_unicode=True):
        if line:
            print(f"[SSE] {line}")

if __name__ == "__main__":
    target_portal = "https://indianrailways.gov.in/"
    investigation_goal = """
    Review publicly accessible pages relevant to Delhi railway
    infrastructure updates, track drainage, and Yamuna flood advisories.
    Return JSON records with title, publisher, date, location, and summary.
    """
    try:
        run_tinyfish_agent(target_portal, investigation_goal)
    except Exception as e:
        print(f"[-] Error: {e}")

