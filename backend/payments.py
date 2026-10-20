import json
import logging
import math
import re
import unicodedata
import urllib.parse
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import desc

import models

logger = logging.getLogger(__name__)

# Standard bank directory supported by VietQR / Napas247
BANK_DIRECTORY = [
    {"code": "MBBANK", "bin": "970422", "name": "MB Bank (Ngân hàng Quân Đội)", "short_name": "MBBank"},
    {"code": "VCB", "bin": "970436", "name": "Vietcombank (Ngoại thương Việt Nam)", "short_name": "Vietcombank"},
    {"code": "TCB", "bin": "970407", "name": "Techcombank (Kỹ thương Việt Nam)", "short_name": "Techcombank"},
    {"code": "ACB", "bin": "970416", "name": "ACB (Á Châu)", "short_name": "ACB"},
    {"code": "TPB", "bin": "970423", "name": "TPBank (Tiên Phong)", "short_name": "TPBank"},
    {"code": "VPB", "bin": "970432", "name": "VPBank (Việt Nam Thịnh Vượng)", "short_name": "VPBank"},
    {"code": "BIDV", "bin": "970418", "name": "BIDV (Đầu tư và Phát triển)", "short_name": "BIDV"},
    {"code": "ICB", "bin": "970415", "name": "VietinBank (Công Thương Việt Nam)", "short_name": "VietinBank"},
    {"code": "VIB", "bin": "970441", "name": "VIB (Quốc tế)", "short_name": "VIB"},
    {"code": "SHB", "bin": "970443", "name": "SHB (Sài Gòn - Hà Nội)", "short_name": "SHB"},
    {"code": "STB", "bin": "970403", "name": "Sacombank (Sài Gòn Thương Tín)", "short_name": "Sacombank"},
    {"code": "HDB", "bin": "970437", "name": "HDBank (Phát triển TP.HCM)", "short_name": "HDBank"},
]

VIP_PLANS = [
    {
        "id": "vip_1m",
        "name": "VIP Pro 1 Tháng",
        "price": 199000,
        "original_price": 299000,
        "duration_days": 30,
        "badge": "Cấp tốc",
        "description": "Dành cho học viên cần ôn luyện tập trung và bứt phá band điểm trong 30 ngày.",
        "features": [
            "Mở khóa toàn bộ đề thi TOEIC ETS từ 2020 - 2024",
            "Tra từ song ngữ Anh - Việt trực tiếp trên từng câu đề thi",
            "Công cụ Annotator vẽ & highlight bút màu trên bài đọc",
            "Gia sư AI Gemini phân tích chi tiết đáp án không giới hạn",
            "Lưu không giới hạn từ vựng vào Giỏ từ & Spaced Repetition",
            "Nghe chép chính tả Dictation đầy đủ transcripts & âm thanh"
        ]
    },
    {
        "id": "vip_6m",
        "name": "VIP Pro 6 Tháng",
        "price": 499000,
        "original_price": 899000,
        "duration_days": 180,
        "badge": "Phổ biến nhất",
        "is_popular": True,
        "discount_percent": 45,
        "description": "Gói học toàn diện được 85% học viên lựa chọn để đạt mục tiêu 650 - 800+ TOEIC.",
        "features": [
            "Toàn bộ đặc quyền của gói VIP Pro 1 Tháng",
            "Thời hạn học dài 6 tháng (chỉ ~83k/tháng, tiết kiệm 45%)",
            "Lộ trình học cá nhân hóa do AI tối ưu theo năng lực",
            "Thống kê tiến độ & thuật toán dự đoán điểm thi thực tế",
            "Ưu tiên hỗ trợ kỹ thuật và giải đáp thắc mắc 24/7"
        ]
    },
    {
        "id": "vip_lifetime",
        "name": "VIP Pro Trọn Đời (12 Tháng+)",
        "price": 799000,
        "original_price": 1990000,
        "duration_days": 3650,
        "badge": "Tiết kiệm 65%",
        "discount_percent": 65,
        "description": "Đầu tư một lần, sở hữu tài khoản VIP vĩnh viễn và tự động cập nhật mọi bộ đề mới hàng năm.",
        "features": [
            "Toàn bộ quyền lợi cao cấp nhất của nền tảng TOEIC AI",
            "Sử dụng trọn đời, tự động cập nhật mọi bộ đề mới nhất hàng năm",
            "Huy hiệu VIP Hoàng Kim danh dự trên Bảng xếp hạng",
            "Không giới hạn số lần thi thử và làm lại mọi dạng bài",
            "Đăng nhập đồng thời trên Laptop, iPad và Điện thoại"
        ]
    }
]

def remove_accents(text: str) -> str:
    """Remove Vietnamese accents and return ASCII uppercase string."""
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', text)
    res = ''.join([c for c in nfkd if not unicodedata.combining(c)])
    return res.replace('đ', 'd').replace('Đ', 'D').upper()

class VietQRHelper:
    @staticmethod
    def generate_qr_url(
        bank_code: str = "MBBANK",
        account_no: str = "",
        amount: float = 0,
        memo: str = "",
        template: str = "compact2",
        account_holder: str = ""
    ) -> str:
        clean_code = "".join(c for c in (bank_code or "MBBANK") if c.isalnum() or c == "_")
        clean_account = "".join(c for c in account_no if c.isalnum())
        clean_template = "".join(c for c in (template or "compact2") if c.isalnum() or c == "_")
        amt_int = int(amount) if amount > 0 else 0
        clean_memo = urllib.parse.quote(memo.strip(), safe="")
        
        url = f"https://img.vietqr.io/image/{clean_code}-{clean_account}-{clean_template}.png?amount={amt_int}&addInfo={clean_memo}"
        if account_holder and account_holder.strip():
            url += f"&accountName={urllib.parse.quote(account_holder.strip(), safe='')}"
        return url

class PaymentService:
    DEFAULT_BANKING_CONFIG = {
        "enabled": True,
        "api_type": "thueapi",  # 'thueapi', 'webhook', 'internal'
        "bank_name": "MB Bank",
        "bank_code": "MBBANK",
        "bank_bin": "970422",
        "account_number": "0868133346",
        "account_name": "NGUYEN THE TRUONG",
        "content_prefix": "TOEIC",
        "token": "",
        "api_url": "",
        "webhook_secret": "",
        "vietqr_template": "compact2",
        "min_deposit": 10000,
    }

    @classmethod
    def get_banking_config(cls, db: Session) -> Dict[str, Any]:
        cfg = dict(cls.DEFAULT_BANKING_CONFIG)
        try:
            row = db.query(models.SystemSetting).filter(models.SystemSetting.key == "banking_config").first()
            if row and row.value:
                stored = json.loads(row.value)
                if isinstance(stored, dict):
                    cfg.update(stored)
        except Exception as e:
            logger.warning(f"Error reading banking_config: {e}")
        return cfg

    @classmethod
    def save_banking_config(cls, db: Session, new_data: Dict[str, Any]) -> Dict[str, Any]:
        current = cls.get_banking_config(db)
        # Update allowed fields
        for field in [
            "enabled", "api_type", "bank_name", "bank_code", "bank_bin",
            "account_number", "account_name", "content_prefix", "vietqr_template",
            "min_deposit", "api_url"
        ]:
            if field in new_data and new_data[field] is not None:
                current[field] = new_data[field]
        
        # Token handling: if clear_token is requested or non-empty string provided
        if new_data.get("clear_token"):
            current["token"] = ""
        elif new_data.get("token") and str(new_data["token"]).strip():
            current["token"] = str(new_data["token"]).strip()

        # Webhook secret handling
        if new_data.get("clear_webhook_secret"):
            current["webhook_secret"] = ""
        elif new_data.get("webhook_secret") and str(new_data["webhook_secret"]).strip():
            current["webhook_secret"] = str(new_data["webhook_secret"]).strip()

        val_json = json.dumps(current, ensure_ascii=False)
        row = db.query(models.SystemSetting).filter(models.SystemSetting.key == "banking_config").first()
        if row:
            row.value = val_json
            row.updated_at = datetime.utcnow()
        else:
            row = models.SystemSetting(
                key="banking_config",
                value=val_json,
                description="Cấu hình tài khoản ngân hàng và tự động duyệt thanh toán VietQR",
                updated_at=datetime.utcnow()
            )
            db.add(row)
        db.commit()
        return current

    @classmethod
    def create_vip_order(cls, db: Session, user: models.User, plan_id: str) -> Dict[str, Any]:
        plan = next((p for p in VIP_PLANS if p["id"] == plan_id), None)
        if not plan:
            # Fallback to vip_6m
            plan = VIP_PLANS[1]

        cfg = cls.get_banking_config(db)
        prefix = (cfg.get("content_prefix") or "TOEIC").strip().upper()

        # Create unique transaction code with collision check


        while True:


            rnd_code = uuid.uuid4().hex[:6].upper()


            transaction_code = f"{prefix} {user.id} {rnd_code}"


            if not db.query(models.Payment).filter(models.Payment.transaction_code == transaction_code).first():


                break

        payment = models.Payment(
            user_id=user.id,
            amount=float(plan["price"]),
            plan_id=plan["id"],
            plan_name=plan["name"],
            payment_method="VIETQR",
            transaction_code=transaction_code,
            status="PENDING",
            created_at=datetime.utcnow()
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

        # Generate QR code URL
        bank_code = cfg.get("bank_code") or "MBBANK"
        account_no = cfg.get("account_number") or ""
        account_name = cfg.get("account_name") or ""
        template = cfg.get("vietqr_template") or "compact2"

        qr_url = VietQRHelper.generate_qr_url(
            bank_code=bank_code,
            account_no=account_no,
            amount=payment.amount,
            memo=payment.transaction_code,
            template=template,
            account_holder=account_name
        )

        return {
            "order_id": payment.id,
            "user_id": user.id,
            "user_name": user.full_name,
            "plan_id": payment.plan_id,
            "plan_name": payment.plan_name,
            "amount": payment.amount,
            "formatted_amount": f"{int(payment.amount):,} đ",
            "transaction_code": payment.transaction_code,
            "status": payment.status,
            "bank_name": cfg.get("bank_name") or "MB Bank",
            "bank_code": bank_code,
            "bank_bin": cfg.get("bank_bin") or "970422",
            "account_number": account_no,
            "account_name": account_name,
            "qr_url": qr_url,
            "created_at": payment.created_at.isoformat()
        }

    @classmethod
    def match_and_process_transaction(
        cls,
        db: Session,
        incoming_tx_id: str,
        amount: float,
        content: str,
        occurred_at: Optional[datetime] = None,
        raw_payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Verify incoming transaction against pending orders and idempotently activate VIP.
        """
        clean_tx_id = str(incoming_tx_id or "").strip()
        if not clean_tx_id:
            return {"status": "error", "message": "Thiếu mã giao dịch ngân hàng."}

        # Check idempotency: already credited?
        existing_payment = db.query(models.Payment).filter(
            models.Payment.gateway_reference == clean_tx_id
        ).first()
        if existing_payment:
            return {
                "status": "already_processed",
                "message": "Giao dịch này đã được ghi nhận và xử lý trước đó.",
                "payment_id": existing_payment.id,
                "user_id": existing_payment.user_id
            }

        # Normalize incoming content
        clean_content = remove_accents(content).replace(" ", "").replace("-", "").replace(".", "").upper()
        
        # Find all pending payments
        pending_payments = db.query(models.Payment).filter(
            models.Payment.status == "PENDING"
        ).order_by(desc(models.Payment.id)).all()

        matched_payment = None
        for p in pending_payments:
            p_code_clean = remove_accents(p.transaction_code).replace(" ", "").replace("-", "").upper()
            user_specific_code = f"TOEIC{p.user_id}"
            
            # Match condition: exact memo fragment in content AND amount >= payment.amount
            code_matches = (p_code_clean in clean_content)
            user_fallback_matches = (user_specific_code in clean_content and f"{p.user_id}" in clean_content)

            if (code_matches or user_fallback_matches) and float(amount) >= float(p.amount) * 0.98:
                matched_payment = p
                break

        if not matched_payment:
            # Also check if user entered partial code (e.g. last 4 hex characters + user id)
            for p in pending_payments:
                parts = p.transaction_code.split()
                if len(parts) >= 3:
                    suffix = parts[-1].upper()
                    if suffix in clean_content and str(p.user_id) in clean_content and float(amount) >= float(p.amount) * 0.98:
                        matched_payment = p
                        break

        if matched_payment:
            matched_payment.status = "COMPLETED"
            matched_payment.completed_at = datetime.utcnow()
            matched_payment.gateway_reference = clean_tx_id
            if raw_payload:
                matched_payment.raw_payload = json.dumps(raw_payload, ensure_ascii=False)

            # Activate VIP for the student
            target_user = matched_payment.user
            if target_user:
                target_user.role = "vip"

                # Send success notification
                notif = models.Notification(
                    user_id=target_user.id,
                    title="🎉 Nâng cấp VIP Pro thành công!",
                    message=f"Hệ thống đã nhận được thanh toán chuyển khoản {int(amount):,}đ. Bạn đã được kích hoạt {matched_payment.plan_name} thành công. Mở khóa 100% đề thi, tra từ song ngữ và gia sư AI!",
                    type="success",
                    is_read=False,
                    created_at=datetime.utcnow()
                )
                db.add(notif)

            db.commit()
            return {
                "status": "success",
                "message": f"Khớp lệnh thành công! Đã kích hoạt VIP cho học viên {target_user.full_name if target_user else ''}.",
                "payment_id": matched_payment.id,
                "user_id": target_user.id if target_user else None,
                "plan_name": matched_payment.plan_name,
                "amount": float(amount)
            }

        return {
            "status": "ignored",
            "message": "Không tìm thấy đơn hàng chờ thanh toán phù hợp với nội dung và số tiền này."
        }

    @classmethod
    def sync_mbbank(cls, db: Session) -> Dict[str, Any]:
        """
        Synchronize recent MBBank transactions from ThueAPI / custom bank API.
        """
        cfg = cls.get_banking_config(db)
        if not cfg.get("enabled"):
            return {
                "status": "disabled",
                "message": "Cấu hình ngân hàng tự động đang tắt.",
                "seen": 0, "credited": 0, "ignored": 0, "duplicates": 0, "failed": 0
            }

        token = (cfg.get("token") or "").strip()
        api_url = (cfg.get("api_url") or "").strip()
        if not api_url and token:
            api_url = f"https://thueapi.pro/historyapimbbankv2/{token}"

        if not api_url and not token:
            return {
                "status": "no_credentials",
                "message": "Chưa nhập API Token ngân hàng MBBank (ThueAPI). Vui lòng cấu hình token trong Admin.",
                "seen": 0, "credited": 0, "ignored": 0, "duplicates": 0, "failed": 0
            }

        try:
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                headers = {"User-Agent": "toeic-master-bank-sync/1.0", "Accept": "application/json"}
                resp = client.get(api_url, headers=headers)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.error(f"Bank sync fetch failed: {exc}")
            return {
                "status": "error",
                "message": f"Không thể kết nối đến API ngân hàng: {str(exc)}",
                "seen": 0, "credited": 0, "ignored": 0, "duplicates": 0, "failed": 1
            }

        items = []
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get("transactions") or data.get("data") or data.get("items") or []

        stats = {"seen": 0, "credited": 0, "ignored": 0, "duplicates": 0, "failed": 0}
        bank_code = cfg.get("bank_code") or "MBBANK"

        for item in items:
            if not isinstance(item, dict):
                continue

            # Skip money out
            tx_type = str(item.get("type") or item.get("transactionType") or "").upper()
            if tx_type == "OUT":
                continue

            tx_id = str(item.get("transactionID") or item.get("refNo") or item.get("transaction_id") or item.get("id") or "").strip()
            amount = float(item.get("amount") or item.get("creditAmount") or 0)
            content = str(item.get("description") or item.get("content") or "").strip()

            if not tx_id or amount <= 0:
                continue

            stats["seen"] += 1

            # Check if recorded in BankTransaction table
            existing_bt = db.query(models.BankTransaction).filter(
                models.BankTransaction.bank_transaction_id == tx_id
            ).first()

            if existing_bt and existing_bt.status in {"PROCESSED", "IGNORED"}:
                stats["duplicates"] += 1
                continue

            if not existing_bt:
                existing_bt = models.BankTransaction(
                    provider=bank_code,
                    bank_transaction_id=tx_id,
                    amount=amount,
                    content=content,
                    occurred_at=datetime.utcnow(),
                    raw_payload=json.dumps(item, ensure_ascii=False),
                    status="PENDING",
                    created_at=datetime.utcnow()
                )
                db.add(existing_bt)
                db.commit()
                db.refresh(existing_bt)

            match_res = cls.match_and_process_transaction(
                db=db,
                incoming_tx_id=tx_id,
                amount=amount,
                content=content,
                raw_payload=item
            )

            res_status = match_res.get("status")
            if res_status == "success":
                existing_bt.status = "PROCESSED"
                existing_bt.processed_at = datetime.utcnow()
                existing_bt.error_message = None
                stats["credited"] += 1
            elif res_status == "already_processed":
                existing_bt.status = "PROCESSED"
                stats["duplicates"] += 1
            else:
                existing_bt.status = "IGNORED"
                existing_bt.error_message = match_res.get("message")
                stats["ignored"] += 1

            db.commit()

        return {
            "status": "ok",
            "message": f"Đồng bộ hoàn tất: Kiểm tra {stats['seen']} giao dịch, Kích hoạt {stats['credited']} VIP, Bỏ qua {stats['ignored']}, Đã xử lý trước {stats['duplicates']}.",
            **stats
        }

    @classmethod
    def test_fetch_transactions(cls, db: Session, custom_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Test API connection and retrieve sample transactions.
        """
        cfg = cls.get_banking_config(db)
        if custom_config:
            cfg.update(custom_config)

        token = (cfg.get("token") or "").strip()
        api_url = (cfg.get("api_url") or "").strip()
        if not api_url and token:
            api_url = f"https://thueapi.pro/historyapimbbankv2/{token}"

        if not api_url and not token:
            return {
                "success": False,
                "error": "Chưa có Token MBBank (ThueAPI) hoặc URL API ngân hàng để kiểm tra.",
                "total_found": 0,
                "transactions": []
            }

        try:
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                headers = {"User-Agent": "toeic-master-test-fetch/1.0", "Accept": "application/json"}
                resp = client.get(api_url, headers=headers)
                body = resp.json()
        except Exception as exc:
            return {
                "success": False,
                "error": f"Lỗi kết nối API ngân hàng: {str(exc)}",
                "total_found": 0,
                "transactions": []
            }

        items = []
        if isinstance(body, list):
            items = body
        elif isinstance(body, dict):
            items = body.get("transactions") or body.get("data") or body.get("items") or []

        sample_txs = []
        for it in items[:15]:
            if isinstance(it, dict):
                sample_txs.append({
                    "transaction_id": str(it.get("transactionID") or it.get("refNo") or it.get("id") or ""),
                    "amount": float(it.get("amount") or it.get("creditAmount") or 0),
                    "content": str(it.get("description") or it.get("content") or ""),
                    "time": str(it.get("transactionDate") or it.get("date") or "")
                })

        return {
            "success": True,
            "message": f"Kết nối ngân hàng thành công! Đã lấy được {len(items)} giao dịch gần nhất.",
            "total_found": len(items),
            "transactions": sample_txs
        }
