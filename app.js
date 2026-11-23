// NexusHub — Unified CRM, HR Presence, Editable Email Desk & 1-Click Voice Router
const DEFAULT_SETTINGS = {
  orgName: "NexusHub",
  supportEmail: "support@nexushub.local",
  subjectFormat: "[{{ticket_id}}] Re: {{subject}}",
  signature: "Best regards,\n{{agent_name}}\n{{org_name}} Support ({{support_email}})",
  webhookUrl: ""
};

let settings = JSON.parse(localStorage.getItem("nexushub_settings")) || { ...DEFAULT_SETTINGS };
let isSignedIn = false;
let activeCall = null;
let selectedTicketId = null;

const staff = [
  { id: 1, name: "You (Lead Admin)", role: "Systems Admin", inOffice: false, ext: "101" },
  { id: 2, name: "Alex Rivera", role: "Network Support", inOffice: true, ext: "102" },
  { id: 3, name: "Priya Patel", role: "Client Success", inOffice: true, ext: "103" },
  { id: 4, name: "Marcus Vance", role: "Field Technician", inOffice: false, ext: "104" }
];

const clients = [
  { id: 1, org: "Oakridge Academy", contact: "Sarah Jenkins", email: "s.jenkins@oakridge.sch.uk", phone: "+44 121 496 0182" },
  { id: 2, org: "Midlands Logistics Ltd", contact: "David Thorne", email: "d.thorne@midlandslogistics.co.uk", phone: "+44 121 496 0449" },
  { id: 3, org: "Apex Design Studio", contact: "Chloe Bennett", email: "chloe@apexdesign.co.uk", phone: "+44 121 496 0921" }
];

const tickets = [
  {
    id: "#1042",
    client: "Oakridge Academy",
    contact: "Sarah Jenkins",
    email: "s.jenkins@oakridge.sch.uk",
    issue: "Wi-Fi Dropouts in Science Block",
    owner: "You (Lead Admin)",
    status: "Open",
    thread: [
      {
        type: "inbound",
        sender: "Sarah Jenkins <s.jenkins@oakridge.sch.uk>",
        time: "10:15 AM",
        body: "Hi IT Support, teachers in the Science Block are losing Wi-Fi every 20 minutes on Room 4 and 5 access points. Can someone check this today?"
      }
    ]
  },
  {
    id: "#1043",
    client: "Midlands Logistics Ltd",
    contact: "David Thorne",
    email: "d.thorne@midlandslogistics.co.uk",
    issue: "VoIP Desk Phone Provisioning",
    owner: "Alex Rivera",
    status: "Open",
    thread: [
      {
        type: "inbound",
        sender: "David Thorne <d.thorne@midlandslogistics.co.uk>",
        time: "10:48 AM",
        body: "We have 3 new starters on Monday and need extensions 204–206 linked to their CRM profiles."
      }
    ]
  },
  {
    id: "#1041",
    client: "Apex Design Studio",
    contact: "Chloe Bennett",
    email: "chloe@apexdesign.co.uk",
    issue: "New Staff Account Setup",
    owner: "Priya Patel",
    status: "Resolved",
    thread: [
      {
        type: "inbound",
        sender: "Chloe Bennett <chloe@apexdesign.co.uk>",
        time: "09:30 AM",
        body: "Please set up login credentials for our new junior designer."
      },
      {
        type: "outbound",
        sender: "Priya Patel via support@nexushub.local",
        time: "09:45 AM",
        body: "All done! Login details have been provisioned and tested."
      }
    ]
  }
];

const logs = [
  { time: "11:20 AM", text: "Alex Rivera signed into office via app." },
  { time: "10:48 AM", text: "Inbound email from d.thorne@midlandslogistics.co.uk created Ticket #1043." },
  { time: "10:15 AM", text: "Inbound email from s.jenkins@oakridge.sch.uk created Ticket #1042." }
];

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function addLog(text) {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  logs.unshift({ time: now, text });
  renderAll();
}

/* ---------------- SETTINGS & TEMPLATE ENGINE ---------------- */
function applyTemplateVars(template, vars) {
  return template
    .replace(/{{ticket_id}}/g, vars.ticket_id || "#1042")
    .replace(/{{subject}}/g, vars.subject || "Support Request")
    .replace(/{{client_name}}/g, vars.client_name || "Sarah Jenkins")
    .replace(/{{org_name}}/g, settings.orgName)
    .replace(/{{support_email}}/g, settings.supportEmail)
    .replace(/{{agent_name}}/g, "You (Lead Admin)");
}

function loadSettingsIntoForm() {
  document.getElementById("brandOrgName").textContent = settings.orgName;
  document.getElementById("setOrgName").value = settings.orgName;
  document.getElementById("setSupportEmail").value = settings.supportEmail;
  document.getElementById("setSubjectFormat").value = settings.subjectFormat;
  document.getElementById("setSignature").value = settings.signature;
  document.getElementById("setWebhookUrl").value = settings.webhookUrl || "";
  updateEmailPreview();
}

function updateEmailPreview() {
  const sampleSubject = applyTemplateVars(settings.subjectFormat, {
    ticket_id: "#1042",
    subject: "Wi-Fi Dropouts in Science Block",
    client_name: "Sarah Jenkins"
  });
  const sampleSig = applyTemplateVars(settings.signature, {
    ticket_id: "#1042",
    client_name: "Sarah Jenkins"
  });

  document.getElementById("emailPreviewBox").textContent =
    `From: ${settings.orgName} <${settings.supportEmail}>\n` +
    `To: Sarah Jenkins <s.jenkins@oakridge.sch.uk>\n` +
    `Subject: ${sampleSubject}\n` +
    `--------------------------------------------------\n` +
    `Hi Sarah,\n\nWe are inspecting the Science Block access points now and will update you shortly.\n\n` +
    `${sampleSig}`;
}

function saveSettings() {
  settings.orgName = document.getElementById("setOrgName").value.trim() || DEFAULT_SETTINGS.orgName;
  settings.supportEmail = document.getElementById("setSupportEmail").value.trim() || DEFAULT_SETTINGS.supportEmail;
  settings.subjectFormat = document.getElementById("setSubjectFormat").value.trim() || DEFAULT_SETTINGS.subjectFormat;
  settings.signature = document.getElementById("setSignature").value;
  settings.webhookUrl = document.getElementById("setWebhookUrl").value.trim();

  localStorage.setItem("nexushub_settings", JSON.stringify(settings));
  document.getElementById("brandOrgName").textContent = settings.orgName;
  updateEmailPreview();
  addLog(`Installation settings updated (Outbound email set to ${settings.supportEmail}).`);
  showToast("Installation & email settings saved!");
}

function resetDefaultSettings() {
  settings = { ...DEFAULT_SETTINGS };
  localStorage.removeItem("nexushub_settings");
  loadSettingsIntoForm();
  showToast("Settings reset to defaults");
}

/* ---------------- HR OFFICE SIGN-IN ---------------- */
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
    showToast("Signed out — calls route to active office staff");
  }
  renderAll();
}

/* ---------------- PHONELINE & 1-CLICK TRANSFER ---------------- */
function simulateIncomingCall(clientIndex = 0) {
  const client = clients[clientIndex] || clients[0];
  let linkedTicket = tickets.find(t => t.client === client.org && t.status === "Open");

  if (!linkedTicket) {
    const newId = `#${1040 + tickets.length + 1}`;
    linkedTicket = {
      id: newId,
      client: client.org,
      contact: client.contact,
      email: client.email,
      issue: "Inbound Phone Inquiry",
      owner: "You (Lead Admin)",
      status: "Open",
      thread: [{
        type: "note",
        sender: "System Auto-Log",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        body: `Ticket automatically opened from inbound call (${client.phone}).`
      }]
    };
    tickets.unshift(linkedTicket);
  }

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
  renderAll();
}

function openActiveCallTicket() {
  if (activeCall && activeCall.ticketId) {
    openTicketDrawer(activeCall.ticketId);
  }
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

/* ---------------- EMAIL DESK & TICKET THREADS ---------------- */
function simulateIncomingEmail(clientIndex = null) {
  const idx = clientIndex !== null ? clientIndex : Math.floor(Math.random() * clients.length);
  const client = clients[idx];
  const sampleSubjects = [
    "Classroom Smartboard Not Responding",
    "Need 2 New Staff Email Accounts",
    "VPN Access Issue From Home"
  ];
  const sampleBodies = [
    "Hi team, can someone take a look at the smartboard in Room 8 before afternoon classes?",
    "Hello, please could you provision accounts and desk extensions for two new staff members starting tomorrow?",
    "Hi support, my remote VPN connection keeps timing out when accessing shared drives."
  ];

  const rand = Math.floor(Math.random() * sampleSubjects.length);
  const newId = `#${1040 + tickets.length + 1}`;
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newTicket = {
    id: newId,
    client: client.org,
    contact: client.contact,
    email: client.email,
    issue: sampleSubjects[rand],
    owner: "You (Lead Admin)",
    status: "Open",
    thread: [
      {
        type: "inbound",
        sender: `${client.contact} <${client.email}>`,
        time: now,
        body: sampleBodies[rand]
      }
    ]
  };

  tickets.unshift(newTicket);
  addLog(`Inbound email from ${client.email} auto-created Ticket ${newId}: "${newTicket.issue}".`);
  showToast(`New email ticket ${newId} received from ${client.org}`);
  openTicketDrawer(newId);
}

function openTicketDrawer(ticketId) {
  selectedTicketId = ticketId;
  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) return;

  document.getElementById("drawerTicketTitle").textContent = `${ticket.id} — ${ticket.issue}`;
  document.getElementById("drawerTicketMeta").textContent = `${ticket.client} (${ticket.contact}) • Assigned to: ${ticket.owner}`;

  const badge = document.getElementById("drawerStatusBadge");
  badge.textContent = ticket.status;
  badge.className = `badge ${ticket.status === "Open" ? "badge-open" : "badge-closed"}`;

  document.getElementById("drawerResolveBtn").textContent = ticket.status === "Open" ? "Mark Resolved" : "Reopen Ticket";
  document.getElementById("composerFromDisplay").textContent = settings.supportEmail;
  document.getElementById("composerToDisplay").textContent = ticket.email;

  // Render 1-Click Route buttons inside drawer
  document.getElementById("drawerRouteTargets").innerHTML = staff.map(s => `
    <button class="btn btn-outline btn-sm" onclick="assignTicketTo('${ticket.id}', '${s.name}')">
      ${s.inOffice ? "🟢" : "⚪"} ${s.name.split(" ")[0]}
    </button>
  `).join("");

  // Render email conversation thread
  document.getElementById("drawerThreadList").innerHTML = ticket.thread.map(msg => {
    const cls = msg.type === "inbound" ? "msg-inbound" : msg.type === "note" ? "msg-note" : "msg-outbound";
    return `
      <div class="msg-bubble ${cls}">
        <div class="msg-meta">
          <strong>${msg.sender}</strong>
          <span>${msg.time}</span>
        </div>
        <div style="white-space:pre-wrap;">${msg.body}</div>
      </div>
    `;
  }).join("");

  document.getElementById("drawerBackdrop").classList.add("active");
  document.getElementById("ticketDrawer").classList.add("open");
}

function closeTicketDrawer() {
  document.getElementById("drawerBackdrop").classList.remove("active");
  document.getElementById("ticketDrawer").classList.remove("open");
  selectedTicketId = null;
}

async function sendTicketReply() {
  if (!selectedTicketId) return;
  const ticket = tickets.find(t => t.id === selectedTicketId);
  const input = document.getElementById("replyInput");
  const isNote = document.getElementById("internalNoteCheck").checked;
  const rawText = input.value.trim();

  if (!rawText) {
    showToast("Type a message first!");
    return;
  }

  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isNote) {
    ticket.thread.push({
      type: "note",
      sender: "Internal Staff Note (You)",
      time: now,
      body: rawText
    });
    addLog(`Internal note added to Ticket ${ticket.id}.`);
    showToast("Internal note saved");
  } else {
    const formattedSignature = applyTemplateVars(settings.signature, {
      ticket_id: ticket.id,
      subject: ticket.issue,
      client_name: ticket.contact
    });
    const formattedSubject = applyTemplateVars(settings.subjectFormat, {
      ticket_id: ticket.id,
      subject: ticket.issue,
      client_name: ticket.contact
    });

    const fullEmailBody = `${rawText}\n\n${formattedSignature}`;

    ticket.thread.push({
      type: "outbound",
      sender: `${settings.orgName} <${settings.supportEmail}>`,
      time: now,
      body: `Subject: ${formattedSubject}\n\n${fullEmailBody}`
    });

    // Optional live webhook dispatch if configured in Settings
    if (settings.webhookUrl) {
      try {
        await fetch(settings.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: settings.supportEmail,
            to: ticket.email,
            subject: formattedSubject,
            body: fullEmailBody,
            ticketId: ticket.id
          })
        });
      } catch (err) {
        console.warn("Webhook dispatch failed (expected in offline demo):", err);
      }
    }

    addLog(`Email reply sent from ${settings.supportEmail} to ${ticket.email} (${ticket.id}).`);
    showToast(`Email sent from ${settings.supportEmail}`);
  }

  input.value = "";
  document.getElementById("internalNoteCheck").checked = false;
  openTicketDrawer(ticket.id);
  renderAll();
}

function toggleTicketStatus() {
  if (!selectedTicketId) return;
  const ticket = tickets.find(t => t.id === selectedTicketId);
  ticket.status = ticket.status === "Open" ? "Resolved" : "Open";
  addLog(`Ticket ${ticket.id} marked as ${ticket.status}.`);
  showToast(`Ticket ${ticket.id} → ${ticket.status}`);
  openTicketDrawer(ticket.id);
  renderAll();
}

function assignTicketTo(ticketId, staffName) {
  const ticket = tickets.find(t => t.id === ticketId);
  if (!ticket) return;
  ticket.owner = staffName;
  addLog(`1-Click Route: Ticket ${ticketId} assigned to ${staffName}.`);
  showToast(`${ticketId} assigned to ${staffName}`);
  if (selectedTicketId === ticketId) openTicketDrawer(ticketId);
  renderAll();
}

/* ---------------- MODALS: CREATE TICKET / ADD CLIENT ---------------- */
function openModal(modalId) {
  if (modalId === "newTicketModal") {
    document.getElementById("newTicketClient").innerHTML = clients.map((c, idx) =>
      `<option value="${idx}">${c.org} (${c.contact} — ${c.email})</option>`
    ).join("");
  }
  document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function createNewTicket() {
  const clientIdx = document.getElementById("newTicketClient").value;
  const subject = document.getElementById("newTicketSubject").value.trim();
  const body = document.getElementById("newTicketBody").value.trim();

  if (!subject) {
    showToast("Enter a ticket subject");
    return;
  }

  const client = clients[clientIdx];
  const newId = `#${1040 + tickets.length + 1}`;
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  tickets.unshift({
    id: newId,
    client: client.org,
    contact: client.contact,
    email: client.email,
    issue: subject,
    owner: "You (Lead Admin)",
    status: "Open",
    thread: [{
      type: "inbound",
      sender: `${client.contact} <${client.email}>`,
      time: now,
      body: body || "Ticket logged manually by staff."
    }]
  });

  document.getElementById("newTicketSubject").value = "";
  document.getElementById("newTicketBody").value = "";
  closeModal("newTicketModal");
  addLog(`Created Ticket ${newId} for ${client.org}: "${subject}".`);
  showToast(`Ticket ${newId} created`);
  openTicketDrawer(newId);
}

function createNewClient() {
  const org = document.getElementById("newClientOrg").value.trim();
  const contact = document.getElementById("newClientContact").value.trim();
  const email = document.getElementById("newClientEmail").value.trim();
  const phone = document.getElementById("newClientPhone").value.trim();

  if (!org || !contact || !email) {
    showToast("Organization, contact name, and email are required");
    return;
  }

  clients.push({
    id: clients.length + 1,
    org,
    contact,
    email,
    phone: phone || "No Caller ID"
  });

  document.getElementById("newClientOrg").value = "";
  document.getElementById("newClientContact").value = "";
  document.getElementById("newClientEmail").value = "";
  document.getElementById("newClientPhone").value = "";
  closeModal("newClientModal");
  addLog(`Added new client: ${org} (${contact} • ${email}).`);
  showToast(`${org} added to Client Directory`);
  renderAll();
}

/* ---------------- NAVIGATION & RENDER ---------------- */
function switchTab(tabId, btn) {
  document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  btn.classList.add("active");
  document.getElementById("pageTitle").textContent = btn.textContent;
  if (tabId === "settings") loadSettingsIntoForm();
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

  // Workspace Open Tickets
  document.getElementById("workspaceTicketsTable").innerHTML = tickets.filter(t => t.status === "Open").map(t => `
    <tr class="clickable-row" onclick="openTicketDrawer('${t.id}')">
      <td><strong>${t.id}</strong></td>
      <td>${t.client}</td>
      <td>${t.issue} <span style="color:var(--muted); font-size:0.78rem;">(${t.thread.length})</span></td>
      <td>${t.owner}</td>
      <td><button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openTicketDrawer('${t.id}')">Open / Reply</button></td>
    </tr>
  `).join("");

  // Full Tickets Table
  document.getElementById("fullTicketsTable").innerHTML = tickets.map(t => `
    <tr class="clickable-row" onclick="openTicketDrawer('${t.id}')">
      <td><strong>${t.id}</strong></td>
      <td>${t.client}</td>
      <td>${t.issue}</td>
      <td><span class="badge ${t.status === "Open" ? "badge-open" : "badge-closed"}">${t.status}</span></td>
      <td>${t.owner}</td>
      <td><button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openTicketDrawer('${t.id}')">Open Thread</button></td>
    </tr>
  `).join("");

  // Clients Table
  document.getElementById("clientsTable").innerHTML = clients.map((c, idx) => `
    <tr>
      <td><strong>${c.org}</strong></td>
      <td>${c.contact}</td>
      <td>${c.email}</td>
      <td>${c.phone}</td>
      <td style="display:flex; gap:6px;">
        <button class="btn btn-primary btn-sm" onclick="simulateIncomingCall(${idx})">Call Pop</button>
        <button class="btn btn-outline btn-sm" onclick="simulateIncomingEmail(${idx})">Email Pop</button>
      </td>
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

// Live preview listeners for Settings tab
["setOrgName", "setSupportEmail", "setSubjectFormat", "setSignature"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", () => {
    settings.orgName = document.getElementById("setOrgName").value || DEFAULT_SETTINGS.orgName;
    settings.supportEmail = document.getElementById("setSupportEmail").value || DEFAULT_SETTINGS.supportEmail;
    settings.subjectFormat = document.getElementById("setSubjectFormat").value || DEFAULT_SETTINGS.subjectFormat;
    settings.signature = document.getElementById("setSignature").value;
    updateEmailPreview();
  });
});

loadSettingsIntoForm();
renderAll();
