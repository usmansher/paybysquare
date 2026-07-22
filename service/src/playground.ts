import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Self-contained dev playground page served at GET /playground (and /).
 * No external assets; talks to the service's own /v1 endpoints, so playing
 * with it exercises exactly what API consumers get.
 */
export const PLAYGROUND_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pay By Square playground</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem; font: 15px/1.5 system-ui, sans-serif;
    background: Canvas; color: CanvasText;
    display: flex; flex-wrap: wrap; gap: 2rem; justify-content: center;
  }
  form, #result { flex: 1 1 22rem; max-width: 30rem; }
  h1 { font-size: 1.2rem; margin: 0 0 1rem; }
  label { display: block; margin: .6rem 0 .15rem; font-weight: 600; font-size: .85rem; }
  input, select {
    width: 100%; padding: .45rem .6rem; font: inherit;
    border: 1px solid color-mix(in srgb, CanvasText 25%, Canvas); border-radius: 6px;
    background: Field; color: FieldText;
  }
  input.bad { border-color: #d33; outline: 1px solid #d33; }
  .row { display: flex; gap: .75rem; } .row > div { flex: 1; }
  #error {
    display: none; margin-top: 1rem; padding: .6rem .8rem; border-radius: 6px;
    background: color-mix(in srgb, #d33 12%, Canvas); color: inherit; font-size: .9rem;
  }
  #qr { display: grid; place-items: center; min-height: 18rem; padding: 1rem;
        border: 1px dashed color-mix(in srgb, CanvasText 25%, Canvas); border-radius: 8px; }
  #qr svg { width: 100%; max-width: 20rem; height: auto; background: #fff; }
  #payload {
    margin-top: 1rem; padding: .6rem .8rem; border-radius: 6px; font: .8rem/1.4 ui-monospace, monospace;
    background: color-mix(in srgb, CanvasText 8%, Canvas); word-break: break-all; cursor: copy;
  }
  #meta, #curl { font-size: .8rem; opacity: .75; margin-top: .5rem; }
  #curl { font-family: ui-monospace, monospace; white-space: pre-wrap; word-break: break-all;
          cursor: copy; padding: .6rem .8rem; border-radius: 6px;
          background: color-mix(in srgb, CanvasText 8%, Canvas); }
  button {
    margin-top: 1rem; margin-right: .5rem; padding: .5rem 1rem; font: inherit;
    border: 1px solid color-mix(in srgb, CanvasText 25%, Canvas); border-radius: 6px;
    background: Field; color: FieldText; cursor: pointer;
  }
  details { margin-top: .75rem; }
  summary { cursor: pointer; font-weight: 600; font-size: .85rem; }
</style>
</head>
<body>
<form id="f">
  <h1>Pay By Square playground</h1>
  <div class="row">
    <div><label>amount *</label><input name="amount" value="25.50" inputmode="decimal"></div>
    <div><label>currency</label><input name="currency" value="EUR" maxlength="3"></div>
    <div><label>date</label><input name="date" type="date" value="2026-07-21"></div>
  </div>
  <label>iban *</label><input name="iban" value="SK7283300000009111111118">
  <label>beneficiaryName *</label><input name="beneficiaryName" value="John Doe">
  <label>swift</label><input name="swift" value="FIOZSKBAXXX">
  <div class="row">
    <div><label>variableSymbol</label><input name="variableSymbol" value="2026001"></div>
    <div><label>constantSymbol</label><input name="constantSymbol" value=""></div>
    <div><label>specificSymbol</label><input name="specificSymbol" value=""></div>
  </div>
  <label>note</label><input name="note" value="Invoice FA20260103">
  <details>
    <summary>More</summary>
    <label>beneficiaryAddress1</label><input name="beneficiaryAddress1" value="">
    <label>beneficiaryAddress2</label><input name="beneficiaryAddress2" value="">
    <label>Bearer token (only if AUTH_TOKEN is set on the server)</label>
    <input id="token" placeholder="dev-token">
  </details>
  <div id="error"></div>
</form>
<div id="result">
  <div id="qr">…</div>
  <div id="payload" title="click to copy"></div>
  <div id="meta"></div>
  <button id="png" type="button">Download PNG</button>
  <button id="svgdl" type="button">Download SVG</button>
  <div id="curl" title="click to copy"></div>
</div>
<script>
const f = document.getElementById('f');
const qs = (id) => document.getElementById(id);

function body() {
  const data = Object.fromEntries(new FormData(f).entries());
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || key === 'token') continue;
    out[key] = key === 'amount' ? Number(value) : value;
  }
  return out;
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const t = qs('token').value.trim();
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

let timer, inflight = 0;
async function render() {
  const seq = ++inflight;
  const payment = body();
  for (const el of f.querySelectorAll('input')) el.classList.remove('bad');
  const [svgRes, payloadRes] = await Promise.all([
    fetch('/v1/qr?format=svg', { method: 'POST', headers: headers(), body: JSON.stringify(payment) }),
    fetch('/v1/payload', { method: 'POST', headers: headers(), body: JSON.stringify(payment) }),
  ]);
  if (seq !== inflight) return;
  if (!svgRes.ok) {
    const { error } = await svgRes.json().catch(() => ({ error: { message: svgRes.statusText } }));
    qs('error').style.display = 'block';
    qs('error').textContent = (error.field ? error.field + ': ' : '') + error.message;
    const bad = error.field && f.querySelector('[name="' + error.field + '"]');
    if (bad) bad.classList.add('bad');
    return;
  }
  qs('error').style.display = 'none';
  qs('qr').innerHTML = await svgRes.text();
  const { payload } = await payloadRes.json();
  qs('payload').textContent = payload;
  qs('meta').textContent = payload.length + ' characters';
  // Wrap values in single quotes, escaping any embedded quote as '\'' so the
  // generated command is safe to paste into a POSIX shell.
  const shq = (s) => "'" + String(s).replaceAll("'", "'\\''") + "'";
  const token = qs('token').value.trim();
  qs('curl').textContent = 'curl -s -X POST ' + shq(location.origin + '/v1/qr?format=png') + ' ' +
    (token ? '-H ' + shq('Authorization: Bearer ' + token) + ' ' : '') +
    '-H ' + shq('Content-Type: application/json') + ' -d ' + shq(JSON.stringify(payment)) + ' --output qr.png';
}

f.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 250); });
f.addEventListener('submit', (e) => { e.preventDefault(); render(); });
qs('payload').addEventListener('click', () => navigator.clipboard.writeText(qs('payload').textContent));
qs('curl').addEventListener('click', () => navigator.clipboard.writeText(qs('curl').textContent));

async function download(format) {
  const res = await fetch('/v1/qr?format=' + format + (format === 'png' ? '&size=512' : ''), {
    method: 'POST', headers: headers(), body: JSON.stringify(body()),
  });
  if (!res.ok) return;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: 'paybysquare.' + format });
  a.click();
  URL.revokeObjectURL(url);
}
qs('png').addEventListener('click', () => download('png'));
qs('svgdl').addEventListener('click', () => download('svg'));

render();
</script>
</body>
</html>
`;

/** Serve the interactive playground at / and /playground when enabled. */
export function registerPlayground(app: FastifyInstance, enabled: boolean): void {
  if (!enabled) {
    return;
  }
  const servePlayground = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ) =>
    reply
      .type('text/html; charset=utf-8')
      .header('x-content-type-options', 'nosniff')
      .header('referrer-policy', 'no-referrer')
      .header(
        'content-security-policy',
        "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'",
      )
      .send(PLAYGROUND_HTML);
  app.get('/', servePlayground);
  app.get('/playground', servePlayground);
}
