import sys
import json
import os
from pathlib import Path

def set_cookie(session_id, csrf_token=None):
    os.makedirs("data/sessions", exist_ok=True)
    
    cookies = [
        {
            "name": "sessionid",
            "value": session_id.strip(),
            "domain": "study4.com",
            "path": "/",
            "expires": -1,
            "httpOnly": True,
            "secure": True,
            "sameSite": "Lax"
        }
    ]
    if csrf_token:
        cookies.append({
            "name": "csrftoken",
            "value": csrf_token.strip(),
            "domain": "study4.com",
            "path": "/",
            "expires": -1,
            "httpOnly": False,
            "secure": True,
            "sameSite": "Lax"
        })
        
    storage_state = {
        "cookies": cookies,
        "origins": [{"origin": "https://study4.com", "localStorage": []}]
    }
    
    with open("data/sessions/study4_storage_state.json", "w", encoding="utf-8") as f:
        json.dump(storage_state, f, indent=2)
        
    with open("data/sessions/study4_cookies.json", "w", encoding="utf-8") as f:
        cookies_dict = {"sessionid": session_id.strip()}
        if csrf_token:
            cookies_dict["csrftoken"] = csrf_token.strip()
        json.dump(cookies_dict, f, indent=2)
        
    print(f"Successfully saved sessionid ({session_id[:10]}...) to data/sessions/!")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        sid = sys.argv[1]
        csrf = sys.argv[2] if len(sys.argv) > 2 else None
        set_cookie(sid, csrf)
    else:
        print("Usage: python set_study4_cookie.py <sessionid> [csrftoken]")
