const TRAIN_NUMBER = "12345";
let activeClaimId = null;
let countdownTimer = null;

// Full unfiltered queue as last fetched from the server, and the
// destination the user has chosen to filter the visible list by.
let latestQueue = [];
let destinationFilter = "";

// ---- Split-flap board update helper ----
function flipTo(elId, newText) {
  const el = document.getElementById(elId);
  if (el.textContent === newText) return;
  el.classList.remove("flipping");
  void el.offsetWidth; // restart animation
  el.classList.add("flipping");
  setTimeout(() => { el.textContent = newText; }, 250);
}

// ---- Destination filter ----
// The datalist is built from whatever destinations actually exist in the
// live queue, so it always matches real data instead of a hardcoded list.
function populateDestinationOptions(queue) {
  const list = document.getElementById("destinationOptions");
  if (!list) return;
  const unique = [...new Set(queue.map((p) => p.destinationStation).filter(Boolean))];
  list.innerHTML = unique.map((d) => `<option value="${d}"></option>`).join("");
}

function getFilteredQueue() {
  if (!destinationFilter) return latestQueue;
  const needle = destinationFilter.trim().toLowerCase();
  return latestQueue.filter(
    (p) => p.destinationStation && p.destinationStation.toLowerCase().includes(needle)
  );
}

function updateRouteDisplay() {
  const el = document.getElementById("routeDestination");
  if (el) el.textContent = destinationFilter.trim() || "New Delhi";
}

const destinationInput = document.getElementById("destinationFilter");
if (destinationInput) {
  destinationInput.addEventListener("input", () => {
    destinationFilter = destinationInput.value;
    updateRouteDisplay();
    // Keep the route assistant in sync with what the user is looking for.
    const toInput = document.getElementById("toInput");
    if (toInput) toInput.value = destinationFilter;
    renderQueue();
  });
}

const clearDestinationBtn = document.getElementById("clearDestinationBtn");
if (clearDestinationBtn) {
  clearDestinationBtn.addEventListener("click", () => {
    destinationFilter = "";
    if (destinationInput) destinationInput.value = "";
    updateRouteDisplay();
    renderQueue();
  });
}

// ---- Add yourself to the queue ----
const toggleJoinFormBtn = document.getElementById("toggleJoinFormBtn");
const joinQueueForm = document.getElementById("joinQueueForm");
const cancelJoinBtn = document.getElementById("cancelJoinBtn");
const joinFormMsg = document.getElementById("joinFormMsg");

function setJoinFormOpen(open) {
  if (!joinQueueForm) return;
  joinQueueForm.hidden = !open;
  if (toggleJoinFormBtn) {
    toggleJoinFormBtn.textContent = open ? "− Hide form" : "+ Add yourself to the queue";
  }
  if (open && joinFormMsg) {
    joinFormMsg.textContent = "";
    joinFormMsg.className = "join-msg";
  }
}

if (toggleJoinFormBtn) {
  toggleJoinFormBtn.addEventListener("click", () => {
    setJoinFormOpen(joinQueueForm.hidden);
  });
}

if (cancelJoinBtn) {
  cancelJoinBtn.addEventListener("click", () => {
    joinQueueForm.reset();
    setJoinFormOpen(false);
  });
}

if (joinQueueForm) {
  joinQueueForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const passengerData = {
      name: document.getElementById("joinName").value.trim(),
      pnr: document.getElementById("joinPnr").value.trim(),
      boardingStation: document.getElementById("joinFrom").value.trim(),
      destinationStation: document.getElementById("joinTo").value.trim(),
      waitlistStatus: document.getElementById("joinStatus").value.trim(),
    };

    if (Object.values(passengerData).some((v) => !v)) {
      joinFormMsg.textContent = "Please fill in every field.";
      joinFormMsg.className = "join-msg error";
      return;
    }

    const submitBtn = joinQueueForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    let addedPassenger = null;

    try {
      const res = await fetch(`/api/queue/${TRAIN_NUMBER}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passengerData),
      });
      if (res.ok) {
        const data = await res.json();
        addedPassenger = data.passenger || data;
      }
    } catch (err) {
      // No live server for this action — fall through to the local queue below.
    }

    if (!addedPassenger) {
      addedPassenger = {
        _id: `local-${Date.now()}`,
        status: "WAITING",
        ...passengerData,
      };
      latestQueue.push(addedPassenger);
      populateDestinationOptions(latestQueue);
    } else {
      await loadQueue();
    }

    renderQueue();
    highlightRow(addedPassenger._id);

    joinFormMsg.textContent = `Added — you're #${latestQueue.findIndex((p) => p._id === addedPassenger._id) + 1} in the queue.`;
    joinFormMsg.className = "join-msg success";
    joinQueueForm.reset();
    submitBtn.disabled = false;
  });
}

// ---- Queue board ----
function renderQueue() {
  const board = document.getElementById("queueBoard");

  if (!latestQueue.length) {
    board.innerHTML = `<p class="empty-msg">No one currently waiting for train ${TRAIN_NUMBER}.</p>`;
    flipTo("flapName", "— — —");
    flipTo("flapStatus", "None waiting");
    return;
  }

  const filtered = getFilteredQueue();

  if (!filtered.length) {
    board.innerHTML = `<p class="empty-msg">No one currently waiting for ${destinationFilter}. <button type="button" id="clearFilterInline" class="link-btn">Show everyone</button></p>`;
    const inlineClear = document.getElementById("clearFilterInline");
    if (inlineClear) inlineClear.addEventListener("click", () => clearDestinationBtn && clearDestinationBtn.click());
  } else {
    board.innerHTML = filtered
      .map(
        (p, i) => `
        <div class="board-row" data-id="${p._id}">
          <span class="rank-badge ${i === 0 && !destinationFilter ? "next" : ""}">${i === 0 && !destinationFilter ? "NEXT" : "#" + (i + 1)}</span>
          <span>${p.name}</span>
          <span class="pnr hide-sm">${p.pnr}</span>
          <span class="status-${p.status}">${p.waitlistStatus}</span>
          <span class="hide-sm">${p.boardingStation} → ${p.destinationStation}</span>
        </div>`
      )
      .join("");
  }

  // The berth is always offered to the true first-in-line passenger for the
  // whole train, regardless of which destination the viewer is filtering by.
  flipTo("flapName", latestQueue[0].name);
  flipTo("flapStatus", "Waiting · " + latestQueue[0].waitlistStatus);
}

async function loadQueue() {
  const res = await fetch(`/api/queue/${TRAIN_NUMBER}`);
  latestQueue = await res.json();
  populateDestinationOptions(latestQueue);
  renderQueue();
}

function highlightRow(passengerId) {
  const row = document.querySelector(`.board-row[data-id="${passengerId}"]`);
  if (row) {
    row.classList.remove("just-notified");
    void row.offsetWidth;
    row.classList.add("just-notified");
  }
}

// ---- Simulate a berth freeing up ----
document.getElementById("freeBerthBtn").addEventListener("click", async () => {
  const seatLabel = document.getElementById("seatLabel").value || "B3-45";
  const res = await fetch(`/api/trains/${TRAIN_NUMBER}/berth-freed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seatLabel }),
  });
  const data = await res.json();

  if (data.passenger) {
    flipTo("flapSeat", data.passenger.seatAssigned);
    flipTo("flapStatus", "Offer sent");
    showClaimPanel(data.passenger);
    await loadQueue();
    highlightRow(data.passenger._id);
  } else {
    alert(data.message || "No one is waiting.");
  }
});

// ---- Claim panel + countdown ----
function showClaimPanel(passenger) {
  activeClaimId = passenger._id;
  const panel = document.getElementById("claimPanel");
  panel.hidden = false;
  document.getElementById("claimText").textContent =
    `${passenger.name} (${passenger.waitlistStatus}) — seat ${passenger.seatAssigned}`;
  document.getElementById("claimResult").textContent = "";
  document.getElementById("countdown").classList.remove("danger");

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(pollCountdown, 1000);
  pollCountdown();
}

async function pollCountdown() {
  if (!activeClaimId) return;
  const res = await fetch(`/api/passengers/${activeClaimId}/countdown`);
  const { secondsLeft } = await res.json();
  const el = document.getElementById("countdown");
  el.textContent = secondsLeft;
  el.classList.toggle("danger", secondsLeft <= 20 && secondsLeft > 0);

  if (secondsLeft <= 0) {
    clearInterval(countdownTimer);
    document.getElementById("claimResult").textContent = "Claim window expired — offer passed to next in queue.";
    document.getElementById("claimResult").style.color = "var(--red)";
    flipTo("flapStatus", "Expired · next up");
    loadQueue();
  }
}

document.getElementById("claimBtn").addEventListener("click", async () => {
  if (!activeClaimId) return;
  const res = await fetch(`/api/passengers/${activeClaimId}/claim`, { method: "POST" });
  const result = await res.json();
  const resultEl = document.getElementById("claimResult");
  resultEl.textContent = result.message;
  resultEl.style.color = result.success ? "var(--green)" : "var(--red)";
  if (result.success) {
    clearInterval(countdownTimer);
    flipTo("flapStatus", "Confirmed");
    loadQueue();
  }
});

// ---- NLP.js chatbot ----
function appendMessage(text, sender) {
  const win = document.getElementById("chatWindow");
  const div = document.createElement("div");
  div.className = `msg ${sender}`;
  div.textContent = text;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

document.getElementById("chatSendBtn").addEventListener("click", sendChat);
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

async function sendChat() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;
  appendMessage(message, "user");
  input.value = "";

  const from = document.getElementById("fromInput").value.trim();
  const to = document.getElementById("toInput").value.trim();

  const res = await fetch("/api/chatbot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, from, to }),
  });
  const data = await res.json();
  appendMessage(data.reply, "bot");
}

// ---- init ----
loadQueue();
setInterval(loadQueue, 5000);
