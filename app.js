const http = require("http");
const client = require("prom-client");
const url = require("url");

// ================= Metrics Setup =================
client.collectDefaultMetrics();

// Custom Metrics
const requestCounter = new client.Counter({
  name: "app_requests_total",
  help: "Total number of requests",
  labelNames: ["method", "route", "status"]
});

const requestDuration = new client.Histogram({
  name: "app_request_duration_seconds",
  help: "Request duration in seconds",
  labelNames: ["method", "route"],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const errorCounter = new client.Counter({
  name: "app_errors_total",
  help: "Total number of errors"
});

// ================= Server =================
const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const parsedUrl = url.parse(req.url, true);
  const route = parsedUrl.pathname;

  try {
    // ================= ROUTES =================

    if (route === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>🚀 DevOps Node App Running</h1>");
    }

    else if (route === "/api") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        message: "Hello from API",
        time: new Date()
      }));
    }

    else if (route === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "UP" }));
    }

    else if (route === "/error") {
      throw new Error("Simulated failure 🚨");
    }

    else if (route === "/metrics") {
      res.writeHead(200, { "Content-Type": client.register.contentType });
      res.end(await client.register.metrics());
    }

    else {
      res.writeHead(404);
      res.end("Route not found");
    }

    // ================= Metrics Success =================
    const duration = (Date.now() - start) / 1000;
    requestCounter.inc({ method: req.method, route, status: 200 });
    requestDuration.observe({ method: req.method, route }, duration);

    console.log(`✅ ${req.method} ${route} - ${duration}s`);

  } catch (err) {
    errorCounter.inc();

    res.writeHead(500);
    res.end("Internal Server Error");

    console.error(`❌ Error on ${route}:`, err.message);

    requestCounter.inc({ method: req.method, route, status: 500 });
  }
});

// ================= Start Server =================
server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});