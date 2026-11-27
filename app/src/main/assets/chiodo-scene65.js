/* Chiodo 121: local WebGL table and avatar renderer. No game or audio state is changed. */
(function (g) {
  'use strict';
  if (typeof document === 'undefined') return;
  const entries = new Map();
  const reduced = g.matchMedia ? g.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const themes = {
    royal: ['#40d591', '#0a865b', '#d88c35'], gold: ['#f4be68', '#a77834', '#da9a41'],
    ocean: ['#43b4df', '#1469aa', '#d9a64c'], napoli: ['#ec8d81', '#c95470', '#d5914e'],
    palazzo: ['#66d8a3', '#198d65', '#d9a54a'], sunset: ['#f4b46b', '#d37a55', '#c18445'],
    diamond: ['#8aaee2', '#5a7dbb', '#e2ad5e'], antica: ['#a7c77b', '#4f985d', '#d3a34d']
  };
  const css = document.createElement('style');
  css.textContent = '.ch65 .ch65-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none!important}.ch65 .ch-arena{isolation:isolate}.ch65.ch65-rendered .ch-avatar[data-ch65-portrait="1"]{background:radial-gradient(circle at 30% 20%,#789d88,#172d28)!important}.ch65.ch65-rendered .ch-avatar[data-ch65-portrait="1"]>svg{visibility:visible}.ch65.ch65-rendered .ch-felt{visibility:hidden!important}.ch65.ch65-rendered .ch65-tablemark{display:none}.ch65:not(.ch65-rendered) .ch-felt{visibility:visible!important}.ch65 .ch-seat,.ch65 .ch-center{z-index:3}';
  document.head.appendChild(css);

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function color(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function mix(a, b, t) { return a.map((x, i) => x + (b[i] - x) * t); }
  function identity() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function multiply(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return out;
  }
  function normalMatrix(a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[4], a11 = a[5], a12 = a[6], a20 = a[8], a21 = a[9], a22 = a[10];
    const b01 = a22 * a11 - a12 * a21, b11 = -a22 * a10 + a12 * a20, b21 = a21 * a10 - a11 * a20;
    const inv = 1 / (a00 * b01 + a01 * b11 + a02 * b21 || 1);
    return new Float32Array([b01 * inv, b11 * inv, b21 * inv, (-a22 * a01 + a02 * a21) * inv, (a22 * a00 - a02 * a20) * inv, (-a21 * a00 + a01 * a20) * inv, (a12 * a01 - a02 * a11) * inv, (-a12 * a00 + a02 * a10) * inv, (a11 * a00 - a01 * a10) * inv]);
  }
  function model(x, y, z, sx, sy, sz, yaw, tilt) {
    const a = yaw || 0, b = tilt || 0, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    return new Float32Array([ca * sx, 0, -sa * sx, 0, sa * sb * sy, cb * sy, ca * sb * sy, 0, sa * cb * sz, -sb * sz, ca * cb * sz, 0, x, y, z, 1]);
  }
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = a => { const n = Math.hypot(...a) || 1; return a.map(x => x / n); };
  function view(eye, at) {
    const z = unit(eye.map((x, i) => x - at[i])), x = unit(cross([0, 1, 0], z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
  }
  function ortho(x, y) { return new Float32Array([1 / x, 0, 0, 0, 0, 1 / y, 0, 0, 0, 0, -2 / 40, 0, 0, 0, -1, 1]); }
  function segment(a, b, width, depth) {
    const d = b.map((v, i) => v - a[i]), len = Math.hypot(...d) || .01, y = d.map(v => v / len);
    const x = unit(cross(Math.abs(y[2]) > .9 ? [1, 0, 0] : [0, 0, 1], y)), z = cross(x, y);
    return new Float32Array([x[0] * width, x[1] * width, x[2] * width, 0, y[0] * len, y[1] * len, y[2] * len, 0, z[0] * depth, z[1] * depth, z[2] * depth, 0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 1]);
  }
  function lathe(profile, segments, close) {
    const out = [], push = (p, n) => out.push(...p, ...n);
    function sample(j, a) {
      const [y, rx, rz] = profile[j], prev = profile[Math.max(0, j - 1)], next = profile[Math.min(profile.length - 1, j + 1)], dy = next[0] - prev[0];
      const dx = next[1] - prev[1], dz = next[2] - prev[2], co = Math.cos(a), si = Math.sin(a);
      return [[rx * co, y, rz * si], unit([co / Math.max(rx, .01), -(dx * co * co / Math.max(rx, .01) + dz * si * si / Math.max(rz, .01)) / (Math.abs(dy) < .001 ? .001 : dy), si / Math.max(rz, .01)])];
    }
    for (let j = 0; j < profile.length - 1; j++) for (let i = 0; i < segments; i++) {
      const a = i * Math.PI * 2 / segments, b = (i + 1) * Math.PI * 2 / segments;
      const A = sample(j, a), B = sample(j, b), C = sample(j + 1, a), D = sample(j + 1, b);
      for (const p of [A, C, B, B, C, D]) push(...p);
    }
    if (close) for (const j of [0, profile.length - 1]) for (let i = 0; i < segments; i++) {
      const a = i * Math.PI * 2 / segments, b = (i + 1) * Math.PI * 2 / segments, y = profile[j][0], n = [0, j === 0 ? -1 : 1, 0];
      for (const p of [[0, y, 0], sample(j, a)[0], sample(j, b)[0]]) push(p, n);
    }
    return out;
  }
  function sphere(segments, rows) {
    const out = [], p = (a, b) => [Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)];
    for (let j = 0; j < rows; j++) for (let i = 0; i < segments; i++) {
      const a = j * Math.PI / rows, b = (j + 1) * Math.PI / rows, c = i * Math.PI * 2 / segments, d = (i + 1) * Math.PI * 2 / segments;
      for (const v of [p(a, c), p(b, c), p(a, d), p(a, d), p(b, c), p(b, d)]) out.push(...v, ...v);
    }
    return out;
  }
  function planar(points, normal) { const out = []; for (const p of points) out.push(...p, ...normal); return out; }
  function labelTexture(gl) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, 512, 256);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 8;
    c.strokeStyle = '#075c65'; c.fillStyle = '#ffea9f';
    c.font = '900 46px system-ui, sans-serif'; c.strokeText('CHIODO', 256, 92); c.fillText('CHIODO', 256, 92);
    c.lineWidth = 10; c.strokeStyle = '#084d7c'; c.fillStyle = '#ffe28a';
    c.font = '1000 85px system-ui, sans-serif'; c.strokeText('121', 256, 154); c.fillText('121', 256, 154);
    c.font = '900 14px system-ui, sans-serif'; c.fillStyle = '#fff4ca';
    c.fillText('NAPOLI CARTOON CLUB', 256, 206);
    c.lineWidth = 6; c.strokeStyle = '#ffe4a0';
    c.beginPath(); c.moveTo(35, 127); c.lineTo(118, 127); c.moveTo(394, 127); c.lineTo(477, 127); c.stroke();
    for (const x of [22, 490]) { c.beginPath(); c.moveTo(x, 109); c.lineTo(x + 4, 115); c.lineTo(x, 121); c.lineTo(x - 4, 115); c.closePath(); c.fill(); }
    const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tx;
  }
  const vertex = `attribute vec3 position; attribute vec3 normal;
    uniform mat4 model; uniform mat4 camera; uniform mat3 normals;
    varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal;
    void main(){vec4 p=model*vec4(position,1.);vWorld=p.xyz;vNormal=normalize(normals*normal);vLocal=position;gl_Position=camera*p;}`;
  const fragment = `precision mediump float;
    uniform vec3 tint; uniform vec3 dark; uniform vec3 eye; uniform float material; uniform float opacity;
    uniform vec4 clipCircle; uniform sampler2D imprint;
    varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal;
    float noise(vec2 p){vec2 q=mod(floor(p),vec2(61.,67.));return fract(sin(dot(q,vec2(2.13,3.71)))*97.73);}
    void main(){
      if(clipCircle.z>0. && length((gl_FragCoord.xy-clipCircle.xy)/clipCircle.zw)>1.)discard;
      vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-.55,1.1,1.0));vec3 v=normalize(eye-vWorld);
      float diffuse=max(dot(n,light),0.);float fill=max(dot(n,normalize(vec3(.7,.6,-.5))),0.);
      float spec=pow(max(dot(n,normalize(light+v)),0.),material==2.?52.:24.);
      vec3 base=tint;float a=opacity;float shine=.05;
      if(material==1.){float grain=sin(vWorld.x*18.+sin(vWorld.z*2.7)*3.+sin(vWorld.z*8.1)*.9);float fine=sin(vWorld.x*88.+vWorld.z*2.);base*=.84+.12*grain+.035*fine;shine=.18;}
      else if(material==2.){base*=.9+.1*sin(vWorld.x*65.);shine=.62;}
      else if(material==3.){float halo=1.-clamp(length(vWorld.xz*vec2(.42,.3)),0.,1.);base=mix(dark,tint,.5+.5*halo);float weave=sin(vWorld.x*210.)*sin(vWorld.z*210.);base*=.98+weave*.018+noise(vWorld.xz*320.)*.025;shine=.012;}
      else if(material==4.){base=mix(base,base*vec3(1.07,.93,.89),clamp(-n.y,0.,1.)*.22);shine=.07;}
      else if(material==5.){base*=.88+.12*sin(vLocal.y*50.+vLocal.x*13.);shine=.17;}
      else if(material==6.){vec4 tex=texture2D(imprint,vLocal.xz*.5+.5);base=tex.rgb;a*=tex.a;shine=0.;}
      else if(material==7.){float edge=clamp(1.-length(vLocal.xz),0.,1.);gl_FragColor=vec4(tint,a*edge*edge);return;}
      else if(material==8.){base=mix(dark,tint,clamp(vLocal.y*.35+.55,0.,1.));gl_FragColor=vec4(base,a);return;}
      // Cel shading keeps the 3D characters and the table readable on small screens.
      float band=diffuse>.78?1.0:(diffuse>.42?.78:.58);
      float bounce=fill>.52?.14:.07;
      float lightness=.22+.64*band+bounce;
      float edge=pow(1.-max(dot(n,v),0.),2.);
      vec3 outColor=base*lightness+vec3(1.,.92,.71)*spec*shine+vec3(.06,.10,.12)*edge;
      gl_FragColor=vec4(outColor,a);
    }`;

  function create(root) {
    const canvas = document.createElement('canvas'); canvas.className = 'ch65-canvas'; canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const shaders = [], buffers = [];
    function compile(type, source) {
      const sh = gl.createShader(type); shaders.push(sh); gl.shaderSource(sh, source); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(sh)); return sh;
    }
    let program;
    try {
      const frag = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0 ? fragment.replace('precision mediump float;', 'precision highp float;') : fragment;
      program = gl.createProgram(); gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
      const mesh = vertices => { const b = gl.createBuffer(); buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); return { b, count: vertices.length / 6 }; };
      const meshes = {
        ball: mesh(sphere(20, 14)), disc: mesh(lathe([[-.5, 1, 1], [.5, 1, 1]], 64, true)),
        rim: mesh(lathe([[-.23, .93, .93], [-.19, 1.0, 1.0], [-.09, 1.02, 1.02], [-.01, 1.01, 1.01], [.045, .975, .975], [.04, .91, .91], [.008, .89, .89]], 80, false)),
        ring: mesh(lathe([[0, .97, .97], [.013, .974, .974], [.023, .986, .986], [.013, 1, 1], [0, 1, 1]], 80, false)),
        torso: mesh(lathe([[-.40, .22, .14], [-.25, .27, .165], [-.04, .35, .18], [.10, .36, .16], [.20, .24, .13], [.23, .14, .105]], 24, true)),
        head: mesh(lathe([[-.265, .072, .08], [-.22, .125, .115], [-.12, .175, .145], [.02, .20, .165], [.16, .185, .16], [.25, .12, .12], [.28, .035, .04]], 28, true)),
        hair: mesh(lathe([[0, .195, .17], [.10, .187, .17], [.21, .13, .13], [.25, .02, .02]], 28, true)),
        sleeve: mesh(lathe([[-.5, .7, .7], [-.25, .85, .85], [.32, 1, 1], [.5, .88, .88]], 16, true)),
        lapel: mesh(planar([[-.25,.13,.14],[-.07,.11,.19],[-.09,-.27,.18], [.25,.13,.14],[.09,-.27,.18],[.07,.11,.19]], [0, 0, 1])),
        shirt: mesh(planar([[-.10,.15,.17],[0,-.19,.19],[.10,.15,.17]], [0,0,1])),
        plane: mesh(planar([[-1,0,-1],[-1,0,1],[1,0,-1],[1,0,-1],[-1,0,1],[1,0,1]], [0,1,0])),
        portrait: mesh(planar([[-1,-1,0],[1,-1,0],[-1,1,0],[-1,1,0],[1,-1,0],[1,1,0]], [0,0,1]))
      };
      const u = {}; for (const k of ['model','camera','normals','tint','dark','eye','material','opacity','clipCircle','imprint']) u[k] = gl.getUniformLocation(program,k);
      const rec = { root, canvas, gl, program, buffers, shaders, meshes, u, p: gl.getAttribLocation(program,'position'), n: gl.getAttribLocation(program,'normal'), texture: labelTexture(gl), raf: 0, arena: null, ro: null, data: null, start: 0, disposed: false, contextLost: false, draws: 0 };
      canvas.addEventListener('webglcontextlost', e => { if (rec.disposed) return; e.preventDefault(); rec.contextLost = true; canvas.hidden = true; cancelAnimationFrame(rec.raf); rec.raf = 0; root.dataset.ch65Render = 'lost'; root.classList.remove('ch65-rendered'); clearPortraits(root); rec.arena?.classList.remove('ch-rendered'); });
      canvas.addEventListener('webglcontextrestored', () => { if (rec.disposed) return; const data = rec.data; dispose(root); if (root.isConnected && data) render(root, data.s, data.positions, data.actor, false, data.prefs); });
      if (g.ResizeObserver) rec.ro = new ResizeObserver(() => request(rec));
      entries.set(root, rec); return rec;
    } catch (error) {
      for (const b of buffers) gl.deleteBuffer(b); for (const sh of shaders) gl.deleteShader(sh); if (program) gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      console.warn('Chiodo: graphical fallback', error.message); return null;
    }
  }

  const skins = ['#c9906c', '#e4b194', '#ad7658', '#d6a077'].map(color);
  const cloths = ['#097cbc', '#c64f59', '#825fc8', '#e19037'].map(color);
  const hairs = ['#30251f','#4b3021','#211f21','#5b3925'].map(color);
  const brass = color('#f1c75e'), linen = color('#fff3da'), pupil = color('#1b273c');
  function draw(rec, name, mat, tint, material, alpha, dark) {
    const { gl, u, meshes } = rec, m = meshes[name];
    gl.bindBuffer(gl.ARRAY_BUFFER, m.b); gl.enableVertexAttribArray(rec.p); gl.vertexAttribPointer(rec.p,3,gl.FLOAT,false,24,0); gl.enableVertexAttribArray(rec.n); gl.vertexAttribPointer(rec.n,3,gl.FLOAT,false,24,12);
    gl.uniformMatrix4fv(u.model,false,mat); gl.uniformMatrix3fv(u.normals,false,normalMatrix(mat)); gl.uniform3fv(u.tint,tint); gl.uniform3fv(u.dark,dark||tint); gl.uniform1f(u.material,material||0); gl.uniform1f(u.opacity,alpha==null?1:alpha); gl.drawArrays(gl.TRIANGLES,0,m.count); rec.draws++;
  }
  function bust(rec, parent, index, gesture, detail, victory) {
    const k = ((index % 4) + 4) % 4, skin = skins[k], jacket = cloths[k], hair = hairs[k];
    const part = (name, x,y,z,sx,sy,sz,tint,material,yaw,tilt) => draw(rec,name,multiply(parent,model(x,y,z,sx,sy,sz,yaw,tilt)),tint,material);
    part('torso',0,0,0,1,1,1,jacket,0);
    part('shirt',0,0,0,1,1,1,linen,0); part('lapel',0,0,.012,1,1,1,mix(jacket,[0,0,0],.24),0);
    part('disc',0,.25,0,.075,.16,.072,skin,4);
    const nod = gesture * .055 + victory * .025;
    const head = multiply(parent,model(0,.57,0,1,1,1,gesture*.045,-nod));
    const hp = (name,x,y,z,sx,sy,sz,tint,material) => draw(rec,name,multiply(head,model(x,y,z,sx,sy,sz)),tint,material);
    hp('head',0,0,0,1,1,1,skin,4);
    hp('hair',0,.047,-.016,1.03,1,1.03,hair,5);
    // Swept fringe and sideburns; the lower front of the face remains uncovered.
    hp('ball',-.055,.163,.108,.14,.062,.086,hair,5);
    for(const side of [-1,1]) {
      hp('ball',side*.187,-.016,-.005,.035,.065,.034,skin,4);
      hp('ball',side*.172,.06,.035,.026,.095,.06,hair,5);
      hp('ball',side*.073,.015,.153,.042,.019,.015,linen,0);
      hp('ball',side*.073,.014,.166,.015,.015,.008,pupil,0);
      hp('ball',side*.071,.065,.154,.050,.010,.016,hair,5);
    }
    hp('ball',0,-.045,.174,.033,.054,.035,skin,4);
    hp('ball',0,-.145,.128,.059,.012,.015,mix(skin,color('#743d38'),.47),4);
    for(let i=0;i<2;i++) part('ball',0,-.16-i*.10,.172,.012,.012,.007,brass,2);
    for(const side of [-1,1]) {
      const reach = side===1?gesture:gesture*.18;
      const a=[side*.30,.08,0], b=[side*(.37-reach*.06),-.18+victory*.12,.10+reach*.20], c=[side*(.25-reach*.08),-.22+victory*.15,.36+reach*.39];
      draw(rec,'sleeve',multiply(parent,segment(a,b,.12,.115)),jacket,0);
      draw(rec,'sleeve',multiply(parent,segment(b,c,.087,.08)),jacket,0);
      part('ball',c[0],c[1],c[2]+.035,.087,.045,.115,skin,4);
      if(detail) for(let f=0;f<4;f++) part('ball',c[0]+(f-1.5)*.029,c[1]-.006,c[2]+.12,.014,.023,.056,skin,4);
    }
  }

  function quality(rec) {
    const q=rec.data.prefs.quality||'high';
    return document.body.dataset.nc50Quality==='low'?'low':q;
  }
  function clearPortraits(root) { root.querySelectorAll('.ch-avatar[data-ch65-portrait]').forEach(el=>el.removeAttribute('data-ch65-portrait')); }
  function frame(rec, now) {
    rec.raf=0;
    if(rec.disposed||!rec.root.isConnected){if(!rec.disposed)dispose(rec.root);return;}
    if(rec.contextLost||document.hidden||!rec.arena?.isConnected)return;
    const q=quality(rec);
    if(q==='low'){rec.canvas.hidden=true;rec.root.dataset.ch65Render='low';rec.root.classList.remove('ch65-rendered');clearPortraits(rec.root);rec.arena.classList.remove('ch-rendered');return;}
    rec.canvas.hidden=false;
    const w=rec.canvas.clientWidth||rec.arena.clientWidth,h=rec.canvas.clientHeight||rec.arena.clientHeight;if(w<1||h<1)return;
    const ratio=Math.min(g.devicePixelRatio||1,q==='ultra'?2:q==='medium'?1.15:1.65);
    const cw=Math.round(w*ratio),ch=Math.round(h*ratio);
    if(rec.canvas.width!==cw)rec.canvas.width=cw;if(rec.canvas.height!==ch)rec.canvas.height=ch;
    const {gl,u,root}=rec,{s,prefs,actor,moved}=rec.data;
    const elapsed=moved&&!reduced.matches?clamp((now-rec.start)/420,0,1):1, gesture=elapsed<1?Math.sin(elapsed*Math.PI):0;
    const palette=themes[prefs.theme]||themes.royal, felt=color(palette[0]), dark=color(palette[1]), wood=color(palette[2]);
    const halfX=2.28, halfY=halfX*h/w, rz=clamp(halfY*.71/.75,.63,2.8), eye=[0,6,7];
    const cam=multiply(ortho(halfX,halfY),view(eye,[0,.04,0]));
    rec.draws=0;gl.viewport(0,0,cw,ch);gl.disable(gl.SCISSOR_TEST);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);gl.useProgram(rec.program);gl.uniformMatrix4fv(u.camera,false,cam);gl.uniform3fv(u.eye,eye);gl.uniform4f(u.clipCircle,0,0,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,rec.texture);gl.uniform1i(u.imprint,0);
    draw(rec,'disc',model(.04,-.29,.07,2.18,.008,rz*1.19),[0,0,0],7,.65);
    draw(rec,'disc',model(0,-.15,0,1.87,.17,rz),mix(wood,[0,0,0],.28),1);
    draw(rec,'rim',model(0,0,0,1.89,1,rz),wood,1);
    draw(rec,'ring',model(0,.029,0,1.80,.55,rz*.952),brass,2);
    draw(rec,'disc',model(0,.022,0,1.687,.026,rz*.891),felt,3,1,dark);
    draw(rec,'ring',model(0,.036,0,1.669,.28,rz*.881),mix(brass,felt,.48),2,.8);
    // Imprint on the near edge, leaving the active piles unobstructed.
    draw(rec,'plane',model(0,.039,rz*.53,.52,1,Math.min(.27,rz*.22)),brass,6,.57);
    // Chiodo 9.11: no second set of 3D busts over the played cards.
    // Each 3D avatar is still rendered in the dedicated player portrait circle below.
    // Keep the original green felt and wooden 3D table unchanged.
    const n=s.n||s.players.length, me=s.seat||0;
    // 9.12: portraits MUST remain visible in their own DOM SVG or private photo.
    // Drawing them into a full-table WebGL canvas placed beneath the seats cannot
    // visibly replace the SVGs: their CSS visibility was previously hidden.
    // Render ONLY the real 3D felt and wood here; don't mask the player portraits.
    clearPortraits(root);
    gl.disable(gl.SCISSOR_TEST);root.dataset.ch65Render='webgl';root.classList.add('ch65-rendered');rec.arena.classList.add('ch-rendered');
    rec.canvas.dataset.scene='ready';rec.canvas.dataset.draws=String(rec.draws);
    if(elapsed<1)rec.raf=requestAnimationFrame(t=>frame(rec,t));
  }
  function request(rec) { if(!rec.disposed&&!rec.raf)rec.raf=requestAnimationFrame(t=>frame(rec,t)); }
  function render(root,s,positions,actor,moved,prefs) {
    const arena=root.querySelector('.ch-arena');if(!arena)return;
    const data={s,positions,actor,moved:!!moved,prefs:{...prefs}};
    let rec=entries.get(root);
    if((prefs.quality==='low'||document.body.dataset.nc50Quality==='low')&&!rec){root.dataset.ch65Render='low';root.classList.remove('ch65-rendered');clearPortraits(root);arena.classList.remove('ch-rendered');return;}
    if(!rec)rec=create(root);
    if(!rec){root.dataset.ch65Render='fallback';root.classList.remove('ch65-rendered');clearPortraits(root);arena.classList.remove('ch-rendered');return;}
    rec.data=data;rec.start=performance.now();
    if(rec.arena!==arena){rec.ro?.disconnect();rec.arena=arena;rec.ro?.observe(arena);}
    if(rec.canvas.parentNode!==arena)arena.prepend(rec.canvas);
    request(rec);
  }
  function dispose(root) {
    const rec=entries.get(root);root.dataset.ch65Render='fallback';root.classList.remove('ch65-rendered');clearPortraits(root);root.querySelector('.ch-arena')?.classList.remove('ch-rendered');
    if(!rec)return;rec.disposed=true;entries.delete(root);cancelAnimationFrame(rec.raf);rec.ro?.disconnect();rec.canvas.remove();
    if(!rec.contextLost){const gl=rec.gl;for(const b of rec.buffers)gl.deleteBuffer(b);for(const sh of rec.shaders)gl.deleteShader(sh);gl.deleteTexture(rec.texture);gl.deleteProgram(rec.program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
  }
  // Only inspect registered roots; removing a game releases its GPU buffers and context.
  new MutationObserver(()=>{for(const [root,rec] of entries){if(!root.isConnected)dispose(root);else if(rec.arena&&!rec.arena.isConnected&&!root.querySelector('.ch-arena'))dispose(root);}}).observe(document.body,{childList:true,subtree:true});
  new MutationObserver(()=>{for(const rec of entries.values())request(rec);}).observe(document.body,{attributes:true,attributeFilter:['data-nc50-quality']});
  const motionChanged=()=>{for(const rec of entries.values())request(rec);};
  if(reduced.addEventListener)reduced.addEventListener('change',motionChanged);else if(reduced.addListener)reduced.addListener(motionChanged);
  document.addEventListener('visibilitychange',()=>{for(const rec of entries.values()){if(document.hidden){cancelAnimationFrame(rec.raf);rec.raf=0;}else request(rec);}});
  g.addEventListener('pagehide',()=>{for(const root of [...entries.keys()])dispose(root);});
  g.NC65_CHIODO_SCENE={render,dispose};
})(typeof window==='undefined'?globalThis:window);
