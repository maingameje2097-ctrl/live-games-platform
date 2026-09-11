const socket = io();

// ---------- Elements ----------
const el = {
  banner: document.getElementById("connectionBanner"),
  difficultyBadge: document.getElementById("difficultyBadge"),
  timerBadge: document.getElementById("timerBadge"),
  modeBadge: document.getElementById("modeBadge"),
  hintStrip: document.getElementById("hintStrip"),
  closestTracker: document.getElementById("closestTracker"),
  guessList: document.getElementById("guessList"),
  emptyState: document.getElementById("emptyState"),
  commentTicker: document.getElementById("commentTicker"),

  helpBtn: document.getElementById("helpBtn"),
  helpModal: document.getElementById("helpModal"),
  closeHelp: document.getElementById("closeHelp"),

  hintIconBtn: document.getElementById("hintIconBtn"),
  leaderboardBtn: document.getElementById("leaderboardBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  panelBackdrop: document.getElementById("panelBackdrop"),
  settingsDrawer: document.getElementById("settingsDrawer"),
  leaderboardDrawer: document.getElementById("leaderboardDrawer"),
  modeStatusCard: document.getElementById("modeStatusCard"),

  tiktokUsername: document.getElementById("tiktokUsername"),
  connectBtn: document.getElementById("connectBtn"),
  disconnectBtn: document.getElementById("disconnectBtn"),
  connectStatus: document.getElementById("connectStatus"),

  modeSegmented: document.getElementById("modeSegmented"),
  difficultySegmented: document.getElementById("difficultySegmented"),
  startGameBtn: document.getElementById("startGameBtn"),

  hostAnswerInput: document.getElementById("hostAnswerInput"),
  hostSubmitBtn: document.getElementById("hostSubmitBtn"),
  resetTotalBtn: document.getElementById("resetTotalBtn"),

  scoreList: document.getElementById("scoreList"),
  scoreTabs: document.querySelectorAll(".score-tab"),
};

let latestLeaderboards = { round: [], total: [] };
let activeScoreTab = "round";
let roundSecondsLeft = 0;
let timerInterval = null;
let closestThisRound = null; // { username, distanceKm, proximity, guessText }
let roundGuesses = []; // every guess kept for the round, always re-sorted by closeness before rendering
let latestStatus = { connected: false, testMode: true };

const COMPASS_ARROW = {
  N: "↑", NNE: "↗", NE: "↗", ENE: "↗",
  E: "→", ESE: "↘", SE: "↘", SSE: "↘",
  S: "↓", SSW: "↙", SW: "↙", WSW: "↙",
  W: "←", WNW: "↖", NW: "↖", NNW: "↖",
};

// ---------- Side panels (Settings / Leaderboard) open + close ----------
function openPanel(panelEl) {
  el.panelBackdrop.classList.remove("hidden");
  panelEl.classList.remove("hidden");
}
function closeAllPanels() {
  el.panelBackdrop.classList.add("hidden");
  el.settingsDrawer.classList.add("hidden");
  el.leaderboardDrawer.classList.add("hidden");
}
el.settingsBtn.addEventListener("click", () => openPanel(el.settingsDrawer));
el.leaderboardBtn.addEventListener("click", () => openPanel(el.leaderboardDrawer));
el.panelBackdrop.addEventListener("click", closeAllPanels);
document.querySelectorAll(".panel-close").forEach((btn) => {
  btn.addEventListener("click", closeAllPanels);
});

// ---------- How to play modal ----------
el.helpBtn.addEventListener("click", () => el.helpModal.classList.remove("hidden"));
el.closeHelp.addEventListener("click", () => el.helpModal.classList.add("hidden"));
el.helpModal.addEventListener("click", (e) => {
  if (e.target === el.helpModal) el.helpModal.classList.add("hidden");
});

// ---------- TikTok connect/disconnect ----------
el.connectBtn.addEventListener("click", () => {
  const username = el.tiktokUsername.value.trim();
  if (!username) return;
  el.connectStatus.textContent = "Connecting…";
  socket.emit("host:connectTikTok", username, (result) => {
    if (result && result.ok) {
      el.connectStatus.textContent = `Connected to @${username}`;
      el.disconnectBtn.classList.remove("hidden");
    } else {
      el.connectStatus.textContent = `Couldn't connect: ${(result && result.error) || "unknown error"}`;
    }
  });
});

el.disconnectBtn.addEventListener("click", () => {
  socket.emit("host:disconnectTikTok", {}, () => {
    el.connectStatus.textContent = "Not connected";
    el.disconnectBtn.classList.add("hidden");
  });
});

// ---------- Mode (Live / Test) ----------
el.modeSegmented.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-mode]");
  if (!btn) return;
  [...el.modeSegmented.children].forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  socket.emit("host:setTestMode", btn.dataset.mode === "test");
});

// ---------- Difficulty ----------
el.difficultySegmented.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-level]");
  if (!btn) return;
  [...el.difficultySegmented.children].forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  socket.emit("host:setDifficulty", btn.dataset.level);
});

// ---------- Round controls ----------
el.startGameBtn.addEventListener("click", () => socket.emit("host:startGame"));
el.hintIconBtn.addEventListener("click", () => socket.emit("host:requestHint"));

el.hostSubmitBtn.addEventListener("click", submitHostAnswer);
el.hostAnswerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitHostAnswer();
});
function submitHostAnswer() {
  const text = el.hostAnswerInput.value.trim();
  if (!text) return;
  socket.emit("host:submitAnswer", text);
  el.hostAnswerInput.value = "";
}

// ---------- Reset all-time leaderboard ----------
el.resetTotalBtn.addEventListener("click", () => {
  if (confirm("Reset the All-Time leaderboard? This can't be undone.")) {
    socket.emit("host:resetTotalScores");
  }
});

// ---------- Scoreboard tabs ----------
el.scoreTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    el.scoreTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeScoreTab = tab.dataset.tab;
    renderScoreboard();
  });
});

function renderScoreboard() {
  const list = activeScoreTab === "round" ? latestLeaderboards.round : latestLeaderboards.total;
  el.scoreList.innerHTML = "";
  if (!list.length) {
    el.scoreList.innerHTML = `<li class="empty-row">No scores yet — correct guesses will show up here.</li>`;
    return;
  }
  list.forEach((entry, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span><span class="rank">${i + 1}.</span>${escapeHtml(entry.username)}</span><span class="pts">${entry.score}</span>`;
    el.scoreList.appendChild(li);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ---------- Mode / status summary ----------
function updateModeUI() {
  const { connected, testMode, username } = latestStatus;

  if (connected) {
    el.modeBadge.textContent = `● Live — @${username || ""}`;
    el.modeBadge.classList.add("is-live");
    el.modeStatusCard.textContent = "Mode: Live — connected to TikTok, scoring counts for real";
    el.modeStatusCard.className = "status-card";
  } else if (testMode) {
    el.modeBadge.textContent = "Test Mode";
    el.modeBadge.classList.remove("is-live");
    el.modeStatusCard.textContent = "Mode: Test — simulated guesses, practice only, scores not counted toward Live play";
    el.modeStatusCard.className = "status-card is-test";
  } else {
    el.modeBadge.textContent = "Not connected";
    el.modeBadge.classList.remove("is-live");
    el.modeStatusCard.textContent = "Not connected — connect your TikTok username below, or flip on Test Mode to rehearse";
    el.modeStatusCard.className = "status-card is-off";
  }
}

// ---------- Socket event handlers ----------
socket.on("status", (status) => {
  latestStatus = { ...latestStatus, ...status };

  if (status.connected) {
    el.banner.classList.add("hidden");
    el.connectStatus.textContent = `Connected to @${status.username}`;
    el.disconnectBtn.classList.remove("hidden");
  } else if (status.reason && status.reason !== "manual_disconnect") {
    el.banner.textContent =
      status.reason === "connect_failed"
        ? `Couldn't connect to TikTok Live (${status.error || "check the username & that you're live"})`
        : "Disconnected from TikTok Live";
    el.banner.classList.remove("hidden");
  }
  if (status.difficulty) {
    el.difficultyBadge.textContent = capitalize(status.difficulty);
  }
  updateModeUI();
});

socket.on("leaderboard", (data) => {
  latestLeaderboards = data;
  renderScoreboard();
});

socket.on("roundStart", (data) => {
  roundGuesses = [];
  el.hintStrip.textContent = "";
  el.difficultyBadge.textContent = capitalize(data.difficulty);
  closestThisRound = null;
  updateClosestTracker();
  renderGuessList();
  startTimer(data.seconds);
});

socket.on("hint", (data) => {
  if (data.text) {
    el.hintStrip.textContent = `Hint: ${data.text}`;
  }
});

socket.on("guessFeedback", (fb) => {
  roundGuesses.push(fb);

  if (!fb.correct && (!closestThisRound || fb.distanceKm < closestThisRound.distanceKm)) {
    closestThisRound = {
      username: fb.username,
      guessText: fb.guessText,
      distanceKm: fb.distanceKm,
      proximity: fb.proximity,
    };
    updateClosestTracker();
  }

  renderGuessList(fb);
});

function buildGuessRow(fb, rank, isNewest) {
  const row = document.createElement("li");
  row.className = "guess-row" + (fb.correct ? " correct" : "") + (isNewest ? " guess-row--new" : "");
  const rankChip = `<span class="chip chip--rank">#${rank}</span>`;
  if (fb.correct) {
    row.innerHTML = `${rankChip}<span class="guess-name">${escapeHtml(fb.username)}</span><span class="chip chip--match">✓ Correct — ${escapeHtml(fb.guessText)}</span>`;
  } else {
    const arrow = COMPASS_ARROW[fb.direction] || "•";
    row.innerHTML = `
      ${rankChip}
      <span class="guess-name">${escapeHtml(fb.username)}: ${escapeHtml(fb.guessText)}</span>
      <span class="chip ${fb.continentMatch ? "chip--match" : "chip--miss"}">🌍 ${fb.continentMatch ? "same continent" : "different continent"}</span>
      <span class="chip chip--pop">Pop ${fb.populationHint === "higher" ? "▲" : "▼"}</span>
      <span class="chip chip--area">Area ${fb.areaHint === "higher" ? "▲" : "▼"}</span>
      <span class="chip chip--direction">${arrow} ${fb.direction} · ${fb.distanceKm.toLocaleString()} km away</span>
      <span class="chip chip--proximity">${fb.proximity}% close</span>
    `;
  }
  return row;
}

// Re-sorts every guess this round by closeness (correct/0km first, farthest last) and
// re-renders the whole list in that order — every individual guess stays visible until
// the round ends, nothing is deduped per user.
function renderGuessList(newestFb) {
  el.emptyState.classList.toggle("hidden", roundGuesses.length > 0);
  const sorted = [...roundGuesses].sort((a, b) => a.distanceKm - b.distanceKm);
  el.guessList.innerHTML = "";
  sorted.forEach((fb, i) => {
    el.guessList.appendChild(buildGuessRow(fb, i + 1, fb === newestFb));
  });
}

function updateClosestTracker() {
  if (!closestThisRound) {
    el.closestTracker.classList.add("hidden");
    return;
  }
  el.closestTracker.classList.remove("hidden");
  el.closestTracker.innerHTML = `🎯 Closest so far: <b>${escapeHtml(closestThisRound.username)}</b> (${escapeHtml(closestThisRound.guessText)}) — ${closestThisRound.distanceKm.toLocaleString()} km away, ${closestThisRound.proximity}% close`;
}

socket.on("roundSolved", (data) => {
  el.hintStrip.textContent = `${data.winner} got it! The answer was ${data.answer}. (+${data.points} pts)`;
});

socket.on("roundTimeout", (data) => {
  el.hintStrip.textContent = `Time's up! The answer was ${data.answer}.`;
});

socket.on("comment", (c) => {
  const line = document.createElement("div");
  line.className = "comment-line";
  line.innerHTML = `<b>${escapeHtml(c.username)}:</b> ${escapeHtml(c.text)}`;
  el.commentTicker.prepend(line);
  while (el.commentTicker.children.length > 12) {
    el.commentTicker.removeChild(el.commentTicker.lastChild);
  }
});

socket.on("gift", (g) => {
  const line = document.createElement("div");
  line.className = "comment-line";
  line.innerHTML = `<b>${escapeHtml(g.username)}</b> sent a gift! 🎁`;
  el.commentTicker.prepend(line);
});

// ---------- Timer ----------
function startTimer(seconds) {
  clearInterval(timerInterval);
  roundSecondsLeft = seconds;
  updateTimerBadge();
  timerInterval = setInterval(() => {
    roundSecondsLeft -= 1;
    updateTimerBadge();
    if (roundSecondsLeft <= 0) clearInterval(timerInterval);
  }, 1000);
}
function updateTimerBadge() {
  el.timerBadge.textContent = `${Math.max(0, roundSecondsLeft)}s`;
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

updateModeUI();
