// Mock State (Connect to your real phoneline API & database here)
let isSignedIn = false;
let activeCall = null;

const staff = [
  { id: 1, name: "You (Founder / Lead)", role: "Systems Admin", inOffice: false, ext: "101" },
  { id: 2, name: "Alex Rivera", role: "Network Support", inOffice: true, ext: "102" },
  { id: 3, name: "Priya Patel", role: "Client Success", inOffice: true, ext: "103" },
  { id: 4, name: "Marcus Vance", role: "Field Technician", inOffice: false, ext: "104" }
];

const clients = [
  { id: 1, org: "Oakridge Academy", contact: "Sarah Jenkins", phone: "+44 121 496 0182", openTickets: 1 },
  { id: 2, org: "Midlands Logistics Ltd", contact: "David Thorne", phone: "+44 121 496 0449", openTickets: 1 },
  { id: 3, org: "Apex Design Studio", contact: "Chloe Bennett", phone: "+44 121 496 0921", openTickets: 0 }
];

const tickets = [
  { id: "#1042", client: "Oakridge Academy", contact: "Sarah Jenkins", issue: "Wi-Fi Dropouts in Science Block", owner: "You (Founder / Lead)", status: "Open" },
  { id: "#1043", client: "Midlands Logistics Ltd", contact: "David Thorne", issue: "VoIP Desk Phone Provisioning", owner: "Alex Rivera", status: "Open" },
  { id: "#1041", client: "Apex Design Studio", contact: "Chloe Bennett", issue: "New Staff Account Setup", owner: "Priya Patel", status: "Resolved" }
];

const logs = [
  { time: "11:20 AM", text: "Alex Rivera signed into office via mobile app." },
  { time: "11:05 AM", text: "Priya Patel resolved Ticket #1041 (Apex Design Studio)." },
  { time: "10:48 AM", text: "Inbound call from +44 121 496 0449 auto-matched to Midlands Logistics Ltd." }
];

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function addLog(text) {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  logs.unshift({ time: now, text });
  renderAll();
}

function toggleOfficeSignIn() {
  isSignedIn = !isSignedIn;
  staff[0].inOffice = isSignedIn;

  const dot = document.getElementById("myStatusDot");
  const text = document.getElementById("myStatusText");
  const btn = document.getElementById("checkInBtn");

  if (isSignedIn) {
    dot.classList.add("online");
    text.textContent = "Signed In (In Office • Ext 101)";
    btn.textContent = "Sign Out of Office";
    btn.className = "btn btn-outline";
    addLog("You signed into the office. Phoneline & ticket routing enabled.");
    showToast("Signed into office — added to live call pool");
  } else {
    dot.classList.remove("online");
    text.textContent = "Signed Out (Off-Site)";
    btn.textContent = "Sign Into Office";
    btn.className = "btn btn-success";
    addLog("You signed out of the office. Direct calls paused.");
    showToast("Signed out — calls will route to active office staff");
  }
  renderAll();
}

function simulateIncomingCall(clientIndex = 0) {
  const client = clients[clientIndex] || clients[0];
  const linkedTicket = tickets.find(t => t.client === client.org && t.status === "Open") || {
    id: "#1044",
    issue: "General Account Inquiry"
  };

  activeCall = {
    caller: client.contact,
    org: client.org,
    phone: client.phone,
    ticketId: linkedTicket.id,
    issue: linkedTicket.issue
  };

  document.getElementById("callerName").textContent = `Incoming Call: ${activeCall.caller} (${activeCall.org})`;
  document.getElementById("callerContext").textContent = `Caller ID: ${activeCall.phone} • Linked Ticket ${activeCall.ticketId}: "${activeCall.issue}"`;
  document.getElementById("callBanner").classList.add("active");

  addLog(`Incoming call from ${activeCall.caller} (${activeCall.org}) auto-linked to ${activeCall.ticketId}.`);
  renderTransferTargets();
}

function renderTransferTargets() {
  const container = document.getElementById("transferTargets");
  const onlineStaff = staff.filter(s => s.inOffice);

  if (onlineStaff.length === 0) {
    container.innerHTML = `<span class="no-staff-warning">No staff currently signed into the office! Sign in above to receive calls.</span>`;
    return;
  }

  container.innerHTML = onlineStaff.map(member => `
    <button class="transfer-chip" onclick="transferCallAndTicket('${member.name}', '${member.ext}')">
      <span class="dot online"></span>
      <strong>${member.name}</strong> (Ext ${member.ext}) → 1-Click Transfer
    </button>
  `).join("");
}

function transferCallAndTicket(targetName, ext) {
  if (!activeCall) return;
  const ticket = tickets.find(t => t.id === activeCall.ticketId);
  if (ticket) ticket.owner = targetName;

  addLog(`1-CLICK TRANSFER: Live call + Ticket ${activeCall.ticketId} moved to ${targetName} (Ext ${ext}).`);
  showToast(`Transferred call & ${activeCall.ticketId} to ${targetName}`);
  document.getElementById("callBanner").classList.remove("active");
  activeCall = null;
  renderAll();
}

function endCall() {
  if (!activeCall) return;
  addLog(`Call ended with ${activeCall.caller} (${activeCall.org}).`);
  document.getElementById("callBanner").classList.remove("active");
  activeCall = null;
}

function quickReassign(ticketId) {
  const onlineStaff = staff.filter(s => s.inOffice);
  if (onlineStaff.length === 0) {
    showToast("No staff signed into office to route to!");
    return;
  }
  const ticket = tickets.find(t => t.id === ticketId);
  const nextStaff = onlineStaff.find(s => s.name !== ticket.owner) || onlineStaff[0];
  ticket.owner = nextStaff.name;
  addLog(`1-Click Ticket Route: ${ticketId} reassigned to ${nextStaff.name}.`);
  showToast(`${ticketId} routed to ${nextStaff.name}`);
  renderAll();
}

function switchTab(tabId, btn) {
  document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  btn.classList.add("active");
  document.getElementById("pageTitle").textContent = btn.textContent;
}

function renderAll() {
  // Staff Presence
  document.getElementById("staffPresenceList").innerHTML = staff.map(s => `
    <div class="staff-row">
      <div>
        <div class="staff-name">${s.name}</div>
        <div class="staff-meta">${s.role} • Ext ${s.ext}</div>
      </div>
      <span class="badge ${s.inOffice ? "badge-in" : "badge-out"}">${s.inOffice ? "In Office" : "Off-Site"}</span>
    </div>
  `).join("");

  // Workspace Tickets
  document.getElementById("workspaceTicketsTable").innerHTML = tickets.filter(t => t.status === "Open").map(t => `
    <tr>
      <td><strong>${t.id}</strong></td>
      <td>${t.client}</td>
      <td>${t.issue}</td>
      <td>${t.owner}</td>
      <td><button class="btn btn-outline btn-sm" onclick="quickReassign('${t.id}')">1-Click Route</button></td>
    </tr>
  `).join("");

  // Full Tickets
  document.getElementById("fullTicketsTable").innerHTML = tickets.map(t => `
    <tr>
      <td><strong>${t.id}</strong></td>
      <td>${t.client}</td>
      <td>${t.issue}</td>
      <td><span class="badge ${t.status === "Open" ? "badge-open" : "badge-closed"}">${t.status}</span></td>
      <td>${t.owner}</td>
      <td><button class="btn btn-outline btn-sm" onclick="quickReassign('${t.id}')">Reassign</button></td>
    </tr>
  `).join("");

  // Clients
  document.getElementById("clientsTable").innerHTML = clients.map((c, idx) => `
    <tr>
      <td><strong>${c.org}</strong></td>
      <td>${c.contact}</td>
      <td>${c.phone}</td>
      <td>${c.openTickets}</td>
      <td><button class="btn btn-primary btn-sm" onclick="simulateIncomingCall(${idx})">Test Call Pop</button></td>
    </tr>
  `).join("");

  // Logs
  const logHtml = logs.map(l => `
    <div class="log-item">
      <span>${l.text}</span>
      <span class="log-time">${l.time}</span>
    </div>
  `).join("");

  document.getElementById("workspaceLogsList").innerHTML = logHtml;
  document.getElementById("fullLogsList").innerHTML = logHtml;

  if (activeCall) renderTransferTargets();
}

renderAll();
