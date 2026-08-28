const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const overlayStyles = `
#rasputin-overlay{position:fixed;left:50%;bottom:1.35rem;z-index:40;transform:translateX(-50%);pointer-events:none}
#rasputin-overlay .shell{pointer-events:auto;padding:5px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
#rasputin-overlay a{display:flex;align-items:center;gap:.75rem;padding:.35rem .35rem .35rem 1rem;border-radius:999px;background:#0a0a0a;color:#e8fff6;text-decoration:none;font-family:"Clash Display","Geist Sans",sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;transition:transform .5s ${EASE}}
#rasputin-overlay a:hover{transform:scale(.98)}
#rasputin-overlay .mark{width:1.35rem;height:1.35rem}
#rasputin-overlay .orb{width:2rem;height:2rem;border-radius:999px;display:grid;place-items:center;background:rgba(94,234,180,.16);transition:transform .5s ${EASE}}
#rasputin-overlay a:hover .orb{transform:translate(2px,-1px) scale(1.05)}
`;

const sigil = `<svg class="mark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 4L42 14.5V33.5L24 44L6 14.5V14.5L24 4Z" stroke="#5eeab4" stroke-width="1.4"/><path d="M24 12L34 18V30L24 36L14 18V18L24 12Z" stroke="#e8fff6" stroke-width="1"/><circle cx="24" cy="24" r="3" fill="#5eeab4"/></svg>`;

export function winnowOverlayHtml(): string {
  return `<div id="rasputin-overlay" data-rasputin-overlay="1"><style>${overlayStyles}</style><div class="shell"><a href="/_rasputin/" title="Return to cockpit">${sigil}<span>Cockpit</span><span class="orb">↗</span></a></div></div>`;
}

export function injectWinnowOverlay(html: string): string {
  if (html.includes("data-rasputin-overlay")) {
    return html;
  }
  const snippet = winnowOverlayHtml();
  const close = html.lastIndexOf("</body>");
  if (close === -1) {
    return `${html}${snippet}`;
  }
  return `${html.slice(0, close)}${snippet}${html.slice(close)}`;
}

export function isHtmlContentType(value: string | undefined): boolean {
  return (value ?? "").toLowerCase().includes("text/html");
}

export function winnowOfflineHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Winnow offline — Rasputin</title>
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap"/>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body { min-height: 100%; margin: 0; }
    body {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 2rem 1rem;
      background: #050505;
      color: #e8fff6;
      font-family: "Clash Display", sans-serif;
    }
    body::before {
      content: "";
      position: fixed; inset: 0; pointer-events: none; z-index: 1;
      background: radial-gradient(900px 500px at 18% 12%, rgba(16,185,129,.18), transparent 55%),
                  radial-gradient(700px 420px at 88% 78%, rgba(34,211,238,.1), transparent 50%);
    }
    .bezel { position: relative; z-index: 2; width: min(40rem, 100%); padding: 6px; border-radius: 2rem; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); }
    .core { border-radius: calc(2rem - 6px); background: #080808; padding: 3rem 2rem 2.25rem; box-shadow: inset 0 1px 1px rgba(255,255,255,.12); }
    .kicker { margin: 0 0 1rem; display: inline-flex; padding: .35rem .85rem; border-radius: 999px; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: #5eeab4; border: 1px solid rgba(94,234,180,.25); }
    h1 { margin: 0 0 .75rem; font-size: clamp(3rem, 10vw, 5.5rem); font-weight: 600; letter-spacing: -.04em; line-height: .9; }
    p { margin: 0 0 2rem; max-width: 28rem; color: rgba(232,255,246,.62); font-size: 1.05rem; line-height: 1.5; font-weight: 400; }
    a { display: inline-flex; align-items: center; gap: .75rem; padding: .35rem .35rem .35rem 1.25rem; border-radius: 999px; background: #e8fff6; color: #050505; text-decoration: none; font-size: 12px; letter-spacing: .18em; text-transform: uppercase; font-weight: 600; transition: transform .55s ${EASE}; }
    a:hover { transform: scale(.98); }
    a span { width: 2.1rem; height: 2.1rem; border-radius: 999px; display: grid; place-items: center; background: rgba(5,5,5,.08); }
  </style>
</head>
<body>
  <div class="bezel"><div class="core">
    <p class="kicker">Link dead</p>
    <h1>Winnow is down.</h1>
    <p>The IDE host is not responding. Rasputin is up; the machine behind the tunnel is not. Start Winnow and retry from the cockpit.</p>
    <a href="/_rasputin/">Return to cockpit <span>↗</span></a>
  </div></div>
</body>
</html>`;
}
