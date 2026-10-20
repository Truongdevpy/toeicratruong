from pathlib import Path
import pytest
from fastapi.testclient import TestClient
import sys

sys.path.append(str(Path(__file__).resolve().parent.parent))

from main import app

client = TestClient(app)

def test_translate_glitch_full_rich_structure():
    res = client.post("/api/translate/lookup", json={
        "text": "glitch",
        "sentence": "The presentation software started to glitch right before the meeting."
    })
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "word"
    assert "word_detail" in data
    detail = data["word_detail"]
    assert detail is not None
    assert detail["word"].lower() == "glitch"
    
    # 1. Phonetics US & UK
    assert "ipa_us" in detail and detail["ipa_us"]
    assert "ipa_uk" in detail and detail["ipa_uk"]
    assert "/ɡlɪtʃ/" in detail["ipa_us"] or "glɪtʃ" in detail["ipa_us"]

    # 2. Contextual Part of speech and meaning
    assert "context_pos" in detail
    assert "context_meaning" in detail

    # 3. Card Tabs (Từ, Cụm, Câu)
    assert "card_tabs" in detail
    tabs = detail["card_tabs"]
    assert len(tabs) >= 3
    labels = [t["tab_label"] for t in tabs]
    assert "Từ" in labels
    assert "Cụm" in labels
    assert "Câu" in labels

    # 4. English definition
    assert "definition_en" in detail
    assert "problem" in detail["definition_en"].lower() or "fault" in detail["definition_en"].lower()

    # 5. Collocations (Cụm từ)
    assert "collocations" in detail
    collocs = [c["phrase"].lower() for c in detail["collocations"]]
    assert any("technical" in c or "system" in c for c in collocs)

    # 6. Synonyms (Đồng nghĩa)
    assert "synonyms" in detail
    syns = [s["word"].lower() for s in detail["synonyms"]]
    assert any("malfunction" in s or "bug" in s or "defect" in s for s in syns)

    # 7. TOEIC Tip (Mẹo TOEIC)
    assert "toeic_tip" in detail
    assert len(detail["toeic_tip"]) > 0

    # 8. Other meanings & Word family
    assert "other_meanings" in detail
    assert "word_family" in detail
    wf_words = [w["word"].lower() for w in detail["word_family"]]
    assert "glitch" in wf_words

def test_translate_some_lookup():
    res = client.post("/api/translate/lookup", json={
        "text": "some",
        "sentence": "I have some apples."
    })
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "word"
    assert "word_detail" in data
    detail = data["word_detail"]
    assert detail is not None
    assert detail["word"].lower() == "some"
    assert "ipa_us" in detail and detail["ipa_us"]
    assert "card_tabs" in detail and len(detail["card_tabs"]) >= 2
    assert "definition_en" in detail and len(detail["definition_en"]) > 0
    assert "translation" in data and len(data["translation"]) > 0

def test_translate_sentence():
    res = client.post("/api/translate/lookup", json={
        "text": "The technician repaired the equipment quickly.",
        "sentence": "The technician repaired the equipment quickly."
    })
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "sentence"
    assert "translation" in data
    assert len(data["translation"]) > 0

def test_translate_get_word():
    res = client.get("/api/translate/word/glitch")
    assert res.status_code == 200
    data = res.json()
    assert data["word_detail"]["word"].lower() == "glitch"
