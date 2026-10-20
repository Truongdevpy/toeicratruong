# -*- coding: utf-8 -*-
import os
import sys
import time
import json
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent
SCREENSHOTS_DIR = BASE_DIR / "screenshots"
BACKEND_URL = "http://127.0.0.1:8001"
FRONTEND_URL = "http://127.0.0.1:5173"

def get_demo_token(role: str) -> str:
    url = f"{BACKEND_URL}/api/auth/demo"
    data = json.dumps({"role": role}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("access_token", "")
    except Exception as e:
        print(f"Error getting token for {role}: {e}")
        return ""

def capture_page(page, url_path: str, output_path: Path, wait_sec: float = 1.5):
    full_url = f"{FRONTEND_URL}{url_path}"
    print(f"Capturing: {url_path} -> {output_path.name}")
    try:
        page.goto(full_url, wait_until="networkidle", timeout=12000)
    except Exception:
        page.goto(full_url, wait_until="load", timeout=12000)
    time.sleep(wait_sec)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(output_path), full_page=False)

def main():
    print("=== TOEICTOTNGHIEP - CAPTURING ALL SCREENSHOTS ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.25
        )
        page = context.new_page()

        # -------------------------------------------------------------
        # 1. GUEST ROLE
        # -------------------------------------------------------------
        print("\n>>> 1. GUEST ROLE (Khách chưa đăng nhập)")
        guest_dir = SCREENSHOTS_DIR / "01_guest"
        page.goto(FRONTEND_URL)
        page.evaluate("() => { localStorage.clear(); }")

        guest_pages = [
            ("/", "01_trang_chu.png"),
            ("/onboarding", "02_khao_sat_muc_tieu.png"),
            ("/placement-test", "03_kiem_tra_dau_vao.png"),
            ("/placement-result", "04_ket_qua_dau_vao.png"),
            ("/practice/vocabulary", "05_kho_tu_vung.png"),
            ("/practice/grammar", "06_ngu_phap.png"),
            ("/videos", "07_bai_giang_video.png"),
            ("/leaderboard", "08_bang_xep_hang.png"),
            ("/community", "09_cong_dong_hoc_tap.png"),
            ("/pricing", "10_bang_gia_vip.png"),
            ("/dashboard", "11_man_hinh_yeu_cau_dang_nhap.png"),
        ]
        for path, filename in guest_pages:
            capture_page(page, path, guest_dir / filename)

        # Modal Login
        try:
            page.goto(f"{FRONTEND_URL}/")
            time.sleep(1)
            btn = page.locator("button:has-text('Đăng nhập')").first
            if btn.is_visible():
                btn.click()
                time.sleep(1)
                page.screenshot(path=str(guest_dir / "12_modal_dang_nhap.png"))
        except Exception as e:
            print("Login modal note:", e)

        # -------------------------------------------------------------
        # 2. STUDENT ROLE
        # -------------------------------------------------------------
        print("\n>>> 2. STUDENT ROLE (Học viên Thường)")
        student_dir = SCREENSHOTS_DIR / "02_student"
        student_token = get_demo_token("student")
        page.goto(FRONTEND_URL)
        page.evaluate(f"(t) => {{ localStorage.setItem('toeic_token', t); }}", student_token)
        page.reload()
        time.sleep(1)

        student_pages = [
            ("/dashboard", "01_bang_dieu_khien_dashboard.png"),
            ("/learning-path", "02_lo_trinh_hoc_tap_ai.png"),
            ("/practice", "03_phong_luyen_thi_tong_hop.png"),
            ("/practice/listening", "04_luyen_nghe_part1_4.png"),
            ("/practice/reading", "05_luyen_doc_part5_7.png"),
            ("/practice/dictation", "06_chep_chinh_ta_dictation.png"),
            ("/practice/flashcards", "07_the_ghi_nho_flashcards_srs.png"),
            ("/practice/vocabulary", "08_kho_tu_vung_hoc_vien.png"),
            ("/practice/grammar", "09_38_chuyen_de_ngu_phap.png"),
            ("/practice/speaking", "10_luyen_noi_shadowing_ai.png"),
            ("/practice/writing", "11_luyen_viet_writing_ai.png"),
            ("/mock-tests", "12_danh_sach_thi_thu_ets.png"),
            ("/ai-tutor", "13_tro_ly_ai_ca_nhan_hoa.png"),
            ("/videos", "14_kho_bai_giang_video.png"),
            ("/statistics", "15_thong_ke_va_tien_do.png"),
            ("/achievements", "16_bo_suu_tap_thanh_tich.png"),
            ("/community", "17_cong_dong_va_nhom_hoc.png"),
            ("/leaderboard", "18_bang_xep_hang_toan_quoc.png"),
            ("/payment", "19_trang_thanh_toan_vietqr.png"),
        ]
        for path, filename in student_pages:
            capture_page(page, path, student_dir / filename)

        # Practice Runner Room (FocusedPracticeRoom)
        try:
            page.goto(f"{FRONTEND_URL}/practice/listening")
            time.sleep(1.5)
            start_practice = page.locator("button:has-text('Luyện ngay')").first
            if not start_practice.is_visible():
                start_practice = page.locator("button:has-text('Bắt đầu')").first
            if start_practice.is_visible():
                start_practice.click()
                time.sleep(2)
                page.screenshot(path=str(student_dir / "20_phong_luyen_tap_song_ngu_tap_trung.png"))
        except Exception as e:
            print("Practice room note:", e)

        # -------------------------------------------------------------
        # 3. VIP PRO ROLE
        # -------------------------------------------------------------
        print("\n>>> 3. VIP PRO ROLE (Học viên VIP)")
        vip_dir = SCREENSHOTS_DIR / "03_vip"
        vip_token = get_demo_token("vip")
        page.goto(FRONTEND_URL)
        page.evaluate(f"(t) => {{ localStorage.setItem('toeic_token', t); }}", vip_token)
        page.reload()
        time.sleep(1)

        vip_pages = [
            ("/dashboard", "01_dashboard_vip_pro_badge.png"),
            ("/mock-tests", "02_kho_de_thi_ets_mo_khoa_100_percent.png"),
            ("/ai-tutor", "03_tro_ly_ai_deeptutor_vip.png"),
            ("/payment", "04_dac_quyen_goi_vip.png"),
        ]
        for path, filename in vip_pages:
            capture_page(page, path, vip_dir / filename)

        # Actual ETS Mock Test Exam Room
        try:
            page.goto(f"{FRONTEND_URL}/mock-tests")
            time.sleep(1.5)
            thi_thu_btn = page.locator("button:has-text('Thi thử')").first
            if thi_thu_btn.is_visible():
                thi_thu_btn.click()
                time.sleep(1)
                start_btn = page.locator("button:has-text('Bắt đầu')").first
                if start_btn.is_visible():
                    start_btn.click()
                    time.sleep(2.5)
                    page.screenshot(path=str(vip_dir / "05_phong_thi_thuc_te_ets_full_test.png"))
        except Exception as e:
            print("VIP exam room note:", e)

        # -------------------------------------------------------------
        # 4. ADMIN ROLE
        # -------------------------------------------------------------
        print("\n>>> 4. ADMIN ROLE (Quản trị viên Hệ thống)")
        admin_dir = SCREENSHOTS_DIR / "04_admin"
        admin_token = get_demo_token("admin")
        page.goto(FRONTEND_URL)
        page.evaluate(f"(t) => {{ localStorage.setItem('toeic_token', t); }}", admin_token)
        page.reload()
        time.sleep(1)

        page.goto(f"{FRONTEND_URL}/admin", wait_until="networkidle", timeout=12000)
        time.sleep(2)

        # Tab 1: AI Review Queue (default)
        page.screenshot(path=str(admin_dir / "01_admin_hang_doi_duyet_cau_hoi_ai.png"))

        admin_tabs = [
            (1, "02_admin_cong_cu_sinh_cau_hoi_ai.png"),
            (2, "03_admin_quan_ly_nhom_hoc.png"),
            (3, "04_admin_quan_ly_nguoi_dung_va_vip.png"),
            (4, "05_admin_cau_hinh_ngan_hang_vietqr.png"),
            (5, "06_admin_doanh_thu_va_don_hang.png"),
            (6, "07_admin_cau_hinh_gemini_api_pool.png"),
            (7, "08_admin_quan_ly_de_thi_va_cau_hoi.png"),
            (8, "09_admin_tong_quan_ngan_hang_cau_hoi.png"),
        ]

        for tab_idx, filename in admin_tabs:
            try:
                # Tab buttons are in div.border-b
                btns = page.locator("div.border-b button")
                if btns.count() > tab_idx:
                    btns.nth(tab_idx).click()
                    time.sleep(1.5)
                    page.screenshot(path=str(admin_dir / filename))
                    print(f"Captured admin tab {tab_idx} -> {filename}")
            except Exception as e:
                print(f"Error on admin tab {tab_idx}: {e}")

        browser.close()
        print("\n=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY! ===")

if __name__ == "__main__":
    main()
