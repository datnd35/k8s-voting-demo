const express = require("express");
const { createClient } = require("redis");

const app = express();
const PORT = 3000;

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

app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  next(err);
});

app.get("/", (req, res) => {
  res.send(`
    <!doctype html>
    <html>
      <head><title>Voting App</title></head>
      <body style="font-family: sans-serif; max-width: 700px; margin: 2rem auto;">
        <h1>Vote</h1>
        <button onclick="vote('A')">Option A</button>
        <button onclick="vote('B')">Option B</button>
        <p id="message"></p>
        <script>
          async function vote(option) {
            const message = document.getElementById('message');
            try {
              const res = await fetch('/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ option })
              });
              const data = await res.json();
              message.textContent = res.ok ? data.message : (data.error || 'Vote failed');
            } catch (e) {
              message.textContent = 'Request failed';
            }
          }
        </script>
      </body>
    </html>
  `);
});

app.post("/vote", async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Missing request body" });
  }

  const { option } = req.body;

  if (option !== "A" && option !== "B") {
    return res.status(400).json({ error: "Invalid option. Use 'A' or 'B'." });
  }

  console.log(`Vote received: ${option}`);

  try {
    await redis.incr(`votes:${option}`);
    return res.status(200).json({ message: `Vote recorded for ${option}` });
  } catch (err) {
    console.error("Failed to write vote to Redis", err.message);
    return res.status(503).json({ error: "Redis unavailable" });
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
  console.log(`Voting server started on port ${PORT}`);
});
