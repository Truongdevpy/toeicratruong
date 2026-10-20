import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
from bs4 import BeautifulSoup

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}

with httpx.Client(headers=headers, follow_redirects=True, timeout=20) as client:
    r_login = client.get("https://study4.com/login/")
    print("Login page status:", r_login.status_code, "URL:", r_login.url)
    soup_login = BeautifulSoup(r_login.text, "html.parser")
    form_login = soup_login.find("form")
    if form_login:
        print("Login form action:", form_login.get("action"), "inputs:", [(i.get("name"), i.get("type")) for i in form_login.find_all("input")])
    
    # Check registration / signup
    r_signup = client.get("https://study4.com/signup/")
    if r_signup.status_code != 200:
        r_signup = client.get("https://study4.com/register/")
    print("Signup page status:", r_signup.status_code, "URL:", r_signup.url)
    soup_signup = BeautifulSoup(r_signup.text, "html.parser")
    form_signup = soup_signup.find("form")
    if form_signup:
        print("Signup form action:", form_signup.get("action"), "inputs:", [(i.get("name"), i.get("type")) for i in form_signup.find_all("input")])
