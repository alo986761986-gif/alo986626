# Napoli Carte 3D - server v2.8
Validated on the isolated napoli-server-stability-preflight branch.
- Maximum 400 active/waiting tables, clean 30-minute ended, 45-minute waiting, and 4-hour inactive games.
- Explicit leave of an in-progress table switches that seat to CPU so other players can finish.
- Index-based session lookup speeds up voice and chat.
- Voice relay: heartbeat pings, stale socket close, max 160 sockets, one voice socket per session.
- HTTP: request limits, controlled join rate, bounded payloads, readiness status with uptime, shutdown drain.
- Server can recover a still-valid token after a short network interruption; it does NOT persist game state through service restarts.
- Single-instance in-memory architecture: do not scale to multiple instances until state and messaging are externalized.
- Avoid displaying personal identity or secret tokens in logging/health output.
- CI tests: full six game suite, 400-room saturation, resume, expiry, chat and HTTP endpoints.
