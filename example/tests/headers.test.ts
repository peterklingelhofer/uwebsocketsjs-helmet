import * as http from 'http';
import { exec, execSync } from 'child_process';

const startServer = (script: string) => {
  return exec(`node dist/${script}.js`, { cwd: __dirname + '/..' });
};

const makeRequest = (path: string) => {
  return new Promise<{ headers: http.IncomingHttpHeaders }>((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 9001, path }, res => {
      const headers = res.headers;
      res.on('data', () => {});
      res.on('end', () => resolve({ headers }));
    });
    req.on('error', reject);
    req.end();
  });
};

describe('uWebSockets.js Helmet', () => {
  let server: any;

  beforeAll((done) => {
    execSync('pnpm run build', { cwd: __dirname + '/..' });
    server = startServer('index');
    server.stdout.on('data', (data: any) => {
      if (data.includes('Listening to port 9001')) {
        done();
      }
    });
  });

  afterAll(() => {
    server.kill();
  });

  test('default headers are set', async () => {
    const response = await makeRequest('/');
    expect(response.headers['content-security-policy']).toBe("default-src 'self'");
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['expect-ct']).toBe('max-age=86400, enforce');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains; preload');
    expect(response.headers['x-download-options']).toBe('noopen');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-xss-protection']).toBe('0');
  });

  test('custom headers are set', async () => {
    server.kill();
    server = startServer('customHeaders');
    await new Promise(resolve => server.stdout.on('data', (data: any) => {
      if (data.includes('Listening to port 9001')) {
        resolve(true);
      }
    }));
    const response = await makeRequest('/');
    expect(response.headers['content-security-policy']).toBe("default-src 'self'; script-src 'self' 'unsafe-inline'");
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
