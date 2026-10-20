import hmac
import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
import models
from auth import get_current_user, get_current_user_optional, require_admin
from payments import PaymentService, VietQRHelper, VIP_PLANS, BANK_DIRECTORY

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["Payments & VIP Subscription"])

@router.get("/plans")
def get_vip_plans():
    """Returns available VIP subscription plans."""
    return {
        "status": "success",
        "plans": VIP_PLANS
    }

@router.get("/bank-info")
def get_public_bank_info(db: Session = Depends(get_db)):
    """Returns public banking transfer details and QR configuration."""
    cfg = PaymentService.get_banking_config(db)
    template = cfg.get("vietqr_template") or "compact2"
    bank_code = cfg.get("bank_code") or "MBBANK"
    account_no = cfg.get("account_number") or ""
    account_name = cfg.get("account_name") or ""
    content_prefix = cfg.get("content_prefix") or "TOEIC"

    demo_qr = VietQRHelper.generate_qr_url(
        bank_code=bank_code,
        account_no=account_no,
        amount=499000,
        memo=f"{content_prefix} DEMO123",
        template=template,
        account_holder=account_name
    )

    return {
        "status": "success",
        "enabled": bool(cfg.get("enabled")),
        "bank_name": cfg.get("bank_name") or "MB Bank",
        "bank_code": bank_code,
        "bank_bin": cfg.get("bank_bin") or "970422",
        "account_number": account_no,
        "account_name": account_name,
        "content_prefix": content_prefix,
        "vietqr_template": template,
        "demo_qr_url": demo_qr,
        "bank_directory": BANK_DIRECTORY
    }

@router.post("/create-order")
def create_vip_order(
    payload: Dict[str, Any],
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a new payment order for purchasing VIP package."""
    plan_id = str(payload.get("plan_id") or "vip_6m").strip()
    order_data = PaymentService.create_vip_order(db=db, user=user, plan_id=plan_id)
    return {
        "status": "success",
        "message": "Đã tạo đơn hàng VIP thành công. Vui lòng quét mã QR để chuyển khoản.",
        "order": order_data
    }

@router.get("/order/{order_id}")
def get_order_details(
    order_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves payment order details and latest status."""
    payment = db.query(models.Payment).filter(
        models.Payment.id == order_id,
        models.Payment.user_id == user.id
    ).first()

    if not payment and user.role == "admin":
        payment = db.query(models.Payment).filter(models.Payment.id == order_id).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng thanh toán.")

    cfg = PaymentService.get_banking_config(db)
    qr_url = VietQRHelper.generate_qr_url(
        bank_code=cfg.get("bank_code") or "MBBANK",
        account_no=cfg.get("account_number") or "",
        amount=payment.amount,
        memo=payment.transaction_code,
        template=cfg.get("vietqr_template") or "compact2",
        account_holder=cfg.get("account_name") or ""
    )

    return {
        "status": "success",
        "order": {
            "id": payment.id,
            "user_id": payment.user_id,
            "plan_id": payment.plan_id,
            "plan_name": payment.plan_name,
            "amount": payment.amount,
            "formatted_amount": f"{int(payment.amount):,} đ",
            "transaction_code": payment.transaction_code,
            "status": payment.status,
            "bank_name": cfg.get("bank_name") or "MB Bank",
            "bank_code": cfg.get("bank_code") or "MBBANK",
            "bank_bin": cfg.get("bank_bin") or "970422",
            "account_number": cfg.get("account_number") or "",
            "account_name": cfg.get("account_name") or "",
            "qr_url": qr_url,
            "gateway_reference": payment.gateway_reference,
            "created_at": payment.created_at.isoformat() if payment.created_at else None,
            "completed_at": payment.completed_at.isoformat() if payment.completed_at else None
        }
    }

@router.get("/status/{transaction_code}")
def check_transaction_status(
    transaction_code: str,
    db: Session = Depends(get_db)
):
    """
    Checks if a payment with given transaction_code is completed.
    Also optionally runs a lightweight sync if still pending and bank sync is configured.
    """
    clean_code = transaction_code.strip()
    payment = db.query(models.Payment).filter(
        models.Payment.transaction_code == clean_code
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã giao dịch đơn hàng.")

    # If pending, attempt auto-sync if token is available
    if payment.status == "PENDING":
        cfg = PaymentService.get_banking_config(db)
        if cfg.get("enabled") and (cfg.get("token") or cfg.get("api_url")):
            try:
                PaymentService.sync_mbbank(db)
                db.refresh(payment)
            except Exception as e:
                logger.warning(f"Auto-sync on status check skipped: {e}")

    return {
        "status": "success",
        "payment_status": payment.status,
        "is_completed": payment.status == "COMPLETED",
        "order_id": payment.id,
        "transaction_code": payment.transaction_code,
        "amount": payment.amount,
        "plan_name": payment.plan_name,
        "completed_at": payment.completed_at.isoformat() if payment.completed_at else None
    }

@router.post("/check-now/{order_id}")
def check_order_now(
    order_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    User clicks 'Tôi đã chuyển khoản - Kiểm tra ngay':
    Triggers bank sync and immediately checks if order is matched.
    """
    payment = db.query(models.Payment).filter(
        models.Payment.id == order_id,
        models.Payment.user_id == user.id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng.")

    if payment.status == "COMPLETED":
        return {
            "status": "success",
            "is_completed": True,
            "message": "Đơn hàng đã được thanh toán và kích hoạt VIP Pro thành công!",
            "order_id": payment.id,
            "payment_status": payment.status
        }

    # Run bank sync
    sync_result = PaymentService.sync_mbbank(db)
    db.refresh(payment)

    if payment.status == "COMPLETED":
        return {
            "status": "success",
            "is_completed": True,
            "message": "Thanh toán thành công! Gói VIP Pro đã được kích hoạt trên tài khoản của bạn.",
            "order_id": payment.id,
            "payment_status": payment.status,
            "sync_result": sync_result
        }
    else:
        return {
            "status": "pending",
            "is_completed": False,
            "message": "Hệ thống đang kiểm tra giao dịch từ ngân hàng. Nếu bạn vừa chuyển khoản, vui lòng đợi thêm 10-30 giây để ngân hàng xử lý biến động số dư.",
            "order_id": payment.id,
            "payment_status": payment.status,
            "sync_result": sync_result
        }

@router.get("/history")
def get_user_payment_history(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns past orders and payment history of the current user."""
    payments = db.query(models.Payment).filter(
        models.Payment.user_id == user.id
    ).order_by(desc(models.Payment.id)).limit(30).all()

    return {
        "status": "success",
        "payments": [
            {
                "id": p.id,
                "plan_id": p.plan_id,
                "plan_name": p.plan_name,
                "amount": p.amount,
                "formatted_amount": f"{int(p.amount):,} đ",
                "transaction_code": p.transaction_code,
                "gateway_reference": p.gateway_reference,
                "status": p.status,
                "created_at": format_vn_datetime(p.created_at) if p.created_at else "",
                "completed_at": format_vn_datetime(p.completed_at) if p.completed_at else ""
            }
            for p in payments
        ]
    }

@router.post("/webhook")
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook receiver for SePay / MBBank / Cass / Third-party Payment Gateway.
    Idempotently checks content against pending VIP orders and activates VIP.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON payload.")

    cfg = PaymentService.get_banking_config(db)
    secret = (cfg.get("webhook_secret") or "").strip()
    if secret:
        received_sig = (
            request.headers.get("X-Webhook-Signature") or
            request.headers.get("X-SePay-Signature") or
            request.headers.get("Authorization") or ""
        ).strip()
        if received_sig.lower().startswith("bearer "):
            received_sig = received_sig[7:].strip()
        elif received_sig.lower().startswith("apikey "):
            received_sig = received_sig[7:].strip()

        if not hmac.compare_digest(secret, received_sig):
            logger.warning("Webhook unauthorized: secret mismatch")
            raise HTTPException(status_code=401, detail="Webhook signature verification failed")
    
    # Extract transaction data (compatible with SePay, ThueAPI, MBBank webhook payloads)
    content = str(body.get("content") or body.get("description") or body.get("transaction_code") or body.get("memo") or "").strip()
    try:
        amount = float(body.get("transferAmount") or body.get("amount") or body.get("creditAmount") or 0)
    except Exception:
        amount = 0

    tx_id = str(body.get("transaction_id") or body.get("id") or body.get("referenceCode") or body.get("reference") or body.get("refNo") or "").strip()

    if not tx_id or amount <= 0:
        return {"status": "ignored", "message": "Missing tx_id or invalid amount."}

    # Record into BankTransaction
    bank_code = cfg.get("bank_code") or "MBBANK"
    existing_bt = db.query(models.BankTransaction).filter(
        models.BankTransaction.bank_transaction_id == tx_id
    ).first()

    if not existing_bt:
        existing_bt = models.BankTransaction(
            provider=bank_code,
            bank_transaction_id=tx_id,
            amount=amount,
            content=content,
            occurred_at=datetime.utcnow(),
            raw_payload=json.dumps(body, ensure_ascii=False),
            status="PENDING",
            created_at=datetime.utcnow()
        )
        db.add(existing_bt)
        db.commit()

    result = PaymentService.match_and_process_transaction(
        db=db,
        incoming_tx_id=tx_id,
        amount=amount,
        content=content,
        raw_payload=body
    )

    if result.get("status") == "success":
        existing_bt.status = "PROCESSED"
        existing_bt.processed_at = datetime.utcnow()
    else:
        existing_bt.status = "IGNORED"
        existing_bt.error_message = result.get("message")
    db.commit()

    return {"status": "ok", "result": result}

@router.post("/simulate-success")
def simulate_payment_success(
    payload: Dict[str, Any],
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test helper for developers/admins to test instant payment confirmation.
    """
    order_id = payload.get("order_id")
    payment = db.query(models.Payment).filter(models.Payment.id == order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng.")

    payment.status = "COMPLETED"
    payment.completed_at = datetime.utcnow()
    payment.gateway_reference = f"TEST_REF_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    target_user = payment.user
    if target_user:
        target_user.role = "vip"
        db.add(models.Notification(
            user_id=target_user.id,
            title="🎉 Nâng cấp VIP Pro thành công (Thử nghiệm)",
            message=f"Đơn hàng {payment.plan_name} đã được kích hoạt thành công trên tài khoản của bạn.",
            type="success",
            is_read=False,
            created_at=datetime.utcnow()
        ))
    db.commit()

    return {
        "status": "success",
        "message": f"Đã giả lập kích hoạt VIP thành công cho tài khoản {target_user.full_name}!",
        "order_id": payment.id
    }
