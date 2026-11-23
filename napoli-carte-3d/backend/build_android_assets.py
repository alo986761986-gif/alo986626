#!/usr/bin/env python3
"""Build the fully-offline playable WebView asset; optional public server endpoint.

All six CPU modes use the same reviewed rules engine as the public multiplayer server.
No Android-to-JavaScript bridge is needed.
"""
from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
html = (root/'frontend/index.html').read_text(encoding='utf-8')
profile_css=(root/'frontend/profile.css').read_text(encoding='utf-8')
profile_js=(root/'frontend/profile.js').read_text(encoding='utf-8')
realtime_css=(root/'frontend/realtime.css').read_text(encoding='utf-8')
realtime_js=(root/'frontend/realtime.js').read_text(encoding='utf-8')
html=html.replace('</head>','<style id="nc22-profile-css">'+profile_css+'</style></head>',1)
html=html.replace('</body>','<script id="nc22-profile-js">'+profile_js+'</script><script id="nc23-realtime-js">'+realtime_js+'</script></body>',1)
html=html.replace('</head>','<style id="nc23-realtime-css">'+realtime_css+'</style></head>',1)
engine = (root/'backend/engine.js').read_text(encoding='utf-8')
assert "module.exports={join,state,action,opts,leave,profile,friend,statusInfo,RULES,rooms,deck40,getChoices,finishScopa,cardText};" in engine
engine = engine.replace("if (typeof module !== 'undefined') module.exports={join,state,action,opts,leave,profile,friend,statusInfo,RULES,rooms,deck40,getChoices,finishScopa,cardText};", "return {join,state,action,opts,profile,friend,statusInfo,RULES};")
engine = engine.replace("const uid = () => crypto.randomUUID();", "const uid = () => ((typeof crypto!=='undefined' && typeof crypto.randomUUID==='function') ? crypto.randomUUID() : 'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));")
asset_dir = root/'android/app/src/main/assets'
server_url = (asset_dir/'server_url.txt').read_text(encoding='utf-8').strip().rstrip('/')
if server_url and not server_url.startswith('https://'): raise ValueError('Online server must be HTTPS')
# JS no need for a service, network, or CDN when practicing against CPU.
prep = "<script>window.NC3D_OFFLINE=true;window.NC3D_SERVER_URL="+json.dumps(server_url)+";window.NC3D_LOCAL=(function(){\n"+engine+"\n})();</script>"
html = html.replace('</head><body>', prep+'</head><body>', 1)
output = asset_dir/'index.html'
output.write_text(html, encoding='utf-8')
print(f'Android embedded game: {output} ({output.stat().st_size} B), online server configured={bool(server_url)}')
