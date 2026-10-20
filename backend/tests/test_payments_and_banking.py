# -*- coding: utf-8 -*-
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from database import SessionLocal
import models

client = TestClient(app)

def test_get_vip_plans():
    response = client.get("/api/payments/plans")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["plans"]) >= 3
    plan_ids = [p["id"] for p in data["plans"]]
    assert "vip_1m" in plan_ids
    assert "vip_6m" in plan_ids
    assert "vip_lifetime" in plan_ids

def test_get_public_bank_info():
    response = client.get("/api/payments/bank-info")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "bank_name" in data
    assert "account_number" in data
    assert "demo_qr_url" in data
    assert len(data["bank_directory"]) >= 8

def test_create_order_and_auto_match_webhook():
    # 1. Login demo student
    r_login = client.post("/api/auth/demo", json={"role": "student"})
    assert r_login.status_code == 200
    token = r_login.json()["access_token"]
    student_id = r_login.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create VIP order
    r_order = client.post("/api/payments/create-order", json={"plan_id": "vip_6m"}, headers=headers)
    assert r_order.status_code == 200
    order_data = r_order.json()["order"]
    order_id = order_data["order_id"]
    memo = order_data["transaction_code"]
    amount = order_data["amount"]
    qr_url = order_data["qr_url"]

    assert order_data["status"] == "PENDING"
    assert "vietqr.io" in qr_url
    assert str(student_id) in memo

    # 3. Check status before payment
    r_status_before = client.get(f"/api/payments/status/{memo}")
    assert r_status_before.status_code == 200
    assert r_status_before.json()["is_completed"] is False

    # 4. Bank Webhook transfer
    bank_tx_id = f"MB_PYTEST_{order_id}_A99"
    webhook_payload = {
        "transaction_id": bank_tx_id,
        "amount": amount,
        "content": f"CHUYEN KHOAN HOC PHI {memo} TU NGUYEN VAN A"
    }
    r_webhook = client.post("/api/payments/webhook", json=webhook_payload)
    assert r_webhook.status_code == 200
    wh_data = r_webhook.json()
    assert wh_data["result"]["status"] == "success"

    # 5. Check status after webhook
    r_status_after = client.get(f"/api/payments/status/{memo}")
    assert r_status_after.status_code == 200
    assert r_status_after.json()["is_completed"] is True
    assert r_status_after.json()["payment_status"] == "COMPLETED"

    # 6. Verify user is now VIP
    r_me = client.get("/api/auth/me", headers=headers)
    assert r_me.status_code == 200
    assert r_me.json()["role"] == "vip"

    # 7. Test Idempotency: replay webhook with same transaction_id
    r_replay = client.post("/api/payments/webhook", json=webhook_payload)
    assert r_replay.status_code == 200
    assert r_replay.json()["result"]["status"] == "already_processed"

def test_admin_manual_approval():
    # 1. Login student & create order
    r_student = client.post("/api/auth/demo", json={"role": "student"})
    student_token = r_student.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    r_order = client.post("/api/payments/create-order", json={"plan_id": "vip_1m"}, headers=student_headers)
    order_id = r_order.json()["order"]["order_id"]

    # 2. Login admin
    r_admin = client.post("/api/auth/demo", json={"role": "admin"})
    admin_token = r_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Admin manually approves
    r_approve = client.post(f"/api/admin/payments/{order_id}/approve", headers=admin_headers)
    assert r_approve.status_code == 200
    assert r_approve.json()["status"] == "success"

    # 4. Verify student is now VIP
    r_me = client.get("/api/auth/me", headers=student_headers)
    assert r_me.json()["role"] == "vip"

def test_admin_banking_config_and_stats():
    r_admin = client.post("/api/auth/demo", json={"role": "admin"})
    admin_token = r_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Get banking config
    r_cfg = client.get("/api/admin/banking/config", headers=admin_headers)
    assert r_cfg.status_code == 200
    cfg = r_cfg.json()["config"]
    assert "bank_name" in cfg
    assert "account_number" in cfg

    # Update config
    update_payload = {
        "enabled": True,
        "bank_name": "MB Bank",
        "bank_code": "MBBANK",
        "account_number": "0868133346",
        "account_name": "NGUYEN THE TRUONG",
        "content_prefix": "TOEIC"
    }
    r_update = client.put("/api/admin/banking/config", json=update_payload, headers=admin_headers)
    assert r_update.status_code == 200
    assert r_update.json()["status"] == "success"

    # Get banking stats
    r_stats = client.get("/api/admin/banking/stats", headers=admin_headers)
    assert r_stats.status_code == 200
    assert "total_orders" in r_stats.json()
    assert "total_revenue" in r_stats.json()

    # Get banking transactions
    r_txs = client.get("/api/admin/banking/transactions", headers=admin_headers)
    assert r_txs.status_code == 200
    assert "transactions" in r_txs.json()