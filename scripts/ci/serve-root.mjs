import http from "node:http";
import path from "node:path";
import { stat, readFile } from "node:fs/promises";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const rootDir = process.cwd();

const contentTypeByExt = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".ico", "image/x-icon"],
  [".woff2", "font/woff2"],
  [".woff", "font/woff"],
  [".ttf", "font/ttf"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
]);

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    "cache-control": "no-store",
    ...headers,
  });
  res.end(body);
}

function safePathFromUrl(urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  const trimmed = decoded.split("?")[0].split("#")[0];
  const cleaned = trimmed.replaceAll("\\", "/");
  const withoutLeading = cleaned.startsWith("/") ? cleaned.slice(1) : cleaned;
  const resolved = path.resolve(rootDir, withoutLeading);
  if (!resolved.startsWith(rootDir)) return null;
  return resolved;
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return send(res, 400, "Bad Request");

  const pathname = req.url.split("?")[0];
  const filePath = safePathFromUrl(pathname);
  if (!filePath) return send(res, 403, "Forbidden");

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return send(res, 404, "Not Found");
  }

  if (fileStat.isDirectory()) {
    const indexPath = path.join(filePath, "index.html");
    try {
      const indexStat = await stat(indexPath);
      if (!indexStat.isFile()) return send(res, 404, "Not Found");
      const body = await readFile(indexPath);
      return send(res, 200, body, { "content-type": "text/html; charset=utf-8" });
    } catch {
      return send(res, 404, "Not Found");
    }
  }

  if (!fileStat.isFile()) return send(res, 404, "Not Found");

  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypeByExt.get(ext) ?? "application/octet-stream";

  try {
    const body = await readFile(filePath);
    return send(res, 200, body, { "content-type": contentType });
  } catch {
    return send(res, 500, "Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`[serve-root] Serving ${rootDir} at http://${host}:${port}`);
});

