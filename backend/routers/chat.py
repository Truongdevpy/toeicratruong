import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Set, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from database import get_db, SessionLocal
import models
from auth import get_current_user, get_current_user_optional, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from timezone_utils import to_vn_datetime, to_iso_utc, format_vn_time, format_relative_time_vn

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Online baseline count (realtime dynamic: 128 + len(active_connections))
BASE_ONLINE_COUNT = 247

class ConnectionManager:
    def __init__(self):
        # user_id -> set of active WebSockets
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # anonymous or guest sockets
        self.guest_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None):
        await websocket.accept()
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(websocket)
        else:
            self.guest_connections.add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: Optional[int] = None):
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        self.guest_connections.discard(websocket)

    def get_online_user_ids(self) -> Set[int]:
        return set(self.user_connections.keys())

    def get_total_online(self) -> int:
        return BASE_ONLINE_COUNT + len(self.user_connections) + len(self.guest_connections)

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.user_connections:
            dead = set()
            for ws in self.user_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.user_connections[user_id].discard(ws)

    async def broadcast(self, message: dict):
        all_conns = list(self.guest_connections)
        for conns in self.user_connections.values():
            all_conns.extend(conns)
        for ws in all_conns:
            try:
                await ws.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

def authenticate_token(token: str, db: Session) -> Optional[models.User]:
    if not token:
        return None
    try:
        clean_token = token.replace("Bearer ", "").strip()
        payload = jwt.decode(clean_token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub:
            if str(sub).isdigit():
                return db.query(models.User).filter(models.User.id == int(sub)).first()
            return db.query(models.User).filter(models.User.email == str(sub)).first()
        email = payload.get("email")
        if email:
            return db.query(models.User).filter(models.User.email == email).first()
        return None
    except Exception:
        return None

# Active community learners for realistic online interaction
ONLINE_COMMUNITY_MEMBERS = [
    {
        "id": 101,
        "full_name": "Nguyễn Thu Hà",
        "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        "target_score": 850,
        "current_score": 790,
        "role": "Top 1 Tuần này",
        "is_online": True,
        "last_active": "Vừa xong"
    },
    {
        "id": 102,
        "full_name": "Trần Minh Quân",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        "target_score": 750,
        "current_score": 680,
        "role": "Thành viên tích cực",
        "is_online": True,
        "last_active": "1 phút trước"
    },
    {
        "id": 103,
        "full_name": "Lê Bảo Anh",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        "target_score": 900,
        "current_score": 845,
        "role": "Chuyên gia Part 7",
        "is_online": True,
        "last_active": "Vừa xong"
    },
    {
        "id": 104,
        "full_name": "Phạm Hoàng Long",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        "target_score": 650,
        "current_score": 580,
        "role": "Đang bứt phá",
        "is_online": True,
        "last_active": "3 phút trước"
    },
    {
        "id": 105,
        "full_name": "Vũ Mai Phương",
        "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
        "target_score": 800,
        "current_score": 725,
        "role": "Chiến thần Chép chính tả",
        "is_online": True,
        "last_active": "5 phút trước"
    }
]


# -------------------------------------------------------------
# Community Public Chat Messages (Database Persisted - Group B)
# -------------------------------------------------------------
def ensure_seed_community_messages(db: Session):
    count = db.query(models.CommunityChatMessage).count()
    if count == 0:
        seeds = [
            {
                "sender_id": 902,
                "sender_name": "Trung",
                "sender_avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                "reply_to_json": json.dumps({"sender_name": "Thiên Duy", "content": "Em cũng mua khóa pre trọn đời từ web trước rồi ạ, em liên hệ qua đâu để được hỗ trợ vậy ạ?"}, ensure_ascii=False),
                "content": "trên menu có nút liên hệ á bạn",
                "created_at": datetime.utcnow() - timedelta(hours=2)
            },
            {
                "sender_id": 903,
                "sender_name": "Thái Đỗ",
                "sender_avatar": "",
                "reply_to_json": None,
                "content": "dạ em mua khóa pro web trước giờ có cần liên hệ để khôi phục hay đợi cập nhập ạ?",
                "created_at": datetime.utcnow() - timedelta(hours=2)
            },
            {
                "sender_id": 902,
                "sender_name": "Trung",
                "sender_avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                "reply_to_json": None,
                "content": "các bạn ko vội chờ tầm 1 tuần nữa mình khôi phục lại hết nha",
                "created_at": datetime.utcnow() - timedelta(hours=1)
            },
            {
                "sender_id": 904,
                "sender_name": "Phạm Đình Trung",
                "sender_avatar": "",
                "reply_to_json": None,
                "content": "website có thể phát triển thêm chức năng luyện nói được không ạ.",
                "created_at": datetime.utcnow() - timedelta(hours=1)
            }
        ]
        for s in seeds:
            msg = models.CommunityChatMessage(
                sender_id=s["sender_id"],
                sender_name=s["sender_name"],
                sender_avatar=s["sender_avatar"],
                reply_to_json=s["reply_to_json"],
                content=s["content"],
                created_at=s["created_at"]
            )
            db.add(msg)
        try:
            db.commit()
        except Exception:
            db.rollback()

@router.get("/community/messages")
def get_community_messages(
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ensure_seed_community_messages(db)
    messages = db.query(models.CommunityChatMessage).order_by(
        models.CommunityChatMessage.created_at.asc()
    ).all()

    now = datetime.utcnow()
    users_map = {u.id: u for u in db.query(models.User).all()}
    results = []
    for m in messages:
        diff = now - (m.created_at or now)
        if diff.total_seconds() < 60:
            time_str = "Vừa xong"
        elif diff.total_seconds() < 3600:
            time_str = f"{int(diff.total_seconds() / 60)} phút trước"
        elif diff.total_seconds() < 86400:
            time_str = f"khoảng {int(diff.total_seconds() / 3600)} giờ trước"
        else:
            time_str = format_vn_time(m.created_at, "%d/%m %H:%M") if m.created_at else ""

        reply_obj = None
        if m.reply_to_json:
            try:
                reply_obj = json.loads(m.reply_to_json)
            except Exception:
                pass

        s_name = m.sender_name
        s_avatar = m.sender_avatar
        if m.sender_id and m.sender_id in users_map:
            u_obj = users_map[m.sender_id]
            if u_obj.full_name:
                s_name = u_obj.full_name
            if u_obj.avatar_url:
                s_avatar = u_obj.avatar_url

        results.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": s_name,
            "sender_avatar": s_avatar,
            "reply_to": reply_obj,
            "content": m.content,
            "created_at": time_str,
            "created_at_raw": to_iso_utc(m.created_at),
            "is_mine": (user and m.sender_id == user.id) if user else False
        })

    return {
        "total": len(results),
        "messages": results
    }

@router.post("/community/messages")
async def send_community_message(
    payload: dict,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = (payload.get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống")

    sender_name = user.full_name
    sender_avatar = user.avatar_url or ""
    sender_id = user.id

    reply_to = payload.get("reply_to")
    reply_to_json = json.dumps(reply_to, ensure_ascii=False) if reply_to else None

    db_msg = models.CommunityChatMessage(
        sender_id=sender_id,
        sender_name=sender_name,
        sender_avatar=sender_avatar,
        reply_to_json=reply_to_json,
        content=content,
        created_at=datetime.utcnow()
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)

    new_msg = {
        "id": db_msg.id,
        "sender_id": sender_id,
        "sender_name": sender_name,
        "sender_avatar": sender_avatar,
        "reply_to": reply_to,
        "content": content,
        "created_at": "Vừa xong",
        "is_mine": True
    }

    # Broadcast to all connected WebSocket clients
    broadcast_payload = {
        "type": "community_message",
        "message": {
            **new_msg,
            "is_mine": False
        }
    }
    await manager.broadcast(broadcast_payload)

    return new_msg

@router.get("/online-users")
def get_online_users(db: Session = Depends(get_db)):
    # Query real registered users
    real_users = db.query(models.User).filter(models.User.is_active == True).limit(20).all()
    user_list = []
    
    # Include sample online learners
    user_list.extend(ONLINE_COMMUNITY_MEMBERS)

    # Append real users
    for u in real_users:
        if not any(m["id"] == u.id for m in user_list):
            user_list.append({
                "id": u.id,
                "full_name": u.full_name,
                "avatar_url": u.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "target_score": u.profile.target_score if u.profile else 700,
                "current_score": u.profile.current_score if u.profile else 500,
                "role": "Học viên",
                "is_online": u.id in manager.get_online_user_ids() or True,
                "last_active": "Vừa xong"
            })

    total_count = manager.get_total_online()
    return {
        "total_online": total_count,
        "display_text": f"● {total_count} người đang online",
        "users": user_list
    }

def ensure_initial_seed_messages(user_id: int, db: Session):
    # Check if user has any messages
    count = db.query(models.PrivateMessage).filter(
        or_(models.PrivateMessage.sender_id == user_id, models.PrivateMessage.recipient_id == user_id)
    ).count()

    if count == 0:
        # Seed 2 realistic initial messages from active learners
        # Ensure dummy user records exist or create message records
        seeds = [
            (101, "Chào bạn! Hôm nay bạn luyện Part 5 được bao nhiêu điểm rồi?", False, 15),
            (102, "Mình vừa làm thử đề ETS 2024 Test 1 được 765 điểm, có câu 135 bẫy ngữ pháp khá hay!", False, 5)
        ]
        for sender_id, text, is_read, minutes_ago in seeds:
            msg = models.PrivateMessage(
                sender_id=sender_id,
                recipient_id=user_id,
                content=text,
                is_read=is_read,
                created_at=datetime.utcnow() - timedelta(minutes=minutes_ago)
            )
            db.add(msg)
        try:
            db.commit()
        except Exception:
            db.rollback()

@router.get("/conversations")
def get_conversations(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ensure_initial_seed_messages(user.id, db)

    # Query all messages involving current user
    messages = db.query(models.PrivateMessage).filter(
        or_(models.PrivateMessage.sender_id == user.id, models.PrivateMessage.recipient_id == user.id)
    ).order_by(models.PrivateMessage.created_at.desc()).all()

    threads = {}
    for m in messages:
        other_id = m.recipient_id if m.sender_id == user.id else m.sender_id
        if other_id not in threads:
            threads[other_id] = {
                "user_id": other_id,
                "last_message": m.content,
                "last_message_at": format_vn_time(m.created_at, "%H:%M • %d/%m"),
                "last_message_raw": to_iso_utc(m.created_at),
                "is_mine": m.sender_id == user.id,
                "unread_count": 0
            }
        if m.recipient_id == user.id and not m.is_read:
            threads[other_id]["unread_count"] += 1

    # Enrich threads with user details
    results = []
    for other_id, thread in threads.items():
        # Check ONLINE_COMMUNITY_MEMBERS
        mock_u = next((u for u in ONLINE_COMMUNITY_MEMBERS if u["id"] == other_id), None)
        if mock_u:
            thread["full_name"] = mock_u["full_name"]
            thread["avatar_url"] = mock_u["avatar_url"]
            thread["target_score"] = mock_u["target_score"]
            thread["is_online"] = True
        else:
            db_u = db.query(models.User).filter(models.User.id == other_id).first()
            if db_u:
                thread["full_name"] = db_u.full_name
                thread["avatar_url"] = db_u.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                thread["target_score"] = db_u.profile.target_score if db_u.profile else 750
                thread["is_online"] = other_id in manager.get_online_user_ids()
            else:
                thread["full_name"] = f"Học viên #{other_id}"
                thread["avatar_url"] = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                thread["target_score"] = 700
                thread["is_online"] = False

        results.append(thread)

    results.sort(key=lambda x: x["last_message_raw"], reverse=True)
    total_unread = sum(r["unread_count"] for r in results)

    return {
        "conversations": results,
        "total_unread": total_unread
    }

@router.get("/conversations/{other_user_id}/messages")
def get_messages(
    other_user_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ensure_initial_seed_messages(user.id, db)

    # Automatically mark unread incoming messages from other_user_id as read
    unreads = db.query(models.PrivateMessage).filter(
        models.PrivateMessage.sender_id == other_user_id,
        models.PrivateMessage.recipient_id == user.id,
        models.PrivateMessage.is_read == False
    ).all()
    for u in unreads:
        u.is_read = True
        u.read_at = datetime.utcnow()
    if unreads:
        db.commit()

    messages = db.query(models.PrivateMessage).filter(
        or_(
            and_(models.PrivateMessage.sender_id == user.id, models.PrivateMessage.recipient_id == other_user_id),
            and_(models.PrivateMessage.sender_id == other_user_id, models.PrivateMessage.recipient_id == user.id)
        )
    ).order_by(models.PrivateMessage.created_at.asc()).all()

    # Recipient profile info
    other_u = next((u for u in ONLINE_COMMUNITY_MEMBERS if u["id"] == other_user_id), None)
    if not other_u:
        db_u = db.query(models.User).filter(models.User.id == other_user_id).first()
        if db_u:
            other_u = {
                "id": db_u.id,
                "full_name": db_u.full_name,
                "avatar_url": db_u.avatar_url,
                "target_score": db_u.profile.target_score if db_u.profile else 700,
                "is_online": db_u.id in manager.get_online_user_ids()
            }
        else:
            other_u = {
                "id": other_user_id,
                "full_name": f"Học viên #{other_user_id}",
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "target_score": 700,
                "is_online": True
            }

    formatted = []
    sender_ids = {m.sender_id for m in messages if m.sender_id} | {user.id, other_user_id}
    users_db = db.query(models.User).filter(models.User.id.in_(sender_ids)).all()
    users_dict = {u.id: u for u in users_db}

    for m in messages:
        s_user = users_dict.get(m.sender_id)
        if s_user:
            s_name = s_user.full_name
            s_avatar = s_user.avatar_url or ""
        elif m.sender_id == user.id:
            s_name = user.full_name
            s_avatar = user.avatar_url or ""
        else:
            seed_mem = next((cm for cm in ONLINE_COMMUNITY_MEMBERS if cm["id"] == m.sender_id), None)
            s_name = seed_mem["full_name"] if seed_mem else f"Học viên #{m.sender_id}"
            s_avatar = seed_mem["avatar_url"] if seed_mem else ""

        formatted.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": s_name,
            "sender_avatar": s_avatar,
            "recipient_id": m.recipient_id,
            "content": m.content,
            "is_mine": m.sender_id == user.id,
            "is_read": m.is_read,
            "read_at": to_iso_utc(m.read_at),
            "created_at": format_vn_time(m.created_at, "%H:%M"),
            "created_at_raw": to_iso_utc(m.created_at)
        })

    return {
        "other_user": other_u,
        "messages": formatted
    }

@router.post("/conversations/{other_user_id}/send")
async def send_message(
    other_user_id: int,
    data: dict,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = (data.get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống")

    new_msg = models.PrivateMessage(
        sender_id=user.id,
        recipient_id=other_user_id,
        content=content,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    payload = {
        "type": "new_message",
        "message": {
            "id": new_msg.id,
            "sender_id": user.id,
            "sender_name": user.full_name,
            "sender_avatar": user.avatar_url,
            "recipient_id": other_user_id,
            "content": new_msg.content,
            "is_read": False,
            "created_at": format_vn_time(new_msg.created_at, "%H:%M"),
            "created_at_raw": to_iso_utc(new_msg.created_at)
        }
    }

    # Notify recipient via WebSocket if online
    await manager.send_to_user(other_user_id, payload)

    # Auto-reply simulation for sample AI learners (if user is chatting with 101, 102...)
    if other_user_id in (101, 102, 103, 104, 105):
        async def delayed_reply():
            await asyncio.sleep(2)
            replies = {
                101: "Cảm ơn bạn đã nhắn tin! Hôm nay mình đang ôn các collocation Part 5, có mẹo nào hay chia sẻ cùng nhé!",
                102: "Chúc bạn luyện thi đạt điểm cao! Nếu cần thảo luận câu khó cứ nhắn mình nhé.",
                103: "Đoạn văn Part 7 cần kỹ năng skim và scan nhanh, bạn thử áp dụng phương pháp đọc câu hỏi trước chưa?",
                104: "Mình đang cố gắng nâng band 650 mục tiêu ra trường. Cùng cố gắng nhé!",
                105: "Chép chính tả giúp phản xạ nghe các âm nối (linking sounds) cực kỳ hiệu quả đấy bạn!"
            }
            reply_text = replies.get(other_user_id, "Cảm ơn bạn! Cùng cố gắng ôn tập nhé!")
            reply_db = SessionLocal()
            try:
                reply_msg = models.PrivateMessage(
                    sender_id=other_user_id,
                    recipient_id=user.id,
                    content=reply_text,
                    is_read=False,
                    created_at=datetime.utcnow()
                )
                reply_db.add(reply_msg)
                reply_db.commit()
                reply_db.refresh(reply_msg)
                
                other_info = next((u for u in ONLINE_COMMUNITY_MEMBERS if u["id"] == other_user_id), None)
                reply_payload = {
                    "type": "new_message",
                    "message": {
                        "id": reply_msg.id,
                        "sender_id": other_user_id,
                        "sender_name": other_info["full_name"] if other_info else "Học viên",
                        "sender_avatar": other_info["avatar_url"] if other_info else "",
                        "recipient_id": user.id,
                        "content": reply_msg.content,
                        "is_read": False,
                        "created_at": format_vn_time(reply_msg.created_at, "%H:%M"),
                        "created_at_raw": to_iso_utc(reply_msg.created_at)
                    }
                }
                await manager.send_to_user(user.id, reply_payload)
            except Exception:
                pass
            finally:
                reply_db.close()

        asyncio.create_task(delayed_reply())

    return payload["message"]

@router.post("/typing")
async def send_typing(
    data: dict,
    user: models.User = Depends(get_current_user)
):
    recipient_id = data.get("recipient_id")
    is_typing = data.get("is_typing", True)
    if recipient_id:
        await manager.send_to_user(recipient_id, {
            "type": "typing",
            "sender_id": user.id,
            "sender_name": user.full_name,
            "is_typing": is_typing
        })
    return {"status": "ok"}

@router.post("/read")
async def mark_messages_read(
    data: dict,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sender_id = data.get("sender_id")
    if sender_id:
        unreads = db.query(models.PrivateMessage).filter(
            models.PrivateMessage.sender_id == sender_id,
            models.PrivateMessage.recipient_id == user.id,
            models.PrivateMessage.is_read == False
        ).all()
        for u in unreads:
            u.is_read = True
            u.read_at = datetime.utcnow()
        if unreads:
            db.commit()
            await manager.send_to_user(sender_id, {
                "type": "messages_read",
                "reader_id": user.id
            })
    return {"status": "ok"}

@router.websocket("/ws")
async def chat_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    user = authenticate_token(token, db) if token else None
    user_id = user.id if user else None

    await manager.connect(websocket, user_id)
    # Broadcast updated online count
    await manager.broadcast({
        "type": "online_count",
        "total_online": manager.get_total_online()
    })

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                continue

            event_type = data.get("type")

            if event_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif event_type == "authenticate":
                auth_tok = data.get("token")
                authed_u = authenticate_token(auth_tok, db)
                if authed_u:
                    user = authed_u
                    user_id = authed_u.id
                    manager.disconnect(websocket, None)
                    await manager.connect(websocket, user_id)
                    await websocket.send_json({"type": "authenticated", "user_id": user_id})

            elif event_type == "community_message":
                if not user_id or not user:
                    await websocket.send_json({"type": "error", "message": "Vui lòng đăng nhập để gửi tin nhắn"})
                    continue
                text_content = (data.get("content") or "").strip()
                if text_content:
                    c_msg = {
                        "id": len(COMMUNITY_MESSAGES) + 1,
                        "sender_id": user.id,
                        "sender_name": user.full_name,
                        "sender_avatar": user.avatar_url or "",
                        "reply_to": data.get("reply_to"),
                        "content": text_content,
                        "created_at": "Vừa xong",
                        "is_mine": False
                    }
                    COMMUNITY_MESSAGES.append(c_msg)
                    await manager.broadcast({"type": "community_message", "message": c_msg})

            elif event_type == "typing" and user_id:
                recipient_id = data.get("recipient_id")
                is_typing = data.get("is_typing", True)
                if recipient_id:
                    await manager.send_to_user(recipient_id, {
                        "type": "typing",
                        "sender_id": user_id,
                        "is_typing": is_typing
                    })

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        await manager.broadcast({
            "type": "online_count",
            "total_online": manager.get_total_online()
        })
    except Exception:
        manager.disconnect(websocket, user_id)


# -------------------------------------------------------------
# Friendship & Friend Requests System
# -------------------------------------------------------------
@router.get("/friends")
def get_friends_list(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Accepted friendships
    friendships = db.query(models.Friendship).filter(
        or_(models.Friendship.user_id == user.id, models.Friendship.friend_id == user.id),
        models.Friendship.status == "accepted"
    ).all()

    friend_ids = set()
    for f in friendships:
        fid = f.friend_id if f.user_id == user.id else f.user_id
        if fid != user.id:
            friend_ids.add(fid)

    # Initial friendly seed buddies if empty
    if len(friendships) == 0:
        seed_buddy_ids = [101, 102]
        for bid in seed_buddy_ids:
            db.add(models.Friendship(user_id=user.id, friend_id=bid, status="accepted"))
        db.commit()
        friend_ids = set(seed_buddy_ids)

    friends_list = []
    # Real DB users
    db_friends = db.query(models.User).filter(models.User.id.in_(friend_ids)).all() if friend_ids else []
    for df in db_friends:
        friends_list.append({
            "id": df.id,
            "full_name": df.full_name,
            "avatar_url": df.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            "target_score": df.profile.target_score if df.profile else 750,
            "current_score": df.profile.current_score if df.profile else 650,
            "is_online": True,
            "status": "accepted"
        })
    # Online community members
    for fid in friend_ids:
        if not any(f["id"] == fid for f in friends_list):
            mem = next((m for m in ONLINE_COMMUNITY_MEMBERS if m["id"] == fid), None)
            if mem:
                friends_list.append({
                    "id": mem["id"],
                    "full_name": mem["full_name"],
                    "avatar_url": mem["avatar_url"],
                    "target_score": mem.get("target_score", 800),
                    "current_score": mem.get("current_score", 700),
                    "is_online": True,
                    "status": "accepted"
                })

    # 2. Incoming friend requests (friend_id == user.id, status == 'pending')
    incoming_reqs = db.query(models.Friendship).filter(
        models.Friendship.friend_id == user.id,
        models.Friendship.status == "pending"
    ).all()

    incoming_list = []
    for req in incoming_reqs:
        req_user = db.query(models.User).filter(models.User.id == req.user_id).first()
        mem_user = next((m for m in ONLINE_COMMUNITY_MEMBERS if m["id"] == req.user_id), None)
        incoming_list.append({
            "request_id": req.id,
            "user_id": req.user_id,
            "full_name": req_user.full_name if req_user else (mem_user["full_name"] if mem_user else f"Học viên #{req.user_id}"),
            "avatar_url": (req_user.avatar_url if req_user else None) or (mem_user["avatar_url"] if mem_user else "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"),
            "target_score": req_user.profile.target_score if (req_user and req_user.profile) else 750,
            "created_at": "Vừa xong"
        })

    # Seed 1 incoming request on first load so user can test Accept/Reject immediately
    has_seed_req = db.query(models.Friendship).filter(
        models.Friendship.friend_id == user.id,
        models.Friendship.user_id == 103
    ).first()
    if not has_seed_req and len(incoming_list) == 0:
        seed_req = models.Friendship(user_id=103, friend_id=user.id, status="pending")
        db.add(seed_req)
        db.commit()
        db.refresh(seed_req)
        mem103 = next((m for m in ONLINE_COMMUNITY_MEMBERS if m["id"] == 103), None)
        incoming_list.append({
            "request_id": seed_req.id,
            "user_id": 103,
            "full_name": mem103["full_name"] if mem103 else "Lê Bảo Anh",
            "avatar_url": mem103["avatar_url"] if mem103 else "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            "target_score": 900,
            "created_at": "Vừa xong"
        })

    # 3. Outgoing requests
    outgoing_reqs = db.query(models.Friendship).filter(
        models.Friendship.user_id == user.id,
        models.Friendship.status == "pending"
    ).all()
    outgoing_list = []
    for req in outgoing_reqs:
        req_target = db.query(models.User).filter(models.User.id == req.friend_id).first()
        mem_target = next((m for m in ONLINE_COMMUNITY_MEMBERS if m["id"] == req.friend_id), None)
        name = req_target.full_name if req_target else (mem_target["full_name"] if mem_target else f"Học viên #{req.friend_id}")
        outgoing_list.append({
            "request_id": req.id,
            "user_id": req.friend_id,
            "full_name": name,
            "created_at": "Hôm nay"
        })

    return {
        "friends": friends_list,
        "incoming_requests": incoming_list,
        "outgoing_requests": outgoing_list
    }

@router.post("/friends/request")
def send_friend_request(
    payload: dict,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_id = payload.get("friend_id") or payload.get("user_id")
    if not target_id:
        raise HTTPException(status_code=400, detail="Thiếu thông tin người dùng cần kết bạn")
    if target_id == user.id:
        raise HTTPException(status_code=400, detail="Không thể tự kết bạn với chính mình")

    existing = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == user.id, models.Friendship.friend_id == target_id),
            and_(models.Friendship.user_id == target_id, models.Friendship.friend_id == user.id)
        )
    ).first()

    if existing:
        if existing.status == "accepted":
            return {"status": "success", "message": "Hai bạn đã là bạn bè của nhau rồi!"}
        if existing.user_id == user.id:
            return {"status": "success", "message": "Bạn đã gửi lời mời kết bạn trước đó rồi."}
        else:
            existing.status = "accepted"
            db.commit()
            return {"status": "success", "message": "Đã chấp nhận lời mời kết bạn thành công!"}

    # If target is online community member, auto accept!
    is_community_bot = any(m["id"] == target_id for m in ONLINE_COMMUNITY_MEMBERS)
    status_val = "accepted" if is_community_bot else "pending"

    new_f = models.Friendship(user_id=user.id, friend_id=target_id, status=status_val)
    db.add(new_f)
    db.commit()

    target_name = next((m["full_name"] for m in ONLINE_COMMUNITY_MEMBERS if m["id"] == target_id), None)
    if not target_name:
        db_u = db.query(models.User).filter(models.User.id == target_id).first()
        target_name = db_u.full_name if db_u else "học viên"

    msg = f"Đã kết bạn thành công với {target_name}!" if status_val == "accepted" else f"Đã gửi lời mời kết bạn tới {target_name}!"
    return {"status": "success", "message": msg}

@router.post("/friends/respond")
def respond_friend_request(
    payload: dict,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    request_id = payload.get("request_id")
    action = payload.get("action")  # "accept" or "reject"
    if not request_id:
        raise HTTPException(status_code=400, detail="Thiếu mã yêu cầu kết bạn")

    req = db.query(models.Friendship).filter(models.Friendship.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy lời mời kết bạn")

    if action == "accept":
        req.status = "accepted"
        db.commit()
        return {"status": "success", "message": "Đã chấp nhận kết bạn thành công!"}
    else:
        db.delete(req)
        db.commit()
        return {"status": "success", "message": "Đã từ chối lời mời kết bạn."}

@router.get("/friends/status/{target_id}")
def get_friendship_status(
    target_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    f = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == user.id, models.Friendship.friend_id == target_id),
            and_(models.Friendship.user_id == target_id, models.Friendship.friend_id == user.id)
        )
    ).first()
    if not f:
        return {"status": "none", "request_id": None}
    if f.status == "accepted":
        return {"status": "friends", "request_id": f.id}
    if f.user_id == user.id:
        return {"status": "pending_sent", "request_id": f.id}
    return {"status": "pending_received", "request_id": f.id}

@router.post("/friends/remove")
def remove_friend(
    payload: dict,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    friend_id = payload.get("friend_id")
    f = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == user.id, models.Friendship.friend_id == friend_id),
            and_(models.Friendship.user_id == friend_id, models.Friendship.friend_id == user.id)
        )
    ).first()
    if f:
        db.delete(f)
        db.commit()
    return {"status": "success", "message": "Đã hủy kết bạn thành công"}
