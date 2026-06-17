// Styles scoped inside the widget's shadow root (no leakage to the host page).
export const WIDGET_CSS = `
:host, * { box-sizing: border-box; }
.launch{position:fixed;right:22px;bottom:22px;z-index:2147483000;display:flex;align-items:center;gap:10px;
  background:#5B2A4E;color:#fff;border:none;border-radius:40px;padding:10px 18px 10px 12px;cursor:pointer;
  box-shadow:0 16px 30px -12px rgba(61,27,52,.7);font:600 14px/1 'Inter',system-ui,sans-serif}
.launch:hover{background:#3d1b34}
.launch svg{width:34px;height:34px}

.panel{position:fixed;right:22px;bottom:22px;z-index:2147483000;width:370px;max-width:calc(100vw - 24px);
  height:560px;max-height:calc(100vh - 24px);background:#fff;border-radius:20px;border:1px solid #e4ddd0;
  box-shadow:0 30px 70px -20px rgba(34,27,46,.55);display:none;flex-direction:column;overflow:hidden;
  font-family:'Inter',system-ui,sans-serif;color:#221b2e}
.panel.open{display:flex}

.phead{background:linear-gradient(135deg,#5B2A4E,#3d1b34);color:#fff;padding:16px;display:flex;align-items:center;gap:12px}
.avatar{width:60px;height:60px;flex:none;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center}
.who{font-family:'Fraunces',serif;font-weight:600;font-size:18px}
.status{font-size:12px;opacity:.8}
.sound{background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:4px 8px;font-size:12px;cursor:pointer}
.x{margin-left:auto;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;opacity:.85;line-height:1}

.stream{flex:1;overflow-y:auto;padding:16px;background:#faf8f3}
.msg{max-width:84%;padding:10px 13px;border-radius:14px;font-size:14px;margin-bottom:10px;line-height:1.45}
.bot{background:#fff;border:1px solid #e4ddd0;border-bottom-left-radius:4px}
.me{background:#5B2A4E;color:#fff;margin-left:auto;border-bottom-right-radius:4px}
.replies{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.reply{border:1px solid #5B2A4E;color:#5B2A4E;background:#fff;border-radius:20px;padding:7px 13px;font-size:13px;font-weight:500;cursor:pointer}
.reply:hover{background:#5B2A4E;color:#fff}
.typing{display:flex;gap:4px;align-items:center;width:fit-content}
.typing span{width:7px;height:7px;border-radius:50%;background:#b8aeb0;display:inline-block;animation:blink 1.2s infinite}
.typing span:nth-child(2){animation-delay:.2s}
.typing span:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}

.minis{margin-bottom:10px}
.prodmini{display:flex;gap:10px;background:#fff;border:1px solid #e4ddd0;border-radius:12px;padding:8px;margin-bottom:8px;align-items:center}
.prodmini .pic{width:48px;height:60px;border-radius:8px;flex:none;display:grid;place-items:center}
.prodmini .pic svg{width:60%;height:60%}
.prodmini .mid{flex:1;min-width:0}
.prodmini .nm{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prodmini .sub{font-size:11px;color:#7a7080;margin:1px 0 2px}
.prodmini .pr{font-size:13px;font-family:'Fraunces',serif;font-weight:600}
.prodmini .pr s{color:#7a7080;font-weight:400;margin-right:4px}
.prodmini .tag{font-size:10px;font-weight:600;color:#C56B5C;flex:none}

.pfoot{border-top:1px solid #e4ddd0;padding:10px;display:flex;gap:8px;align-items:center;background:#fff}
.pfoot input{flex:1;border:1px solid #e4ddd0;border-radius:30px;padding:10px 14px;font-size:14px;font-family:inherit;outline:none}
.pfoot input:focus{border-color:#5B2A4E}
.icon{background:#5B2A4E;border:none;color:#fff;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:16px;flex:none;display:grid;place-items:center}
.icon.listening{background:#C56B5C;animation:pulse 1s infinite}
@keyframes pulse{50%{opacity:.55}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
