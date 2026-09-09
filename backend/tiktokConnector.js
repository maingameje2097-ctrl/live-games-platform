const { WebcastPushConnection } = require("tiktok-live-connector");

// Wraps one active TikTok LIVE connection. Only one connection is expected at a time
// for this personal platform (you, or your friend, hosting their own single stream).
class TikTokConnector {
  constructor({ onComment, onGift, onStatus }) {
    this.connection = null;
    this.username = null;
    this.onComment = onComment || (() => {});
    this.onGift = onGift || (() => {});
    this.onStatus = onStatus || (() => {});
  }

  isConnected() {
    return !!this.connection && !!this.connection.getState().isConnected;
  }

  async connect(username) {
    if (this.connection) {
      await this.disconnect();
    }
    const cleanUsername = username.replace(/^@/, "").trim();
    this.username = cleanUsername;
    this.connection = new WebcastPushConnection(cleanUsername);

    this.connection.on("chat", (data) => {
      this.onComment({
        userId: data.userId || data.uniqueId,
        username: data.nickname || data.uniqueId,
        text: data.comment,
      });
    });

    this.connection.on("gift", (data) => {
      this.onGift({
        userId: data.userId || data.uniqueId,
        username: data.nickname || data.uniqueId,
        giftName: data.giftName,
        repeatCount: data.repeatCount,
      });
    });

    this.connection.on("streamEnd", () => {
      this.onStatus({ connected: false, reason: "stream_ended" });
    });

    this.connection.on("disconnected", () => {
      this.onStatus({ connected: false, reason: "disconnected" });
    });

    try {
      const state = await this.connection.connect();
      this.onStatus({ connected: true, roomId: state.roomId, username: cleanUsername });
      return { ok: true, roomId: state.roomId };
    } catch (err) {
      this.onStatus({ connected: false, reason: "connect_failed", error: err.message });
      return { ok: false, error: err.message };
    }
  }

  async disconnect() {
    if (this.connection) {
      try {
        this.connection.disconnect();
      } catch (e) {
        // ignore
      }
      this.connection = null;
    }
    this.onStatus({ connected: false, reason: "manual_disconnect" });
  }
}

module.exports = { TikTokConnector };
