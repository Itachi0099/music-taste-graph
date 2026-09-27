import type { NextRequest } from 'next/server';
import app from '../../../../server/app';

// Next.js App Router Catch-all API Route handler that bridges Express.js
export async function GET(req: NextRequest) {
  return handleExpress(req);
}

export async function POST(req: NextRequest) {
  return handleExpress(req);
}

export async function OPTIONS(req: NextRequest) {
  return handleExpress(req);
}

async function handleExpress(req: NextRequest): Promise<Response> {
  // Convert NextRequest to standard request simulation for Express
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Create a mock response collector
  let statusCode = 200;
  const headers = new Headers();
  let responseBody: any = '';

  const mockRes: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      headers.set(name, value);
      return this;
    },
    header(name: string, value: string) {
      headers.set(name, value);
      return this;
    },
    json(body: any) {
      headers.set('Content-Type', 'application/json');
      responseBody = JSON.stringify(body);
      return this;
    },
    send(body: any) {
      responseBody = body;
      return this;
    },
    end(chunk?: any) {
      if (chunk) responseBody = chunk;
      return this;
    }
  };

  let parsedBody: any = undefined;
  if (req.method === 'POST') {
    try {
      parsedBody = await req.json();
    } catch {
      parsedBody = {};
    }
  }

  const mockReq: any = {
    method: req.method,
    url: path,
    originalUrl: path,
    query: Object.fromEntries(url.searchParams.entries()),
    body: parsedBody,
    headers: Object.fromEntries(req.headers.entries())
  };

  await new Promise<void>((resolve) => {
    app(mockReq, mockRes, () => {
      resolve();
    });
    // When res.json / res.send is called, ensure completion
    const origJson = mockRes.json;
    mockRes.json = function(b: any) {
      origJson.call(mockRes, b);
      resolve();
    };
    const origSend = mockRes.send;
    mockRes.send = function(b: any) {
      origSend.call(mockRes, b);
      resolve();
    };
    const origEnd = mockRes.end;
    mockRes.end = function(b: any) {
      origEnd.call(mockRes, b);
      resolve();
    };
  });

  return new Response(responseBody, {
    status: statusCode,
    headers
  });
}
