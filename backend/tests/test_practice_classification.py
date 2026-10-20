import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parent.parent))
from main import app

client = TestClient(app)

def test_part1_classification():
    res = client.get("/api/practice/part/1")
    assert res.status_code == 200
    data = res.json()
    assert "by_level" in data
    assert "by_photo_type" in data
    photo_types = data["by_photo_type"]
    assert "Tranh một người" in photo_types
    assert "Tranh nhiều người" in photo_types
    assert len(data["questions"]) > 0

def test_part2_12_question_types():
    res = client.get("/api/practice/part/2")
    assert res.status_code == 200
    data = res.json()
    assert "by_question_type" in data
    qtypes = data["by_question_type"]
    expected_types = [
        "Câu hỏi Who", "Câu hỏi When", "Câu hỏi Where", "Câu hỏi Why",
        "Câu hỏi What / Which", "Câu hỏi How", "Câu hỏi Be/Do/Have",
        "Câu hỏi Modal verb", "Câu hỏi lựa chọn", "Câu hỏi đuôi",
        "Câu hỏi phủ định", "Câu khẳng định"
    ]
    for et in expected_types:
        assert et in qtypes, f"Missing {et} in part 2"
    assert "Level 1" in data["by_level"]
    assert "Level 2" in data["by_level"]
    assert "Level 3" in data["by_level"]
    assert "Level 4" in data["by_level"]

def test_part3_special_types():
    res = client.get("/api/practice/part/3")
    assert res.status_code == 200
    data = res.json()
    assert "by_special_type" in data
    stypes = data["by_special_type"]
    assert "Có hình / bảng biểu" in stypes
    assert "Hội thoại 3 người nói" in stypes
    assert "Câu hỏi hàm ý người nói" in stypes

def test_part4_special_types():
    res = client.get("/api/practice/part/4")
    assert res.status_code == 200
    data = res.json()
    assert "by_special_type" in data
    stypes = data["by_special_type"]
    assert "Có hình / bảng biểu" in stypes
    assert "Câu hỏi hàm ý người nói" in stypes

def test_part5_topics():
    res = client.get("/api/practice/part/5")
    assert res.status_code == 200
    data = res.json()
    assert "by_topic" in data
    topics = data["by_topic"]
    for t in ["Từ vựng", "Từ loại", "Động từ", "Ngữ pháp khác"]:
        assert t in topics, f"Missing topic {t} in part 5"
    assert "Level 1" in data["by_level"]
    assert "Level 2" in data["by_level"]
    assert "Level 3" in data["by_level"]
    assert "Level 4" in data["by_level"]

def test_level_query_normalization():
    res = client.get("/api/practice/part/2?level=Level 2 – 200–300")
    assert res.status_code == 200
    data = res.json()
    assert len(data["questions"]) > 0

    res2 = client.get("/api/practice/part/5?category=Động từ")
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2["questions"]) > 0
