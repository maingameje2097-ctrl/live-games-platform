// In-memory leaderboard. Resets when the server restarts (a live session is one server run).
// roundScores: resets every new round. totalScores: accumulates for the whole stream.

class Leaderboard {
  constructor() {
    this.totalScores = new Map(); // userId -> { username, score }
    this.roundScores = new Map(); // userId -> { username, score }
  }

  resetRound() {
    this.roundScores = new Map();
  }

  resetTotal() {
    this.totalScores = new Map();
  }

  add(userId, username, points) {
    const totalEntry = this.totalScores.get(userId) || { username, score: 0 };
    totalEntry.username = username; // keep latest display name
    totalEntry.score += points;
    this.totalScores.set(userId, totalEntry);

    const roundEntry = this.roundScores.get(userId) || { username, score: 0 };
    roundEntry.username = username;
    roundEntry.score += points;
    this.roundScores.set(userId, roundEntry);
  }

  top(map, limit = 10) {
    return Array.from(map.entries())
      .map(([userId, v]) => ({ userId, username: v.username, score: v.score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  topRound(limit = 10) {
    return this.top(this.roundScores, limit);
  }

  topTotal(limit = 10) {
    return this.top(this.totalScores, limit);
  }
}

module.exports = { Leaderboard };
