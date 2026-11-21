# MAAM + WaterMan + Caddy + ngrok — Complete Restart Guide

This guide explains how to restart **both applications** and expose them through **one ngrok domain** on Windows after rebooting or closing your terminals.

> **Status:** Caddy was confirmed to return WaterMan HTML (HTTP 200, 599 bytes) with the public Host header after the configuration fix. Both public applications and their login/API flows still need to be tested together.

## 1. Architecture

```text
Public Internet
    |
    v
ngrok: https://french-gratified-gigantic.ngrok-free.dev
    |
    v
Caddy reverse proxy: 127.0.0.1:8080
    |                                  |
    | /maam/                           | /waterman/
    v                                  v
MAAM React/Vite: 5174             WaterMan React/Vite: 5173
    |                                  |
    v                                  v
MAAM FastAPI: 8001                WaterMan FastAPI: 8000
    |                                  |
    +------ PostgreSQL database(s) ---+
```

## 2. Ports

| Service | Port | Purpose |
|---|---:|---|
| MAAM frontend | 5174 | React + Vite |
| MAAM backend | 8001 | FastAPI |
| WaterMan frontend | 5173 | React + Vite |
| WaterMan backend | 8000 | FastAPI |
| Caddy | 8080 | Routes both applications |
| ngrok | forwards to 8080 | Public HTTPS tunnel |
| PostgreSQL | 5432 (default) | Database service |

## 3. Restart sequence — six PowerShell terminals

First verify that PostgreSQL is running. If its Windows service starts automatically, no action is required.

**Terminal 1 — MAAM backend (8001)**

Navigate to your MAAM `backend` directory and activate its Python virtual environment if applicable:

```powershell
cd "YOUR_MAAM_PROJECT_PATH\backend"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

If the FastAPI app lives in `backend/main.py`, use `uvicorn main:app` instead.

**Terminal 2 — MAAM frontend (5174)**

```powershell
cd "YOUR_MAAM_PROJECT_PATH\frontend"
npm run dev -- --port 5174 --strictPort
```

**Terminal 3 — WaterMan backend (8000)**

Navigate to your WaterMan `backend` directory and activate its Python virtual environment if applicable:

```powershell
cd "YOUR_WATERMAN_PROJECT_PATH\backend"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Adjust the FastAPI module path if WaterMan uses a different entry point.

**Terminal 4 — WaterMan frontend (5173)**

```powershell
cd "YOUR_WATERMAN_PROJECT_PATH\frontend"
npm run dev -- --port 5173 --strictPort
```

**Terminal 5 — Caddy (8080)**

```powershell
caddy run --config C:\caddy-config\Caddyfile --adapter caddyfile
```

If Caddy is already running, do not start a second instance. Use `caddy reload` only when changing its configuration.

**Terminal 6 — ngrok (forward to 8080)**

```powershell
$ngrok = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter ngrok.exe -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
& $ngrok.FullName http 8080
```

**Important:** ngrok must forward to **8080**, not directly to 5173 or 5174, to expose both projects through Caddy.

Keep all six terminals open while using the applications.

## 4. Final Caddy configuration

File: `C:\caddy-config\Caddyfile`

```caddyfile
:8080 {
    bind 127.0.0.1

    handle /maam/api/* {
        uri strip_prefix /maam
        reverse_proxy 127.0.0.1:5174
    }

    handle /waterman/api/* {
        uri strip_prefix /waterman
        reverse_proxy 127.0.0.1:5173
    }

    handle /maam/* {
        reverse_proxy 127.0.0.1:5174
    }

    handle /waterman/* {
        reverse_proxy 127.0.0.1:5173
    }

    handle {
        respond "Application not found" 404
    }
}
```

The `:8080` site address accepts requests with the ngrok Host header; `bind 127.0.0.1` keeps Caddy listening on loopback only. This resolved the earlier zero-byte response in the local Host-header test.

## 5. Verify local services

| Service | URL |
|---|---|
| MAAM frontend | http://127.0.0.1:5174/maam/ |
| WaterMan frontend | http://127.0.0.1:5173/waterman/ |
| MAAM FastAPI docs | http://127.0.0.1:8001/docs |
| WaterMan FastAPI docs | http://127.0.0.1:8000/docs |
| MAAM via Caddy | http://127.0.0.1:8080/maam/ |
| WaterMan via Caddy | http://127.0.0.1:8080/waterman/ |

## 6. Verify public URLs

- **MAAM:** https://french-gratified-gigantic.ngrok-free.dev/maam/
- **WaterMan:** https://french-gratified-gigantic.ngrok-free.dev/waterman/

Check that both React pages render, then verify their API requests and login workflows. A `200` response alone does not confirm that the full application works.

## 7. Troubleshooting

**Check local ports:**

```powershell
Get-NetTCPConnection -State Listen |
    Where-Object { $_.LocalPort -in 5173,5174,8000,8001,8080 } |
    Select-Object LocalAddress,LocalPort,State
```

**Validate Caddy configuration:**

```powershell
caddy validate --config C:\caddy-config\Caddyfile --adapter caddyfile
```

**Reload Caddy after a configuration change:**

```powershell
caddy reload --config C:\caddy-config\Caddyfile --adapter caddyfile
```

**Test Caddy using ngrok's Host header:**

```powershell
curl.exe -s -o NUL -w "HTTP %{http_code}, Size %{size_download} bytes\n" -H "Host: french-gratified-gigantic.ngrok-free.dev" "http://127.0.0.1:8080/waterman/"
```

**Check public WaterMan response:**

```powershell
curl.exe -s -o NUL -w "HTTP %{http_code}, Size %{size_download} bytes\n" "https://french-gratified-gigantic.ngrok-free.dev/waterman/"
```

**Check public MAAM response:**

```powershell
curl.exe -s -o NUL -w "HTTP %{http_code}, Size %{size_download} bytes\n" "https://french-gratified-gigantic.ngrok-free.dev/maam/"
```

If a login/API request returns HTML (`<!doctype html>`) rather than JSON, check that the frontend request path matches the Vite proxy rules and Caddy path rewriting. If the public hostname changes, update any Vite `allowedHosts` settings accordingly.

## 8. What must be repeated after a reboot?

| Task | Repeat? |
|---|---|
| Install PostgreSQL, Caddy, or ngrok | No |
| Edit Caddyfile | No, unless configuration changes |
| Change Vite settings | No, unless configuration changes |
| Start PostgreSQL | Only if not running automatically |
| Start both FastAPI backends | Yes |
| Start both React frontends | Yes |
| Start Caddy | Yes, unless already running as a service/process |
| Start ngrok | Yes |

**Quick order:** PostgreSQL → MAAM backend → MAAM frontend → WaterMan backend → WaterMan frontend → Caddy → ngrok (`8080`).

> **Security:** This uses Vite development servers and FastAPI reload mode, suitable for development and demos, not production. Do not expose sensitive departmental data or real credentials through a public tunnel without appropriate authorization and security controls.
