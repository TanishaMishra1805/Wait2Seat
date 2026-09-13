const TRAIN_NUMBER = "12345";
let activeClaimId = null;
let countdownTimer = null;

// ---- Split-flap board update helper ----
function flipTo(elId, newText) {
  const el = document.getElementById(elId);
  if (el.textContent === newText) return;
  el.classList.remove("flipping");
  void el.offsetWidth; // restart animation
  el.classList.add("flipping");
  setTimeout(() => { el.textContent = newText; }, 250);
}

// ---- Queue board ----
async function loadQueue() {
  const res = await fetch(`/api/queue/${TRAIN_NUMBER}`);
  const queue = await res.json();
  const board = document.getElementById("queueBoard");

  if (!queue.length) {
    board.innerHTML = `<p class="empty-msg">No one currently waiting for train ${TRAIN_NUMBER}.</p>`;
    flipTo("flapName", "— — —");
    flipTo("flapStatus", "None waiting");
    return;
  }

  board.innerHTML = queue
    .map(
      (p, i) => `
      <div class="board-row" data-id="${p._id}">
        <span class="rank-badge ${i === 0 ? "next" : ""}">${i === 0 ? "NEXT" : "#" + (i + 1)}</span>
        <span>${p.name}</span>
        <span class="pnr hide-sm">${p.pnr}</span>
        <span class="status-${p.status}">${p.waitlistStatus}</span>
        <span class="hide-sm">${p.boardingStation} → ${p.destinationStation}</span>
      </div>`
    )
    .join("");

  flipTo("flapName", queue[0].name);
  flipTo("flapStatus", "Waiting · " + queue[0].waitlistStatus);
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
