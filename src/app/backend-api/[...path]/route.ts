import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

const BACKEND_URL = (process.env.SPRING_BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const { getToken } = await auth();
    const token = await getToken();
    const target = new URL(`${BACKEND_URL}/api/${path.join("/")}`);
    request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    headers.set("accept", request.headers.get("accept") || "application/json");
    if (token) headers.set("authorization", `Bearer ${token}`);

    const hasBody = !["GET", "HEAD"].includes(request.method);
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    const responseHeaders = new Headers();
    const responseType = response.headers.get("content-type");
    if (responseType) responseHeaders.set("content-type", responseType);
    const body = await response.arrayBuffer();
    if (body.byteLength === 0) {
      return Response.json(
        { error: `Java backend returned an empty response (${response.status}).` },
        { status: response.status || 502 },
      );
    }
    return new Response(body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    console.error("Spring backend proxy error:", error);
    return Response.json(
      { error: "The Java backend is unavailable. Start it on port 8080." },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
