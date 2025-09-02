// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------------
   1) Middleware
--------------------------*/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: "bb.sid",
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // true if HTTPS
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// Serve public static files (index.html, images, etc.)
app.use(express.static(__dirname));

// Serve admin static files (JS, CSS)
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve images from local images folder
app.use('/images', express.static(path.join(__dirname, 'images')));

/* -------------------------
   2) Admin Auth
--------------------------*/
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD || "DAMalaga2028!";
const PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD_PLAIN, 10);

function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.username === ADMIN_USER) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

/* -------------------------
   3) Auth routes
--------------------------*/
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  if (username !== ADMIN_USER) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  req.session.user = { username: ADMIN_USER };
  res.json({ ok: true, user: { username: ADMIN_USER } });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("bb.sid");
    res.json({ ok: true });
  });
});

app.get("/api/me", (req, res) => {
  if (req.session && req.session.user) return res.json({ authenticated: true, user: req.session.user });
  res.json({ authenticated: false });
});

/* -------------------------
   4) Public posts (read)
--------------------------*/
const DATA_PATH = process.env.POSTS_PATH || path.join(__dirname, 'data', 'posts.json');

app.get("/posts", (req, res) => {
  fs.readFile(DATA_PATH, "utf8", (err, data) => {
    if (err) {
      // If file doesn't exist, return empty array
      if (err.code === 'ENOENT') return res.json([]);
      return res.status(500).send("Error reading posts file");
    }
    res.type("application/json").send(data);
  });
});

/* -------------------------
   5) Admin posts (write) — protected
--------------------------*/
app.post("/admin/posts", requireAuth, (req, res) => {
  const body = req.body;
  if (!Array.isArray(body)) return res.status(400).json({ error: "Body must be an array of posts" });

  fs.writeFile(DATA_PATH, JSON.stringify(body, null, 2), (err) => {
    if (err) return res.status(500).json({ error: "Error saving posts" });
    res.json({ ok: true });
  });
});

/* -------------------------
   6) Serve admin HTML
--------------------------*/
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

/* -------------------------
   7) Start server
--------------------------*/
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});