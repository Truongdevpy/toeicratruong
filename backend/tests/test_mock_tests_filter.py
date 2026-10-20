from pathlib import Path
import pytest
from fastapi.testclient import TestClient
import sys

sys.path.append(str(Path(__file__).resolve().parent.parent))

from main import app

client = TestClient(app)

def test_tests_catalog_enriched_metadata():
    res = client.get("/api/tests?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "tests" in data
    assert len(data["tests"]) > 0
    t = data["tests"][0]
    assert "difficulty" in t
    assert t["difficulty"] in ("Easy", "Medium", "Hard")
    assert "topic" in t
    assert "parts" in t
    assert isinstance(t["parts"], list)

def test_tests_filter_by_difficulty():
    for diff in ["Easy", "Medium", "Hard"]:
        res = client.get(f"/api/tests?difficulty={diff}&limit=5")
        assert res.status_code == 200
        items = res.json().get("tests", [])
        for item in items:
            assert item["difficulty"].lower() == diff.lower()

def test_tests_filter_by_part():
    # Part 1 filter
    res = client.get("/api/tests?part=1&limit=5")
    assert res.status_code == 200
    items = res.json().get("tests", [])
    for item in items:
        assert 1 in item["parts"]

    # Part 11 (Speaking)
    res_sw = client.get("/api/tests?part=11&limit=5")
    assert res_sw.status_code == 200
    items_sw = res_sw.json().get("tests", [])
    for item in items_sw:
        assert item["test_type"] == "sw_speaking"

def test_tests_search():
    res = client.get("/api/tests?search=ets&limit=5")
    assert res.status_code == 200
    items = res.json().get("tests", [])
    assert len(items) > 0

def test_unwanted_branding_removed_from_user_facing_responses():
    # Check /api/mock-tests series string
    res_mock = client.get("/api/mock-tests")
    assert res_mock.status_code == 200
    data_mock = res_mock.json()
    series = data_mock.get("series") or ""
    assert "Đậu TOEIC" not in series
    assert "Study4" not in series

    # Check /api/tests difficulties
    res_tests = client.get("/api/tests?limit=30")
    assert res_tests.status_code == 200
    for t in res_tests.json().get("tests", []):
        assert "Study4" not in t.get("difficulty", "")
        assert "Đậu" not in t.get("difficulty", "")
