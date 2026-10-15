/* requester-profiles.js — Sample requester profiles for the demo. */
var KEY4 = "nb.legal.requester-profile";
var requesterProfiles = [{ id: "afi-finance", company: "Alder Foods", code: "AFI", department: "Finance" }, { id: "afi-operations", company: "Alder Foods", code: "AFI", department: "Operations" }, { id: "hmc-crewing", company: "Harborline Maritime", code: "HMC", department: "Crewing" }, { id: "smi-treasury", company: "Silvercrest Mining", code: "SMI", department: "Treasury" }];
function selectedProfile() {
  let id;
  try {
    id = localStorage.getItem(KEY4);
  } catch {
  }
  return requesterProfiles.find((p3) => p3.id === id) || null;
}
function setRequesterProfile(id) {
  if (id && !requesterProfiles.some((p3) => p3.id === id)) throw new Error("Unknown sample requester.");
  localStorage.setItem(KEY4, id);
}
function profileValues() {
  const p3 = selectedProfile();
  return p3 ? { company: p3.company, companyCode: p3.code, department: p3.department, requestor: `Sample ${p3.department} requester` } : {};
}
