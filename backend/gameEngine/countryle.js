const { COUNTRIES, findCountryByGuess } = require("./countries");

const EARTH_RADIUS_KM = 6371;
const MAX_DISTANCE_KM = 20015; // ~ half of Earth's circumference (the farthest two points can be)
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function bearing(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let deg = (Math.atan2(y, x) * 180) / Math.PI;
  deg = (deg + 360) % 360;
  const index = Math.round(deg / 22.5) % 16;
  return COMPASS[index];
}

function proximityPercent(distanceKm) {
  const pct = 100 * (1 - distanceKm / MAX_DISTANCE_KM);
  return Math.max(0, Math.round(pct));
}

class CountryleRound {
  constructor({ difficulty = "standard" } = {}) {
    this.difficulty = difficulty;
    this.target = this.pickTarget(difficulty);
    this.guessesByUser = new Map(); // userId -> [{guessText, country, correct, ...}]
    this.correctUsers = []; // in order of correctness (first = round winner)
    this.hintsRevealed = 0;
    this.startedAt = Date.now();
    this.solved = false;
  }

  pickTarget(difficulty) {
    // "easy" restricts the pool to bigger/well-known countries by population, for now use full pool at all levels
    // (kept simple + honest: same pool, difficulty mainly affects timing/hints, see server.js)
    const pool = COUNTRIES;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Reveals a hint text, tier 1-3. Returns null once all hints are used.
  nextHint() {
    this.hintsRevealed += 1;
    const t = this.target;
    if (this.hintsRevealed === 1) {
      return `Continent: ${t.continent}`;
    }
    if (this.hintsRevealed === 2) {
      return `First letter: ${t.name[0]}`;
    }
    if (this.hintsRevealed === 3) {
      return `Capital city: ${t.capital}`;
    }
    return null;
  }

  // Process one comment/guess from a viewer. Returns a feedback object or null if not a valid country guess.
  submitGuess(userId, username, rawText) {
    const country = findCountryByGuess(rawText);
    if (!country) return null;

    const correct = country.code === this.target.code;
    const distanceKm = correct ? 0 : Math.round(haversineKm(country, this.target));
    const direction = correct ? null : bearing(country, this.target);

    const feedback = {
      userId,
      username,
      guessText: country.name,
      correct,
      continentMatch: country.continent === this.target.continent,
      populationHint: correct ? "match" : country.population > this.target.population ? "lower" : "higher", // hint: "the answer's population is ___ than your guess"
      areaHint: correct ? "match" : country.area > this.target.area ? "lower" : "higher",
      distanceKm,
      direction,
      proximity: correct ? 100 : proximityPercent(distanceKm),
      timestamp: Date.now(),
    };

    if (!this.guessesByUser.has(userId)) this.guessesByUser.set(userId, []);
    this.guessesByUser.get(userId).push(feedback);

    if (correct && !this.solved) {
      // only the FIRST correct guess actually "solves" and closes the round scoring window;
      // we still record it so more than one person can get partial credit if desired later
      if (!this.correctUsers.find((u) => u.userId === userId)) {
        this.correctUsers.push({ userId, username, atMs: Date.now() - this.startedAt });
      }
      this.solved = true;
    }

    return feedback;
  }

  // Scoring for a correct guess: base points minus hint penalty, plus a first-solver bonus.
  scoreFor(userId) {
    const BASE = 10;
    const HINT_PENALTY = 2;
    const FIRST_BONUS = 5;
    const isFirst = this.correctUsers[0] && this.correctUsers[0].userId === userId;
    let score = BASE - this.hintsRevealed * HINT_PENALTY;
    if (isFirst) score += FIRST_BONUS;
    return Math.max(1, score);
  }
}

module.exports = { CountryleRound, haversineKm, bearing };
