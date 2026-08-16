const express = require("express");
const { createClient } = require("redis");

const app = express();
const PORT = 3001;

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const redisUrl = `redis://${REDIS_HOST}:${REDIS_PORT}`;

const redis = createClient({ url: redisUrl });

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis connection error", err.message));

(async () => {
  try {
    await redis.connect();
  } catch (err) {
    console.error("Initial Redis connect failed", err.message);
  }
})();

app.get("/", async (req, res) => {
  try {
    const [aRaw, bRaw] = await Promise.all([redis.get("votes:A"), redis.get("votes:B")]);
    const aVotes = Number(aRaw || 0);
    const bVotes = Number(bRaw || 0);

    res.send(`
      <!doctype html>
      <html>
        <head><title>Voting Results</title></head>
        <body style="font-family: sans-serif; max-width: 700px; margin: 2rem auto;">
          <h1>Voting Results</h1>
          <p>Option A: ${aVotes} votes</p>
          <p>Option B: ${bVotes} votes</p>
          <button onclick="location.reload()">Refresh</button>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Failed to read votes", err.message);
    res.status(503).send("Redis unavailable");
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", async (req, res) => {
  try {
    await redis.ping();
    return res.json({ status: "ready" });
  } catch (err) {
    console.error("Readiness check failed", err.message);
    return res.status(503).json({ status: "not ready", error: "Redis unavailable" });
  }
});

app.listen(PORT, () => {
  console.log(`Result server started on port ${PORT}`);
});
