import sys
from pathlib import Path

translate_path = Path("../backend/routers/translate.py")
content = translate_path.read_text(encoding="utf-8")
content = content.replace("Vui lÃ²ng cung cáº¥p vÄƒn báº£n cáº§n dá»‹ch", "Vui lòng cung cấp văn bản cần dịch")
content = content.replace("KhÃ´ng thá»ƒ láº¥y báº£n dá»‹ch lÃºc nÃ y. Vui lÃ²ng thá»\xad láº¡i.", "Không thể lấy bản dịch lúc này. Vui lòng thử lại.")
translate_path.write_text(content, encoding="utf-8")
print("Cleaned translate.py strings")
