# Medora AI Service

A standalone **FastAPI microservice** that owns *all* AI/medical logic for Medora.
The frontend and the main (.NET) backend talk to it only over HTTP — there is no
AI logic or direct model import anywhere else.

## Responsibilities

Everything happens inside this service: request validation, authentication
validation, message classification, medical scope restriction, AI inference,
conversation memory, response formatting, error handling, and structured logging.

## Architecture

```
ai_service/
├── app/                     # FastAPI transport/application layer
│   ├── main.py              # app factory, lifespan, middleware, routers
│   ├── settings.py          # env-driven configuration
│   ├── dependencies.py      # DI providers
│   ├── exceptions.py        # error envelope + handlers (fallback message)
│   ├── logging_config.py    # JSON structured logging
│   ├── security/            # JWT auth, guest sessions, rate limit, sanitization
│   ├── schemas/             # Pydantic request/response models
│   ├── routers/             # /chat, /classify, /conversation, /health
│   └── services/            # container (composition root) + orchestrator
└── src/                     # AI/medical domain engine (RAG, safety, classifier, LLM)
```

## Endpoints

| Method | Path                       | Description                                  |
|--------|----------------------------|----------------------------------------------|
| POST   | `/chat`                    | Classify → (block or generate) → reply       |
| POST   | `/classify`                | `medical` / `medora_platform` / `non_medical`|
| GET    | `/conversation/{id}`       | Retrieve conversation history (owner-checked) |
| GET    | `/health`                  | Liveness + model availability                |

Interactive docs: `http://localhost:8000/docs`.

### `POST /chat`

```json
{ "message": "عندي صداع وسخونية", "user_id": null, "role": "guest", "conversation_id": null, "attached_image": null }
```
```json
{ "response": "...", "conversation_id": "abc123", "metadata": { "classification": "medical", "source": "llm" } }
```

## Scope restriction

Before any inference, the message is classified. `non_medical` messages (cooking,
coding, sports, politics, news, entertainment, general study, …) are **never sent
to the LLM**; the service returns the localized scope message directly. The LLM
system prompt enforces the same scope as a second layer.

## Auth

* **Logged-in users** send the same HS256 JWT issued by the main backend
  (`Authorization: Bearer <token>`); it is validated locally against the shared
  `JWT_SECRET`/issuer/audience. Role is taken from the token, never the client.
* **Guests** need no token; they get a temporary `guest-<uuid>` conversation id.

Set `AI_REQUIRE_AUTH=true` to reject anonymous callers.

## Run locally

```bash
cd ai_service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in OPENAI_API_KEY / JWT_SECRET
uvicorn app.main:app --reload --port 8000
```

Without `OPENAI_API_KEY` the service still runs and returns the deterministic
local medical responder.

## Docker

```bash
docker build -t medora-ai-service .
docker run -p 8000:8000 --env-file .env medora-ai-service
```

## Deployment as a systemd service

The service runs as `ai_service.service`, bound to `127.0.0.1:8100` (exposed
publicly through nginx at `/ai`). It auto-restarts on crash and starts on boot.

Install / update:

```bash
sudo bash deploy/install_service.sh
```

This creates the venv (if missing), installs `deploy/ai_service.service` to
`/etc/systemd/system/`, enables it, and starts it.

### Runtime control

```bash
sudo systemctl start ai_service
sudo systemctl stop ai_service
sudo systemctl restart ai_service
sudo systemctl status ai_service
journalctl -u ai_service -f          # live logs (structured JSON)
```

### Behavior

* **Running** → `/ai-consultation` works normally; requests hit the chatbot.
* **Stopped** → requests can't connect; the frontend shows the maintenance
  message *"AI consultation service is currently unavailable. Please try again
  later."* (`AI_MAINTENANCE_MESSAGE`). A running-but-erroring model instead
  returns the in-app fallback (`AI_FALLBACK_MESSAGE`).

### nginx reverse proxy (production)

The service listens on localhost only, so nginx must expose it at `/ai`. Add the
block in [`deploy/nginx-ai-location.conf`](deploy/nginx-ai-location.conf) to the
`server { … }` of `medora.tigerauto.to.conf`, then `sudo nginx -t && sudo
systemctl reload nginx`. (Not applied automatically — it touches the shared
production gateway.)

## Frontend integration

The React page `/ai-consultation` calls `POST {VITE_AI_SERVICE_URL}/chat`.

* `frontend/.env.development` → `VITE_AI_SERVICE_URL=http://localhost:8100`
* `frontend/.env.production`  → `VITE_AI_SERVICE_URL=https://medora.tigerauto.to/ai`
