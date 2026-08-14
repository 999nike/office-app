import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4176);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function proxyMemoryJobFeed(request, response, pathname) {
  const isFeedRequest = pathname === "/api/memory-jobs";
  const acknowledgementMatch = pathname.match(/^\/api\/memory-jobs\/([^/]+)\/collected$/);
  if (!isFeedRequest && !acknowledgementMatch) return false;

  const feedUrl = String(process.env.MEMORY_SPACE_JOB_FEED_URL || "").trim();
  const feedToken = String(process.env.MEMORY_SPACE_JOB_FEED_TOKEN || "").trim();
  if (!feedUrl || !feedToken) {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ configured: false, jobs: [], count: 0 }));
    return true;
  }

  const upstreamUrl = new URL(
    acknowledgementMatch ? `${encodeURIComponent(acknowledgementMatch[1])}/collected` : "ready",
    `${feedUrl.replace(/\/+$/, "")}/`,
  );
  const body = acknowledgementMatch ? await readRequestBody(request) : undefined;
  try {
    const upstream = await fetch(upstreamUrl, {
      method: acknowledgementMatch ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${feedToken}`,
        ...(acknowledgementMatch ? { "Content-Type": request.headers["content-type"] || "application/json" } : {}),
      },
      body,
    });
    const responseBody = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(responseBody);
  } catch (error) {
    response.writeHead(502, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ error: `Memory Space job feed unavailable: ${error.message}` }));
  }
  return true;
}

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  if (await proxyMemoryJobFeed(request, response, pathname)) return;
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const requestedPath = normalize(join(root, relativePath));

  if (!requestedPath.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const info = await stat(requestedPath);
    const filePath = info.isDirectory() ? join(requestedPath, "index.html") : requestedPath;
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Office V0 running at http://127.0.0.1:${port}`);
});
