import http from 'node:http';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const PORT = Number(process.env.STEP4_COLLECTOR_PORT ?? 43110);
const MAX_BODY_SIZE = 50 * 1024 * 1024;
const datasetRoot = path.resolve(process.cwd(), 'dataset', 'step4');

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
};

const readRequestBody = request => {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    request.setEncoding('utf8');

    request.on('data', chunk => {
      rawBody += chunk;

      if (rawBody.length > MAX_BODY_SIZE) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });

    request.on('end', () => {
      resolve(rawBody);
    });

    request.on('error', reject);
  });
};

const isNonEmptyString = value => {
  return typeof value === 'string' && value.trim().length > 0;
};

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, {
      ok: true,
      datasetRoot,
    });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/step4/save') {
    sendJson(response, 404, {
      message: 'Not Found',
    });
    return;
  }

  try {
    const rawBody = await readRequestBody(request);
    const payload = JSON.parse(rawBody);
    const { sampleId, targetBase64, recipe } = payload;

    if (
      !isNonEmptyString(sampleId) ||
      !isNonEmptyString(targetBase64) ||
      recipe == null ||
      typeof recipe !== 'object'
    ) {
      sendJson(response, 400, {
        message: 'Invalid request payload.',
      });
      return;
    }

    const sampleDir = path.join(datasetRoot, sampleId);
    const targetPath = path.join(sampleDir, 'target.jpg');
    const recipePath = path.join(sampleDir, 'recipe.json');

    await mkdir(sampleDir, { recursive: true });
    await writeFile(targetPath, Buffer.from(targetBase64, 'base64'));
    await writeFile(recipePath, JSON.stringify(recipe, null, 2), 'utf8');

    sendJson(response, 200, {
      sampleId,
      targetPath,
      recipePath,
    });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error ? error.message : 'Unknown collector error.',
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[step4-collector] listening on http://127.0.0.1:${PORT}`);
  console.log(`[step4-collector] saving into ${datasetRoot}`);
});
