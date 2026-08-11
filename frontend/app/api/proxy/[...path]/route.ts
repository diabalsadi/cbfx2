import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:8000';

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = '/' + path.join('/');
  const search = req.nextUrl.search;
  const url = `${BACKEND_URL}${targetPath}${search}`;

  const headers: Record<string, string> = {};
  const contentType = req.headers.get('content-type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;
  const realIp = req.headers.get('x-real-ip');
  if (realIp) headers['X-Real-IP'] = realIp;

  let body: Blob | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.blob();
  }

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body,
    });

    console.log(`Proxying ${req.method} request to: ${url} - Status: ${res.status}`);

    if (res.status === 204) {
      return new NextResponse(null, { status: res.status });
    }

    const responseHeaders = new Headers();
    const hopByHopAndEncodingHeaders = new Set([
      'content-encoding',
      'content-length',
      'transfer-encoding',
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'upgrade',
    ]);

    res.headers.forEach((value, key) => {
      if (!hopByHopAndEncodingHeaders.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    const data = await res.arrayBuffer();
    return new NextResponse(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Proxy error for ${url}:`, error);
    return NextResponse.json(
      { detail: 'Failed to communicate with backend server' },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
