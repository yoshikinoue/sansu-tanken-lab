/**
 * @file server.js
 * @description Zero-dependency Node.js v24 HTTP Server for Sansu Tanken Lab (算数探検ラボ).
 *   - Serves static application assets with strict UTF-8 MIME types and path traversal protection
 *   - Provides GET /api/progress and atomic POST /api/progress persistence with automatic backup
 *   - Provides POST /api/transfer/generate and POST /api/transfer/claim for 8-character transfer codes
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDefaultProgress,
  normalizeProgressData,
  normalizeTransferCode,
  TRANSFER_ALPHABET,
  TRANSFER_TTL_MS
} from './src/services/storage-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const defaultPort = Number(process.env.PORT) || 3000;
export const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB

export const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

export const MIME_TYPES = mimeTypes;

// Per-file write queue mutex to guarantee serialized atomic writes under concurrent POST load
const writeQueues = new Map();

/**
 * Sanitize a requested URL path against a root directory and prevent directory traversal or dotfile exposure.
 * @param {string} requestedUrl
 * @param {string} rootDir
 * @returns {string}
 */
export function sanitizePath(requestedUrl, rootDir) {
  if (typeof requestedUrl !== 'string' || typeof rootDir !== 'string') {
    throw new Error('Path traversal detected');
  }

  // Strip query parameters and hash fragments
  const rawPath = requestedUrl.split(/[?#]/)[0];

  if (rawPath.includes('\0') || /%00/i.test(rawPath)) {
    throw new Error('Path traversal detected');
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
    if (decodedPath.includes('%')) {
      decodedPath = decodeURIComponent(decodedPath);
    }
  } catch {
    throw new Error('Path traversal detected');
  }

  if (decodedPath.includes('\0')) {
    throw new Error('Path traversal detected');
  }

  // Normalize slashes for inspection
  const normalizedSlashes = decodedPath.replace(/\\/g, '/');

  // Reject explicit parent directory traversal segments
  const rawSegments = normalizedSlashes.split('/').filter(Boolean);
  for (const seg of rawSegments) {
    if (seg === '..' || seg.startsWith('.')) {
      throw new Error('Path traversal detected');
    }
  }

  const relativeTarget = rawSegments.length === 0 ? 'index.html' : rawSegments.join(path.sep);
  const rootResolved = path.resolve(rootDir);
  const resolved = path.resolve(rootResolved, '.' + path.sep + relativeTarget);

  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) {
    throw new Error('Path traversal detected');
  }

  return resolved;
}

/**
 * Validate a progress payload before atomic write.
 * @param {any} payload
 * @returns {boolean}
 */
export function validateAtomicPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid JSON payload');
  }
  if (payload.schemaVersion !== '1.0.0') {
    throw new Error('Unsupported schema version');
  }
  return true;
}

/**
 * Execute an async task serialized per target file path.
 * @template T
 * @param {string} fileKey
 * @param {() => Promise<T>} taskFn
 * @returns {Promise<T>}
 */
function enqueueFileWrite(fileKey, taskFn) {
  const prev = writeQueues.get(fileKey) || Promise.resolve();
  const next = prev.catch(() => {}).then(taskFn);
  writeQueues.set(
    fileKey,
    next.finally(() => {
      if (writeQueues.get(fileKey) === next) {
        writeQueues.delete(fileKey);
      }
    })
  );
  return next;
}

/**
 * Atomically write JSON data to `targetFile` via a unique temporary file and `fs.rename`.
 * Optionally copies existing `targetFile` to `backupFile` prior to replacement.
 * @param {string} targetFile
 * @param {object} data
 * @param {string} [backupFile]
 * @returns {Promise<void>}
 */
export async function atomicWriteJson(targetFile, data, backupFile) {
  return enqueueFileWrite(targetFile, async () => {
    const dir = path.dirname(targetFile);
    await fs.mkdir(dir, { recursive: true });

    if (backupFile) {
      try {
        await fs.access(targetFile);
        await fs.copyFile(targetFile, backupFile);
      } catch {
        // Target file does not exist yet; skip backup copy
      }
    }

    const uniqueSuffix = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    const tmpFile = `${targetFile}.tmp.${uniqueSuffix}`;
    const serialized = JSON.stringify(data, null, 2) + '\n';

    try {
      await fs.writeFile(tmpFile, serialized, 'utf-8');
      await fs.rename(tmpFile, targetFile);
    } catch (err) {
      try {
        await fs.unlink(tmpFile);
      } catch {
        // Ignore cleanup error
      }
      throw err;
    }
  });
}

/**
 * Validate and atomically write progress payload to `dataFile`.
 * @param {string} dataFile
 * @param {object} payload
 * @param {string} [backupFile]
 * @returns {Promise<object>}
 */
export async function atomicWriteProgress(dataFile, payload, backupFile) {
  validateAtomicPayload(payload);
  const normalized = normalizeProgressData(payload);
  await atomicWriteJson(dataFile, normalized, backupFile);
  return normalized;
}

/**
 * Read JSON file safely with optional fallback.
 * @param {string} filePath
 * @param {string} [backupFile]
 * @returns {Promise<object|null>}
 */
async function readJsonFileSafe(filePath, backupFile) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (backupFile) {
      try {
        const backupContent = await fs.readFile(backupFile, 'utf-8');
        return JSON.parse(backupContent);
      } catch {
        // Fall through
      }
    }
    if (err && err.code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

/**
 * Read HTTP request body with a strict byte size limit.
 * @param {http.IncomingMessage} req
 * @param {number} maxBytes
 * @returns {Promise<string>}
 */
function readRequestBody(req, maxBytes = MAX_BODY_SIZE) {
  return new Promise((resolve, reject) => {
    const contentLength = Number(req.headers['content-length']);
    if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
      req.resume();
      const err = new Error('Payload Too Large');
      err.statusCode = 413;
      reject(err);
      return;
    }

    const chunks = [];
    let totalBytes = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        aborted = true;
        req.resume();
        const err = new Error('Payload Too Large');
        err.statusCode = 413;
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (aborted) return;
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });

    req.on('error', (err) => {
      if (aborted) return;
      reject(err);
    });
  });
}

/**
 * Send JSON HTTP response with standard security and CORS headers.
 * @param {http.ServerResponse} res
 * @param {number} statusCode
 * @param {object} payload
 */
function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept'
  });
  res.end(body);
}

/**
 * Generate a random 8-character transfer code `LAB-XXXX-XXXX`.
 * @returns {string}
 */
function createRandomTransferCode() {
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += TRANSFER_ALPHABET[Math.floor(Math.random() * TRANSFER_ALPHABET.length)];
    p2 += TRANSFER_ALPHABET[Math.floor(Math.random() * TRANSFER_ALPHABET.length)];
  }
  return `LAB-${p1}-${p2}`;
}

/**
 * Create a configured Node.js HTTP server instance for Sansu Tanken Lab.
 * @param {object} [options]
 * @param {string} [options.rootDir]
 * @param {string} [options.dataDir]
 * @param {string} [options.dataFile]
 * @param {string} [options.backupFile]
 * @param {string} [options.transfersFile]
 * @param {number} [options.maxBodySize]
 * @returns {http.Server}
 */
export function createAppServer(options = {}) {
  const rootDir = path.resolve(options.rootDir || __dirname);
  const dataDir = path.resolve(options.dataDir || path.join(rootDir, 'data'));
  const dataFile = path.resolve(options.dataFile || path.join(dataDir, 'progress.json'));
  const backupFile = path.resolve(
    options.backupFile || path.join(path.dirname(dataFile), 'progress.backup.json')
  );
  const transfersFile = path.resolve(
    options.transfersFile || path.join(path.dirname(dataFile), 'transfers.json')
  );
  const maxBodySize = typeof options.maxBodySize === 'number' ? options.maxBodySize : MAX_BODY_SIZE;

  const server = http.createServer(async (req, res) => {
    try {
      const method = (req.method || 'GET').toUpperCase();
      const rawUrl = req.url || '/';
      const pathname = rawUrl.split(/[?#]/)[0];

      // Handle CORS preflight
      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
      }

      // =====================================================================
      // API Routes
      // =====================================================================
      if (pathname === '/api/progress') {
        if (method === 'GET' || method === 'HEAD') {
          let currentData = await readJsonFileSafe(dataFile, backupFile);
          if (!currentData || currentData.schemaVersion !== '1.0.0') {
            currentData = createDefaultProgress();
          } else {
            currentData = normalizeProgressData(currentData);
          }

          if (method === 'HEAD') {
            res.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
              'Access-Control-Allow-Origin': '*'
            });
            res.end();
            return;
          }

          sendJson(res, 200, currentData);
          return;
        }

        if (method === 'POST') {
          let rawBody;
          try {
            rawBody = await readRequestBody(req, maxBodySize);
          } catch (err) {
            if (err && err.statusCode === 413) {
              sendJson(res, 413, { error: 'Payload Too Large' });
              return;
            }
            sendJson(res, 400, { error: 'Failed to read request body' });
            return;
          }

          let parsed;
          try {
            parsed = JSON.parse(rawBody);
          } catch {
            sendJson(res, 400, { error: 'Invalid JSON payload' });
            return;
          }

          const payload =
            parsed && typeof parsed === 'object' && parsed.data && parsed.data.schemaVersion
              ? parsed.data
              : parsed;

          try {
            validateAtomicPayload(payload);
          } catch (err) {
            sendJson(res, 400, { error: err.message });
            return;
          }

          const savedAt = new Date().toISOString();
          if (!payload.lastUpdated) {
            payload.lastUpdated = savedAt;
          }

          const savedData = await atomicWriteProgress(dataFile, payload, backupFile);
          sendJson(res, 200, {
            success: true,
            savedAt,
            data: savedData
          });
          return;
        }

        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }

      if (pathname === '/api/transfer/generate') {
        if (method !== 'POST') {
          sendJson(res, 405, { error: 'Method Not Allowed' });
          return;
        }

        let rawBody;
        try {
          rawBody = await readRequestBody(req, maxBodySize);
        } catch (err) {
          if (err && err.statusCode === 413) {
            sendJson(res, 413, { error: 'Payload Too Large' });
            return;
          }
          sendJson(res, 400, { error: 'Failed to read request body' });
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          sendJson(res, 400, { error: 'Invalid JSON payload' });
          return;
        }

        const userData = parsed?.data || parsed?.userData || parsed;
        try {
          validateAtomicPayload(userData);
        } catch (err) {
          sendJson(res, 400, { error: err.message });
          return;
        }

        const code =
          typeof parsed?.code === 'string' && /^LAB-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/i.test(parsed.code)
            ? parsed.code.toUpperCase()
            : createRandomTransferCode();
        const normalizedCode = normalizeTransferCode(code);
        const now = typeof parsed?.now === 'number' ? parsed.now : Date.now();
        const expiresAt =
          typeof parsed?.expiresAt === 'number' ? parsed.expiresAt : now + TRANSFER_TTL_MS;

        const existingTransfers = (await readJsonFileSafe(transfersFile)) || {};
        existingTransfers[normalizedCode] = {
          code,
          normalizedCode,
          data: normalizeProgressData(userData),
          createdAt: now,
          expiresAt
        };

        await atomicWriteJson(transfersFile, existingTransfers);
        sendJson(res, 200, {
          success: true,
          code,
          expiresAt
        });
        return;
      }

      if (pathname === '/api/transfer/claim') {
        if (method !== 'POST') {
          sendJson(res, 405, { error: 'Method Not Allowed' });
          return;
        }

        let rawBody;
        try {
          rawBody = await readRequestBody(req, maxBodySize);
        } catch (err) {
          if (err && err.statusCode === 413) {
            sendJson(res, 413, { error: 'Payload Too Large' });
            return;
          }
          sendJson(res, 400, { error: 'Failed to read request body' });
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          sendJson(res, 400, { error: 'Invalid JSON payload' });
          return;
        }

        let normalized = normalizeTransferCode(parsed?.code || '');
        if (normalized.length === 8 && !normalized.startsWith('LAB')) {
          normalized = `LAB${normalized}`;
        }

        if (!/^LAB[2-9A-HJ-NP-Z]{8}$/.test(normalized)) {
          sendJson(res, 400, { error: '無効な引き継ぎコード形式です（LAB-XXXX-XXXX）' });
          return;
        }

        const existingTransfers = (await readJsonFileSafe(transfersFile)) || {};
        const record = existingTransfers[normalized];
        if (!record) {
          sendJson(res, 404, { error: '引き継ぎコードが見つかりません' });
          return;
        }

        const now = typeof parsed?.now === 'number' ? parsed.now : Date.now();
        if (typeof record.expiresAt === 'number' && now > record.expiresAt) {
          sendJson(res, 410, {
            error: 'この引き継ぎコードは有効期限（48時間）が切れています。元の端末で再発行してください'
          });
          return;
        }

        sendJson(res, 200, {
          success: true,
          code: record.code,
          data: record.data
        });
        return;
      }

      if (pathname === '/api' || pathname.startsWith('/api/')) {
        sendJson(res, 404, { error: 'API endpoint not found' });
        return;
      }

      // =====================================================================
      // Static File Serving
      // =====================================================================
      if (method !== 'GET' && method !== 'HEAD') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }

      let filePath;
      try {
        filePath = sanitizePath(rawUrl, rootDir);
      } catch {
        sendJson(res, 403, { error: 'Forbidden: Path traversal detected' });
        return;
      }

      let stat;
      try {
        stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
          stat = await fs.stat(filePath);
        }
      } catch {
        sendJson(res, 404, { error: 'File Not Found' });
        return;
      }

      if (!stat.isFile()) {
        sendJson(res, 404, { error: 'File Not Found' });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      const headers = {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*'
      };

      if (method === 'HEAD') {
        res.writeHead(200, headers);
        res.end();
        return;
      }

      const content = await fs.readFile(filePath);
      res.writeHead(200, headers);
      res.end(content);
    } catch (err) {
      sendJson(res, 500, { error: 'Internal Server Error', details: err?.message });
    }
  });

  return server;
}

/**
 * Start the HTTP server listening on the given port.
 * @param {number} [port=defaultPort]
 * @param {object} [options={}]
 * @returns {Promise<http.Server>}
 */
export function startServer(port = defaultPort, options = {}) {
  const server = createAppServer(options);
  const host = options.host || '127.0.0.1';
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.removeListener('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.removeListener('error', onError);
      resolve(server);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

/**
 * Gracefully stop a running HTTP server instance.
 * @param {http.Server} server
 * @returns {Promise<void>}
 */
export function stopServer(server) {
  return new Promise((resolve, reject) => {
    if (!server || !server.listening) {
      resolve();
      return;
    }
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export const ServerContract = {
  defaultPort,
  MAX_BODY_SIZE,
  mimeTypes,
  MIME_TYPES,
  sanitizePath,
  validateAtomicPayload,
  atomicWriteJson,
  atomicWriteProgress,
  createAppServer,
  startServer,
  stopServer
};

export default ServerContract;

// Auto-start server only when invoked directly via `node server.js`
const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainModule) {
  const portToUse = Number(process.env.PORT) || defaultPort;
  const hostToUse = process.env.HOST || '0.0.0.0';
  startServer(portToUse, { host: hostToUse })
    .then((srv) => {
      const addr = srv.address();
      const boundPort = typeof addr === 'object' && addr ? addr.port : portToUse;
      console.log(`算数探検ラボ サーバー起動: http://localhost:${boundPort}`);
    })
    .catch((err) => {
      console.error('サーバー起動エラー:', err);
      process.exit(1);
    });
}
