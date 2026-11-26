(function (g) {
  'use strict';
  const SUITS = ['Denari', 'Coppe', 'Spade', 'Bastoni'];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  function suitIcon(suit) {
    const shapes = [
      '<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="7"/><path d="m16 8 2.3 5 5.4.7-4 3.8 1 5.5-4.7-2.6-4.7 2.6 1-5.5-4-3.8 5.4-.7Z" fill="currentColor" stroke="none"/>',
      '<path d="M9 5h14v8a7 7 0 0 1-14 0V5Zm0 2H5v5c0 4 3 6 6 6M23 7h4v5c0 4-3 6-6 6M16 20v6M10 27h12"/>',
      '<path d="m19 4 7-1-1 7L12 23l-3-3L22 7M7 17l8 8M7 24l-3 4M5 22l5 5"/>',
      '<path d="m10 27 8-21c1-3 6-2 5 2l-7 21ZM16 12l-5-4M15 18l-7-2M19 14l6-4M17 22l7-3"/>'
    ];
    return '<svg class="ch65-suit-icon" data-palo="'+suit+'" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[suit] || shapes[0])+'</svg>';
  }
  function icon(name) {
    const paths = {
      back: '<path d="m15 5-7 7 7 7"/>',
      book: '<path d="M12 6C8 3 4 4 3 5v14c3-2 6-1 9 1 3-2 6-3 9-1V5c-2-1-6-2-9 1Zm0 0v14"/>',
      gear: '<path d="m10 3-.6 2.5-2 .9-2.4-.8-2 3.4 1.8 1.7v2.6L3 15l2 3.4 2.4-.8 2 .9.6 2.5h4l.6-2.5 2-.9 2.4.8 2-3.4-1.8-1.7v-2.6L21 9l-2-3.4-2.4.8-2-.9L14 3Z"/><circle cx="12" cy="12" r="3"/>',
      crown: '<path d="m3 7 5 4 4-7 4 7 5-4-2 12H5L3 7Zm3 15h12"/>',
      cards: '<rect x="4" y="3" width="12" height="17" rx="2"/><path d="M18 6h2v15H9"/>',
      arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>'
    };
    return '<svg class="ch65-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name] || paths.cards)+'</svg>';
  }
  function handLayout(count, availableWidth, cardWidth) {
    const width = Math.max(1, availableWidth - 24);
    const step = count <= 1 ? cardWidth : Math.min(cardWidth + 7, (width - cardWidth) / (count - 1));
    const fan = count > 0 && count <= 7 && step >= 44;
    return {fan, step: fan ? step : cardWidth + 7, overlap: fan ? Math.min(0, step-cardWidth) : 0};
  }
  const helpers = {suitIcon, handLayout};
  if (typeof module !== 'undefined') module.exports = helpers;
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.id = 'chiodo-visual65';
  style.textContent = `
.ch-premium.ch65{--ch65-ink:#f5ead3;--ch65-muted:#a8bcb0;--ch65-gold:#d6b574;--ch65-card:clamp(54px,15vw,72px);padding:8px max(8px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))!important;background:radial-gradient(ellipse at 50% 0,#32423855,transparent 62%),radial-gradient(ellipse at 50% 50%,var(--ch-felt-dark,#173d2e),#080f12 83%)!important;color:var(--ch65-ink)!important;overflow-x:hidden!important;isolation:isolate;font-family:system-ui,-apple-system,sans-serif!important}
.ch65.ch-premium>*{max-width:780px;margin-left:auto;margin-right:auto}.ch65 .ch-head{width:100%;max-width:780px;min-height:48px;padding:3px 1px 6px!important;margin:0 auto 5px;gap:7px;border-bottom:1px solid #d4ba7c28;z-index:25}.ch65 .ch-head>div:nth-child(2){min-width:0;flex:1;text-align:left;padding-left:3px}.ch65 .ch-head strong{font-size:clamp(17px,4.7vw,24px);line-height:1.12;letter-spacing:1.1px;color:#f4ddb0;white-space:nowrap}.ch65 .ch-head small{font-size:9px;line-height:1.35;letter-spacing:1px;color:#adc2b5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;margin-top:4px}.ch65 .ch-rule-options{flex-wrap:nowrap;gap:4px}.ch65 .ch-head .ch-btn{display:grid;place-items:center;width:44px;height:44px;min-width:44px;padding:0!important;background:#12251d9c!important;border:1px solid #cdb47d40!important;color:#e9d6b2!important;box-shadow:inset 0 1px #fff1!important;border-radius:13px;font-size:0!important}.ch65 .ch-head .ch-btn:hover{background:#263b2f!important}.ch65 .ch65-icon{height:21px;width:21px;flex-shrink:0;vertical-align:middle}.ch65 .ch65-suit-icon{width:22px;height:22px;flex-shrink:0;color:#dbb96e}.ch65 .ch65-suit-icon[data-palo="1"]{color:#ef9c8e}.ch65 .ch65-suit-icon[data-palo="2"]{color:#a1cce5}.ch65 .ch65-suit-icon[data-palo="3"]{color:#9ad3a9}
.ch65 .ch-score{width:100%;max-width:780px;display:grid;grid-template-columns:repeat(var(--ch65-players,4),minmax(0,1fr));gap:0;padding:6px 3px;margin:0 auto 5px;border-radius:14px;border:1px solid #a68b562b;background:linear-gradient(130deg,#22372dba,#0c1b17cf);box-shadow:inset 0 1px #ffffff07}.ch65 .ch-score-item{padding:0 7px;text-align:left;position:relative;min-width:0;border-right:1px solid #fff1}.ch65 .ch-score-item:last-child{border:0}.ch65 .ch-score-item b{font-size:10px;font-weight:650;line-height:15px;color:#b9cabe;letter-spacing:.1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ch65 .ch-score-item[data-own="1"] b{color:#e8d7b5}.ch65 .ch-score-item strong{font-size:21px;line-height:26px;font-weight:750;color:#edf0db;font-variant-numeric:tabular-nums}.ch65 .ch-score-item small{font-size:9px;color:#94aa9d}.ch65 .ch65-score-total{display:flex;align-items:baseline;gap:2px;white-space:nowrap;line-height:26px;min-width:0}.ch65 .ch65-score-total>strong,.ch65 .ch65-score-total>small{flex:0 0 auto;white-space:nowrap}.ch65 .ch-score-track{height:3px;background:#ffffff12;margin:2px 0 0;border-radius:3px}.ch65 .ch-score-track i{background:#86b69d}.ch65 .ch-score-item[data-risk="medium"] .ch-score-track i{background:#d9ba79}.ch65 .ch-score-item[data-risk="high"] .ch-score-track i{background:#db8f7f}.ch65 .ch-score-item[data-risk="high"] strong{color:#f0ab99}.ch65 .ch65-score-out{font-size:8px!important;letter-spacing:.5px;color:#e3a28e!important}.ch65 .ch65-score-delta{font-size:10px;color:#e7c887;margin-left:4px;font-variant-numeric:tabular-nums}.ch65 .ch-history{display:none}
.ch65 .ch-arena{position:relative;max-width:760px;width:100%;height:clamp(250px,calc(100vh - 500px),430px);height:clamp(250px,calc(100dvh - 500px),430px);margin:0 auto;isolation:isolate;overflow:visible}.ch65 .ch-felt{inset:17% 4% 13%;border-radius:46%/36%;border:10px solid var(--ch-wood,#6f4729)!important;background:repeating-linear-gradient(20deg,#ffffff04 0 1px,transparent 1px 3px),radial-gradient(ellipse at 43% 24%,var(--ch-felt-light,#326d53),var(--ch-felt-dark,#103d2a) 80%)!important;box-shadow:inset 0 0 0 2px #c7a76a88,inset 0 12px 28px #0006,0 4px 0 #80623a,0 10px 0 #30251a,0 16px 25px #0009!important;transform:perspective(1000px) rotateX(6deg)}.ch65 .ch-felt:before{display:none}.ch65 .ch-felt:after{inset:9px;border:1px solid #d3c18b33;border-radius:44%/35%}.ch65 .ch65-tablemark{position:absolute;left:50%;top:69%;transform:translate(-50%,-50%);color:#f5e3b42e;text-shadow:0 1px #0005;letter-spacing:3.5px;font-size:clamp(10px,2.8vw,17px);white-space:nowrap;font-weight:800;pointer-events:none;z-index:0}.ch65 .ch65-tablemark small{display:block;font-size:6px;letter-spacing:3px;text-align:center;margin-top:4px;color:#ead8ad44}.ch65 .ch-center,.ch65 .ch-arena.ch-rendered .ch-center{top:51%;width:49%;gap:9px;z-index:4}.ch65 .ch-piles{gap:22px;align-items:center}.ch65 .ch-deck{position:relative;width:clamp(43px,12.3vw,58px);height:clamp(73px,20.7vw,98px);font-size:12px;border-radius:5px;border:2px solid #e0cba5;background:repeating-linear-gradient(45deg,transparent 0 6px,#d1a46218 6px 7px),repeating-linear-gradient(-45deg,#6f2d36 0 6px,#d1a46230 6px 7px);box-shadow:1px 1px 0 #fff1,calc(var(--ch65-stack,4px)*.4) calc(var(--ch65-stack,4px)*.4) 0 #c8b797,calc(var(--ch65-stack,4px)*.6) calc(var(--ch65-stack,4px)*.6) 0 #7a6953,calc(var(--ch65-stack,4px)*.8) calc(var(--ch65-stack,4px)*.8) 0 #dccbab,var(--ch65-stack,4px) var(--ch65-stack,4px) 0 #98836c,calc(var(--ch65-stack,4px) + 2px) calc(var(--ch65-stack,4px) + 4px) 9px #0008;transform:rotate(-5deg);color:#f4e8cb;isolation:isolate}.ch65 .ch-deck:before{content:'';position:absolute;inset:4px;border:1px solid #e0cba580;border-radius:2px}.ch65 .ch-deck:after{content:'121';font-family:Georgia,serif;font-size:18px;position:absolute;inset:0;display:grid;place-items:center;letter-spacing:1px;color:#f0d59a;text-shadow:0 2px #0005}.ch65 .ch65-deck-number{position:absolute;right:-8px;bottom:-9px;z-index:2;min-width:24px;height:22px;display:grid;place-items:center;background:#16291f;color:#eed8ac;border:1px solid #bda271;border-radius:7px;font-size:11px;transform:rotate(5deg);font-variant-numeric:tabular-nums}.ch65 .ch-deck[data-empty="1"]{background:#142d2340;box-shadow:none;border-style:dashed;opacity:.6}.ch65 .ch-deck[data-empty="1"]:before,.ch65 .ch-deck[data-empty="1"]:after{display:none}.ch65 .ch-top{position:relative;isolation:isolate;filter:none;transform:rotate(3deg);perspective:none}.ch65 .ch-top:before,.ch65 .ch-top:after{content:'';position:absolute;inset:1px;border:1px solid #b9aa8e;border-radius:5px;background:#e3d9bf;z-index:-1;box-shadow:0 3px 6px #0007;transform:translate(2px,3px) rotate(-5deg)}.ch65 .ch-top:after{transform:translate(-1px,1px) rotate(6deg);z-index:-2}.ch65 .ch-top:empty:before,.ch65 .ch-top:empty:after{display:none}.ch65 .ch-top .playing-card{width:clamp(43px,12.3vw,58px)!important;height:clamp(73px,20.7vw,98px)!important}.ch65 .ch-top.ch-fly{animation:none!important}.ch65 .ch-meta{display:flex;justify-content:center;gap:5px;align-items:center;font-size:11px;line-height:20px;color:#f3e2be;white-space:normal;background:#081e17d9;border:1px solid #d0b4772d;border-radius:20px;padding:3px 9px;min-width:88px;max-width:160px;text-align:center;box-shadow:0 2px 4px #0003}.ch65 .ch-meta .ch65-suit-icon{width:18px;height:18px}.ch65 .ch65-penalty{position:absolute;right:-13px;top:-12px;z-index:7;background:#70362b;color:#ffe8c7;border:1px solid #dfa078;min-width:36px;height:29px;border-radius:9px;padding:3px 6px;font-size:15px;font-weight:850;box-shadow:0 3px 8px #0006;font-variant-numeric:tabular-nums}
.ch65 .ch-seat{width:104px;min-width:0;max-width:32%;height:100px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:0;z-index:7;transform:translate(-50%,-50%);font-size:11px;overflow:visible}.ch65[data-players="4"] .ch-seat[data-position="left"],.ch65[data-players="4"] .ch-seat[data-position="right"]{width:88px}.ch65 .ch-avatar{width:48px;height:48px;min-height:48px;flex-shrink:0;margin:9px!important;border-radius:50%;border:2px solid #bda576!important;box-shadow:0 4px 10px #0007!important;animation:none!important}.ch65 .ch-seat b{font-size:14px!important;line-height:20px!important;font-weight:750!important;max-width:100%!important;padding:0 5px;border:1px solid #d2bc8230;border-radius:6px;background:#0a1819e6;text-shadow:0 1px 2px #000!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0!important}.ch65 .ch-seat small{font-size:10px;line-height:14px;color:#d0d9c7;display:flex;align-items:center;justify-content:center;gap:5px;width:100%;white-space:nowrap}.ch65 .ch-seat.out{opacity:.45}.ch65 .ch-backs{height:12px;display:flex;align-items:center;justify-content:center;margin:0 0 0 4px;max-width:39px}.ch65 .ch-backcard{height:12px;width:8px;border:1px solid #d8c6a5;border-radius:2px;margin-left:-3px;box-shadow:0 1px 3px #0006}.ch65 .nc59-clock{margin:3px!important;padding:6px!important;flex-shrink:0;background:transparent!important;box-shadow:none!important}.ch65 .nc59-clock:before{content:'';position:absolute;inset:0;border-radius:50%;background:conic-gradient(#43f58b var(--nc59-progress,100%),#1d4934 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 6px),#000 calc(100% - 5px));mask:radial-gradient(farthest-side,transparent calc(100% - 6px),#000 calc(100% - 5px));pointer-events:none}.ch65 .nc59-clock>.ch-avatar{margin:0!important;border:0!important;box-shadow:none!important}.ch65 .nc59-seconds{right:-6px;bottom:-3px;background:#08291b;color:#cdffda;border-color:#57dd89;font-size:11px;padding:2px 4px;min-width:25px;line-height:14px}.ch65 .ch-seat>.nc64-voice{left:calc(50% + 22px);right:auto;top:5px;z-index:35!important}.ch65 .ch-seat>.nc64-voice.nc64-side-left{right:calc(50% + 22px);left:auto}.ch65 .ch-seat>.nc64-voice:before{inset:6px;box-shadow:0 3px 7px #0007}.ch65 .ch-seat>.nc64-voice svg{width:19px;height:19px}.ch65 .ch-bubble{max-width:min(180px,50vw);white-space:normal;text-align:center;font-size:12px;line-height:1.25;padding:7px 9px!important;border-radius:10px!important;border:1px solid #c5a666!important;background:linear-gradient(145deg,#faefd2,#dfc291)!important;color:#302715!important;box-shadow:0 4px 12px #0007!important;z-index:40;bottom:calc(100% - 4px);top:auto}.ch65 .ch-seat[data-position="top"] .ch-bubble,.ch65 .ch-seat[data-position="upper-left"] .ch-bubble,.ch65 .ch-seat[data-position="upper-right"] .ch-bubble{top:calc(100% + 2px);bottom:auto;left:50%;right:auto;transform:translateX(-50%)}.ch65 .ch-seat[data-position="left"] .ch-bubble{left:0;right:auto;transform:none;top:auto;bottom:100%}.ch65 .ch-seat[data-position="right"] .ch-bubble{right:0;left:auto;transform:none;top:auto;bottom:100%}.ch65 .ch-bubble:after{border-width:5px;border-top-color:#c5a666;left:calc(50% - 5px)}.ch65 .ch-seat[data-position^="upper"] .ch-bubble:after,.ch65 .ch-seat[data-position="top"] .ch-bubble:after{top:auto;bottom:100%;border-top-color:transparent;border-bottom-color:#c5a666}.ch65 .ch-seat.ch-throw .ch-avatar{animation:none!important}
.ch65 .ch-status{display:flex;align-items:center;justify-content:center;gap:7px;min-height:32px;width:100%;max-width:780px;margin:3px auto 4px;padding:5px 10px;font-size:12px;line-height:17px;background:#0a201ad1;border:1px solid #789f8136;border-radius:10px;box-shadow:none!important;text-shadow:none!important;color:#d1dfd3}.ch65 .ch-status.mine{background:#1e3a2b;border-color:#9eae6e66;color:#f8e3b8!important;box-shadow:inset 3px 0 #d5b77c!important;text-shadow:none!important}.ch65 .ch-status.mine:before{content:'';width:6px;height:6px;background:#65e59b;border-radius:50%;flex-shrink:0}.ch65 #co-error:empty{display:none}.ch65 .ch-controls{min-height:44px;margin:0 auto 5px;gap:6px;max-width:780px;align-items:center}.ch65 .ch-controls:empty{min-height:6px;margin-bottom:1px}.ch65 .ch-controls p{font-size:11px;line-height:16px;color:#c0d1c2;margin:3px 0;max-width:100%;flex-basis:100%}.ch65 .ch-controls button,.ch65 .ch-btn{min-height:44px;border-radius:11px;border:1px solid #ddc58a;background:linear-gradient(160deg,#ead4a1,#bd9455);box-shadow:inset 0 1px #fff7,0 2px 0 #76582f,0 4px 8px #0004;color:#2a2418;font-weight:800;font-size:13px;padding:9px 16px}.ch65 .ch-controls button:disabled{opacity:.45;box-shadow:none}.ch65 .ch-controls [data-call]{background:linear-gradient(140deg,#f7de9e,#c99a4c);min-width:104px;letter-spacing:1px}.ch65 .ch-controls [data-contest]{background:#3d2926;color:#f5d4bd;border-color:#be8b6d;box-shadow:inset 0 1px #ffffff15}.ch65 .ch-controls button[data-suit]{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:calc(50% - 5px);background:#20382b;color:#eedfbf;border-color:#a18d60;box-shadow:inset 0 1px #fff1;font-size:12px}.ch65 .ch-controls.ch65-suit-choice{background:#0c211bdc;border:1px solid #a8905c66;border-radius:15px;padding:8px}.ch65 .ch-controls.ch65-suit-choice>div{width:100%;padding:0!important;border:0!important}.ch65 .ch-controls.ch65-suit-choice>div>div{margin:7px 0!important;gap:6px!important}.ch65 .ch-controls.ch65-suit-choice>div>b{font-size:12px}.ch65 .ch-controls [id$="cancel-suit"]{background:transparent;color:#d9c8a7;box-shadow:none;border:0;min-height:44px;padding:8px 14px}.ch65 .ch-timer{height:36px;width:36px;min-width:36px;font-size:13px;box-shadow:inset 0 0 0 6px #172b20;border:1px solid #ceb47755}
.ch65 .ch-hand-label{display:flex;align-items:center;justify-content:center;gap:7px;text-align:center;margin:1px auto;font-size:9px;line-height:17px;letter-spacing:1.4px;color:#9eb4a6;max-width:780px}.ch65 .ch-hand-label b{font-size:10px;color:#dfd4b8;font-weight:650;letter-spacing:.4px}.ch65 .ch-hand-label small{font-size:9px;letter-spacing:0;color:#b4c4b5}.ch65 .ch-hand{position:relative;max-width:780px;width:100%;display:flex;align-items:flex-end;justify-content:flex-start;gap:7px;overflow-x:auto;overflow-y:hidden;margin:0 auto;padding:13px 12px 17px;touch-action:pan-x;scrollbar-width:thin;scrollbar-color:#9b8851 #14271f;overscroll-behavior-x:contain;min-height:calc(var(--ch65-card)*1.68 + 30px);isolation:isolate}.ch65 .ch-hand[data-fan="1"]{justify-content:center;gap:var(--ch65-gap,7px);overflow-x:hidden}.ch65 .ch-hand button{position:relative;min-width:44px!important;min-height:0!important;width:var(--ch65-card);flex:0 0 var(--ch65-card);margin:0;border:0!important;border-radius:5px!important;padding:0!important;background:none!important;box-shadow:none!important;filter:none!important;transform:translateY(var(--ch65-lift,0px)) rotate(var(--ch65-angle,0deg))!important;transform-origin:50% 110%;transition:transform 140ms ease,opacity 100ms ease!important;z-index:var(--ch65-order,1);opacity:1!important}.ch65 .ch-hand[data-fan="1"] button+button{margin-left:var(--ch65-overlap,0px)}.ch65 .ch-hand button .playing-card{width:var(--ch65-card)!important;height:calc(var(--ch65-card)*1.68)!important;display:block;box-shadow:0 1px 0 #f4e9d2,0 2px 0 #b2a48a,0 6px 9px #0008!important;border:1px solid #e9dfc6!important;border-radius:5px!important;transform:none!important;animation:none!important;transition:none!important}.ch65 .ch-hand button:not(:disabled) .playing-card{box-shadow:0 0 0 1px #e5c88f,0 2px 0 #b2a48a,0 7px 11px #0008!important}.ch65 .ch-hand button:not(:disabled):after{content:'';position:absolute;bottom:-6px;left:32%;width:36%;height:3px;border-radius:3px;background:#d4bd8e;box-shadow:0 0 4px #dac47f55;pointer-events:none}.ch65 .ch-hand button:disabled .playing-card{filter:brightness(.88) saturate(.82)}.ch65 .ch-hand button:disabled{cursor:default}.ch65 .ch-hand button:not(:disabled):active,.ch65 .ch-hand button.nc62-pressed:not(:disabled){transform:translateY(calc(var(--ch65-lift,0px) - 7px)) rotate(var(--ch65-angle,0deg)) scale(1.025)!important;z-index:30;opacity:1!important;filter:brightness(1.06)!important}.ch65 .ch-hand button:focus-visible{outline:2px solid #f2d394!important;outline-offset:4px;z-index:30}.ch65 .ch-hand.ch-deal button{animation:none!important}.ch65 .ch-hand .ch65-new-card .playing-card{box-shadow:0 0 0 2px #e9d597,0 0 14px #dfc48266,0 5px 8px #0009!important}.ch65 .playing-card:after{opacity:.22!important}.ch65 .ch65-flight{position:fixed!important;pointer-events:none!important;z-index:80;max-width:none!important;margin:0!important;transform-origin:center;will-change:transform,opacity;filter:drop-shadow(0 7px 5px #0006)}.ch65 .ch65-flight>.playing-card{width:100%!important;height:100%!important;margin:0!important;transform:none!important;animation:none!important;transition:none!important;box-shadow:0 2px 0 #bcae90,0 5px 9px #0008!important}.ch65 .ch65-flight-back{width:100%;height:100%;border:2px solid #e0cba5;border-radius:5px;background:repeating-linear-gradient(45deg,#702e36 0 5px,#bf96682e 5px 6px),#702e36;box-shadow:inset 0 0 0 3px #702e36,inset 0 0 0 4px #d0ae78;display:grid;place-items:center;color:#e8ce93;font:700 17px Georgia}
.ch65 .ch-fx{top:73%;left:50%;font-size:10px;padding:5px 8px;max-width:70%;white-space:normal;text-align:center;background:#10251fe8;border-color:#d3b57666;color:#ebd7a5;animation:ch65-event 1.15s both;z-index:16}.ch65 .ch-fx[data-fx="2"]{color:#f4b897;border-color:#ba785166}.ch65 .ch-fx[data-fx="9"]{color:#c7bce9}.ch65 .ch65-summary{position:absolute;inset:3% 4%;z-index:20;display:flex;flex-direction:column;justify-content:center;border-radius:20px;border:1px solid #ccb17570;background:linear-gradient(135deg,#263c2df5,#0d211cf8);box-shadow:0 12px 24px #0006,inset 0 1px #fff1;padding:12px 14px;animation:ch65-summary-in 240ms ease-out both;overflow:auto}.ch65 .ch65-summary-title{display:flex;gap:9px;align-items:center;justify-content:center;margin-bottom:9px}.ch65 .ch65-summary-medal{width:38px;height:38px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;background:linear-gradient(140deg,#ead2a0,#9f793d);color:#302615;box-shadow:0 3px 8px #0005}.ch65 .ch65-summary h2{font-size:18px;line-height:22px;color:#f4dfb5;margin:0;font-weight:750;text-align:left}.ch65 .ch65-summary p{font-size:10px;line-height:14px;margin:3px 0 0;color:#b5c7b8;text-align:left}.ch65 .ch65-summary table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;color:#dce7d8}.ch65 .ch65-summary th{font-size:8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;color:#9fb6a7;padding:5px 2px;border-bottom:1px solid #d7c08933;text-align:right}.ch65 .ch65-summary th:first-child{width:43%;text-align:left}.ch65 .ch65-summary td{padding:6px 2px;border-bottom:1px solid #ffffff08;text-align:right;font-variant-numeric:tabular-nums}.ch65 .ch65-summary td:first-child{text-align:left;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.ch65 .ch65-summary td:nth-child(3){color:#d9bd84}.ch65 .ch65-summary td:last-child{color:#f8e6bd;font-weight:800}.ch65 .ch65-summary tr[data-own="1"] td:first-child{color:#f7dfae;font-weight:700}.ch65 .ch65-summary tr[data-out="1"] td{color:#d99d8e}.ch65 .ch65-summary tr[data-out="1"] td:first-child:after{content:' · ELIM.';font-size:8px}.ch65 .ch65-summary-foot{font-size:9px!important;text-align:center!important;margin-top:8px!important;color:#91ad99!important}.ch65[data-stage="finished"] .ch-seat,.ch65[data-stage="finished"] .ch-center{opacity:.12;pointer-events:none}.ch65[data-stage="finished"] .ch-fx{display:none}.ch65[data-stage="finished"] .ch-hand{opacity:.6}.ch65 .ch-victory{z-index:24;pointer-events:none}.ch65 .ch-settings{position:fixed;inset:0;z-index:100;background:#06120eea;padding:18px;overflow:auto}.ch65 .ch-settings-panel{max-height:calc(100dvh - 36px);overflow:auto;border:1px solid #d0b57a77;background:linear-gradient(140deg,#243b2d,#11241d);box-shadow:0 15px 40px #0008}.ch65 .ch-settings-panel h2{font-size:20px;color:#ead3a8}.ch65 .ch-settings-panel label{font-size:13px}.ch65 .ch-settings-panel select{min-height:44px;font-size:12px;max-width:59%}.ch65 .ch-live{width:100%;max-width:780px;margin:5px auto 0;padding:6px 9px!important;border:1px solid #b69d6533!important;border-radius:12px!important;background:#12251de6!important}.ch65 .nc23-bar{display:flex;align-items:center;justify-content:center;gap:8px}.ch65 .ch-live .nc23-bar .ch-btn{min-height:44px;padding:8px 12px;font-size:11px;border:1px solid #b49b6755;background:#1e382a;color:#d8ddc8;box-shadow:none}.ch65 #ch-live-status{font-size:9px;color:#a5b9aa;line-height:13px}.ch65 .ch-live input{max-width:100%}.ch65 .ch-live .nc25-voice-tools{font-size:12px}.ch65 .ch-live .nc25-voice-tools .ch-btn{margin:3px}.ch65>.nc-wallet-strip{width:100%;max-width:780px;margin:0 auto 4px!important;padding:3px 8px!important;background:#14251c70!important;border:0!important;border-radius:6px!important;min-height:24px;font-size:11px!important;color:#d4bf8f!important;box-shadow:none!important}.ch65>.nc-wallet-strip small{font-size:9px;color:#a1b3a4}.ch65 .waiting{width:100%;padding:14px!important;margin:4px auto!important;background:#142f24;border:1px solid #b69b6540}.ch65 .waiting .spin{width:30px;height:30px;border-width:3px;margin:2px auto 10px}.ch65 .waiting h2{font-size:17px}.ch65 .waiting p{font-size:11px}.ch65[data-stage="waiting"] .ch-hand,.ch65[data-stage="waiting"] .ch-hand-label{display:none}

.ch65 .ch-seat[data-position="top"] .ch-bubble,.ch65 .ch-seat[data-position="upper-left"] .ch-bubble{top:52px;bottom:auto;left:calc(50% + 35px);right:auto;transform:none;max-width:min(120px,32vw)}.ch65 .ch-seat[data-position="upper-right"] .ch-bubble{top:52px;bottom:auto;right:calc(50% + 35px);left:auto;transform:none;max-width:min(120px,32vw)}.ch65 .ch-seat[data-position="own"] .ch-bubble{top:27px;bottom:auto;right:calc(50% + 38px);left:auto;transform:none;max-width:min(120px,32vw)}.ch65 .ch-seat[data-position="top"] .ch-bubble:after,.ch65 .ch-seat[data-position="upper-left"] .ch-bubble:after,.ch65 .ch-seat[data-position="upper-right"] .ch-bubble:after,.ch65 .ch-seat[data-position="own"] .ch-bubble:after{display:none}
@media(max-height:700px) and (orientation:portrait){.ch65 .ch-head{margin-bottom:3px;min-height:46px;padding-bottom:3px!important}.ch65 .ch-score{padding-top:4px;padding-bottom:4px;margin-bottom:3px}.ch65 .ch-score-item strong{font-size:19px;line-height:23px}.ch65 .ch-status{margin:2px auto;min-height:30px;padding:4px 8px}.ch65 .ch-hand{padding-top:10px;padding-bottom:12px;min-height:calc(var(--ch65-card)*1.68 + 22px)}.ch65 .ch-controls{margin-bottom:2px}.ch65 .ch-hand-label{margin:0 auto}.ch65>.nc-wallet-strip{margin-bottom:2px!important}}


.ch65 .ch65-seat-caption{display:contents}
.ch65[data-compact="1"] .ch-seat[data-position="top"],.ch65[data-compact="1"] .ch-seat[data-position="own"]{width:222px;max-width:76%;height:68px;flex-direction:row;align-items:center;justify-content:flex-start;gap:4px;padding-right:44px}
.ch65[data-compact="1"] .ch-seat[data-position="top"] .ch65-seat-caption,.ch65[data-compact="1"] .ch-seat[data-position="own"] .ch65-seat-caption{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;flex:1;min-width:0;gap:2px}
.ch65[data-compact="1"] .ch-seat[data-position="top"] .ch65-seat-caption>b,.ch65[data-compact="1"] .ch-seat[data-position="own"] .ch65-seat-caption>b{max-width:100%!important;padding:0 4px}
.ch65[data-compact="1"] .ch-seat[data-position="top"] .ch65-seat-caption>small,.ch65[data-compact="1"] .ch-seat[data-position="own"] .ch65-seat-caption>small{justify-content:flex-start;gap:3px;padding-left:4px}
.ch65[data-compact="1"] .ch-seat[data-position="top"]>.nc64-voice,.ch65[data-compact="1"] .ch-seat[data-position="own"]>.nc64-voice{left:auto!important;right:0!important;top:12px}
.ch65[data-compact="1"] .ch-center,.ch65[data-compact="1"] .ch-arena.ch-rendered .ch-center{top:50%;gap:4px}
.ch65[data-compact="1"] .ch-deck,.ch65[data-compact="1"] .ch-top>.playing-card{width:44px!important;height:74px!important}
.ch65[data-compact="1"] .ch-meta{font-size:10px;line-height:16px;padding:1px 6px;gap:3px;min-width:80px;min-height:20px}
.ch65[data-compact="1"] .ch-meta .ch65-suit-icon{width:16px;height:16px}
.ch65[data-compact="1"] .ch-seat[data-position="top"] .ch-bubble{left:64px;right:auto;top:52px;bottom:auto;max-width:118px;font-size:11px;line-height:14px;padding:4px 6px!important}
.ch65[data-compact="1"] .ch-seat[data-position="own"] .ch-bubble{left:calc(50% - 159px);right:auto;top:auto;bottom:calc(100% + 4px);max-width:min(110px,26vw);font-size:11px;line-height:14px;padding:4px 6px!important}
@media(max-height:520px) and (orientation:landscape){.ch65[data-compact="1"] .ch-deck,.ch65[data-compact="1"] .ch-top>.playing-card{width:46px!important;height:78px!important}.ch65[data-compact="1"] .ch-seat[data-position="top"],.ch65[data-compact="1"] .ch-seat[data-position="own"]{max-width:76%}}

@keyframes ch65-event{0%{opacity:0;transform:translate(-50%,-35%) scale(.94)}20%,75%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-80%)}}
@keyframes ch65-summary-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(min-width:700px){.ch65.ch-premium{--ch65-card:72px;padding-top:14px!important}.ch65 .ch-head{min-height:55px}.ch65 .ch-head small{font-size:10px}.ch65 .ch-seat{width:132px;max-width:27%}.ch65[data-players="4"] .ch-seat[data-position="left"],.ch65[data-players="4"] .ch-seat[data-position="right"]{width:125px}.ch65 .ch-seat b{font-size:15px!important}.ch65 .ch-score-item strong{font-size:24px}.ch65 .ch-score-item b{font-size:12px}.ch65 .ch-score{padding:8px 5px}.ch65 .ch-status{font-size:13px}.ch65 .ch65-summary{inset:8% 16%;padding:20px}.ch65 .ch65-summary td{padding:9px 3px}.ch65 .ch65-summary h2{font-size:23px}}
@media(max-height:520px) and (orientation:landscape){.ch65.ch-premium{--ch65-card:52px;display:grid;grid-template-columns:minmax(300px,1.65fr) minmax(230px,1fr);grid-template-rows:auto auto auto minmax(32px,1fr) auto auto minmax(calc(var(--ch65-card)*1.68 + 22px),auto);gap:3px 12px;padding:5px 10px!important;align-content:start}.ch65.ch-premium>.nc-wallet-strip{grid-column:1/3;grid-row:1;margin:0!important;min-height:19px;padding:0 4px!important}.ch65 .ch-head{grid-column:1/3;grid-row:2;min-height:42px;margin:0;padding-bottom:3px!important}.ch65 .ch-head strong{font-size:19px}.ch65 .ch-head small{display:inline-block;margin:0 0 0 10px;max-width:220px;vertical-align:middle}.ch65 .ch-head .ch-btn{width:44px;height:44px;min-width:44px;min-height:44px}.ch65 .ch-score{grid-column:2;grid-row:3;margin:0;padding:4px 2px}.ch65 .ch-score-item strong{font-size:20px;line-height:24px}.ch65 .ch65-score-total{line-height:24px;gap:2px}.ch65 .ch65-score-total>small{font-size:8px}.ch65 .ch-arena{grid-column:1;grid-row:3/8;height:calc(100dvh - 86px)!important;min-height:245px;margin:0}.ch65 .ch-status{grid-column:2;grid-row:4;align-self:center;margin:2px 0;padding:4px 7px;font-size:11px}.ch65 #co-error{grid-column:2}.ch65 .ch-controls{grid-column:2;grid-row:5;margin:0;align-self:end;min-height:38px}.ch65 .ch-controls:empty{min-height:0}.ch65 .ch-controls button{min-height:44px;padding:8px 12px;font-size:12px}.ch65 .ch-hand-label{grid-column:2;grid-row:6;margin:2px 0}.ch65 .ch-hand{grid-column:2;grid-row:7;min-height:calc(var(--ch65-card)*1.68 + 22px);height:calc(var(--ch65-card)*1.68 + 22px);padding:8px 7px 12px;align-self:end}.ch65 .ch-live{grid-column:1/3;grid-row:8;margin-top:6px}.ch65 .ch-settings{grid-column:auto;grid-row:auto}.ch65 .ch65-summary{inset:0 3%;padding:10px 13px}.ch65 .ch65-summary td{padding:5px 2px}.ch65 .ch65-summary-title{margin-bottom:4px}.ch65 .ch65-summary h2{font-size:17px}.ch65 .ch65-summary-foot{margin-top:5px!important}.ch65 .ch-controls.ch65-suit-choice{padding:5px}.ch65 .ch-controls.ch65-suit-choice p{margin:0}.ch65 .ch-controls button[data-suit]{min-height:44px}.ch65 .ch-controls.ch65-suit-choice>div>div{margin:3px 0!important}}
@media(max-width:350px){.ch65.ch-premium{--ch65-card:50px;padding-left:6px!important;padding-right:6px!important}.ch65 .ch-head strong{font-size:15px;letter-spacing:.8px}.ch65 .ch-head .ch-btn{width:44px;min-width:44px}.ch65 .ch-rule-options{gap:2px}.ch65 .ch-head{gap:3px}.ch65 .ch-score-item{padding:0 4px}.ch65 .ch-seat b{font-size:13px!important}.ch65 .ch-seat>.nc64-voice{left:calc(50% + 17px)}.ch65 .ch-seat>.nc64-voice.nc64-side-left{left:auto;right:calc(50% + 17px)}.ch65 .ch-center{width:43%}.ch65 .ch-piles{gap:16px}}
.ch65[data-quality="low"] .ch65-flight,.ch65[data-quality="low"] .ch-victory{display:none!important}.ch65[data-quality="low"] .ch-felt,.ch65[data-quality="medium"] .ch-felt{transform:none}.ch65[data-quality="low"] .ch65-summary{animation:none}.ch65[data-quality="low"] .ch-hand button{transition:none!important}body[data-nc50-quality="low"] .ch65 .ch-felt{visibility:visible!important}
@media(prefers-reduced-motion:reduce){.ch65 .ch65-flight,.ch65 .ch-victory{display:none!important}.ch65 .ch65-summary,.ch65 .ch-fx,.ch65 .ch-hand button{animation:none!important;transition:none!important}.ch65 .ch-fx{opacity:1}}
`;
  document.head.appendChild(style);
  const records = new Map();
  const reduced = g.matchMedia ? g.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  const deferred = fn => (g.queueMicrotask ? g.queueMicrotask(fn) : Promise.resolve().then(fn));
  function canMove(root) { return !reduced.matches && root.dataset.quality !== 'low' && document.body.dataset.nc50Quality !== 'low' && !document.hidden; }
  function rect(node) { if (!node) return null; const r=node.getBoundingClientRect(); return {left:r.left,top:r.top,width:r.width,height:r.height}; }
  function snapshot(root) {
    const cards = new Map();
    root.querySelectorAll('.ch-hand button[data-card]').forEach(b => cards.set(b.dataset.card, {box:rect(b.querySelector('.playing-card') || b),html:b.innerHTML}));
    const seats = new Map();
    root.querySelectorAll('.ch-seat[data-seat]').forEach(b => seats.set(Number(b.dataset.seat), rect(b.querySelector('.ch-avatar') || b)));
    return {state:root._chState,cards,seats,deck:rect(root.querySelector('.ch-deck'))};
  }
  function stopAnimations(rec) {
    if (rec.frame) { cancelAnimationFrame(rec.frame); rec.frame=0; }
    if(rec.countFrame){cancelAnimationFrame(rec.countFrame);rec.countFrame=0;}
    for(const counter of rec.counters || []) counter.node.textContent=String(counter.value);
    rec.counters?.clear();
    for (const animation of rec.animations) { try { animation.cancel(); } catch (_) {} }
    rec.animations.clear();
    for (const node of rec.hidden) node.style.visibility='';
    rec.hidden.clear();
    for (const node of rec.flights) node.remove();
    rec.flights.clear();
    for (const timeout of rec.timeouts) clearTimeout(timeout);
    rec.timeouts.clear();
  }
  function dispose(root) { const rec=records.get(root); if (!rec) return; stopAnimations(rec); rec.seq++; records.delete(root); }
  function later(rec, fn, ms) { const timer=setTimeout(()=>{rec.timeouts.delete(timer);fn();},ms);rec.timeouts.add(timer);return timer; }
  function handStyle(root) {
    const hand=root.querySelector('.ch-hand');if(!hand)return;
    const buttons=Array.from(hand.querySelectorAll('button[data-card]'));
    const width=buttons[0]?.offsetWidth || 54;
    const layout=handLayout(buttons.length,hand.clientWidth,width);
    hand.dataset.fan=layout.fan?'1':'0';
    hand.style.setProperty('--ch65-overlap',layout.overlap+'px');
    hand.style.setProperty('--ch65-gap',layout.overlap<0?'0px':Math.max(0,layout.step-width)+'px');
    buttons.forEach((button,i)=>{
      const offset=buttons.length>1?(i-(buttons.length-1)/2)/((buttons.length-1)/2):0;
      button.style.setProperty('--ch65-angle',(layout.fan?offset*5:0)+'deg');
      button.style.setProperty('--ch65-lift',(layout.fan?Math.abs(offset)*3-3:0)+'px');
      button.style.setProperty('--ch65-order',String(i+1));
    });
    const label=root.querySelector('.ch-hand-label');
    if(label)label.innerHTML='<span>LA TUA MANO</span><b>'+buttons.length+' '+(buttons.length===1?'CARTA':'CARTE')+'</b>'+(!layout.fan&&buttons.length>4?'<small>Scorri per vederle tutte</small>':'');
  }
  function compactArena(root,arena) {
    const height=arena.getBoundingClientRect().height;
    const compact=height<310;
    root.dataset.compact=compact?'1':'0';
    const top=root.querySelector('.ch-seat[data-position="top"]');
    const own=root.querySelector('.ch-seat[data-position="own"]');
    if(top)top.style.top=compact?'37px':'17%';
    if(own)own.style.top=compact?(height-37)+'px':'84%';
  }
  function fitArena(root) {
    const arena=root.querySelector('.ch-arena');if(!arena)return;
    const landscape=g.matchMedia && g.matchMedia('(max-height:520px) and (orientation:landscape)').matches;
    if(landscape){arena.style.height='';compactArena(root,arena);handStyle(root);return;}
    const viewport=g.visualViewport?.height || g.innerHeight;
    const children=Array.from(root.children).filter(n=>n!==arena&&!n.classList.contains('ch-settings')&&!n.classList.contains('ch-live')&&!n.classList.contains('ch65-flight'));
    let occupied=0;
    for(const child of children){const cs=getComputedStyle(child);if(cs.display==='none'||cs.position==='absolute'||cs.position==='fixed')continue;occupied+=child.getBoundingClientRect().height+(parseFloat(cs.marginTop)||0)+(parseFloat(cs.marginBottom)||0);}
    const rs=getComputedStyle(root);
    occupied+=(parseFloat(rs.paddingTop)||0)+(parseFloat(rs.paddingBottom)||0);
    const available=viewport-occupied-8;
    arena.style.height=clamp(available,250,root.clientWidth>700?480:430)+'px';
    compactArena(root,arena);handStyle(root);
  }
  function decorateControls(root) {
    const controls=root.querySelector('.ch-controls');if(!controls)return;
    const choices=controls.querySelectorAll('button[data-suit]');
    controls.classList.toggle('ch65-suit-choice',choices.length>0);
    choices.forEach(button=>{const suit=Number(button.dataset.suit);button.innerHTML=suitIcon(suit)+'<span>'+esc(SUITS[suit])+'</span>';button.setAttribute('aria-label','Scegli '+SUITS[suit]);});
    const timer=controls.querySelector('.ch-timer');if(timer)timer.setAttribute('aria-label','Secondi rimasti per la dichiarazione');
    controls.querySelectorAll('[data-call],[data-contest]').forEach(b=>b.setAttribute('aria-label',b.textContent));
    if(choices.length)root.dataset.action='suit';else if(controls.querySelector('[data-call],[data-contest]'))root.dataset.action='call';else root.dataset.action='play';
  }
  function results(root,s,old,rec) {
    if(s.status!=='finished'){rec.result=null;rec.resultKey=null;return;}
    const resultKey=String(s.id||s.roomId||'cpu')+'|'+s.players.map(p=>Number(p.score)||0).join(',')+'|'+(s.winners||[]).join(',');
    if(!rec.result||rec.resultKey!==resultKey){rec.resultKey=resultKey;rec.result=s.players.map((p,i)=>({before:old?.players?.[i]&&Number.isFinite(Number(old.players[i].score))?Number(old.players[i].score):null,total:Number(p.score)||0}));}
    const winner=s.winners?.length===1?s.players[s.winners[0]]:null;
    const summary=document.createElement('section');summary.className='ch65-summary';summary.setAttribute('aria-label',winner?'Risultato della partita':'Riepilogo della mano');
    summary.innerHTML='<div class="ch65-summary-title"><span class="ch65-summary-medal">'+icon(winner?'crown':'cards')+'</span><div><h2>'+esc(winner?winner.name+' vince':'Mano conclusa')+'</h2><p>'+esc(winner?'Ultimo giocatore sotto 121 punti':'I punti della mano si aggiungono al totale')+'</p></div></div><table><thead><tr><th>Giocatore</th><th>Prima</th><th>Mano</th><th>Totale</th></tr></thead><tbody>'+s.players.map((p,i)=>{const row=rec.result[i]||{before:null,total:Number(p.score)||0};const delta=row.before===null?null:Math.max(0,row.total-row.before);return '<tr data-own="'+(i===(s.seat||0)?1:0)+'" data-out="'+(p.eliminated||p.score>=121?1:0)+'"><td title="'+esc(p.name)+'">'+esc(p.name)+'</td><td>'+(row.before===null?'—':row.before)+'</td><td>'+(delta===null?'—':'+'+delta)+'</td><td>'+row.total+'</td></tr>';}).join('')+'</tbody></table><p class="ch65-summary-foot">LIMITE DI ELIMINAZIONE · 121 PUNTI</p>';
    root.querySelector('.ch-arena')?.append(summary);
  }
  function decorate(root,s,old,rec) {
    const count=s.n||s.players.length,me=s.seat||0;
    root.dataset.players=String(count);root.dataset.stage=s.status;root.style.setProperty('--ch65-players',String(count));
    const back=root.querySelector('.ch-head>button');if(back){back.innerHTML=icon('back');back.setAttribute('aria-label','Esci dal tavolo');back.title='Esci';}
    const rules=root.querySelector('[data-ch-rules]');if(rules){rules.innerHTML=icon('book');rules.setAttribute('aria-label','Regole di Chiodo 121');rules.title='Regole';}
    const settings=root.querySelector('[data-ch-settings]');if(settings){settings.innerHTML=icon('gear');settings.title='Impostazioni di Chiodo';}
    const mode=root.querySelector('.ch-head small');if(mode){mode.title=s.mode||'';mode.textContent=s.mode||'';}
    root.querySelectorAll('.ch-score-item').forEach((node,i)=>{
      const p=s.players[i],value=Number(p.score)||0;
      node.dataset.own=i===me?'1':'0';node.setAttribute('aria-label',p.name+': '+value+' punti, limite 121');
      node.innerHTML='<b title="'+esc(p.name)+'">'+esc(p.name)+'</b><span class="ch65-score-total"><strong>'+value+'</strong><small>/ 121</small></span><div class="ch-score-track"><i style="width:'+clamp(value/121*100,0,100)+'%"></i></div>'+(p.eliminated?'<small class="ch65-score-out">ELIMINATO</small>':'');
    });
    const spots=count===2?[[50,84,'own'],[50,17,'top']]:count===3?[[50,84,'own'],[18,22,'upper-left'],[82,22,'upper-right']]:[[50,84,'own'],[14,48,'left'],[50,17,'top'],[86,48,'right']];
    root.querySelectorAll('.ch-seat[data-seat]').forEach(node=>{
      const i=Number(node.dataset.seat),p=s.players[i],spot=spots[(i-me+count)%count];if(!spot||!p)return;
      node.style.left=spot[0]+'%';node.style.top=spot[1]+'%';node.dataset.position=spot[2];
      const name=node.querySelector(':scope>b');if(name){name.title=p.name+(p.bot?' · CPU':'');name.textContent=p.name+(i===me&&p.name!=='Tu'?' · Tu':'');}
      const line=node.querySelector(':scope>small'),backs=node.querySelector(':scope>.ch-backs');
      if(line){line.textContent=p.eliminated?'Eliminato':(p.count||0)+' carte'+(p.bot?' · CPU':'');if(backs&&!p.eliminated)line.append(backs);}
      if(name&&line){const caption=document.createElement('div');caption.className='ch65-seat-caption';caption.append(name,line);node.append(caption);}
    });
    const arena=root.querySelector('.ch-arena');if(arena){const mark=document.createElement('div');mark.className='ch65-tablemark';mark.innerHTML='CHIODO 121<small>NAPOLI · CARTE DA GIOCO</small>';arena.append(mark);}
    const deck=root.querySelector('.ch-deck');if(deck){const n=Number(s.deckCount)||0;deck.innerHTML='<span class="ch65-deck-number">'+n+'</span>';deck.dataset.empty=n===0?'1':'0';deck.style.setProperty('--ch65-stack',clamp(Math.round(n/8),1,5)+'px');deck.setAttribute('aria-label','Mazzo: '+n+' carte rimaste');}
    const meta=root.querySelector('.ch-meta');if(meta){meta.innerHTML=s.top?suitIcon(s.suit)+'<span>'+esc(SUITS[s.suit])+'</span>':'Attesa giocatori';meta.setAttribute('aria-label',s.top?'Palo attuale: '+SUITS[s.suit]:'Attesa giocatori');}
    if(s.penalty){const badge=document.createElement('span');badge.className='ch65-penalty';badge.textContent='+'+s.penalty;badge.setAttribute('aria-label','Penalità di '+s.penalty+' carte');root.querySelector('.ch-top')?.append(badge);}
    const status=root.querySelector('.ch-status');if(status){status.setAttribute('role','status');status.setAttribute('aria-live','polite');}
    root.querySelectorAll('.ch-hand button[data-card]').forEach(button=>{const c=s.hand.find(x=>String(x.id)===button.dataset.card);if(c)button.setAttribute('aria-label',(c.v===8?'Fante':c.v===9?'Cavallo':c.v===10?'Re':c.v===1?'Asso':c.v)+' di '+SUITS[c.s]+(button.disabled?'':' · giocabile'));});
    results(root,s,old,rec);
    handStyle(root);
  }
  function flight(root,rec,html,from,to,options) {
    if(!from||!to||!from.width||!to.width||!root.isConnected||typeof Element.prototype.animate!=='function')return;
    const opts=options||{},node=document.createElement('div');node.className='ch65-flight';node.setAttribute('aria-hidden','true');node.innerHTML=html;
    const w=to.width,h=to.height;
    node.style.cssText='left:'+to.left+'px;top:'+to.top+'px;width:'+w+'px;height:'+h+'px;';
    root.append(node);rec.flights.add(node);
    const dx=from.left+from.width/2-to.left-w/2,dy=from.top+from.height/2-to.top-h/2;
    const scale=Math.max(.15,from.width/w),duration=opts.duration||360,delay=opts.delay||0;
    const transform='translate('+dx+'px,'+dy+'px) rotate('+(opts.rotate||-12)+'deg) scale('+scale+')';
    let target=opts.target;
    if(target){target.style.visibility='hidden';rec.hidden.add(target);}
    const animation=node.animate([
      {transform,opacity:.85,offset:0},
      {transform:'translate('+(dx*.4)+'px,'+(dy*.4-16)+'px) rotate(-3deg) scale(1.04)',opacity:1,offset:.58},
      {transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1,offset:1}
    ],{duration,delay,easing:'cubic-bezier(.22,.65,.26,1)',fill:'both'});
    rec.animations.add(animation);
    const finish=()=>{if(target){target.style.visibility='';rec.hidden.delete(target);}node.remove();rec.flights.delete(node);rec.animations.delete(animation);};
    animation.onfinish=finish;animation.oncancel=finish;
    later(rec,finish,duration+delay+180);
  }
  function animateChange(root,s,before,rec) {
    if(!canMove(root))return;
    const old=before.state,me=s.seat||0,newHand=s.status==='playing'&&(!old||old.status==='waiting'||old.status==='finished');
    const hand=Array.from(root.querySelectorAll('.ch-hand button[data-card]'));
    const currentDeck=rect(root.querySelector('.ch-deck'));
    const deck=before.deck||currentDeck;
    if(newHand){hand.slice(0,7).forEach((button,i)=>flight(root,rec,button.innerHTML,currentDeck,rect(button.querySelector('.playing-card')||button),{target:button,duration:300,delay:i*55,rotate:8}));return;}
    if(!old)return;
    const moved=!!(old.top&&s.top&&old.top.id!==s.top.id);
    let actor=old.turn;
    if(moved){const known=before.cards.get(String(s.top.id));const decreased=s.players.findIndex((p,i)=>old.players[i]&&Number(p.count)<Number(old.players[i].count));if(known)actor=me;else if(decreased>=0)actor=decreased;
      const top=root.querySelector('.ch-top>.playing-card');
      if(top){const from=known?.box||before.seats.get(actor);flight(root,rec,top.outerHTML,from,rect(top),{target:top,duration:380,rotate:actor===me?-7:12});}
    }
    s.players.forEach((player,i)=>{
      if(!old.players[i])return;
      const increase=Number(player.count)-(Number(old.players[i].count)-(moved&&actor===i?1:0));if(increase<=0)return;
      if(i===me){const fresh=hand.filter(b=>!before.cards.has(b.dataset.card));fresh.slice(0,7).forEach((button,j)=>{button.classList.add('ch65-new-card');later(rec,()=>button.classList.remove('ch65-new-card'),1100+j*50);flight(root,rec,button.innerHTML,deck,rect(button.querySelector('.playing-card')||button),{target:button,duration:330,delay:j*65,rotate:-10});});}
      else {const seat=root.querySelector('.ch-seat[data-seat="'+i+'"]');const target=rect(seat?.querySelector('.ch-backs')||seat?.querySelector('.ch-avatar'));if(!target)return;const targetBox={left:target.left,top:target.top,width:Math.min(28,target.width||28),height:44};for(let k=0;k<Math.min(increase,4);k++)flight(root,rec,'<div class="ch65-flight-back">121</div>',deck,targetBox,{duration:320,delay:k*65,rotate:8});}
    });
  }
  function animateScores(root,s,old,rec) {
    if(!old||!canMove(root))return;
    const items=Array.from(root.querySelectorAll('.ch-score-item strong'));
    const totals=Array.from(root.querySelectorAll('.ch65-summary tbody tr td:last-child'));
    const changes=[];
    s.players.forEach((player,i)=>{
      const previous=Number(old.players?.[i]?.score),value=Number(player.score);
      if(!Number.isFinite(previous)||!Number.isFinite(value)||value<=previous)return;
      for(const node of [items[i],totals[i]])if(node){const counter={node,value,previous};changes.push(counter);rec.counters.add(counter);node.textContent=String(previous);}
    });
    if(!changes.length)return;
    const start=performance.now(),seq=rec.seq;
    function tick(now){
      rec.countFrame=0;
      if(rec.seq!==seq||!root.isConnected||!canMove(root)){for(const c of changes){c.node.textContent=String(c.value);rec.counters.delete(c);}return;}
      const progress=Math.min(1,(now-start)/360),eased=1-Math.pow(1-progress,3);
      for(const c of changes)c.node.textContent=String(Math.round(c.previous+(c.value-c.previous)*eased));
      if(progress<1)rec.countFrame=requestAnimationFrame(tick);
      else for(const c of changes)rec.counters.delete(c);
    }
    rec.countFrame=requestAnimationFrame(tick);
  }
  function install() {
    const previous=g.NC_CHIODO_TABLE;if(typeof previous!=='function'||previous._ch65)return;
    function table(root,s) {
      if(!root||!s)return previous.apply(this,arguments);
      let rec=records.get(root);if(!rec){rec={seq:0,frame:0,animations:new Set(),flights:new Set(),hidden:new Set(),timeouts:new Set(),counters:new Set(),countFrame:0,result:null,resultKey:null};records.set(root,rec);}
      stopAnimations(rec);
      const before=snapshot(root),old=before.state,seq=++rec.seq;
      root.classList.add('ch65');root.dataset.players=String(s.n||s.players.length);root.dataset.stage=s.status;
      const out=previous.apply(this,arguments);
      decorate(root,s,old,rec);
      deferred(()=>{
        if(rec.seq!==seq||!root.isConnected)return;
        decorateControls(root);handStyle(root);fitArena(root);
        rec.frame=requestAnimationFrame(()=>{rec.frame=0;if(rec.seq===seq&&root.isConnected){animateChange(root,s,before,rec);animateScores(root,s,old,rec);}});
      });
      return out;
    }
    table._ch65=true;g.NC_CHIODO_TABLE=table;
  }
  let resizeFrame=0;
  function resize(){if(resizeFrame)return;resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;for(const [root,rec] of records){if(!root.isConnected){dispose(root);continue;}stopAnimations(rec);handStyle(root);fitArena(root);}});}
  g.addEventListener('resize',resize,{passive:true});g.visualViewport?.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const rec of records.values())stopAnimations(rec);});
  g.addEventListener('pagehide',()=>{for(const root of records.keys())dispose(root);});
  if(reduced.addEventListener)reduced.addEventListener('change',()=>{for(const rec of records.values())stopAnimations(rec);});
  g.NC65_CHIODO_UI={dispose,resize,handLayout,suitIcon,version:'6.5.0'};
  install();
})(typeof window==='undefined'?globalThis:window);
