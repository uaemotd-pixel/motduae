import mongoose from "mongoose";

/**
 * One document per chat bubble — scalable realtime history (WhatsApp-style).
 * Large media is stored as data URLs for now (same as Phase 1); can move to object storage later.
 */
const liveChatMessageSchema = new mongoose.Schema(
  {
    sessionKey: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    /** Client-facing message id (UUID). */
    messageId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["customer", "agent", "system"],
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["text", "voice", "image", "file"],
      default: "text",
      index: true,
    },
    text: { type: String, default: "", maxlength: 4000 },
    caption: { type: String, default: "", maxlength: 2000 },
    audio: { type: String, default: undefined },
    data: { type: String, default: undefined },
    fileName: { type: String, default: undefined },
    mimeType: { type: String, default: undefined },
    fileSize: { type: Number, default: undefined },
    durationMs: { type: Number, default: undefined },
    attachmentKind: {
      type: String,
      enum: ["image", "file"],
      required: false,
    },
    senderName: { type: String, default: undefined },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },
    /** Soft-delete tombstone (WhatsApp-style “delete for everyone”). */
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: {
      type: String,
      enum: ["customer", "agent"],
      required: false,
    },
    /** WhatsApp-style “delete for me” — hidden only for that side. */
    hiddenForCustomer: { type: Boolean, default: false, index: true },
    hiddenForAgent: { type: Boolean, default: false, index: true },
    /** Reply-to quote (snapshot at send time). */
    replyTo: {
      id: { type: String, default: undefined },
      role: {
        type: String,
        enum: ["customer", "agent", "system"],
        required: false,
      },
      kind: {
        type: String,
        enum: ["text", "voice", "image", "file"],
        required: false,
      },
      text: { type: String, default: "", maxlength: 500 },
      senderName: { type: String, default: undefined },
    },
    editedAt: { type: Date, default: null },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

liveChatMessageSchema.index({ sessionKey: 1, at: 1 });
liveChatMessageSchema.index({ sessionKey: 1, role: 1, status: 1 });

const LiveChatMessage = mongoose.model("LiveChatMessage", liveChatMessageSchema);

export default LiveChatMessage;
