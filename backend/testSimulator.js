const { COUNTRIES } = require("./gameEngine/countries");

const FAKE_NAMES = [
  "moonlight_viewer", "quiz_kenji", "sara_watches", "night_owl22", "traveler.dee",
  "pixel_fan", "chatty_marc", "june.codes", "ray_the_explorer", "tofu_bunny",
];

// Emits a mix of near-random and semi-plausible country guesses so the host can see
// the full range of feedback types (correct, close, far, wrong continent) while testing.
class TestSimulator {
  constructor(emitComment) {
    this.emitComment = emitComment;
    this.timer = null;
  }

  start(intervalMs = 2500) {
    this.stop();
    this.timer = setInterval(() => {
      const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
      const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      this.emitComment({
        userId: `test_${name}`,
        username: name,
        text: country.name,
      });
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = { TestSimulator };
