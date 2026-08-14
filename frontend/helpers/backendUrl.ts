// Server-only. The FastAPI backend's base URL — used by the proxy route and
// by anything fetching the backend directly at request time (e.g. SEO
// metadata in generateMetadata(), which runs on the server before a page's
// own client-side data fetching kicks in).
export const IS_DEV = process.env.NODE_ENV !== "production";

export const BACKEND_URL =
  process.env.BACKEND_URL || (IS_DEV ? "http://localhost:8000" : "https://cbfx.onrender.com");
