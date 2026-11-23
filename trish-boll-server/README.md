# TRISH BOLL – Server pubblico multiplayer (v5)
Server Node.js WebSocket RFC 6455, senza dipendenze npm esterne.

## Esecuzione locale
```bash
npm start
npm test
```
La porta è letta da `PORT` (default 3000). HTTP `GET /health`, `GET /stats`; WebSocket `/ws`.

## Deploy
Creare un servizio **dedicato** su Railway o un host Node con WebSocket persistenti:
- repository GitHub `alo986761986-gif/alo986626`, branch `trish-boll-v4-native-premium`
- root directory `/trish-boll-server`
- start command `npm start`
- abilitare dominio HTTPS pubblico con WebSocket upgrade
- inserire nell'app Android il dominio `wss://<hostname>/ws`

Non usare Vercel Functions standard per un loop WebSocket di partita; verificare il supporto a connessioni persistenti nel runtime scelto.
Il multiplayer viene annunciato pubblico solo dopo che /health risponde e due client indipendenti scambiano state.

Messaggi client: `{"t":"join","name":"Player","skin":0}`, `{"t":"input","a":1.2,"b":0}`.
Server: `joined`, `state`, `food`, `dead`, `error`, `pong`.

Il client Android usa TLS standard e rifiuta URL non wss://. È progettato per Android 5+.
