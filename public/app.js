const TRAIN_NUMBER = "12345";
let activeClaimId = null;
let countdownTimer = null;

// ---- Clock ----
function tickClock() {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString("en-IN");
}
setInterval(tickClock, 1000);
tickClock();

// ---- Queue board ----
async function loadQueue() {
  const res = await fetch(`/api/queue/${TRAIN_NUMBER}`);
  const queue = await res.json();
  const board = document.getElementById("queueBoard");

  if (!queue.length) {
    board.innerHTML = `<p class="empty-msg">No one currently waiting for train ${TRAIN_NUMBER}.</p>`;
    return;
  }

  board.innerHTML = queue
    .map(
      (p, i) => `
      <div class="board-row">
        <span class="rank-badge">${i === 0 ? "NEXT" : "#" + (i + 1)}</span>
        <span>${p.name}</span>
        <span>${p.pnr}</span>
        <span class="status-${p.status}">${p.waitlistStatus}</span>
        <span>${p.boardingStation} → ${p.destinationStation}</span>
      </div>`
    )
    .join("");
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
    showClaimPanel(data.passenger);
  } else {
    alert(data.message || "No one is waiting.");
  }
  loadQueue();
});

// ---- Seat claim panel + countdown ----
function showClaimPanel(passenger) {
  activeClaimId = passenger._id;
  const panel = document.getElementById("claimPanel");
  panel.hidden = false;
  document.getElementById("claimText").textContent =
    `${passenger.name} (${passenger.waitlistStatus}) — offered seat ${passenger.seatAssigned}`;
  document.getElementById("claimResult").textContent = "";

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(pollCountdown, 1000);
  pollCountdown();
}

async function pollCountdown() {
  if (!activeClaimId) return;
  const res = await fetch(`/api/passengers/${activeClaimId}/countdown`);
  const { secondsLeft } = await res.json();
  document.getElementById("countdown").textContent = secondsLeft;
  if (secondsLeft <= 0) {
    clearInterval(countdownTimer);
    document.getElementById("claimResult").textContent = "Claim window expired — offer passed to next in queue.";
    loadQueue();
  }
}

document.getElementById("claimBtn").addEventListener("click", async () => {
  if (!activeClaimId) return;
  const res = await fetch(`/api/passengers/${activeClaimId}/claim`, { method: "POST" });
  const result = await res.json();
  document.getElementById("claimResult").textContent = result.message;
  if (result.success) {
    clearInterval(countdownTimer);
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
