const express = require("express");
const cors = require("cors");
const { execFile } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const execFileAsync = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*").split(",").map(x => x.trim());
const YTDLP = process.env.YTDLP_PATH || "yt-dlp";

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Origin not allowed"));
  }
}));
app.use(express.json({ limit: "20kb" }));

function validateUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error("सही X/Twitter URL डालें।"); }
  const hosts = ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"];
  if (!hosts.includes(u.hostname.toLowerCase()) || !/\/status\/\d+/.test(u.pathname)) {
    throw new Error("केवल X/Twitter की सार्वजनिक status पोस्ट लिंक स्वीकार है।");
  }
  return u.toString();
}
async function getInfo(url) {
  const { stdout } = await execFileAsync(YTDLP, ["--dump-single-json", "--no-warnings", "--no-playlist", url], {
    timeout: 60000, maxBuffer: 8 * 1024 * 1024
  });
  return JSON.parse(stdout);
}
function safeFormats(info) {
  const formats = (info.formats || []).filter(f =>
    f.url && f.vcodec && f.vcodec !== "none" && (f.ext === "mp4" || f.ext === "m4v")
  );
  const byHeight = new Map();
  for (const f of formats) {
    const h = Number(f.height || 0);
    if (!h) continue;
    const old = byHeight.get(h);
    if (!old || Number(f.tbr || 0) > Number(old.tbr || 0)) byHeight.set(h, f);
  }
  return [...byHeight.entries()].sort((a,b)=>a[0]-b[0]).map(([height,f])=>({
    id: String(f.format_id), label: `${height}p`
  })).slice(-5);
}
app.get("/", (req,res)=>res.type("text").send("X Video Downloader backend is running."));
app.get("/health", (req,res)=>res.json({ok:true}));
app.post("/api/info", async (req,res) => {
  try {
    const url = validateUrl(req.body && req.body.url);
    const info = await getInfo(url);
    if (!info.formats || !info.formats.length) return res.status(404).json({error:"इस पोस्ट में उपलब्ध वीडियो नहीं मिला।"});
    const formats = safeFormats(info);
    if (!formats.length) return res.status(404).json({error:"इस पोस्ट में समर्थित MP4 वीडियो क्वालिटी नहीं मिली।"});
    res.json({
      title: info.title || "X Video",
      thumbnail: info.thumbnail || null,
      duration: info.duration || null,
      formats
    });
  } catch (e) {
    res.status(400).json({error: e.message || "वीडियो की जानकारी प्राप्त नहीं हो सकी।"});
  }
});
app.get("/api/download", async (req,res) => {
  let tempDir;
  try {
    const url = validateUrl(req.query.url);
    const format = String(req.query.format || "");
    if (!/^[A-Za-z0-9._+-]{1,30}$/.test(format)) return res.status(400).send("Invalid format");
    const info = await getInfo(url);
    const allowed = safeFormats(info).some(f => f.id === format);
    if (!allowed) return res.status(400).send("Requested format is not available");
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "xvd-"));
    const out = path.join(tempDir, "x-video.%(ext)s");
    await execFileAsync(YTDLP, [
      "--no-warnings", "--no-playlist", "--merge-output-format", "mp4",
      "-f", `${format}+bestaudio/${format}`, "-o", out, url
    ], { timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    const files = fs.readdirSync(tempDir);
    const file = files.find(n => /\.(mp4|m4v)$/i.test(n));
    if (!file) throw new Error("वीडियो फाइल तैयार नहीं हो सकी।");
    res.download(path.join(tempDir,file), "x-video.mp4", () => {
      fs.rm(tempDir, {recursive:true, force:true}, ()=>{});
    });
  } catch (e) {
    if (tempDir) fs.rm(tempDir, {recursive:true, force:true}, ()=>{});
    res.status(400).send(e.message || "डाउनलोड विफल।");
  }
});
app.listen(PORT, ()=>console.log(`Server listening on ${PORT}`));
