import mongoose from "mongoose";

/**
 * WhatsApp-style live support thread.
 * Messages live in LiveChatMessage; this doc holds inbox metadata + denormalized preview.
 */
const liveChatSessionSchema = new mongoose.Schema(
  {
    /** Public id used by Socket.IO clients (UUID string). */
    sessionKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    customer: {
      userId: { type: String, default: null, index: true },
      name: { type: String, required: true, trim: true },
      email: { type: String, default: "", trim: true, lowercase: true },
      kind: {
        type: String,
        enum: ["registered", "guest", "anonymous"],
        default: "anonymous",
      },
      /** Customer profile picture path/URL (WhatsApp-style header/inbox avatar). */
      profilePic: { type: String, default: "", trim: true },
    },
    agent: {
      userId: { type: String, default: null },
      name: { type: String, default: null },
      profilePic: { type: String, default: "", trim: true },
    },
    status: {
      type: String,
      enum: ["waiting", "active", "ended", "closed"],
      default: "waiting",
      index: true,
    },
    locale: { type: String, default: "en", trim: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    endedBy: {
      type: String,
      enum: ["customer", "agent"],
      required: false,
    },
    endedAt: { type: Date, default: null },
    restartEndsAt: { type: Date, default: null },
    messageCount: { type: Number, default: 0 },
    /** Denormalized last message for inbox (no media payload). */
    lastMessage: {
      id: String,
      role: String,
      kind: String,
      text: String,
      status: String,
      at: String,
      fileName: String,
      attachmentKind: String,
    },
  },
  { timestamps: true },
);

liveChatSessionSchema.index({ status: 1, lastActivityAt: -1 });
liveChatSessionSchema.index({
  "customer.userId": 1,
  status: 1,
  lastActivityAt: -1,
});

const LiveChatSession = mongoose.model("LiveChatSession", liveChatSessionSchema);

export default LiveChatSession;
