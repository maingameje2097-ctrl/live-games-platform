const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { TikTokConnector } = require("./tiktokConnector");
const { TestSimulator } = require("./testSimulator");
const { CountryleRound } = require("./gameEngine/countryle");
const { Leaderboard } = require("./gameEngine/leaderboard");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_DIR));

const PORT = process.env.PORT || 3000;

// ---------------- Global session state ----------------
const leaderboard = new Leaderboard();
let currentRound = null; // active CountryleRound
let difficulty = "standard"; // easy | standard | expert
let testMode = false;
let roundTimerHandle = null;
const ROUND_SECONDS = { easy: 90, standard: 60, expert: 40 };

let connector = null;
let simulator = null;

function broadcastStatus(extra = {}) {
  io.emit("status", {
    connected: connector ? connector.isConnected() : false,
    username: connector ? connector.username : null,
    testMode,
    difficulty,
    ...extra,
  });
}

function broadcastLeaderboards() {
  io.emit("leaderboard", {
    round: leaderboard.topRound(10),
    total: leaderboard.topTotal(10),
  });
}

function pushComment(comment) {
  io.emit("comment", { username: comment.username, text: comment.text });

  if (!currentRound) return;
  const feedback = currentRound.submitGuess(comment.userId, comment.username, comment.text);
  if (!feedback) return;

  io.emit("guessFeedback", feedback);

  if (feedback.correct) {
    const points = currentRound.scoreFor(comment.userId);
    leaderboard.add(comment.userId, comment.username, points);
    broadcastLeaderboards();
    io.emit("roundSolved", {
      winner: comment.username,
      answer: currentRound.target.name,
      points,
    });
    endRoundSoon();
  }
}

function startRound() {
  clearTimeout(roundTimerHandle);
  leaderboard.resetRound();
  currentRound = new CountryleRound({ difficulty });
  io.emit("roundStart", {
    difficulty,
    seconds: ROUND_SECONDS[difficulty] || 60,
  });
  broadcastLeaderboards();

  const seconds = ROUND_SECONDS[difficulty] || 60;
  roundTimerHandle = setTimeout(() => {
    if (currentRound && !currentRound.solved) {
      io.emit("roundTimeout", { answer: currentRound.target.name });
    }
    endRoundSoon(0);
  }, seconds * 1000);
}

function endRoundSoon(delayMs = 3000) {
  clearTimeout(roundTimerHandle);
  roundTimerHandle = setTimeout(() => startRound(), delayMs);
}

// ---------------- TikTok connector wiring ----------------
connector = new TikTokConnector({
  onComment: pushComment,
  onGift: (gift) => {
    io.emit("gift", gift);
    // Shared, non-decisive bonus window for everyone (per platform rules: gifts never grant
    // individual answer advantage). Kept intentionally simple here; expand in later phases.
    io.emit("giftBonusWindow", { seconds: 15, from: gift.username });
  },
  onStatus: (status) => broadcastStatus(status),
});

simulator = new TestSimulator(pushComment);

// ---------------- Socket.IO control channel (host dashboard) ----------------
io.on("connection", (socket) => {
  broadcastStatus();
  broadcastLeaderboards();
  if (currentRound) {
    socket.emit("roundStart", { difficulty, seconds: ROUND_SECONDS[difficulty] || 60, resync: true });
  }

  socket.on("host:connectTikTok", async (usernameInput, ack) => {
    const result = await connector.connect(usernameInput);
    if (ack) ack(result);
  });

  socket.on("host:disconnectTikTok", async (_data, ack) => {
    await connector.disconnect();
    if (ack) ack({ ok: true });
  });

  socket.on("host:setTestMode", (enabled) => {
    testMode = !!enabled;
    if (testMode) {
      simulator.start();
    } else {
      simulator.stop();
    }
    broadcastStatus();
  });

  socket.on("host:setDifficulty", (level) => {
    if (ROUND_SECONDS[level]) {
      difficulty = level;
      broadcastStatus();
    }
  });

  socket.on("host:startGame", () => {
    startRound();
  });

  socket.on("host:nextRound", () => {
    startRound();
  });

  socket.on("host:requestHint", () => {
    if (!currentRound) return;
    const hint = currentRound.nextHint();
    io.emit("hint", { text: hint });
  });

  // Host typing an answer/test comment directly on the game screen (no second device needed)
  socket.on("host:submitAnswer", (text) => {
    pushComment({ userId: "host", username: "Host", text });
  });
});

server.listen(PORT, () => {
  console.log(`Live games server running on port ${PORT}`);
});
