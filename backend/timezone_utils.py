# -*- coding: utf-8 -*-
from datetime import datetime, timezone, timedelta, time
from typing import Optional

# Vietnam timezone (UTC+7 / Asia/Saigon)
VN_TZ_OFFSET = timedelta(hours=7)
VN_TIMEZONE = timezone(VN_TZ_OFFSET)

def to_vn_datetime(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Converts a datetime (assumed naive UTC if no tzinfo) to Vietnam timezone (UTC+7).
    Returns an aware datetime with tzinfo=VN_TIMEZONE.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        # SQLite stores naive UTC
        return dt.replace(tzinfo=timezone.utc).astimezone(VN_TIMEZONE)
    return dt.astimezone(VN_TIMEZONE)

def to_iso_utc(dt: Optional[datetime]) -> Optional[str]:
    """
    Converts a datetime to ISO 8601 UTC string ending with 'Z'.
    E.g. '2026-09-29T03:02:00.123456Z'.
    Allows client browsers to parse accurately with new Date(...).
    """
    if dt is None:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    iso = dt.isoformat()
    if not iso.endswith("Z") and "+" not in iso:
        iso += "Z"
    return iso

def format_vn_time(dt: Optional[datetime], fmt: str = "%H:%M") -> str:
    """
    Converts UTC datetime to Vietnam timezone and formats it.
    Default format is '%H:%M' (e.g. '10:02').
    """
    if dt is None:
        return ""
    vn_dt = to_vn_datetime(dt)
    return vn_dt.strftime(fmt)

def format_vn_datetime(dt: Optional[datetime], fmt: str = "%d/%m/%Y %H:%M") -> str:
    """
    Converts UTC datetime to Vietnam timezone and formats date and time.
    """
    if dt is None:
        return ""
    vn_dt = to_vn_datetime(dt)
    return vn_dt.strftime(fmt)

def format_relative_time_vn(dt: Optional[datetime]) -> str:
    """
    Converts UTC datetime to friendly Vietnamese relative time:
    - Under 60s: 'Vừa xong'
    - Under 60m: 'X phút trước'
    - Under 24h: 'khoảng X giờ trước' (or '%H:%M' if today)
    - 24h or more: '%d/%m %H:%M'
    """
    if dt is None:
        return "Vừa xong"
    now = datetime.utcnow()
    raw_dt = dt.replace(tzinfo=None) if dt.tzinfo else dt
    diff = now - raw_dt
    total_sec = diff.total_seconds()
    if total_sec < 60:
        return "Vừa xong"
    elif total_sec < 3600:
        return f"{int(total_sec / 60)} phút trước"
    elif total_sec < 86400:
        vn_now = to_vn_datetime(now)
        vn_dt = to_vn_datetime(dt)
        if vn_now and vn_dt and vn_now.date() == vn_dt.date():
            return vn_dt.strftime("%H:%M")
        return f"khoảng {int(total_sec / 3600)} giờ trước"
    else:
        return format_vn_time(dt, "%d/%m %H:%M")

def get_now_vn() -> datetime:
    """Returns current aware datetime in Vietnam timezone"""
    return datetime.now(VN_TIMEZONE)

def get_today_vn_date():
    """Returns current date in Vietnam timezone"""
    return datetime.now(VN_TIMEZONE).date()

def get_vn_day_start_utc() -> datetime:
    """Returns the UTC datetime corresponding to 00:00:00 (midnight) today in Vietnam"""
    vn_today = get_today_vn_date()
    return datetime.combine(vn_today, time.min) - VN_TZ_OFFSET