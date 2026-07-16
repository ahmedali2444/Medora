"""Quick in-process smoke test for the AI service (no network/LLM needed)."""

import os

os.environ.setdefault("OPENAI_API_KEY", "")  # force local fallback path
os.environ.setdefault("AI_RATE_LIMIT_ENABLED", "false")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

with TestClient(app) as client:
    # health
    r = client.get("/health")
    print("HEALTH", r.status_code, r.json())
    assert r.status_code == 200

    # classify: non-medical
    for msg, expected in [
        ("ازاي أعمل مكرونة بشاميل؟", "non_medical"),
        ("اكتبلي كود Python", "non_medical"),
        ("مين كسب الماتش؟", "non_medical"),
        ("عندي صداع وسخونية", "medical"),
        # Arabic definite-article / clitic prefixes must not hide medical terms.
        ("كيف أتحكم في مستوى السكر؟", "medical"),
        ("ما أعراض ارتفاع ضغط الدم؟", "medical"),
        ("متى يجب التوجه للطوارئ؟", "medical"),
        ("ما أسباب الإرهاق المستمر؟", "medical"),
        ("ازاي احجز موعد مع دكتور في المنصة؟", "medora_platform"),
        ("How do I order medicine on Medora?", "medora_platform"),
    ]:
        r = client.post("/classify", json={"message": msg})
        got = r.json()["classification"]
        flag = "OK" if got == expected else "MISMATCH"
        print(f"CLASSIFY [{flag}] expected={expected:15} got={got:15} :: {msg}")

    # chat: non-medical should be blocked (scope_block), no LLM
    r = client.post("/chat", json={"message": "اكتبلي كود Python", "role": "guest"})
    body = r.json()
    print("CHAT non-medical:", r.status_code, body["metadata"], "::", body["response"][:60])
    assert body["metadata"]["source"] == "scope_block"
    conv_id = body["conversation_id"]
    assert conv_id.startswith("guest-")

    # chat: medical (local fallback since no key), reuse conversation
    r = client.post(
        "/chat",
        json={"message": "عندي صداع وسخونية من امبارح", "role": "guest", "conversation_id": conv_id},
    )
    body = r.json()
    print("CHAT medical:", r.status_code, body["metadata"], "::", body["response"][:80])
    assert r.status_code == 200
    assert body["metadata"]["source"] in {"llm", "local_fallback"}

    # conversation retrieval (guest, unowned -> allowed)
    r = client.get(f"/conversation/{conv_id}")
    print("CONVERSATION:", r.status_code, "messages=", len(r.json()["messages"]))
    assert r.status_code == 200

print("\nALL SMOKE CHECKS PASSED")
