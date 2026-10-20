import os
import shutil
import sqlite3
import tempfile
from pathlib import Path

user_data = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data"

for cookie_file in user_data.glob("*/Network/Cookies"):
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp_name = tmp.name
        shutil.copy2(cookie_file, tmp_name)
        conn = sqlite3.connect(tmp_name)
        cursor = conn.cursor()
        cursor.execute("SELECT host_key, name FROM cookies WHERE host_key LIKE '%study4%'")
        rows = cursor.fetchall()
        if rows:
            print(f"Profile {cookie_file.parent.parent.name} has {len(rows)} study4 cookies:")
            for r in rows:
                print("  ", r[0], r[1])
        conn.close()
    except Exception as e:
        pass
    finally:
        if os.path.exists(tmp_name):
            try:
                os.remove(tmp_name)
            except:
                pass
