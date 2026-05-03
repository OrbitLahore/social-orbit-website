#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════
 *  SOCIAL ORBIT — Notion → events.html sync script
 *  Run: node sync-events.js
 *  Requires: NOTION_TOKEN env var (your integration secret)
 * ════════════════════════════════════════════════════════
 *
 *  DATABASE ID: 34fac6ec-d195-8169-9e9b-000bfbcc6fe6
 *
 *  Notion Database Columns:
 *  ─────────────────────────────────────────────────────
 *  Name        (Title)   — event name, e.g. "Arcade Night"
 *  Status      (Select)  — Upcoming | Completed | Cancelled
 *  Level       (Select)  — LVL_01 | LVL_02 | LVL_03
 *  Date        (Date)    — YYYY-MM-DD
 *  Time        (Text)    — e.g. "7:00 PM"
 *  Location    (Text)    — e.g. "Gulberg, Lahore"
 *  Price       (Text)    — e.g. "Rs 1500"
 *  Description (Text)    — one-liner shown on the card
 *  Event_Slug  (Text)    — url slug, e.g. "arcade"
 *  HP_Bar      (Select)  — Full | Mid | Low
 *  Link        (URL)     — external join link (optional)
 *  Order       (Number)  — display order (1 = first)
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── CONFIG ────────────────────────────────────────────
const DB_ID        = '34fac6ec-d195-8169-9e9b-000bfbcc6fe6';
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const OUT_FILE     = path.join(__dirname, 'events.html');

if (!NOTION_TOKEN) {
  console.error('\n❌  Set NOTION_TOKEN env var first:\n    $env:NOTION_TOKEN="secret_xxxx"\n');
  process.exit(1);
}

// ── NOTION API HELPER ─────────────────────────────────
function notionPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request({
      hostname: 'api.notion.com',
      path:     `/v1/${endpoint}`,
      method:   'POST',
      headers: {
        'Authorization':  `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── NOTION PROPERTY HELPERS ───────────────────────────
const text   = p => p?.rich_text?.map(r => r.plain_text).join('') || '';
const title  = p => p?.title?.map(r => r.plain_text).join('') || '';
const select = p => p?.select?.name || '';
const date   = p => p?.date?.start || '';
const url    = p => p?.url || '';
const num    = p => p?.number ?? 99;

// ── HP BAR RENDERER ───────────────────────────────────
function hpBar(level) {
  if (level === 'Full') return '♥♥♥';
  if (level === 'Mid')  return '♥♥<span style="opacity:.3">_</span>';
  if (level === 'Low')  return '♥<span style="opacity:.3">__</span>';
  return '♥♥♥';
}

// ── FORMAT DATE ───────────────────────────────────────
function fmtDate(d) {
  if (!d) return 'TBA';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── UPCOMING EVENT CARD ───────────────────────────────
function upcomingCard(ev, delay) {
  const lvl    = select(ev.properties.Level)       || 'LVL_01';
  const name   = title(ev.properties.Name);
  const desc   = text(ev.properties.Description);
  const d      = fmtDate(date(ev.properties.Date));
  const time   = text(ev.properties.Time)          || 'TBA';
  const loc    = text(ev.properties.Location)      || 'TBA';
  const price  = text(ev.properties.Price)         || 'Rs 1500';
  const slug   = text(ev.properties.Event_Slug)    || 'event';
  const hp     = select(ev.properties.HP_Bar)      || 'Full';
  const extUrl = url(ev.properties.Link)           || `join.html?event=${slug}`;
  const hpColor = hp === 'Full' ? 'var(--pixel-mist)' : 'var(--hot-pink)';

  return `
      <!-- ${name} -->
      <div class="pixel-card reveal" style="--d:${delay}s">
        <div class="pixel-corner-tr"></div><div class="pixel-corner-bl"></div>
        <div style="border-bottom:2px solid var(--pixel-violet);padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--pixel-mist);letter-spacing:1px">${lvl}</span>
          <span style="font-family:var(--font-mono);font-size:10px;color:${hpColor}">HP: ${hp}</span>
        </div>
        <h3 class="pixel-h2" style="margin-bottom:12px;font-size:clamp(16px,3vw,20px);">${name}</h3>
        <p class="pixel-body" style="margin-bottom:20px;min-height:72px;font-size:12px;">${desc}</p>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--hot-pink);margin-bottom:20px;display:flex;flex-direction:column;gap:6px">
          <span>&gt; Date: ${d}</span>
          <span>&gt; Time: ${time}</span>
          <span>&gt; Loc: ${loc}</span>
          <span>&gt; Cost: ${price}</span>
        </div>
        <div class="hp-bar" style="margin-bottom:16px">${hpBar(hp)}</div>
        <a href="${extUrl}" class="pixel-btn" style="width:100%;justify-content:center;text-align:center;display:block">Join_Queue →</a>
      </div>`;
}

// ── PAST EVENT CARD ───────────────────────────────────
function pastCard(ev, delay) {
  const name = title(ev.properties.Name);
  const d    = fmtDate(date(ev.properties.Date));
  return `
      <div class="past-card reveal" style="--d:${delay}s">
        <h3 style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:rgba(200,184,255,.5);text-transform:uppercase;margin-bottom:8px;text-decoration:line-through;">${name}</h3>
        <p style="font-family:var(--font-mono);font-size:11px;color:rgba(200,184,255,.3);">&gt; Date: ${d}</p>
        <p style="font-family:var(--font-mono);font-size:11px;color:rgba(200,184,255,.3);">&gt; fully filled</p>
        <div class="hp-bar" style="margin-top:16px;opacity:.3">♥♥♥</div>
      </div>`;
}

// ── MAIN ──────────────────────────────────────────────
async function main() {
  console.log('🔄  Fetching events from Notion...');

  const res = await notionPost(`databases/${DB_ID}/query`, {
    sorts: [{ property: 'Order', direction: 'ascending' }]
  });

  if (res.object === 'error') {
    console.error('❌  Notion error:', res.message);
    console.error('    Make sure you shared the DB with your integration in Notion.');
    process.exit(1);
  }

  const all      = res.results;
  const upcoming = all.filter(e => select(e.properties.Status) === 'Upcoming');
  const past     = all.filter(e => select(e.properties.Status) === 'Completed' || select(e.properties.Status) === 'Cancelled');

  console.log(`✅  Found ${upcoming.length} upcoming, ${past.length} past events`);

  const upcomingHTML = upcoming.length
    ? upcoming.map((e, i) => upcomingCard(e, +(i * 0.1).toFixed(1))).join('\n')
    : `<p class="pixel-body" style="color:rgba(200,184,255,.4);grid-column:1/-1;">&gt; no upcoming events right now. check back soon.</p>`;

  const pastHTML = past.length
    ? past.map((e, i) => pastCard(e, +(i * 0.1).toFixed(1))).join('\n')
    : '';

  const pastSection = past.length ? `
<!-- ══ PAST ORBITS ════════════════════════════════════════ -->
<section class="mode2" style="border-top:2px solid rgba(123,47,255,.2)">
  <div class="mode2-section">
    <p class="reveal" style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(200,184,255,.3);margin-bottom:32px;">&gt; archive [ past_orbits ]</p>
    <div class="grid-3">${pastHTML}
    </div>
  </div>
</section>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Events | Social Orbit Lahore</title>
  <meta name="description" content="Upcoming Social Orbit events in Lahore. One room. Zero networking pressure.">
  <!-- Auto-generated by sync-events.js on ${new Date().toISOString()} -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <style>
    body { background: var(--pixel-night); }
    .cursor { display: inline-block; animation: blink 1s step-end infinite; }

    .steps-grid { display: flex; flex-direction: column; gap: 0; }
    .step-item {
      display: flex; gap: 20px; align-items: flex-start;
      padding: 28px 0; border-bottom: 1px solid rgba(123,47,255,.2);
    }
    .step-item:last-child { border-bottom: none; }
    .step-num {
      font-family: var(--font-mono); font-size: 11px; letter-spacing: 2px;
      color: var(--pixel-violet); text-transform: uppercase; flex-shrink: 0;
      width: 64px; padding-top: 3px;
    }
    .step-content h4 {
      font-family: var(--font-mono); font-size: 14px; font-weight: 700;
      color: var(--white); text-transform: uppercase; margin-bottom: 8px;
    }
    .step-content p { font-family: var(--font-mono); font-size: 12px; color: rgba(200,184,255,.6); line-height: 1.6; }

    .past-card {
      border: 2px solid rgba(123,47,255,.25); padding: 24px;
      background: rgba(255,255,255,.02); position: relative;
      opacity: .55;
    }
    .past-card::after { content: 'COMPLETED'; position: absolute; top: 16px; right: 16px;
      font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px;
      color: var(--hot-pink); border: 1px solid var(--hot-pink); padding: 2px 8px;
    }

    .events-hero {
      background: var(--pixel-night); border-bottom: 2px solid var(--pixel-violet);
      padding: 100px 24px 72px; position: relative; overflow: hidden;
    }
    .events-hero-inner { max-width: 1200px; margin: 0 auto; }
    .scanline {
      position: absolute; inset: 0; pointer-events: none; opacity: .03;
      background: repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 4px);
    }
  </style>
</head>
<body>

<!-- NAV (dark mode) -->
<nav class="site-nav dark" id="site-nav">
  <div class="nav-inner">
    <a href="index.html" class="nav-logo">
      <img src="logo.png" alt="Social Orbit" class="nav-logo-img">
    </a>
    <div class="nav-links">
      <a href="narrative.html">Narrative</a>
      <a href="events.html" class="active">Events</a>
      <a href="join.html">Join</a>
    </div>
    <a href="join.html" class="nav-cta">Enter Orbit →</a>
    <button class="burger" id="burger" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>
<div class="mobile-menu dark" id="mobile-menu">
  <button class="mobile-close" id="mobile-close">✕</button>
  <a href="narrative.html">Narrative</a>
  <a href="events.html" class="active">Events</a>
  <a href="join.html" class="cta">Join →</a>
  <div class="mobile-foot">Lahore</div>
</div>

<!-- ══ HERO ══════════════════════════════════════════════ -->
<section class="events-hero">
  <div class="scanline"></div>
  <div class="events-hero-inner">
    <p class="reveal" style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(200,184,255,.4);margin-bottom:16px;">&gt; loading social_orbit_v2026<span class="cursor">_</span></p>
    <h1 class="pixel-h1 reveal" style="--d:.05s;margin-bottom:20px;font-size:clamp(24px,6vw,52px);">
      &gt; Next Side_Quest:<br>Social_Orbit
    </h1>
    <p class="pixel-body reveal" style="--d:.1s;max-width:480px;">
      one room. zero networking pressure. pick your level.
    </p>
  </div>
</section>

<!-- ══ UPCOMING EVENTS ════════════════════════════════════ -->
<section class="mode2">
  <div class="mode2-section">
    <p class="reveal" style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(200,184,255,.4);margin-bottom:32px;">&gt; upcoming_orbits [ ${upcoming.length} found ]</p>
    <div class="grid-3">
${upcomingHTML}
    </div>
  </div>
</section>

<!-- ══ HOW IT WORKS ═══════════════════════════════════════ -->
<section class="mode2" style="border-top:2px solid rgba(123,47,255,.3)">
  <div class="mode2-section">
    <p class="reveal" style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(200,184,255,.4);margin-bottom:32px;">&gt; system_guide [ how_it_works ]</p>
    <h2 class="pixel-h1 reveal" style="--d:.05s;margin-bottom:40px;font-size:clamp(18px,4vw,32px)">&gt; How_It_Works</h2>
    <div class="steps-grid">
      <div class="step-item reveal">
        <span class="step-num">STEP_01</span>
        <div class="step-content">
          <h4>submit the form</h4>
          <p>one page. name, age, one weird question. that's it. we read every response.</p>
        </div>
      </div>
      <div class="step-item reveal" style="--d:.05s">
        <span class="step-num">STEP_02</span>
        <div class="step-content">
          <h4>get confirmed</h4>
          <p>if you're in, you get a confirmation with the venue and time. no hype, just info.</p>
        </div>
      </div>
      <div class="step-item reveal" style="--d:.1s">
        <span class="step-num">STEP_03</span>
        <div class="step-content">
          <h4>show up. alone if you want.</h4>
          <p>the first 20 minutes are over-engineered. you don't sit alone. you don't open with "so what do you do."</p>
        </div>
      </div>
      <div class="step-item reveal" style="--d:.15s">
        <span class="step-num">STEP_04</span>
        <div class="step-content">
          <h4>something real usually happens.</h4>
          <p>no business cards. no networking. just people who showed up for the same reason.</p>
        </div>
      </div>
    </div>
  </div>
</section>

${pastSection}

<!-- ══ CTA ════════════════════════════════════════════════ -->
<section style="background:var(--pixel-violet);border-top:2px solid var(--pixel-violet);border-bottom:2px solid var(--pixel-violet);padding:64px 24px;text-align:center">
  <p style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:16px">&gt; ready_to_enter_orbit?</p>
  <h2 style="font-family:var(--font-head);font-weight:800;font-size:clamp(28px,7vw,60px);color:var(--white);line-height:1.05;margin-bottom:12px">pick a level.<br>show up.</h2>
  <p style="font-family:var(--font-mono);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:32px">form is short. one weird question. that's it.</p>
  <a href="join.html" class="pixel-btn" style="background:var(--white);color:var(--pixel-violet);border-color:var(--white);font-size:13px;padding:14px 36px;display:inline-block">Join_Queue →</a>
</section>

<!-- ══ FOOTER ═════════════════════════════════════════════ -->
<footer class="site-footer dark">
  <div class="footer-inner">
    <div class="footer-logo"><img src="logo.png" alt="Social Orbit" class="footer-logo-img"></div>
    <p style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(200,184,255,.3);">Lahore · Touch Grass Together</p>
    <div class="footer-links">
      <a href="narrative.html">Narrative</a>
      <a href="events.html">Events</a>
      <a href="join.html">Join</a>
    </div>
    <p class="footer-copy">© 2026 Social Orbit</p>
  </div>
</footer>

<script src="scripts.js"></script>
</body>
</html>`;

  fs.writeFileSync(OUT_FILE, html, 'utf8');
  console.log(`\n✅  events.html rebuilt successfully!\n    → ${OUT_FILE}\n`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });
