export {
  getShipaClient,
  createLiveClient,
  isShipaLiveMode,
  isShipaWebhookConfigured,
} from "./shipaClient.js";
export { createStubClient } from "./shipaStubClient.js";
export {
  normalizeShipaWebhookPayload,
  toShipaV2OrderBody,
  sanitizeShipaRef,
  toShipaCity,
  mapToShipaUaeCity,
  SHIPA_V2_SANDBOX_BASE_URL,
  SHIPA_V2_REF_MAX_LENGTH,
  SHIPA_UAE_CITIES,
} from "./shipaV2.js";
