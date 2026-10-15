/* views.js — The three role views (Requestor, Legal Assistant, Legal Manager) and role guards. */
var views = { requester: { label: "Requester view", avatar: "R", title: "Your requests" }, assistant: { label: "Legal Assistant view", avatar: "LA", title: "Legal work queue" }, manager: { label: "Legal Manager view", avatar: "LM", title: "For your approval" } };
var role = "requester";
try {
  const saved = localStorage.getItem("nb.legal.view");
  if (views[saved]) role = saved;
} catch {
}
var currentRole = () => role;
function setRole(value) {
  if (!views[value]) throw new Error("Unknown view.");
  role = value;
  try {
    localStorage.setItem("nb.legal.view", role);
  } catch {
  }
}
function requireView(...allowed) {
  if (!allowed.includes(role)) throw new Error("This action is available in the " + allowed.map((x3) => views[x3].label).join(" or ") + ".");
}
