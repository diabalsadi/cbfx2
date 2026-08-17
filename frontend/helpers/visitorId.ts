const KEY = "cbfx_visitor_id";

// A random, anonymous, persistent id used only to de-duplicate the admin
// "visitors" chart (see backend/app/routers/geo.py) — lets a refresh or
// repeat page load within the same day not count as a separate visitor.
// Not tied to any account; logged-in users are de-duplicated by email
// instead, server-side.
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
