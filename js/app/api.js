/* api.js — Thin data access layer. */
async function submitRequest(payload) {
  return createRequest(payload, getRequests());
}
