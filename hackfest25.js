// ...existing code...
/**
 * app.js
 *
 * Single-file Node.js + Express prototype for a route-optimization web app.
 * - Frontend served inline (main page, login, signup)
 * - Backend endpoints for auth (SQLite) and route lookup (OSRM + Nominatim)
 *
 * Setup:
 * 1) Create a .env file with:
 *    SESSION_SECRET=a_long_random_secret
 *
 * 2) Install dependencies:
 *    npm install express sqlite3 bcrypt dotenv body-parser cookie-parser express-session node-fetch
 *
 * 3) Run:
 *    node hackfest25.js
 *
 * Notes:
 * - Default root redirects to /login when not authenticated (signup/login page stays untouched).
 * - Main page defaults to light theme; toggle switches to dark (dark = previous appearance).
 */
 
const express = require('express');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change_me';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// --- Simple SQLite DB for users ---
const db = new sqlite3.Database('./app.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password_hash TEXT,
        name TEXT
    );`);
});

// --- Helpers ---
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    res.redirect('/login');
}

async function getDirections(origin, destination) {
    const geocode = async (q) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
        const r = await fetch(url, { headers: { 'User-Agent': 'route-optimizer/1.0 (contact@example.com)' } });
        const arr = await r.json();
        if (!arr || arr.length === 0) throw new Error('Geocode failed for: ' + q);
        return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), display_name: arr[0].display_name };
    };

    const o = await geocode(origin);
    const d = await geocode(destination);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?alternatives=true&overview=full&geometries=geojson`;
    const r = await fetch(osrmUrl);
    const data = await r.json();
    if (!data || data.code !== 'Ok') throw new Error('Routing failed: ' + (data && data.message));
    return {
        origin: o,
        destination: d,
        routes: data.routes.map(rt => ({
            duration: rt.duration,
            distance: rt.distance,
            geometry: rt.geometry
        }))
    };
}

function authPageHTML(title, action, buttonText) {
    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:Inter,Arial,Helvetica,sans-serif;background:#f3f4f6;color:#0b1220;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
    .box{background:white;border-radius:10px;padding:28px;width:360px;box-shadow:0 10px 30px rgba(2,6,23,0.08);border:1px solid rgba(2,6,23,0.04)}
    h2{margin:0 0 12px 0;font-size:20px}
    label{display:block;font-size:13px;color:#52606d;margin-top:10px}
    input{width:100%;padding:10px 12px;margin-top:6px;border-radius:8px;border:1px solid #e6eef8;font-size:14px;box-sizing:border-box}
    button{margin-top:14px;width:100%;padding:10px;border-radius:8px;border:0;background:#7c3aed;color:white;font-weight:600;cursor:pointer}
    .muted{margin-top:10px;font-size:13px;color:#64748b;text-align:center}
    a{color:#7c3aed;text-decoration:none}
  </style>
</head>
<body>
  <div class="box">
    <h2>${title}</h2>
    <form method="POST" action="${action}">
      ${action === '/signup' ? `
        <label for="name">Name</label>
        <input id="name" name="name" placeholder="Your name" required />
      ` : ''}
      <label for="email">Email</label>
      <input id="email" type="email" name="email" placeholder="you@example.com" required />
      <label for="password">Password</label>
      <input id="password" type="password" name="password" placeholder="••••••••" required />
      <button type="submit">${buttonText}</button>
    </form>
    <div class="muted">
      ${action === '/signup' ? `<span>Already have an account? <a href="/login">Login</a></span>` : `<span>Don't have an account? <a href="/signup">Sign up</a></span>`}
    </div>
  </div>
</body>
</html>
`;
}
// --- Routes ---
// Default root: if not authenticated, go to login/signup (signup/login pages unchanged)
app.get('/', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.send(mainPageHTML({
        user: { id: req.session.userId, name: req.session.userName }
    }));
});

// Login pages (unchanged)
app.get('/login', (req, res) => {
    res.send(authPageHTML('Login', '/login', 'Login'));
});
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT id, password_hash, name FROM users WHERE email = ?', email, async (err, row) => {
        if (err || !row) return res.send('<p>Invalid credentials. <a href="/login">Try again</a></p>');
        const ok = await bcrypt.compare(password, row.password_hash);
        if (!ok) return res.send('<p>Invalid credentials. <a href="/login">Try again</a></p>');
        req.session.userId = row.id;
        req.session.userName = row.name || row.email;
        res.redirect('/');
    });
});

// Signup (unchanged)
app.get('/signup', (req, res) => {
    res.send(authPageHTML('Sign Up', '/signup', 'Create account'));
});
app.post('/signup', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.send('<p>Missing fields. <a href="/signup">Try again</a></p>');
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [email, hash, name || ''], function(err) {
        if (err) return res.send('<p>Unable to create account (maybe email exists). <a href="/signup">Try again</a></p>');
        req.session.userId = this.lastID;
        req.session.userName = name || email;
        res.redirect('/');
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// Route optimization endpoint
app.post('/route', async (req, res) => {
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    try {
        const data = await getDirections(from, to);
        if (!data.routes || data.routes.length === 0) return res.status(404).json({ error: 'No routes found' });
        const bestIndex = data.routes.reduce((bestIdx, r, i) => r.duration < data.routes[bestIdx].duration ? i : bestIdx, 0);
        res.json({ origin: data.origin, destination: data.destination, routes: data.routes, bestRouteIndex: bestIndex });
    } catch (err) {
        console.error('Route error', err);
        res.status(500).json({ error: err.message || 'Routing error' });
    }
});

// Simple placeholder pages for "other pages" mentioned
app.get('/settings', requireAuth, (req, res) => {
    res.send(simplePage('Settings', '<p>Settings page (placeholder)</p>'));
});
app.get('/profile', requireAuth, (req, res) => {
    res.send(simplePage('Profile', `<p>Profile management for ${req.session.userName}</p>`));
});

// Start
app.listen(PORT, () => {
    console.log(`App listening on http://localhost:${PORT}`);
});

// --- HTML templates (inline for single-file demo) ---
// mainPageHTML: updated to default light theme; toggle switches to dark (previous look).
function mainPageHTML({ user }) {
    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Route Optimizer</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    :root{
      /* LIGHT theme = default (inverts previous dark look) */
      --bg: #f7f8fb;
      --card: #ffffff;
      --muted: #5b6b79;
      --accent1: #7c3aed; /* purple */
      --accent2: #16a34a; /* green */
      --white: #071033;   /* text color on light bg */
      --glass: rgba(0,0,0,0.04);
      --soft: 12px;
    }
    html,body{height:100%;margin:0;font-family:Inter,Inter var,Segoe UI,Helvetica,Arial;background:var(--bg);color:var(--white)}
    .app-shell{display:flex;flex-direction:column;height:100%}
    header.app-bar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;gap:12px;background:transparent}
    .left, .center, .right{display:flex;align-items:center;gap:12px}
    /* hamburger replaced with three spans for morphing */
    .btn-hamburger{width:44px;height:44px;border-radius:999px;background:var(--glass);display:flex;align-items:center;justify-content:center;border:1px solid rgba(7,16,51,0.06);cursor:pointer;transition:transform .32s cubic-bezier(.2,.9,.3,1), box-shadow .18s ease}
    .btn-hamburger:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(124,58,237,0.16)}
    .btn-hamburger .bar{display:block;width:18px;height:2px;background:var(--white);border-radius:2px;transition:all .28s ease}
    .btn-hamburger .bar + .bar{margin-top:5px}
    /* morph to X when open */
    .btn-hamburger.open .bar1{transform: translateY(7px) rotate(45deg)}
    .btn-hamburger.open .bar2{opacity:0; transform:scaleX(0)}
    .btn-hamburger.open .bar3{transform: translateY(-7px) rotate(-45deg)}
    /* shift along with panel so it's accessible */
    .btn-hamburger.shift{transform:translateX(280px)}
    .logo-title{font-weight:700;font-size:18px;color:var(--white);letter-spacing:0.6px}
    /* company name centered */
    .company{font-size:20px;font-weight:700;color:var(--white);text-align:center;flex:1}
    /* profile */
    .profile-btn{width:44px;height:44px;border-radius:999px;background:linear-gradient(135deg,var(--accent2),#10b981);display:flex;align-items:center;justify-content:center;color:#031018;font-weight:700;cursor:pointer;border:2px solid rgba(7,16,51,0.06);transition:transform .15s ease, box-shadow .12s ease}
    .profile-btn:hover{transform:scale(1.06);box-shadow:0 12px 30px rgba(124,58,237,0.14)}
    /* side-panel */
    .side-panel{position:fixed;left:0;top:0;height:100%;width:280px;background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,251,0.98));backdrop-filter:blur(6px);box-shadow:4px 0 40px rgba(2,6,23,0.06);transform:translateX(-110%);transition:transform .32s cubic-bezier(.2,.9,.3,1);z-index:60;padding:26px;border-right:1px solid rgba(7,16,51,0.04)}
    .side-panel.open{transform:translateX(0)}
    .side-panel h3{margin:0 0 12px 0;color:var(--white)}
    .side-item{display:flex;align-items:center;justify-content:space-between;padding:10px;border-radius:10px;background:transparent;color:var(--muted);margin-bottom:8px;cursor:pointer;transition:all .18s ease}
    .side-item:hover{background:rgba(124,58,237,0.06);color:var(--white);transform:translateX(6px)}
    /* profile dropdown */
    .profile-menu{position:absolute;right:12px;top:64px;background:var(--card);padding:8px;border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,0.06);min-width:160px;display:none;z-index:70;border:1px solid rgba(7,16,51,0.04)}
    .profile-menu.show{display:block}
    .profile-menu a{display:block;padding:8px 10px;color:var(--muted);text-decoration:none;border-radius:8px}
    .profile-menu a:hover{background:rgba(124,58,237,0.06);color:var(--white)}
    /* main content */
    main.content{display:flex;flex-direction:column;align-items:center;gap:18px;padding:18px 16px 26px 16px;flex:1}
    .card{width:100%;max-width:980px;background:var(--card);border-radius:14px;padding:16px;border:1px solid rgba(7,16,51,0.04);box-shadow:0 8px 30px rgba(2,6,23,0.04)}
    .controls-row{display:flex;gap:14px;align-items:flex-start}
    /* form */
    form#routeForm{display:flex;flex-direction:column;gap:10px;align-items:stretch;min-width:320px}
    label.field-label{font-size:13px;color:var(--muted);margin-bottom:6px}
    input.text, button.action{
      border-radius:12px;padding:12px 14px;border:1px solid rgba(7,16,51,0.06);background:linear-gradient(180deg,rgba(7,16,51,0.02),transparent);color:var(--white);font-size:15px;outline:none;transition:box-shadow .15s ease, transform .12s ease, border-color .12s ease;
      width:100%;box-sizing:border-box;
    }
    input.text::placeholder{color:rgba(7,16,51,0.35)}
    input.text:focus{box-shadow:0 8px 20px rgba(124,58,237,0.12);border-color:var(--accent1)}
    .from-to{display:flex;flex-direction:column;gap:8px}
    .btn-group{display:flex;gap:10px;align-items:center}
    button.action{background:linear-gradient(90deg,var(--accent1),var(--accent2));border:0;color:#fff;padding:12px 16px;border-radius:12px;cursor:pointer;transition:transform .12s ease, box-shadow .12s ease}
    /* purple glow under buttons on hover */
    button.action:hover{transform:translateY(-3px);box-shadow:0 14px 40px rgba(124,58,237,0.28)}
    /* secondary clear button style */
    .action.clear{background:transparent;border:1px solid rgba(7,16,51,0.06);color:var(--white)}
    .action.clear:hover{box-shadow:0 10px 30px rgba(124,58,237,0.14)}
    /* map */
    #map{height:52vh;border-radius:12px;border:1px solid rgba(7,16,51,0.04);overflow:hidden}
    /* info */
    #info{color:var(--muted);margin-top:8px}
    /* responsive */
    @media(min-width:900px){
      .controls-row{flex-direction:row;align-items:flex-start}
      form#routeForm{width:420px}
    }
    @media(max-width:899px){
      .company{font-size:18px}
      .card{padding:12px}
      #map{height:48vh}
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <header class="app-bar">
      <div class="left">
        <button id="hamburger" class="btn-hamburger" aria-label="Open menu">
          <span class="bar bar1"></span>
          <span class="bar bar2"></span>
          <span class="bar bar3"></span>
        </button>
      </div>

      <div class="center">
        <div class="company">Company Placeholder</div>
      </div>

      <div class="right" style="position:relative">
        <button id="profileBtn" class="profile-btn" aria-label="Profile">
          <span id="avatarLetter">${user ? escapeHtml((user.name||'U').slice(0,1).toUpperCase()) : 'U'}</span>
        </button>

        <div id="profileMenu" class="profile-menu" role="menu" aria-hidden="true">
          <a href="/profile">Profile</a>
          <a href="/settings">Settings</a>
          <a href="/logout">Log out</a>
        </div>
      </div>
    </header>

    <nav id="sidePanel" class="side-panel" aria-hidden="true">
      <h3>Menu</h3>
      <div class="side-item" id="themeToggle">
        <div>
          <div style="font-weight:600;color:var(--white)">Theme</div>
          <div style="font-size:13px;color:var(--muted)">Toggle dark / light</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <label style="font-size:12px;color:var(--muted);">Dark</label>
          <input type="checkbox" id="themeSwitch" />
        </div>
      </div>

      <div class="side-item" onclick="location.href='/settings'">
        <div>
          <div style="font-weight:600;color:var(--white)">Settings</div>
          <div style="font-size:13px;color:var(--muted)">Account & preferences</div>
        </div>
        <div style="color:var(--muted)">›</div>
      </div>

      <div style="margin-top:18px;color:var(--muted);font-size:13px">Quick actions</div>
      <div style="display:flex;gap:10px;margin-top:8px">
        <button class="action" onclick="document.getElementById('themeSwitch').click()">Toggle Theme</button>
        <button class="action" onclick="location.href='/profile'">Open Profile</button>
      </div>
    </nav>

    <main class="content">
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div class="controls-row" style="justify-content:space-between;align-items:flex-start">
          <div style="flex:1">
            <form id="routeForm" autocomplete="off">
              <div class="from-to">
                <div>
                  <label class="field-label">From:</label>
                  <input class="text" name="from" placeholder="moi avenue, nairobi" required />
                </div>
                <div>
                  <label class="field-label">To:</label>
                  <input class="text" name="to" placeholder="moi avenue, nairobi" required />
                </div>
              </div>
              <div style="display:flex;gap:10px;margin-top:8px;align-items:center">
                <button type="submit" class="action">Find routes</button>
                <button type="button" class="action clear" id="clearBtn">Clear</button>
              </div>
            </form>
          </div>
          <div style="width:180px;display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <div style="font-size:13px;color:var(--muted);text-align:right">Signed in as</div>
            <div style="font-weight:700;color:var(--white)">${user ? escapeHtml(user.name || 'User') : 'Guest'}</div>
          </div>
        </div>

        <div id="map"></div>
        <div id="info"></div>
      </div>
    </main>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // UI interactions
    const sidePanel = document.getElementById('sidePanel');
    const hamburger = document.getElementById('hamburger');
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    const themeSwitch = document.getElementById('themeSwitch');
    const clearBtn = document.getElementById('clearBtn');
    const routeForm = document.getElementById('routeForm');

    // ensure default theme = LIGHT (switch unchecked). If user wants dark, check the box.
    themeSwitch.checked = false;

    function applyDarkTheme() {
      document.documentElement.style.setProperty('--bg','#0b0b0d');
      document.documentElement.style.setProperty('--card','#0f1720');
      document.documentElement.style.setProperty('--muted','#9aa6b2');
      document.documentElement.style.setProperty('--white','#ffffff');
      document.documentElement.style.setProperty('--glass','rgba(255,255,255,0.04)');
    }
    function applyLightTheme() {
      document.documentElement.style.setProperty('--bg','#f7f8fb');
      document.documentElement.style.setProperty('--card','#ffffff');
      document.documentElement.style.setProperty('--muted','#5b6b79');
      document.documentElement.style.setProperty('--white','#071033');
      document.documentElement.style.setProperty('--glass','rgba(0,0,0,0.04)');
    }

    // initialize light by default
    applyLightTheme();

    themeSwitch.addEventListener('change', (e)=>{
      if(e.target.checked){
        applyDarkTheme();
      } else {
        applyLightTheme();
      }
    });

    // Hamburger open/close with morph to X and slide alongside panel
    function openPanel() {
      sidePanel.classList.add('open');
      hamburger.classList.add('open','shift');
    }
    function closePanel() {
      sidePanel.classList.remove('open');
      hamburger.classList.remove('open','shift');
    }
    hamburger.addEventListener('click', (e)=>{
      e.stopPropagation();
      if (sidePanel.classList.contains('open')) closePanel();
      else openPanel();
    });
    // clicking outside closes panel & profile menu
    document.addEventListener('click', ()=> {
      closePanel();
      profileMenu.classList.remove('show');
    });
    sidePanel.addEventListener('click', (e)=> e.stopPropagation());

    profileBtn.addEventListener('click', (e)=> { e.stopPropagation(); profileMenu.classList.toggle('show'); });

    // Map + routing behavior
    const map = L.map('map').setView([20,0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    let routeLayer = null;
    let markers = [];

    function clearMap() {
      if (routeLayer) { routeLayer.remove(); routeLayer = null; }
      markers.forEach(m => map.removeLayer(m));
      markers = [];
      document.getElementById('info').innerHTML = '';
    }
    // clear button now clears form inputs and map
    clearBtn.addEventListener('click', ()=> {
      routeForm.reset(); // resets fields to placeholders
      clearMap();
    });

    document.getElementById('routeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = { from: fd.get('from'), to: fd.get('to') };
      const res = await fetch('/route', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'unknown'}));
        return alert('Error: ' + (err.error || res.statusText));
      }
      const data = await res.json();
      clearMap();
      const best = data.bestRouteIndex;
      data.routes.forEach((r, i) => {
        const color = (i === best) ? '#ff6b6b' : '#60a5fa';
        const style = { color, weight: (i===best?6:3), opacity: (i===best?0.95:0.7) };
        const layer = L.geoJSON(r.geometry, { style }).addTo(map);
        if (!routeLayer) routeLayer = L.featureGroup().addTo(map);
        routeLayer.addLayer(layer);
      });
      if (data.origin) {
        const mo = L.marker([data.origin.lat, data.origin.lon]).addTo(map).bindPopup('Origin: ' + (data.origin.display_name || 'origin'));
        markers.push(mo);
      }
      if (data.destination) {
        const md = L.marker([data.destination.lat, data.destination.lon]).addTo(map).bindPopup('Destination: ' + (data.destination.display_name || 'destination'));
        markers.push(md);
      }
      const bounds = routeLayer ? routeLayer.getBounds() : (markers.length? L.featureGroup(markers).getBounds() : null);
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [20,20] });
      const info = document.getElementById('info');
      info.innerHTML = '<h3 style="margin:0 0 6px 0;color:var(--white)">Routes</h3>' + data.routes.map((r,i)=>\`<div style="margin-bottom:6px;color:var(--muted);">\${i===best?'<strong style="color:var(--accent2)">BEST</strong> ':'#'} Route \${i+1}: \${(r.distance/1000).toFixed(2)} km, \${Math.round(r.duration/60)} min</div>\`).join('');
    });

    // keyboard escape to close panels
    document.addEventListener('keydown', (e)=> {
      if (e.key === 'Escape') {
        closePanel();
        profileMenu.classList.remove('show');
      }
    });
  </script>
</body>
</html>
`;
}
// ...existing code...

function simplePage(title, content) {
    return `
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:Inter,Arial;background:#071033;color:#e6eef8;padding:36px}</style></head>
<body><h2>${title}</h2>${content}<p style="margin-top:18px"><a href="/">Back home</a></p></body></html>`;
}

// Small server-side helper to escape HTML when injecting user name
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
