"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  X,
  Sparkles,
  Scissors,
  Ruler,
  ShoppingBag,
  Truck,
  CreditCard,
  Mail,
  RotateCcw,
  LayoutGrid,
  Send,
  ChevronDown,
  Globe2,
  UserRound,
  Shirt,
  Package,
  Gift,
  Store,
  Heart,
  MapPin,
  Undo2,
  ShieldCheck,
  AlertTriangle,
  Headset,
} from "lucide-react";
import {
  FAQ_ITEMS,
  CHATBOT_FAQ_SECTIONS,
  CHATBOT_TRACK_TOPIC_ID,
  CHATBOT_DAMAGE_TOPIC_ID,
  type FAQItem,
} from "@/data/motdFaqs";
import { useAuth } from "@/context/AuthContext";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { getActiveLiveSession } from "@/lib/api/supportChat";
import { displayOrderId } from "@/lib/customOrders";
import LiveChatPanel from "@/components/shared/LiveChatPanel";

export const FAQ_CHAT_OPEN_EVENT = "motd-faq-chat-open";

const VISITOR_NAME_KEY = "motd-chat-visitor-name";
const VISITOR_EMAIL_KEY = "motd-chat-visitor-email";

type Role = "bot" | "user";

type ChatMessage = {
  id: string;
  role: Role;
  text: string;
};

type QuickReplies =
  | { kind: "sections" }
  | { kind: "questions"; topicId: string }
  | { kind: "afterAnswer"; topicId: string };

function firstName(full: string) {
  const trimmed = full.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function readStoredVisitor() {
  if (typeof window === "undefined") return { name: "", email: "" };
  try {
    return {
      name: sessionStorage.getItem(VISITOR_NAME_KEY)?.trim() || "",
      email: sessionStorage.getItem(VISITOR_EMAIL_KEY)?.trim() || "",
    };
  } catch {
    return { name: "", email: "" };
  }
}

function storeVisitor(name: string, email?: string) {
  if (typeof window === "undefined") return;
  try {
    const n = name.trim();
    if (n) sessionStorage.setItem(VISITOR_NAME_KEY, n);
    if (email?.trim()) sessionStorage.setItem(VISITOR_EMAIL_KEY, email.trim());
  } catch {
    // ignore storage failures
  }
}

const TOPIC_ICONS = {
  "chat-track": MapPin,
  "chat-damage": AlertTriangle,
  "chat-about": Sparkles,
  "chat-browse": Globe2,
  "chat-account": UserRound,
  "chat-designs": Shirt,
  "chat-fabrics": Scissors,
  "chat-rto": Package,
  "chat-addons": Gift,
  "chat-brands": Store,
  "chat-tailors": Ruler,
  "chat-measurements": Ruler,
  "chat-pricing": CreditCard,
  "chat-wardrobe": Heart,
  "chat-orders": ShoppingBag,
  "chat-delivery": Truck,
  "chat-returns": Undo2,
  "chat-support": ShieldCheck,
} as const;

const CUSTOM_STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  pending: { en: "Order Placed", ar: "تم تقديم الطلب" },
  confirmed: { en: "Order Confirmed", ar: "تم تأكيد الطلب" },
  fabric_delivered: { en: "Fabric Delivered", ar: "تم تسليم القماش" },
  at_tailor: { en: "Tailor Received Fabric", ar: "استلم الخياط القماش" },
  in_production: { en: "Stitching in Progress", ar: "الخياطة قيد التنفيذ" },
  ready: { en: "Ready", ar: "جاهز" },
  out_for_delivery: { en: "Out for Delivery", ar: "في التوصيل" },
  delivered: { en: "Delivered", ar: "تم التسليم" },
  return_requested: { en: "Return Requested", ar: "تم طلب الإرجاع" },
  return_approved: { en: "Return Approved", ar: "تمت الموافقة على الإرجاع" },
  return_rejected: { en: "Return Rejected", ar: "تم رفض الإرجاع" },
  refund_processed: { en: "Refund Processed", ar: "تمت معالجة الاسترداد" },
};

const RETAIL_STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  pending: { en: "Pending", ar: "قيد الانتظار" },
  confirmed: { en: "Confirmed", ar: "مؤكد" },
  shipped: { en: "Shipped", ar: "تم الشحن" },
  delivered: { en: "Delivered", ar: "تم التسليم" },
  cancelled: { en: "Cancelled", ar: "ملغى" },
};

type TrackOrderResponse =
  | {
      success: true;
      orderType: "custom" | "retail";
      order: {
        id?: string;
        publicOrderId?: string | null;
        status: string;
        statusHistory?: Array<{ status: string; changedAt?: string }>;
        date?: string;
        design?: { name?: string; nameAr?: string } | null;
        items?: Array<{ name?: string; nameAr?: string }>;
      };
    }
  | { success: false; message?: string };

function statusLabel(
  status: string,
  orderType: "custom" | "retail",
  isAr: boolean,
) {
  const map = orderType === "custom" ? CUSTOM_STATUS_LABELS : RETAIL_STATUS_LABELS;
  const entry = map[status];
  if (entry) return isAr ? entry.ar : entry.en;
  return status.replace(/_/g, " ");
}

function formatTrackOrderReply(
  data: Extract<TrackOrderResponse, { success: true }>,
  isAr: boolean,
): string {
  const orderId = displayOrderId(data.order);
  const typeLabel = isAr
    ? data.orderType === "custom"
      ? "خياطة مخصصة"
      : "جاهز / تجزئة"
    : data.orderType === "custom"
      ? "Custom Mukhawar"
      : "Ready-made / Retail";
  const current = statusLabel(data.order.status, data.orderType, isAr);

  let itemHint = "";
  if (data.orderType === "custom") {
    const design = data.order.design;
    const name = isAr
      ? design?.nameAr?.trim() || design?.name?.trim()
      : design?.name?.trim() || design?.nameAr?.trim();
    if (name) itemHint = name;
  } else if (data.order.items?.[0]) {
    const item = data.order.items[0];
    itemHint = isAr
      ? item.nameAr?.trim() || item.name?.trim() || ""
      : item.name?.trim() || item.nameAr?.trim() || "";
  }

  const history = Array.isArray(data.order.statusHistory)
    ? data.order.statusHistory
    : [];
  // statusHistory can repeat the same status (e.g. "confirmed" again when Shipa
  // parcels are created). Timeline UIs keep one entry per status; match that here.
  const seenStatuses = new Set<string>();
  const uniqueHistory = history.filter((entry) => {
    const key = String(entry?.status || "");
    if (!key || seenStatuses.has(key)) return false;
    seenStatuses.add(key);
    return true;
  });
  const progressLines = uniqueHistory
    .slice(-6)
    .map((entry) => {
      const label = statusLabel(entry.status, data.orderType, isAr);
      const when = entry.changedAt
        ? new Date(entry.changedAt).toLocaleDateString(isAr ? "ar-AE" : "en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "";
      return when ? `• ${label} — ${when}` : `• ${label}`;
    });

  if (isAr) {
    const parts = [
      `وجدتُ طلبك ${orderId}.`,
      `النوع: ${typeLabel}`,
      itemHint ? `التفاصيل: ${itemHint}` : "",
      `الحالة الحالية: ${current}`,
    ].filter(Boolean);
    if (progressLines.length > 0) {
      parts.push("", "التقدّم:", ...progressLines);
    }
    return parts.join("\n");
  }

  const parts = [
    `I found your order ${orderId}.`,
    `Type: ${typeLabel}`,
    itemHint ? `Details: ${itemHint}` : "",
    `Current status: ${current}`,
  ].filter(Boolean);
  if (progressLines.length > 0) {
    parts.push("", "Progress:", ...progressLines);
  }
  return parts.join("\n");
}

/** Normalize typed Order ID for prefix checks (CO-/RO- only). */
function normalizeTrackOrderIdInput(raw: string) {
  return String(raw || "")
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/**
 * Real-time prefix check: must be building toward CO… or RO….
 * Empty / single C or R = ok while typing; anything else = error.
 */
function getTrackOrderIdPrefixError(raw: string, badPrefixMessage: string) {
  const normalized = normalizeTrackOrderIdInput(raw);
  if (!normalized) return "";
  if (normalized.startsWith("CO") || normalized.startsWith("RO")) return "";
  if (normalized.length === 1 && (normalized === "C" || normalized === "R")) {
    return "";
  }
  return badPrefixMessage;
}

function isTrackOrderIdPrefixValid(raw: string) {
  const normalized = normalizeTrackOrderIdInput(raw);
  return normalized.startsWith("CO") || normalized.startsWith("RO");
}

const TRACK_EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DamageKind =
  | ""
  | "torn"
  | "stained"
  | "missing_parts"
  | "wrong_item"
  | "packaging_damaged"
  | "other";

type ClaimOrderType = "" | "custom" | "retail";

const DAMAGE_KIND_OPTIONS: { value: Exclude<DamageKind, "">; en: string; ar: string }[] =
  [
    { value: "torn", en: "Torn / ripped", ar: "ممزّق / مقطوع" },
    { value: "stained", en: "Stained / dirty", ar: "ملطّخ / متّسخ" },
    { value: "missing_parts", en: "Missing parts / incomplete", ar: "أجزاء ناقصة / غير مكتمل" },
    { value: "wrong_item", en: "Wrong item received", ar: "تم استلام قطعة خاطئة" },
    { value: "packaging_damaged", en: "Damaged packaging", ar: "تغليف تالف" },
    { value: "other", en: "Something else", ar: "شيء آخر" },
  ];

/** Pull a customer Order ID (RO-0001ABC / CO-0001ABC) out of a typed question. */
function extractTrackOrderIdFromText(raw: string): string | null {
  const match = String(raw || "")
    .toUpperCase()
    .match(/\b((?:RO|CO)-\d+[A-Z]{3})\b/);
  return match?.[1] ?? null;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const chipVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.04 * i, duration: 0.28, ease: EASE },
  }),
};

let msgSeq = 0;
function nextId(prefix: string) {
  msgSeq += 1;
  return `${prefix}-${msgSeq}`;
}

function notifyChatOpen(open: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FAQ_CHAT_OPEN_EVENT, { detail: { open } })
  );
}

/** True when the text contains Arabic letters (used to pick reply language). */
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function scoreFaqAgainstQuery(
  query: string,
  tokens: string[],
  question: string,
  answer: string,
): number {
  let score = 0;
  if (question.includes(query) || query.includes(question)) score += 12;
  for (const token of tokens) {
    if (question.includes(token)) score += 3;
    if (answer.includes(token)) score += 1;
  }
  return score;
}

/** Match FAQs in both EN and AR so Arabic free-text works on the English site. */
function findBestFaq(query: string): FAQItem | null {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;

  // Arabic tokens are often short; keep Latin tokens at length > 2.
  const tokens = q
    .split(/\s+/)
    .filter((t) => t.length > 2 || containsArabic(t));
  let best: FAQItem | null = null;
  let bestScore = 0;

  for (const item of FAQ_ITEMS) {
    const scoreEn = scoreFaqAgainstQuery(
      q,
      tokens,
      item.questionEn.toLowerCase(),
      item.answerEn.toLowerCase(),
    );
    const scoreAr = scoreFaqAgainstQuery(
      q,
      tokens,
      item.questionAr.toLowerCase(),
      item.answerAr.toLowerCase(),
    );
    const score = Math.max(scoreEn, scoreAr);

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore >= 3 ? best : null;
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1.5 px-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#8A8A80]"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  );
}

export default function FaqChatbot() {
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [open, setOpen] = useState(false);
  const [liveChatOpen, setLiveChatOpen] = useState(false);
  /** Desktop half-screen expand while customer is in live agent chat. */
  const [liveChatExpanded, setLiveChatExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReplies | null>(null);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [questionsExpanded, setQuestionsExpanded] = useState(false);
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [awaitingName, setAwaitingName] = useState(false);
  const [supportView, setSupportView] = useState<null | "form" | "success">(null);
  const [supportCategory, setSupportCategory] = useState<"general" | "damage_claim">(
    "general",
  );
  const [supportRef, setSupportRef] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formOrderId, setFormOrderId] = useState("");
  const [formOrderIdInvalid, setFormOrderIdInvalid] = useState(false);
  const [formDamageKind, setFormDamageKind] = useState<DamageKind>("");
  const [formClaimOrderType, setFormClaimOrderType] = useState<ClaimOrderType>("");
  const [formConcern, setFormConcern] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportError, setSupportError] = useState("");
  const isDamageClaim = supportCategory === "damage_claim";

  const DAMAGE_POST_DELIVERY = new Set([
    "delivered",
    "return_requested",
    "return_approved",
    "return_rejected",
    "refund_processed",
  ]);
  /** Meaningful user exchanges (topic/question/typed). Support CTA unlocks after 2. */
  /** Live agent CTA — only after FAQ miss or after an answer (may still need help). */
  const [offerLiveAgent, setOfferLiveAgent] = useState(false);
  const [trackView, setTrackView] = useState(false);
  const [trackOrderId, setTrackOrderId] = useState("");
  const [trackEmail, setTrackEmail] = useState("");
  const [trackSubmitting, setTrackSubmitting] = useState(false);
  const [trackError, setTrackError] = useState("");
  const trackInputRef = useRef<HTMLInputElement>(null);
  const trackEmailInputRef = useRef<HTMLInputElement>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awaitingNameRef = useRef(false);
  const greetingStartedRef = useRef(false);
  /** Mobile soft-keyboard: keep the fixed panel inside the visual viewport. */
  const [mobileViewportStyle, setMobileViewportStyle] = useState<
    CSSProperties | undefined
  >(undefined);
  const syncMobileViewportRef = useRef<(() => void) | null>(null);

  const displayName = (() => {
    if (isAuthenticated && user && !user.isGuest && user.name?.trim()) {
      const preferred =
        isAr && user.nameAr?.trim() ? user.nameAr.trim() : user.name.trim();
      return firstName(preferred);
    }
    if (visitorName.trim()) return firstName(visitorName);
    return "";
  })();

  useEffect(() => {
    awaitingNameRef.current = awaitingName;
  }, [awaitingName]);

  const copy = isAr
    ? {
        title: "رعاية MOTD",
        online: "ONLINE",
        chooseTopic: "اختر موضوعاً",
        askName: "قبل أن نبدأ، ما اسمك؟",
        nameHint: "يرجى كتابة اسمك أدناه ثم اضغطي إرسال.",
        welcomeNamed: (name: string) =>
          `تشرفنا يا ${name}! كيف يمكنني مساعدتك اليوم؟ اختر موضوعاً للبدء.`,
        welcomeNamedMember: (name: string) =>
          `مرحباً بعودتك يا ${name}! يسعدنا مساعدتك. اختر موضوعاً للبدء.`,
        intro: "مرحباً! أهلاً بك في رعاية MOTD.",
        welcome:
          "مرحباً! أنا فريق رعاية MOTD. كيف يمكنني مساعدتك اليوم؟ اختر موضوعاً للبدء.",
        sectionReply: (title: string, name?: string) =>
          name
            ? `حسناً يا ${name} — إليك أسئلة شائعة حول «${title}». اضغط على سؤالك.`
            : `حسناً — إليك أسئلة شائعة حول «${title}». اضغط على سؤالك.`,
        moreInTopic: (name?: string) =>
          name
            ? `${name}، هل لديك سؤال آخر في هذا الموضوع؟`
            : "هل لديك سؤال آخر في هذا الموضوع؟",
        otherTopics: "مواضيع أخرى",
        askAnother: "سؤال آخر",
        contactPrompt: (name?: string) =>
          name
            ? `${name}، إذا احتجتِ مساعدة إضافية راسلينا على care@motd.ae وسنرد عليكِ في أقرب وقت.`
            : "إذا احتجتِ مساعدة إضافية، راسلينا على care@motd.ae وسنرد عليكِ في أقرب وقت.",
        noMatch: (name?: string) =>
          name
            ? `${name}، لم أجد إجابة دقيقة على ذلك. يمكنك اختيار موضوع أدناه، أو التحدث مع وكيل إن احتجتِ مساعدة إضافية.`
            : "لم أجد إجابة دقيقة على ذلك. يمكنك اختيار موضوع أدناه، أو التحدث مع وكيل إن احتجتِ مساعدة إضافية.",
        niceToMeet: (name: string) => `تشرفنا يا ${name}!`,
        contact: "تواصل معنا",
        close: "إغلاق الدردشة",
        open: "فتح دردشة المساعدة",
        you: "أنت",
        care: "رعاية MOTD",
        typing: "يكتب…",
        placeholder: "اكتبي سؤالك هنا…",
        namePlaceholder: "اكتبي اسمك هنا…",
        send: "إرسال",
        showMore: (n: number) => `اختر سؤالاً (${n})`,
        showTopics: (n: number) => `اختر موضوعاً (${n})`,
        showLess: "إخفاء",
        talkToAgent: "تحدثي مع وكيل مباشرة",
        liveChatOffline:
          "لا يوجد وكلاء متصلون الآن. اتركي بياناتك وسنتواصل معكِ عبر البريد.",
        supportFormTitle: "تواصل مع فريق الرعاية",
        supportGuestHint:
          "اتركي اسمك وبريدك الإلكتروني وسيتواصل معكِ وكيل رعاية عملاء MOTD.",
        supportMemberHint:
          "سيتواصل معكِ وكيل رعاية عملاء MOTD قريباً عبر البريد الإلكتروني على العنوان أدناه.",
        supportName: "الاسم",
        supportEmail: "البريد الإلكتروني",
        supportNamePlaceholder: "اكتبي اسمك",
        supportEmailPlaceholder: "you@example.com",
        supportSubmit: "إرسال الطلب",
        supportSubmitting: "جاري الإرسال…",
        supportSuccessTitle: "تم استلام طلبك",
        supportSuccessBody:
          "سيتواصل معكِ وكيل رعاية عملاء MOTD قريباً عبر البريد الإلكتروني.",
        supportRefLabel: "رقم المرجع",
        backToTopics: "العودة إلى المواضيع",
        supportInvalidEmail: "يرجى إدخال بريد إلكتروني صالح.",
        supportInvalidName: "يرجى إدخال اسم صالح (حرفين على الأقل).",
        supportOrderHint:
          "إذا كان الأمر متعلقاً بطلب، يرجى ذكر رقم الطلب.",
        supportConcern: "الاستفسار",
        supportConcernPlaceholder: "اكتبي ما تحتاجين المساعدة بشأنه",
        supportInvalidConcern: "يرجى وصف استفسارك (10 أحرف على الأقل).",
        damageTitle: "الإبلاغ عن تلف",
        damageHint:
          "لا حاجة لحساب. أدخلي رقم الطلب والبريد من رسالة التأكيد ووصف التلف. يتولى فريق رعاية MOTD الطلب فقط — لا تتواصلي مع الخياط أو محل القماش أو شركة الشحن.",
        damageMemberHint:
          "أدخلي رقم الطلب ووصف التلف. يتولى فريق رعاية MOTD الطلب فقط — لا تتواصلي مع الشركاء.",
        damageGuestSessionHint:
          "أنتِ تتسوقين كزائرة بدون حساب. أدخلي رقم الطلب والبريد المستخدم عند الدفع ووصف التلف. يتولى فريق رعاية MOTD الطلب فقط.",
        damageOrderLabel: "رقم الطلب",
        damageOrderPlaceholder: "مثل RO-0001ABC",
        damageConcern: "وصف التلف",
        damageConcernPlaceholder: "صفي التلف ومتى استلمتِ الطلب",
        damageInvalidConcern: "يرجى وصف التلف (10 أحرف على الأقل).",
        damageInvalidOrder: "يرجى إدخال رقم طلب صالح.",
        damageOrderNotYours:
          "رقم الطلب هذا ليس من طلباتك. تحققي من الرقم وحاولي مرة أخرى.",
        damageOrderNotDelivered:
          "يمكن الإبلاغ عن التلف فقط بعد تسليم الطلب. هذا الطلب لم يُعلَّم كمُسلَّم بعد.",
        damageKindLabel: "نوع التلف",
        damageKindPlaceholder: "اختاري نوع التلف",
        damageKindRequired: "يرجى اختيار نوع التلف.",
        damageOrderTypeLabel: "نوع الطلب",
        damageOrderTypePlaceholder: "اختاري نوع الطلب",
        damageOrderTypeCustom: "مخوار مخصص",
        damageOrderTypeRetail: "جاهز / تجزئة",
        damageOrderTypeRequired: "يرجى اختيار نوع الطلب.",
        damageSuccessBody:
          "استلم فريق رعاية MOTD بلاغ التلف. سيتواصلون معكِ عبر البريد الإلكتروني — لا حاجة للتواصل مع الشركاء.",
        trackTitle: "تتبع طلبك",
        trackHint:
          "أدخلي رقم الطلب (مثل RO-0001ABC أو CO-0001ABC) لعرض الحالة الحالية والتقدّم.",
        trackHintGuest:
          "أدخلي رقم الطلب والبريد الإلكتروني المستخدم عند الدفع (من رسالة التأكيد).",
        trackLabel: "رقم الطلب",
        trackPlaceholder: "مثل RO-0001ABC",
        trackEmailLabel: "البريد الإلكتروني",
        trackEmailPlaceholder: "البريد من تأكيد طلبك",
        trackSubmit: "تتبع الطلب",
        trackSubmitting: "جاري البحث…",
        trackInvalid: "يرجى إدخال رقم طلب صالح.",
        trackBadPrefix: "رقم الطلب يجب أن يبدأ بـ CO أو RO.",
        trackInvalidEmail: "يرجى إدخال بريد إلكتروني صالح.",
        trackNotFound:
          "يمكنكِ تتبع الطلبات المقدَّمة من هذا الحساب فقط. هذا الرقم ليس من طلباتك. تحققي من الرقم وحاولي مرة أخرى.",
        trackNotFoundGuest:
          "لم نتمكن من مطابقة رقم الطلب مع البريد الذي أدخلته. استخدمي الرقم والبريد من رسالة التأكيد وحاولي مرة أخرى.",
        trackAnother: "تتبع طلب آخر",
        notLoggedIn: "لم تقومي بتسجيل الدخول بعد.",
      }
    : {
        title: "MOTD Care",
        online: "ONLINE",
        chooseTopic: "Choose a topic",
        askName: "Before we begin — what's your name?",
        nameHint: "Please type your name below, then press send.",
        welcomeNamed: (name: string) =>
          `Nice to meet you, ${name}! How can I help you today? Pick a topic to begin.`,
        welcomeNamedMember: (name: string) =>
          `Welcome back, ${name}! How can I help you today? Pick a topic to begin.`,
        intro: "Hi! Welcome to MOTD Care.",
        welcome:
          "Hi! I'm with the MOTD Care team. How can I help you today? Pick a topic to begin.",
        sectionReply: (title: string, name?: string) =>
          name
            ? `Sure, ${name} — here are common questions about “${title}”. Tap the one you'd like answered.`
            : `Sure — here are common questions about “${title}”. Tap the one you'd like answered.`,
        moreInTopic: (name?: string) =>
          name
            ? `${name}, want another question on this topic?`
            : "Want another question on this topic?",
        otherTopics: "Other topics",
        askAnother: "Ask another",
        contactPrompt: (name?: string) =>
          name
            ? `${name}, if you need more help email us at care@motd.ae and we'll get back to you shortly.`
            : "If you need more help, email us at care@motd.ae and we'll get back to you shortly.",
        noMatch: (name?: string) =>
          name
            ? `${name}, I couldn't find an exact answer for that. You can choose a topic below, or talk to an agent if you still need help.`
            : "I couldn't find an exact answer for that. You can choose a topic below, or talk to an agent if you still need help.",
        niceToMeet: (name: string) => `Nice to meet you, ${name}!`,
        contact: "Contact us",
        close: "Close chat",
        open: "Open help chat",
        you: "You",
        care: "MOTD Care",
        typing: "Typing…",
        placeholder: "Type your question…",
        namePlaceholder: "Type your name…",
        send: "Send",
        showMore: (n: number) => `Choose a question (${n})`,
        showTopics: (n: number) => `Choose a topic (${n})`,
        showLess: "Hide",
        talkToAgent: "Talk to an agent",
        liveChatOffline:
          "No agents are online right now. Leave your details and we'll email you.",
        supportFormTitle: "Contact MOTD Support",
        supportGuestHint:
          "Share your name and email and a MOTD Customer Support Agent will contact you.",
        supportMemberHint:
          "A MOTD Customer Support Agent will contact you shortly via email at the address below.",
        supportName: "Name",
        supportEmail: "Email",
        supportNamePlaceholder: "Enter your name",
        supportEmailPlaceholder: "you@example.com",
        supportSubmit: "Submit request",
        supportSubmitting: "Sending…",
        supportSuccessTitle: "Request received",
        supportSuccessBody:
          "A MOTD Customer Support Agent will contact you shortly via email.",
        supportRefLabel: "Reference",
        backToTopics: "Back to topics",
        supportInvalidEmail: "Please enter a valid email address.",
        supportInvalidName: "Please enter a valid name (at least 2 characters).",
        supportOrderHint:
          "Please mention your order number if this is an order-related issue.",
        supportConcern: "Your concern",
        supportConcernPlaceholder: "Tell us what you need help with",
        supportInvalidConcern: "Please describe your concern (at least 10 characters).",
        damageTitle: "Claim a Damage",
        damageHint:
          "No account needed. Enter your Order ID, the email from your confirmation, and describe the damage. MOTD Care handles it only — do not contact the tailor, fabric shop, or courier.",
        damageMemberHint:
          "Enter your Order ID and describe the damage. MOTD Care handles it only — do not contact partners.",
        damageGuestSessionHint:
          "You're shopping as a guest (no account). Enter your Order ID, the email used at checkout, and describe the damage. MOTD Care handles it only.",
        damageOrderLabel: "Order ID",
        damageOrderPlaceholder: "e.g. RO-0001ABC",
        damageConcern: "Damage description",
        damageConcernPlaceholder: "Describe the damage and when you received the order",
        damageInvalidConcern: "Please describe the damage (at least 10 characters).",
        damageInvalidOrder: "Please enter a valid Order ID.",
        damageOrderNotYours:
          "That Order ID isn't one of your orders. Check the ID and try again.",
        damageOrderNotDelivered:
          "A damage claim can only be submitted after the order is marked delivered.",
        damageKindLabel: "Kind of damage",
        damageKindPlaceholder: "Select kind of damage",
        damageKindRequired: "Please select the kind of damage.",
        damageOrderTypeLabel: "Order type",
        damageOrderTypePlaceholder: "Select order type",
        damageOrderTypeCustom: "Custom Mukhawar",
        damageOrderTypeRetail: "Ready-made",
        damageOrderTypeRequired: "Please select the order type.",
        damageSuccessBody:
          "MOTD Care has received your damage claim. They will contact you by email — no need to contact partners.",
        trackTitle: "Track Your Order",
        trackHint:
          "Enter your Order ID (e.g. RO-0001ABC or CO-0001ABC) to see the current status and progress.",
        trackHintGuest:
          "Enter your Order ID and the email you used at checkout (from your confirmation email).",
        trackLabel: "Order ID",
        trackPlaceholder: "e.g. RO-0001ABC",
        trackEmailLabel: "Email",
        trackEmailPlaceholder: "Email from your order confirmation",
        trackSubmit: "Track order",
        trackSubmitting: "Looking up…",
        trackInvalid: "Please enter a valid Order ID.",
        trackBadPrefix: "Order ID must start with CO or RO.",
        trackInvalidEmail: "Please enter a valid email address.",
        trackNotFound:
          "You can only track orders placed on this account. That Order ID isn't one of yours. Check the ID and try again.",
        trackNotFoundGuest:
          "We couldn't match that Order ID with the email you entered. Use the Order ID and email from your confirmation and try again.",
        trackAnother: "Track another order",
        notLoggedIn: "You are not logged in yet.",
      };

  useEffect(() => {
    setQuestionsExpanded(false);
    setTopicsExpanded(false);
  }, [quickReplies]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = threadRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  useEffect(() => {
    notifyChatOpen(open);
    return () => notifyChatOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const scrollables = panel.querySelectorAll<HTMLElement>("[data-chat-scroll]");
    const cleanups: (() => void)[] = [];

    scrollables.forEach((el) => {
      const onWheel = (event: WheelEvent) => {
        event.stopPropagation();
        const canScroll = el.scrollHeight > el.clientHeight + 1;
        if (!canScroll) {
          event.preventDefault();
          return;
        }
        const scrollingUp = event.deltaY < 0;
        const scrollingDown = event.deltaY > 0;
        const atTop = el.scrollTop <= 0;
        const atBottom =
          el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if ((scrollingUp && atTop) || (scrollingDown && atBottom)) {
          event.preventDefault();
        }
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      cleanups.push(() => el.removeEventListener("wheel", onWheel));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [open, messages.length, quickReplies, typing]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // When the mobile keypad opens, `100dvh` / fixed `bottom` still refer to the
  // layout viewport, so the panel sits under the keyboard and feels stuck.
  // Pin height + bottom to `visualViewport` on small screens only.
  useEffect(() => {
    if (!open) {
      setMobileViewportStyle(undefined);
      syncMobileViewportRef.current = null;
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 639px)");
    let raf = 0;

    const syncViewport = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!mobileQuery.matches) {
          setMobileViewportStyle(undefined);
          return;
        }

        const vv = window.visualViewport;
        const viewportHeight = vv?.height ?? window.innerHeight;
        const offsetTop = vv?.offsetTop ?? 0;
        const keyboardOverlap = Math.max(
          0,
          window.innerHeight - viewportHeight - offsetTop,
        );
        const margin = 12;
        const available = Math.max(220, Math.floor(viewportHeight - margin * 2));

        setMobileViewportStyle({
          height: `${available}px`,
          maxHeight: `${available}px`,
          bottom: `${keyboardOverlap + margin}px`,
          top: "auto",
        });
      });
    };

    syncMobileViewportRef.current = syncViewport;
    syncViewport();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    mobileQuery.addEventListener("change", syncViewport);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      syncMobileViewportRef.current = null;
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      mobileQuery.removeEventListener("change", syncViewport);
      document.body.style.overflow = previousOverflow;
      setMobileViewportStyle(undefined);
    };
  }, [open]);

  useEffect(() => {
    if (open && awaitingName) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 320);
      return () => window.clearTimeout(t);
    }
  }, [open, awaitingName, messages.length]);

  const pushUser = (text: string) => {
    setMessages((prev) => [...prev, { id: nextId("u"), role: "user", text }]);
  };

  const botReply = (text: string, replies: QuickReplies | null, delayMs = 620) => {
    setBusy(true);
    setQuickReplies(null);
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { id: nextId("b"), role: "bot", text }]);
      // After an FAQ answer, offer live agent in case the reply wasn't enough.
      if (replies?.kind === "afterAnswer") {
        setOfferLiveAgent(true);
      }
      setQuickReplies(replies);
      setBusy(false);
    }, delayMs);
  };

  const getMemberProfile = useCallback(() => {
    if (isAuthenticated && user && !user.isGuest && user.email?.trim()) {
      const rawName = user.name?.trim() || "";
      const preferred =
        isAr && user.nameAr?.trim()
          ? user.nameAr.trim()
          : rawName || user.email.trim();
      return { name: preferred, email: user.email.trim() };
    }
    return null;
  }, [isAuthenticated, user, isAr]);

  const isRegisteredMember = Boolean(
    isAuthenticated && user && !user.isGuest && user.email?.trim()
  );
  /** Guest checkout session (shared guest account) — still needs Order ID + contact email. */
  const isGuestShopper = Boolean(isAuthenticated && user?.isGuest);
  /**
   * Live agent only after FAQ escalation — never on the first topic list.
   * Set when free-text has no match, or after an FAQ answer (may still need help).
   */
  const showTalkToAgent = offerLiveAgent;

  const resetSupportState = useCallback(() => {
    setSupportView(null);
    setSupportCategory("general");
    setSupportRef("");
    setFormName("");
    setFormEmail("");
    setFormOrderId("");
    setFormOrderIdInvalid(false);
    setFormDamageKind("");
    setFormClaimOrderType("");
    setFormConcern("");
    setSupportSubmitting(false);
    setSupportError("");
  }, []);

  const resetTrackState = useCallback(() => {
    setTrackView(false);
    setTrackOrderId("");
    setTrackEmail("");
    setTrackSubmitting(false);
    setTrackError("");
  }, []);

  const openTrackForm = useCallback(
    (prefillOrderId = "") => {
      if (busy || awaitingNameRef.current || trackSubmitting || supportSubmitting) {
        return;
      }
      resetSupportState();
      setTrackError("");
      setTrackOrderId(prefillOrderId);
      setTrackEmail("");
      setTrackView(true);
      setQuickReplies(null);
      setTopicsExpanded(false);
      window.setTimeout(() => {
        if (prefillOrderId && !isRegisteredMember) {
          trackEmailInputRef.current?.focus();
        } else {
          trackInputRef.current?.focus();
        }
      }, 280);
    },
    [
      busy,
      isRegisteredMember,
      resetSupportState,
      supportSubmitting,
      trackSubmitting,
    ],
  );

  const openSupportForm = (category: "general" | "damage_claim" = "general") => {
    if (busy || awaitingNameRef.current || supportSubmitting || trackSubmitting) return;
    resetTrackState();
    setQuickReplies(null);
    setSupportCategory(category);
    setSupportError("");
    setSupportRef("");
    setFormConcern("");
    setFormOrderId("");
    setFormOrderIdInvalid(false);
    setFormDamageKind("");
    setFormClaimOrderType("");
    setSupportView("form");

    const member = getMemberProfile();
    if (member) {
      setFormName(member.name);
      setFormEmail(member.email);
      return;
    }

    if (category === "damage_claim") {
      // Only prefill checkout email when the shopper is in an active guest session.
      // Anonymous visitors must type the confirmation email themselves (no stored autofill).
      if (user?.isGuest && user.guestContactEmail?.trim()) {
        setFormName(visitorName.trim() || "");
        setFormEmail(user.guestContactEmail.trim());
        return;
      }
      setFormName(visitorName.trim() || "");
      setFormEmail("");
      return;
    }

    // General support for guests: empty fields with placeholders only
    setFormName("");
    setFormEmail("");
  };

  const openLiveChat = async () => {
    if (busy || awaitingNameRef.current || supportSubmitting || trackSubmitting || liveChatOpen) {
      return;
    }
    // Always open live chat (WhatsApp-style queue). Do not fall back to email form
    // just because no agent is currently on the Live Chat tab.
    setLiveChatOpen(true);
  };

  const openDamageClaimForm = () => {
    openSupportForm("damage_claim");
  };

  const finishSupportSuccess = (referenceNumber: string) => {
    setSupportRef(referenceNumber);
    setSupportView("success");
    const successBody = isDamageClaim
      ? copy.damageSuccessBody
      : copy.supportSuccessBody;
    setMessages((prev) => [
      ...prev,
      {
        id: nextId("b"),
        role: "bot",
        text: `${successBody}\n\n${copy.supportRefLabel}: ${referenceNumber}`,
      },
    ]);
  };

  const submitSupportRequest = async () => {
    if (supportSubmitting) return;
    setSupportError("");

    let name = formName.trim().replace(/\s+/g, " ");
    let email = formEmail.trim();

    if (!isRegisteredMember) {
      if (name.length < 2) {
        setSupportError(copy.supportInvalidName);
        return;
      }
      if (!TRACK_EMAIL_RX.test(email)) {
        setSupportError(copy.supportInvalidEmail);
        return;
      }
      storeVisitor(name, email);
    } else {
      const member = getMemberProfile();
      if (!member) return;
      name = member.name;
      email = member.email;
    }

    const orderId = normalizeTrackOrderIdInput(formOrderId);
    if (isDamageClaim) {
      if (!formClaimOrderType) {
        setSupportError(copy.damageOrderTypeRequired);
        return;
      }
      if (!formDamageKind) {
        setSupportError(copy.damageKindRequired);
        return;
      }
      if (!orderId || orderId.length < 4) {
        setFormOrderIdInvalid(true);
        setSupportError(copy.damageInvalidOrder);
        return;
      }
      if (!isTrackOrderIdPrefixValid(orderId)) {
        setFormOrderIdInvalid(true);
        setSupportError(copy.trackBadPrefix);
        return;
      }
      // Soft hint from Order ID prefix (CO = custom, RO = retail)
      if (orderId.startsWith("CO") && formClaimOrderType !== "custom") {
        setSupportError(
          isAr
            ? "رقم الطلب هذا لمخوار مخصص. يرجى اختيار «مخوار مخصص»."
            : "This Order ID is for a custom order. Please select Custom Mukhawar.",
        );
        return;
      }
      if (orderId.startsWith("RO") && formClaimOrderType !== "retail") {
        setSupportError(
          isAr
            ? "رقم الطلب هذا لطلب جاهز. يرجى اختيار «جاهز / تجزئة»."
            : "This Order ID is for a ready-made order. Please select Ready-made.",
        );
        return;
      }
    }

    const concern = formConcern.trim();
    if (concern.length < 10 || concern.length > 2000) {
      setSupportError(
        isDamageClaim ? copy.damageInvalidConcern : copy.supportInvalidConcern,
      );
      return;
    }

    setSupportSubmitting(true);
    try {
      // Logged-in: verify Order ID belongs to this account before creating the claim
      if (isDamageClaim && isRegisteredMember) {
        try {
          const check = await api.get<TrackOrderResponse>(
            `/api/orders/track/by-id/${encodeURIComponent(orderId)}`,
          );
          if (!check?.success || !check.order) {
            setFormOrderIdInvalid(true);
            setSupportError(copy.damageOrderNotYours);
            return;
          }
          if (!DAMAGE_POST_DELIVERY.has(String(check.order.status || ""))) {
            setFormOrderIdInvalid(true);
            setSupportError(copy.damageOrderNotDelivered);
            return;
          }
        } catch (verifyErr) {
          const status = (verifyErr as { status?: number })?.status;
          setFormOrderIdInvalid(true);
          setSupportError(
            status === 404
              ? copy.damageOrderNotYours
              : getApiErrorMessage(
                  verifyErr,
                  isAr
                    ? "تعذر التحقق من رقم الطلب. حاولي مرة أخرى."
                    : "Could not verify the Order ID. Please try again.",
                ),
          );
          return;
        }
      }

      // Guest / anonymous: verify Order ID + confirmation email before creating the claim
      if (isDamageClaim && !isRegisteredMember) {
        try {
          const check = await api.post<TrackOrderResponse>(
            "/api/orders/track/by-id",
            { publicOrderId: orderId, email },
          );
          if (!check?.success || !check.order) {
            setFormOrderIdInvalid(true);
            setSupportError(copy.trackNotFoundGuest);
            return;
          }
          if (!DAMAGE_POST_DELIVERY.has(String(check.order.status || ""))) {
            setFormOrderIdInvalid(true);
            setSupportError(copy.damageOrderNotDelivered);
            return;
          }
        } catch (verifyErr) {
          const status = (verifyErr as { status?: number })?.status;
          setFormOrderIdInvalid(true);
          setSupportError(
            status === 404
              ? copy.trackNotFoundGuest
              : getApiErrorMessage(
                  verifyErr,
                  isAr
                    ? "تعذر التحقق من رقم الطلب. حاولي مرة أخرى."
                    : "Could not verify the Order ID. Please try again.",
                ),
          );
          return;
        }
      }

      const damageKindLabel = DAMAGE_KIND_OPTIONS.find(
        (o) => o.value === formDamageKind,
      );
      const kindText = damageKindLabel
        ? isAr
          ? damageKindLabel.ar
          : damageKindLabel.en
        : formDamageKind;
      const concernWithKind =
        isDamageClaim && kindText
          ? `[${kindText}]\n${concern}`
          : concern;

      const data = await api.post<{ success: boolean; referenceNumber: string }>(
        "/api/faq-support/requests",
        {
          name,
          email,
          concern: concernWithKind,
          locale,
          category: supportCategory,
          ...(isDamageClaim
            ? {
                publicOrderId: orderId,
                orderType: formClaimOrderType,
                damageKind: formDamageKind,
              }
            : {}),
        },
      );
      finishSupportSuccess(data.referenceNumber);
    } catch (err) {
      const status = (err as { status?: number; data?: { code?: string } })?.status;
      const code = (err as { data?: { code?: string } })?.data?.code;
      if (isDamageClaim && (status === 404 || code === "ORDER_NOT_ON_ACCOUNT")) {
        setFormOrderIdInvalid(true);
        setSupportError(
          isRegisteredMember ? copy.damageOrderNotYours : copy.trackNotFoundGuest,
        );
        return;
      }
      if (isDamageClaim && code === "ORDER_NOT_DELIVERED") {
        setFormOrderIdInvalid(true);
        setSupportError(copy.damageOrderNotDelivered);
        return;
      }
      if (isDamageClaim && code === "ORDER_TYPE_MISMATCH") {
        setSupportError(
          getApiErrorMessage(err, copy.damageOrderTypeRequired),
        );
        return;
      }
      setSupportError(
        getApiErrorMessage(
          err,
          isAr
            ? "تعذر إرسال الطلب. حاولي مرة أخرى أو راسلينا على care@motd.ae."
            : "Could not send your request. Please try again or email care@motd.ae.",
        ),
      );
    } finally {
      setSupportSubmitting(false);
    }
  };

  const backFromSupport = () => {
    resetSupportState();
    setQuickReplies({ kind: "sections" });
  };

  const backFromTrack = () => {
    resetTrackState();
    setQuickReplies({ kind: "sections" });
  };

  const lookupTrackOrder = async (orderId: string, email?: string) => {
    setTrackError("");
    setTrackSubmitting(true);

    const notFoundMessage = isRegisteredMember
      ? copy.trackNotFound
      : copy.trackNotFoundGuest;

    try {
      const data = isRegisteredMember
        ? await api.get<TrackOrderResponse>(
            `/api/orders/track/by-id/${encodeURIComponent(orderId)}`,
          )
        : await api.post<TrackOrderResponse>("/api/orders/track/by-id", {
            publicOrderId: orderId,
            email: String(email || "").trim(),
          });

      if (!data?.success || !data.order) {
        setTrackError(notFoundMessage);
        setMessages((prev) => [
          ...prev,
          { id: nextId("b"), role: "bot", text: notFoundMessage },
        ]);
        return;
      }

      resetTrackState();
      botReply(formatTrackOrderReply(data, isAr), { kind: "sections" }, 700);
    } catch (err) {
      const status = (err as { status?: number; data?: { code?: string } })?.status;
      const code = (err as { data?: { code?: string } })?.data?.code;
      if (status === 401 || code === "NOT_LOGGED_IN") {
        resetTrackState();
        setMessages((prev) => [
          ...prev,
          {
            id: nextId("b"),
            role: "bot",
            text: isAr
              ? displayName
                ? `${displayName}، أدخلي رقم الطلب والبريد من رسالة التأكيد أدناه.`
                : "أدخلي رقم الطلب والبريد من رسالة التأكيد أدناه."
              : displayName
                ? `${displayName}, enter your Order ID and confirmation email below.`
                : "Enter your Order ID and confirmation email below.",
          },
        ]);
        openTrackForm(orderId);
        return;
      }
      const message =
        status === 404
          ? notFoundMessage
          : getApiErrorMessage(
              err,
              isAr
                ? "تعذر تحميل تفاصيل الطلب. حاولي مرة أخرى."
                : "Could not load order details. Please try again.",
            );
      setTrackError(message);
      setMessages((prev) => [
        ...prev,
        { id: nextId("b"), role: "bot", text: message },
      ]);
    } finally {
      setTrackSubmitting(false);
    }
  };

  const submitTrackOrder = async () => {
    if (trackSubmitting) return;

    const orderId = normalizeTrackOrderIdInput(trackOrderId);
    if (!orderId) {
      setTrackError(copy.trackInvalid);
      return;
    }
    if (!isTrackOrderIdPrefixValid(orderId)) {
      setTrackError(copy.trackBadPrefix);
      return;
    }
    if (orderId.length < 4) {
      setTrackError(copy.trackInvalid);
      return;
    }

    const email = trackEmail.trim();
    if (!isRegisteredMember) {
      if (!TRACK_EMAIL_RX.test(email)) {
        setTrackError(copy.trackInvalidEmail);
        return;
      }
    }

    pushUser(
      isRegisteredMember ? orderId : `${orderId} · ${email.toLowerCase()}`,
    );

    await lookupTrackOrder(orderId, isRegisteredMember ? undefined : email);
  };

  const beginGreeting = useCallback(() => {
    if (greetingStartedRef.current) return;
    greetingStartedRef.current = true;

    if (typingTimer.current) clearTimeout(typingTimer.current);
    setTyping(false);
    setBusy(false);
    setQuestionsExpanded(false);
    setTopicsExpanded(false);
    setQuickReplies(null);
    setDraft("");
    setOfferLiveAgent(false);
    resetSupportState();
    resetTrackState();

    const member = getMemberProfile();
    const intro = isAr
      ? "مرحباً! أهلاً بك في رعاية MOTD."
      : "Hi! Welcome to MOTD Care.";

    // Logged-in user: always use account first name — never ask which name to use
    if (member) {
      const short = firstName(member.name);
      setVisitorName(member.name);
      setAwaitingName(false);
      awaitingNameRef.current = false;
      storeVisitor(member.name, member.email);
      setMessages([{ id: nextId("b"), role: "bot", text: intro }]);
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId("b"),
            role: "bot",
            text: isAr
              ? `مرحباً بعودتك يا ${short}! يسعدنا مساعدتك. اختر موضوعاً للبدء.`
              : `Welcome back, ${short}! How can I help you today? Pick a topic to begin.`,
          },
        ]);
        setQuickReplies({ kind: "sections" });
      }, 450);
      return;
    }

    // Guest: ask for name, then call them by first name
    setVisitorName("");
    setAwaitingName(true);
    awaitingNameRef.current = true;
    setMessages([{ id: nextId("b"), role: "bot", text: intro }]);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("b"),
          role: "bot",
          text: isAr
            ? "قبل أن نبدأ، ما اسمك؟"
            : "Before we begin — what's your name?",
        },
      ]);
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }, 450);
  }, [getMemberProfile, isAr, resetSupportState, resetTrackState]);

  // On open: resume live agent thread if one is still waiting/active; else FAQ greeting.
  useEffect(() => {
    if (!open) {
      greetingStartedRef.current = false;
      return;
    }
    if (greetingStartedRef.current || liveChatOpen) return;

    let cancelled = false;

    const boot = async () => {
      try {
        const { session } = await getActiveLiveSession();
        if (cancelled) return;
        if (session?.id) {
          greetingStartedRef.current = true;
          setLiveChatOpen(true);
          return;
        }
      } catch {
        // fall through to FAQ greeting
      }
      if (cancelled) return;
      beginGreeting();
    };

    if (!authLoading) {
      void boot();
      return () => {
        cancelled = true;
      };
    }

    const fallback = window.setTimeout(() => {
      void boot();
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [open, authLoading, beginGreeting, liveChatOpen]);

  const openChat = () => {
    greetingStartedRef.current = false;
    setLiveChatOpen(false);
    setLiveChatExpanded(false);
    setMessages([]);
    setQuickReplies(null);
    setAwaitingName(false);
    awaitingNameRef.current = false;
    setVisitorName("");
    setDraft("");
    setTyping(false);
    setBusy(false);
    setOfferLiveAgent(false);
    resetSupportState();
    resetTrackState();
    setOpen(true);
  };

  const closeChat = () => {
    setOpen(false);
    setLiveChatOpen(false);
    setLiveChatExpanded(false);
    greetingStartedRef.current = false;
    setOfferLiveAgent(false);
    resetSupportState();
    resetTrackState();
    if (typingTimer.current) clearTimeout(typingTimer.current);
  };

  const acceptName = (rawName: string) => {
    const cleaned = rawName.trim().replace(/\s+/g, " ");
    if (cleaned.length < 2) {
      botReply(
        isAr
          ? "من فضلك اكتبي اسماً صالحاً (حرفين على الأقل)."
          : "Please enter a valid name (at least 2 characters).",
        null,
        400
      );
      setAwaitingName(true);
      awaitingNameRef.current = true;
      return false;
    }
    const short = firstName(cleaned);
    setVisitorName(cleaned);
    storeVisitor(cleaned);
    setAwaitingName(false);
    awaitingNameRef.current = false;
    pushUser(cleaned);
    botReply(copy.welcomeNamed(short), { kind: "sections" }, 700);
    return true;
  };

  const selectSection = (topicId: string) => {
    if (busy || awaitingNameRef.current) return;
    const section = CHATBOT_FAQ_SECTIONS.find((s) => s.id === topicId);
    if (!section) return;
    const title = isAr ? section.titleAr : section.titleEn;
    pushUser(title);

    if (topicId === CHATBOT_TRACK_TOPIC_ID) {
      setQuickReplies(null);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("b"),
          role: "bot",
          text: isRegisteredMember
            ? isAr
              ? displayName
                ? `${displayName}، أدخلي رقم الطلب أدناه لتتبع حالته.`
                : "أدخلي رقم الطلب أدناه لتتبع حالته."
              : displayName
                ? `${displayName}, enter your Order ID below to track its status.`
                : "Enter your Order ID below to track its status."
            : isAr
              ? displayName
                ? `${displayName}، أدخلي رقم الطلب والبريد من رسالة التأكيد أدناه.`
                : "أدخلي رقم الطلب والبريد من رسالة التأكيد أدناه."
              : displayName
                ? `${displayName}, enter your Order ID and the email from your confirmation below.`
                : "Enter your Order ID and the email from your confirmation below.",
        },
      ]);
      openTrackForm();
      return;
    }

    if (topicId === CHATBOT_DAMAGE_TOPIC_ID) {
      setQuickReplies(null);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("b"),
          role: "bot",
          text: isRegisteredMember
            ? isAr
              ? displayName
                ? `${displayName}، يمكنكِ الإبلاغ عن التلف أدناه. يتولى فريق رعاية MOTD الطلب فقط.`
                : "يمكنكِ الإبلاغ عن التلف أدناه. يتولى فريق رعاية MOTD الطلب فقط."
              : displayName
                ? `${displayName}, you can file a damage claim below. MOTD Care handles it only.`
                : "You can file a damage claim below. MOTD Care handles it only."
            : isAr
              ? displayName
                ? `${displayName}، لا حاجة لحساب — أدخلي رقم الطلب والبريد من رسالة التأكيد أدناه.`
                : "لا حاجة لحساب — أدخلي رقم الطلب والبريد من رسالة التأكيد أدناه."
              : displayName
                ? `${displayName}, no account needed — enter your Order ID and confirmation email below.`
                : "No account needed — enter your Order ID and confirmation email below.",
        },
      ]);
      openDamageClaimForm();
      return;
    }

    botReply(
      copy.sectionReply(title, displayName || undefined),
      { kind: "questions", topicId }
    );
  };

  const selectQuestion = (faq: FAQItem) => {
    if (busy || awaitingNameRef.current) return;
    const question = isAr ? faq.questionAr : faq.questionEn;
    const answer = isAr ? faq.answerAr : faq.answerEn;
    pushUser(question);
    botReply(answer, { kind: "afterAnswer", topicId: faq.chatTopicId }, 780);
  };

  const showSectionsAgain = () => {
    if (busy || awaitingNameRef.current) return;
    pushUser(copy.otherTopics);
    const short = displayName;
    botReply(
      short ? copy.welcomeNamed(short) : copy.welcome,
      { kind: "sections" }
    );
  };

  const showQuestionsAgain = (topicId: string) => {
    if (busy || awaitingNameRef.current) return;
    const section = CHATBOT_FAQ_SECTIONS.find((s) => s.id === topicId);
    if (!section) return;
    const title = isAr ? section.titleAr : section.titleEn;
    pushUser(copy.askAnother);
    botReply(
      copy.sectionReply(title, displayName || undefined),
      { kind: "questions", topicId }
    );
  };

  const showContact = () => {
    if (busy || awaitingNameRef.current) return;
    pushUser(copy.contact);
    botReply(copy.contactPrompt(displayName || undefined), { kind: "sections" });
  };

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    const text = draft.trim();
    if (!text) return;

    // Prefer ref so name step is never missed due to a stale render
    if (awaitingNameRef.current || awaitingName) {
      setDraft("");
      acceptName(text);
      return;
    }

    setDraft("");
    pushUser(text);

    const typedOrderId = extractTrackOrderIdFromText(text);
    if (typedOrderId) {
      if (isRegisteredMember) {
        void lookupTrackOrder(typedOrderId);
        return;
      }
      botReply(
        isAr
          ? displayName
            ? `${displayName}، أدخلي أيضاً البريد الإلكتروني من رسالة التأكيد لإكمال التتبع.`
            : "أدخلي أيضاً البريد الإلكتروني من رسالة التأكيد لإكمال التتبع."
          : displayName
            ? `${displayName}, enter the email from your confirmation to finish tracking.`
            : "Enter the email from your confirmation to finish tracking.",
        null,
        500,
      );
      openTrackForm(typedOrderId);
      return;
    }

    // Reply language follows the question script, not only the page locale.
    const replyIsAr = containsArabic(text) || isAr;
    const match = findBestFaq(text);
    if (match) {
      const answer = replyIsAr ? match.answerAr : match.answerEn;
      botReply(answer, { kind: "afterAnswer", topicId: match.chatTopicId }, 780);
      return;
    }

    // Free-text didn't match any FAQ — topics/questions failed; offer live agent.
    setOfferLiveAgent(true);

    if (replyIsAr && !isAr) {
      botReply(
        displayName
          ? `${displayName}، لم أجد إجابة دقيقة على ذلك. يمكنك اختيار موضوع أدناه، أو التحدث مع وكيل.`
          : "لم أجد إجابة دقيقة على ذلك. يمكنك اختيار موضوع أدناه، أو التحدث مع وكيل.",
        { kind: "sections" },
        700,
      );
      return;
    }

    botReply(copy.noMatch(displayName || undefined), { kind: "sections" }, 700);
  };

  const sectionQuestions = (topicId: string) =>
    FAQ_ITEMS.filter((item) => item.chatTopicId === topicId);

  const trackPrefixError = getTrackOrderIdPrefixError(
    trackOrderId,
    copy.trackBadPrefix,
  );
  const displayTrackError = trackPrefixError || trackError;
  const trackEmailOk =
    isRegisteredMember || TRACK_EMAIL_RX.test(trackEmail.trim());
  const canSubmitTrack =
    isTrackOrderIdPrefixValid(trackOrderId) &&
    normalizeTrackOrderIdInput(trackOrderId).length >= 4 &&
    trackEmailOk &&
    !trackSubmitting;

  return (
    <>
      {/* FAB — bottom-most corner; hidden while panel is open */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={openChat}
            aria-label={copy.open}
            aria-expanded={false}
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="fixed bottom-4 end-3 sm:bottom-5 sm:end-5 md:bottom-6 md:end-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-[0_10px_40px_rgba(0,0,0,0.28)] outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] hover:cursor-pointer touch-manipulation mb-(--safe-bottom) me-(--safe-right)"
          >
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-full border border-black/25"
              animate={{ scale: [1, 1.45], opacity: [0.45, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
            />
            <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label={copy.close}
              onClick={closeChat}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] sm:bg-black/10 sm:backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none md:pointer-events-none"
            />

            <motion.div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={copy.title}
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              style={mobileViewportStyle}
              className={
                liveChatOpen && liveChatExpanded
                  ? "fixed z-50 flex min-h-0 max-w-[100vw] flex-col overflow-hidden overflow-x-hidden rounded-none border border-white/10 bg-[#FFFDF9] shadow-[0_24px_80px_rgba(0,0,0,0.28)] outline-none transition-[width,height,max-width,top,bottom] duration-300 ease-out xs:rounded-2xl bottom-[max(0.5rem,var(--safe-bottom))] start-[max(0.5rem,var(--safe-left))] end-[max(0.5rem,var(--safe-right))] w-auto h-[min(92dvh,44rem)] max-h-[calc(100dvh-1rem-var(--safe-top)-var(--safe-bottom))] sm:start-auto sm:bottom-[max(1.25rem,var(--safe-bottom))] sm:end-[max(1.25rem,var(--safe-right))] sm:w-[min(100vw-2.5rem,26rem)] sm:max-w-[26rem] sm:h-[min(84dvh,44rem)] md:bottom-[max(0.75rem,var(--safe-bottom))] md:top-[max(0.75rem,var(--safe-top))] md:end-[max(0.75rem,var(--safe-right))] md:h-auto md:max-h-none md:w-[min(62vw,48rem)] md:max-w-[min(62vw,48rem)] lg:w-[min(58vw,52rem)] lg:max-w-[min(58vw,52rem)]"
                  : "fixed z-50 flex min-h-0 max-w-[100vw] flex-col overflow-hidden overflow-x-hidden rounded-none border border-white/10 bg-[#FFFDF9] shadow-[0_24px_80px_rgba(0,0,0,0.28)] outline-none transition-[width,height,max-width,top,bottom] duration-300 ease-out xs:rounded-2xl bottom-[max(0.5rem,var(--safe-bottom))] start-[max(0.5rem,var(--safe-left))] end-[max(0.5rem,var(--safe-right))] w-auto h-[min(92dvh,44rem)] max-h-[calc(100dvh-1rem-var(--safe-top)-var(--safe-bottom))] sm:start-auto sm:bottom-[max(1.25rem,var(--safe-bottom))] sm:end-[max(1.25rem,var(--safe-right))] sm:w-[min(100vw-2.5rem,26rem)] sm:max-w-[26rem] sm:h-[min(84dvh,44rem)] md:bottom-[max(1.5rem,var(--safe-bottom))] md:end-[max(1.5rem,var(--safe-right))] md:top-auto md:w-[28rem] md:max-w-[28rem] md:h-[min(82dvh,46rem)]"
              }
            >
              <AnimatePresence>
                {liveChatOpen ? (
                  <LiveChatPanel
                    open={liveChatOpen}
                    onClose={() => {
                      setLiveChatOpen(false);
                      setLiveChatExpanded(false);
                      // Auto-resume skips FAQ greeting — start it when live panel closes.
                      if (messages.length === 0) {
                        greetingStartedRef.current = false;
                        beginGreeting();
                      }
                    }}
                    onCloseWidget={closeChat}
                    onExpandedChange={setLiveChatExpanded}
                    locale={locale}
                    isAr={isAr}
                    initialName={
                      getMemberProfile()?.name || visitorName.trim() || ""
                    }
                    priorMessages={messages.map((m) => ({
                      role: m.role,
                      text: m.text,
                    }))}
                  />
                ) : null}
              </AnimatePresence>
              {/* Header with in-panel close */}
              <header className="relative shrink-0 overflow-hidden bg-black px-3.5 py-3 sm:px-4 sm:py-3.5 text-white">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
                <div className="relative flex items-center gap-2.5 sm:gap-3">
                  <motion.span
                    className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white text-black [font-family:var(--font-display)] text-[14px] sm:text-[15px] tracking-wide"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.08, type: "spring", stiffness: 400, damping: 20 }}
                  >
                    M
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <motion.h2
                      className="[font-family:var(--font-display)] text-[16px] sm:text-[17px] font-light leading-tight tracking-tight"
                      initial={{ opacity: 0, x: isAr ? 8 : -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1, duration: 0.3, ease: EASE }}
                    >
                      {copy.title}
                    </motion.h2>
                  </div>
                  <motion.button
                    type="button"
                    onClick={closeChat}
                    aria-label={copy.close}
                    whileHover={{ scale: 1.08, rotate: 90 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white hover:text-black hover:cursor-pointer"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </motion.button>
                </div>
              </header>

              {/* Message thread */}
              <div
                ref={threadRef}
                data-lenis-prevent
                data-lenis-prevent-wheel
                data-chat-scroll
                className="relative min-h-0 flex-1 space-y-3 sm:space-y-3.5 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y px-3 py-3.5 sm:px-3.5 sm:py-4 [-webkit-overflow-scrolling:touch]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 12% 8%, rgba(0,0,0,0.03), transparent 42%), radial-gradient(circle at 88% 92%, rgba(0,0,0,0.025), transparent 40%), linear-gradient(180deg, #F7F5F0 0%, #FFFDF9 100%)",
                }}
              >
                {open && messages.length === 0 && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <span className="mt-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-[10px] text-white [font-family:var(--font-display)]">
                        M
                      </span>
                      <div className="rounded-2xl rounded-ss-md border border-[#E8E8E4] bg-white px-4 py-3 shadow-[0_6px_20px_rgba(0,0,0,0.05)]">
                        <TypingDots />
                      </div>
                    </div>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <motion.div
                        key={msg.id}
                        layout="position"
                        initial={{
                          opacity: 0,
                          y: 14,
                          scale: 0.98,
                        }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 420, damping: 28 }}
                        className={`flex w-full max-w-full min-w-0 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex min-w-0 max-w-[min(92%,20rem)] sm:max-w-[90%] gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                        >
                          {!isUser && (
                            <span className="mt-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-[10px] text-white [font-family:var(--font-display)]">
                              M
                            </span>
                          )}
                          <div
                            className={`flex min-w-0 max-w-full flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
                          >
                            <span className="px-1 [font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.16em] text-[#8A8A80]">
                              {isUser ? copy.you : copy.care}
                            </span>
                            <div
                              className={
                                isUser
                                  ? "max-w-full rounded-2xl rounded-se-md bg-black px-3.5 py-2.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                                  : "max-w-full rounded-2xl rounded-ss-md border border-[#E8E8E4] bg-white/95 px-3.5 py-2.5 text-[#1a1a1a] shadow-[0_6px_20px_rgba(0,0,0,0.05)] backdrop-blur-sm"
                              }
                            >
                              <p className="whitespace-pre-line break-words [overflow-wrap:anywhere] [font-family:var(--font-body)] text-[13px] sm:text-[13.5px] leading-[1.55]">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                <AnimatePresence>
                  {typing && (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="flex justify-start"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-[10px] text-white [font-family:var(--font-display)]">
                          M
                        </span>
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-1 [font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.16em] text-[#8A8A80]">
                            {copy.care}
                          </span>
                          <div className="rounded-2xl rounded-ss-md border border-[#E8E8E4] bg-white px-4 py-3 shadow-[0_6px_20px_rgba(0,0,0,0.05)]">
                            <TypingDots />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* FAQ support request */}
              <AnimatePresence mode="wait">
                {supportView && !typing && !awaitingName && !trackView && (
                  <motion.div
                    key={supportView === "form" ? "support-form" : "support-success"}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className="shrink-0 max-h-[min(58dvh,28rem)] min-h-0 overflow-x-hidden overflow-y-auto border-t border-[#E8E8E4] bg-white/95 px-2.5 py-3 sm:px-3 sm:py-3.5 backdrop-blur-md"
                    data-lenis-prevent
                    data-lenis-prevent-wheel
                    data-chat-scroll
                  >
                    {supportView === "form" ? (
                      <div className="flex flex-col gap-3">
                        <div>
                          <p
                            className={`[font-family:var(--font-display)] text-[14px] ${
                              isDamageClaim ? "text-red-800" : "text-black"
                            }`}
                          >
                            {isDamageClaim
                              ? copy.damageTitle
                              : copy.supportFormTitle}
                          </p>
                          <p className="mt-1 [font-family:var(--font-body)] text-[12px] leading-relaxed text-[#5A5A56]">
                            {isDamageClaim
                              ? isRegisteredMember
                                ? copy.damageMemberHint
                                : isGuestShopper
                                  ? copy.damageGuestSessionHint
                                  : copy.damageHint
                              : isRegisteredMember
                                ? copy.supportMemberHint
                                : copy.supportGuestHint}
                          </p>
                        </div>

                        {!isDamageClaim ? (
                          <motion.p
                            role="status"
                            initial={{ backgroundColor: "#000000", color: "#FFFFFF" }}
                            animate={{
                              backgroundColor: ["#000000", "#FFFFFF", "#000000"],
                              color: ["#FFFFFF", "#000000", "#FFFFFF"],
                              borderColor: ["#000000", "#000000", "#000000"],
                            }}
                            transition={{
                              duration: 1.4,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="rounded-xl border px-3 py-2.5 [font-family:var(--font-body)] text-[12.5px] font-medium leading-snug"
                          >
                            {copy.supportOrderHint}
                          </motion.p>
                        ) : null}

                        {isRegisteredMember ? (
                          <dl className="space-y-2 rounded-xl border border-[#E8E8E4] bg-[#FFFDF9] px-3 py-3">
                            <div>
                              <dt className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                                {copy.supportName}
                              </dt>
                              <dd className="mt-0.5 break-words [font-family:var(--font-body)] text-[13px] text-black">
                                {formName}
                              </dd>
                            </div>
                            <div>
                              <dt className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                                {copy.supportEmail}
                              </dt>
                              <dd className="mt-0.5 break-words [font-family:var(--font-body)] text-[13px] text-black">
                                {formEmail}
                              </dd>
                            </div>
                          </dl>
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            <label className="flex flex-col gap-1">
                              <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                                {copy.supportName}
                              </span>
                              <input
                                type="text"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                disabled={supportSubmitting}
                                autoComplete="name"
                                placeholder={copy.supportNamePlaceholder}
                                className="rounded-xl border border-[#E8E8E4] bg-white px-3 py-2.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] text-black outline-none placeholder:text-[#8A8A80] focus:border-black disabled:opacity-60"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                                {copy.supportEmail}
                              </span>
                              <input
                                type="email"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                disabled={supportSubmitting}
                                autoComplete="email"
                                placeholder={
                                  isDamageClaim
                                    ? copy.trackEmailPlaceholder
                                    : copy.supportEmailPlaceholder
                                }
                                className="rounded-xl border border-[#E8E8E4] bg-white px-3 py-2.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] text-black outline-none placeholder:text-[#8A8A80] focus:border-black disabled:opacity-60"
                              />
                            </label>
                          </div>
                        )}

                        {isDamageClaim ? (
                          <>
                            <label className="flex flex-col gap-1">
                              <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                                {copy.damageOrderTypeLabel}
                              </span>
                              <select
                                value={formClaimOrderType}
                                onChange={(e) => {
                                  setFormClaimOrderType(
                                    e.target.value as ClaimOrderType,
                                  );
                                  setSupportError("");
                                }}
                                disabled={supportSubmitting}
                                className="rounded-xl border border-red-200 bg-red-50/40 px-3 py-2.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] text-black outline-none focus:border-red-400 disabled:opacity-60"
                              >
                                <option value="">
                                  {copy.damageOrderTypePlaceholder}
                                </option>
                                <option value="custom">
                                  {copy.damageOrderTypeCustom}
                                </option>
                                <option value="retail">
                                  {copy.damageOrderTypeRetail}
                                </option>
                              </select>
                            </label>

                            <label className="flex flex-col gap-1">
                              <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                                {copy.damageKindLabel}
                              </span>
                              <select
                                value={formDamageKind}
                                onChange={(e) => {
                                  setFormDamageKind(e.target.value as DamageKind);
                                  setSupportError("");
                                }}
                                disabled={supportSubmitting}
                                className="rounded-xl border border-red-200 bg-red-50/40 px-3 py-2.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] text-black outline-none focus:border-red-400 disabled:opacity-60"
                              >
                                <option value="">
                                  {copy.damageKindPlaceholder}
                                </option>
                                {DAMAGE_KIND_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {isAr ? opt.ar : opt.en}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="flex flex-col gap-1">
                              <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                                {copy.damageOrderLabel}
                              </span>
                              <input
                                type="text"
                                value={formOrderId}
                                onChange={(e) => {
                                  setFormOrderId(e.target.value);
                                  setFormOrderIdInvalid(false);
                                  setSupportError("");
                                }}
                                disabled={supportSubmitting}
                                autoComplete="off"
                                autoCapitalize="characters"
                                spellCheck={false}
                                aria-invalid={formOrderIdInvalid}
                                placeholder={copy.damageOrderPlaceholder}
                                className={`rounded-xl border bg-red-50/40 px-3 py-2.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] uppercase tracking-wide text-black outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[#8A8A80] disabled:opacity-60 ${
                                  formOrderIdInvalid
                                    ? "border-red-500 focus:border-red-600 ring-1 ring-red-500/30"
                                    : "border-red-200 focus:border-red-400"
                                }`}
                              />
                            </label>
                          </>
                        ) : null}

                        <label className="flex flex-col gap-1">
                          <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                            {isDamageClaim
                              ? copy.damageConcern
                              : copy.supportConcern}
                          </span>
                          <textarea
                            value={formConcern}
                            onChange={(e) => setFormConcern(e.target.value)}
                            disabled={supportSubmitting}
                            rows={4}
                            maxLength={2000}
                            placeholder={
                              isDamageClaim
                                ? copy.damageConcernPlaceholder
                                : copy.supportConcernPlaceholder
                            }
                            className={`resize-y rounded-xl border bg-white px-3 py-2.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] leading-relaxed text-black outline-none placeholder:text-[#8A8A80] disabled:opacity-60 ${
                              isDamageClaim
                                ? "border-red-200 focus:border-red-400"
                                : "border-[#E8E8E4] focus:border-black"
                            }`}
                          />
                        </label>

                        {supportError ? (
                          <p className="[font-family:var(--font-body)] text-[11px] text-red-700">
                            {supportError}
                          </p>
                        ) : null}

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <motion.button
                            type="button"
                            disabled={supportSubmitting}
                            onClick={() => void submitSupportRequest()}
                            whileTap={{ scale: 0.98 }}
                            className={
                              isDamageClaim
                                ? "inline-flex flex-1 items-center justify-center rounded-full border border-red-300 bg-red-600 px-4 py-2.5 [font-family:var(--font-body)] text-[12px] text-white transition hover:bg-red-700 disabled:opacity-50 hover:cursor-pointer"
                                : "inline-flex flex-1 items-center justify-center rounded-full border border-black bg-black px-4 py-2.5 [font-family:var(--font-body)] text-[12px] text-white transition hover:bg-white hover:text-black disabled:opacity-50 hover:cursor-pointer"
                            }
                          >
                            {supportSubmitting ? copy.supportSubmitting : copy.supportSubmit}
                          </motion.button>
                          <button
                            type="button"
                            disabled={supportSubmitting}
                            onClick={backFromSupport}
                            className="inline-flex flex-1 items-center justify-center rounded-full border border-[#E8E8E4] bg-[#FFFDF9] px-4 py-2.5 [font-family:var(--font-body)] text-[12px] text-black transition hover:border-black disabled:opacity-50 hover:cursor-pointer"
                          >
                            {copy.backToTopics}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="[font-family:var(--font-display)] text-[14px] text-black">
                            {copy.supportSuccessTitle}
                          </p>
                          <p className="mt-1 [font-family:var(--font-body)] text-[12px] leading-relaxed text-[#5A5A56]">
                            {isDamageClaim
                              ? copy.damageSuccessBody
                              : copy.supportSuccessBody}
                          </p>
                        </div>
                        {supportRef ? (
                          <div className="rounded-xl border border-[#E8E8E4] bg-[#FFFDF9] px-3 py-3">
                            <p className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                              {copy.supportRefLabel}
                            </p>
                            <p className="mt-1 [font-family:var(--font-ui)] text-[13px] tracking-wide text-black">
                              {supportRef}
                            </p>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={backFromSupport}
                          className="inline-flex items-center justify-center rounded-full border border-black bg-black px-4 py-2.5 [font-family:var(--font-body)] text-[12px] text-white transition hover:bg-white hover:text-black hover:cursor-pointer"
                        >
                          {copy.backToTopics}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Order ID tracking */}
              <AnimatePresence mode="wait">
                {trackView && !typing && !awaitingName && !supportView && (
                  <motion.div
                    key="track-form"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className="shrink-0 max-h-[min(58dvh,28rem)] min-h-0 overflow-x-hidden overflow-y-auto border-t border-[#E8E8E4] bg-white/95 px-2.5 py-3 sm:px-3 sm:py-3.5 backdrop-blur-md"
                    data-lenis-prevent
                    data-lenis-prevent-wheel
                    data-chat-scroll
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="[font-family:var(--font-display)] text-[14px] text-black">
                          {copy.trackTitle}
                        </p>
                        <p className="mt-1 [font-family:var(--font-body)] text-[12px] leading-relaxed text-[#5A5A56]">
                          {isRegisteredMember
                            ? copy.trackHint
                            : copy.trackHintGuest}
                        </p>
                      </div>

                      <label className="flex flex-col gap-1">
                        <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                          {copy.trackLabel}
                        </span>
                        <input
                          ref={trackInputRef}
                          type="text"
                          value={trackOrderId}
                          onChange={(e) => {
                            setTrackOrderId(e.target.value);
                            setTrackError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (isRegisteredMember) {
                                if (canSubmitTrack) void submitTrackOrder();
                              } else {
                                trackEmailInputRef.current?.focus();
                              }
                            }
                          }}
                          disabled={trackSubmitting}
                          autoComplete="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          aria-invalid={Boolean(displayTrackError)}
                          placeholder={copy.trackPlaceholder}
                          className={`rounded-xl border bg-white px-3 py-2.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] uppercase tracking-wide text-black outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[#8A8A80] disabled:opacity-60 ${
                            displayTrackError
                              ? "border-red-500 focus:border-red-600"
                              : "border-[#E8E8E4] focus:border-black"
                          }`}
                        />
                      </label>

                      {!isRegisteredMember ? (
                        <label className="flex flex-col gap-1">
                          <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                            {copy.trackEmailLabel}
                          </span>
                          <input
                            ref={trackEmailInputRef}
                            type="email"
                            value={trackEmail}
                            onChange={(e) => {
                              setTrackEmail(e.target.value);
                              setTrackError("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (canSubmitTrack) void submitTrackOrder();
                              }
                            }}
                            disabled={trackSubmitting}
                            autoComplete="email"
                            inputMode="email"
                            aria-invalid={Boolean(displayTrackError)}
                            placeholder={copy.trackEmailPlaceholder}
                            className={`rounded-xl border bg-white px-3 py-2.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] text-black outline-none placeholder:text-[#8A8A80] disabled:opacity-60 ${
                              displayTrackError
                                ? "border-red-500 focus:border-red-600"
                                : "border-[#E8E8E4] focus:border-black"
                            }`}
                          />
                        </label>
                      ) : null}

                      {displayTrackError ? (
                        <p
                          role="alert"
                          className="[font-family:var(--font-body)] text-[11px] text-red-700"
                        >
                          {displayTrackError}
                        </p>
                      ) : null}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <motion.button
                          type="button"
                          disabled={!canSubmitTrack}
                          onClick={() => void submitTrackOrder()}
                          whileTap={{ scale: 0.98 }}
                          className="inline-flex flex-1 items-center justify-center rounded-full border border-black bg-black px-4 py-2.5 [font-family:var(--font-body)] text-[12px] text-white transition hover:bg-white hover:text-black disabled:opacity-50 hover:cursor-pointer"
                        >
                          {trackSubmitting ? copy.trackSubmitting : copy.trackSubmit}
                        </motion.button>
                        <button
                          type="button"
                          disabled={trackSubmitting}
                          onClick={backFromTrack}
                          className="inline-flex flex-1 items-center justify-center rounded-full border border-[#E8E8E4] bg-[#FFFDF9] px-4 py-2.5 [font-family:var(--font-body)] text-[12px] text-black transition hover:border-black disabled:opacity-50 hover:cursor-pointer"
                        >
                          {copy.backToTopics}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick replies */}
              <AnimatePresence mode="wait">
                {quickReplies && !typing && !awaitingName && !supportView && !trackView && (
                  <motion.div
                    key={
                      quickReplies.kind +
                      ("topicId" in quickReplies ? quickReplies.topicId : "")
                    }
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className={
                      (quickReplies.kind === "questions" && questionsExpanded) ||
                      (quickReplies.kind === "sections" && topicsExpanded)
                        ? "flex min-h-0 max-h-[min(58dvh,26rem)] flex-col overflow-x-hidden border-t border-[#E8E8E4] bg-white/95 px-2.5 py-2 sm:px-3 sm:py-2.5 backdrop-blur-md"
                        : quickReplies.kind === "questions" ||
                            quickReplies.kind === "sections"
                          ? "shrink-0 max-h-[min(28dvh,10rem)] min-h-0 overflow-x-hidden border-t border-[#E8E8E4] bg-white/95 px-2.5 py-2 sm:px-3 sm:py-2.5 backdrop-blur-md"
                          : "shrink-0 max-h-[min(42dvh,16rem)] sm:max-h-[min(44dvh,18rem)] min-h-0 overflow-x-hidden border-t border-[#E8E8E4] bg-white/95 px-2.5 py-2 sm:px-3 sm:py-2.5 backdrop-blur-md"
                    }
                  >
                    {quickReplies.kind === "sections" && (
                      <div className="flex max-h-full min-h-0 w-full flex-col gap-1.5 overflow-x-hidden">
                        <motion.button
                          type="button"
                          disabled={busy}
                          onClick={() => setTopicsExpanded((prev) => !prev)}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          aria-expanded={topicsExpanded}
                          className="flex w-full shrink-0 items-center justify-between gap-2 rounded-xl border border-[#E8E8E4] bg-black px-3 py-3 text-start text-white transition hover:bg-[#1a1a1a] disabled:opacity-50 hover:cursor-pointer touch-manipulation"
                        >
                          <span className="min-w-0 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em]">
                            {topicsExpanded
                              ? copy.showLess
                              : copy.showTopics(CHATBOT_FAQ_SECTIONS.length)}
                          </span>
                          <motion.span
                            animate={{ rotate: topicsExpanded ? 180 : 0 }}
                            transition={{ duration: 0.22, ease: EASE }}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-black"
                          >
                            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </motion.span>
                        </motion.button>

                        <AnimatePresence initial={false}>
                          {topicsExpanded && (
                            <motion.div
                              key="topics-dropdown"
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.22, ease: EASE }}
                              data-lenis-prevent
                              data-lenis-prevent-wheel
                              data-chat-scroll
                              className="max-h-[min(48dvh,20rem)] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
                            >
                              <div className="flex flex-col gap-1.5 pb-1">
                                {CHATBOT_FAQ_SECTIONS.map((section, i) => {
                                  const Icon =
                                    TOPIC_ICONS[
                                      section.id as keyof typeof TOPIC_ICONS
                                    ] ?? Sparkles;
                                  const isDamageTopic =
                                    section.id === CHATBOT_DAMAGE_TOPIC_ID;
                                  return (
                                    <motion.button
                                      key={section.id}
                                      type="button"
                                      custom={i}
                                      variants={chipVariants}
                                      initial="hidden"
                                      animate="show"
                                      disabled={busy}
                                      onClick={() => selectSection(section.id)}
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.98 }}
                                      className={
                                        isDamageTopic
                                          ? "group flex w-full min-w-0 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 sm:py-2.5 text-start text-red-900 transition-colors hover:border-red-300 hover:bg-red-100 disabled:opacity-50 hover:cursor-pointer touch-manipulation"
                                          : "group flex w-full min-w-0 items-center gap-3 rounded-xl border border-[#E8E8E4] bg-[#FFFDF9] px-3 py-3 sm:py-2.5 text-start transition-colors hover:border-black hover:bg-black hover:text-white disabled:opacity-50 hover:cursor-pointer touch-manipulation"
                                      }
                                    >
                                      <span
                                        className={
                                          isDamageTopic
                                            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-200 text-red-800"
                                            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white transition-colors group-hover:bg-white group-hover:text-black"
                                        }
                                      >
                                        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                                      </span>
                                      <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] [font-family:var(--font-body)] text-[12.5px] leading-snug">
                                        {isAr ? section.titleAr : section.titleEn}
                                      </span>
                                    </motion.button>
                                  );
                                })}
                                  {showTalkToAgent ? (
                                  <motion.button
                                    type="button"
                                    custom={CHATBOT_FAQ_SECTIONS.length}
                                    variants={chipVariants}
                                    initial="hidden"
                                    animate="show"
                                    disabled={busy || liveChatOpen}
                                    onClick={() => void openLiveChat()}
                                    whileTap={{ scale: 0.99 }}
                                    className="group flex w-full min-w-0 items-center gap-3 rounded-xl border border-black bg-black px-3 py-3 sm:py-2.5 text-start text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50 hover:cursor-pointer touch-manipulation"
                                  >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black">
                                      <Headset className="h-3.5 w-3.5" strokeWidth={1.5} />
                                    </span>
                                    <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] [font-family:var(--font-body)] text-[12.5px] leading-snug">
                                      {copy.talkToAgent}
                                    </span>
                                  </motion.button>
                                ) : null}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {quickReplies.kind === "questions" && (() => {
                      const allQuestions = sectionQuestions(quickReplies.topicId);
                      const count = allQuestions.length;

                      return (
                        <div className="flex max-h-full min-h-0 w-full flex-col gap-1.5 overflow-x-hidden">
                          <motion.button
                            type="button"
                            disabled={busy || count === 0}
                            onClick={() => setQuestionsExpanded((prev) => !prev)}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            aria-expanded={questionsExpanded}
                            className="flex w-full shrink-0 items-center justify-between gap-2 rounded-xl border border-[#E8E8E4] bg-black px-3 py-3 text-start text-white transition hover:bg-[#1a1a1a] disabled:opacity-50 hover:cursor-pointer touch-manipulation"
                          >
                            <span className="min-w-0 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em]">
                              {questionsExpanded
                                ? copy.showLess
                                : copy.showMore(count)}
                            </span>
                            <motion.span
                              animate={{ rotate: questionsExpanded ? 180 : 0 }}
                              transition={{ duration: 0.22, ease: EASE }}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-black"
                            >
                              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </motion.span>
                          </motion.button>

                          <AnimatePresence initial={false}>
                            {questionsExpanded && (
                              <motion.div
                                key="questions-dropdown"
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.22, ease: EASE }}
                                data-lenis-prevent
                                data-lenis-prevent-wheel
                                data-chat-scroll
                                className="max-h-[min(48dvh,20rem)] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
                              >
                                <div className="flex flex-col gap-1.5 pb-1">
                                  {allQuestions.map((faq, i) => (
                                    <motion.button
                                      key={faq.id}
                                      type="button"
                                      custom={Math.min(i, 8)}
                                      variants={chipVariants}
                                      initial="hidden"
                                      animate="show"
                                      disabled={busy}
                                      onClick={() => selectQuestion(faq)}
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.985 }}
                                      className="w-full min-w-0 rounded-xl border border-[#E8E8E4] bg-[#FFFDF9] px-3 py-3 sm:py-2.5 text-start [font-family:var(--font-body)] text-[12px] sm:text-[12.5px] leading-snug text-black break-words [overflow-wrap:anywhere] transition-colors hover:border-black hover:bg-black hover:text-white disabled:opacity-50 hover:cursor-pointer touch-manipulation"
                                    >
                                      {isAr ? faq.questionAr : faq.questionEn}
                                    </motion.button>
                                  ))}
                                  {showTalkToAgent ? (
                                    <motion.button
                                      type="button"
                                      custom={Math.min(allQuestions.length, 8)}
                                      variants={chipVariants}
                                      initial="hidden"
                                      animate="show"
                                      disabled={busy || liveChatOpen}
                                      onClick={() => void openLiveChat()}
                                      whileTap={{ scale: 0.99 }}
                                      className="group flex w-full min-w-0 items-center gap-3 rounded-xl border border-black bg-black px-3 py-3 sm:py-2.5 text-start text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50 hover:cursor-pointer touch-manipulation"
                                    >
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black">
                                        <Headset className="h-3.5 w-3.5" strokeWidth={1.5} />
                                      </span>
                                      <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] [font-family:var(--font-body)] text-[12.5px] leading-snug">
                                        {copy.talkToAgent}
                                      </span>
                                    </motion.button>
                                  ) : null}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <motion.button
                            type="button"
                            disabled={busy}
                            onClick={showSectionsAgain}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2 py-1 [font-family:var(--font-ui)] text-[10px] uppercase tracking-wider text-[#8A8A80] transition hover:text-black disabled:opacity-50 hover:cursor-pointer"
                          >
                            <LayoutGrid className="h-3 w-3" strokeWidth={1.5} />
                            {copy.otherTopics}
                          </motion.button>
                        </div>
                      );
                    })()}

                    {quickReplies.kind === "afterAnswer" && (
                      <div className="flex min-w-0 flex-col gap-2.5 overflow-x-hidden">
                        <p className="[font-family:var(--font-body)] text-[12px] text-[#5A5A56]">
                          {copy.moreInTopic(displayName || undefined)}
                        </p>
                        <div className="flex min-w-0 flex-wrap gap-1.5">
                          {[
                            {
                              key: "again",
                              label: copy.askAnother,
                              icon: RotateCcw,
                              onClick: () => showQuestionsAgain(quickReplies.topicId),
                              primary: false,
                            },
                            {
                              key: "topics",
                              label: copy.otherTopics,
                              icon: LayoutGrid,
                              onClick: showSectionsAgain,
                              primary: false,
                            },
                            {
                              key: "contact",
                              label: copy.contact,
                              icon: Mail,
                              onClick: showContact,
                              primary: false,
                            },
                            ...(showTalkToAgent
                              ? [
                                  {
                                    key: "agent",
                                    label: copy.talkToAgent,
                                    icon: Headset,
                                    onClick: () => void openLiveChat(),
                                    primary: true,
                                  },
                                ]
                              : []),
                          ].map((action, i) => {
                            const Icon = action.icon;
                            return (
                              <motion.button
                                key={action.key}
                                type="button"
                                custom={i}
                                variants={chipVariants}
                                initial="hidden"
                                animate="show"
                                disabled={busy || (action.key === "agent" && liveChatOpen)}
                                onClick={action.onClick}
                                whileTap={
                                  action.key === "agent"
                                    ? { scale: 0.99 }
                                    : { scale: 0.97 }
                                }
                                className={
                                  action.key === "agent"
                                    ? "inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border border-black bg-black px-3.5 py-2.5 text-center [font-family:var(--font-body)] text-[12px] leading-snug text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50 hover:cursor-pointer touch-manipulation"
                                    : action.primary
                                      ? "inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-3.5 py-2 [font-family:var(--font-body)] text-[12px] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50 hover:cursor-pointer"
                                      : "inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E4] bg-[#FFFDF9] px-3.5 py-2 [font-family:var(--font-body)] text-[12px] text-black transition-colors hover:border-black hover:bg-black hover:text-white disabled:opacity-50 hover:cursor-pointer"
                                }
                              >
                                <Icon className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                  {action.label}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Name input only — FAQ browsing uses topics/questions; live agent has its own composer. */}
              {!supportView && !trackView && !liveChatOpen && awaitingName ? (
              <form
                onSubmit={handleSend}
                className="shrink-0 overflow-x-hidden border-t border-[#E8E8E4] bg-white px-2.5 py-2 sm:px-3 sm:py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:pb-2.5"
              >
                <p className="mb-2 px-1 [font-family:var(--font-body)] text-[11px] text-[#8A8A80]">
                  {copy.nameHint}
                </p>
                <div className="flex min-w-0 w-full items-center gap-2 rounded-full border border-[#E8E8E4] bg-[#FFFDF9] px-2.5 py-1 sm:px-3 sm:py-1.5 transition focus-within:border-black">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={busy}
                    placeholder={copy.namePlaceholder}
                    aria-label={copy.namePlaceholder}
                    enterKeyHint="send"
                    autoComplete="given-name"
                    onFocus={() => {
                      // iOS often finishes keyboard animation after focus; re-sync
                      // and keep the composer visible above the keypad.
                      window.setTimeout(() => {
                        syncMobileViewportRef.current?.();
                        threadRef.current?.scrollTo({
                          top: threadRef.current.scrollHeight,
                          behavior: "smooth",
                        });
                      }, 350);
                    }}
                    className="min-w-0 w-full flex-1 bg-transparent py-2 sm:py-1.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] text-black outline-none placeholder:text-[#8A8A80] disabled:opacity-60"
                  />
                  <motion.button
                    type="submit"
                    disabled={busy || !draft.trim()}
                    aria-label={copy.send}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition disabled:opacity-35 hover:cursor-pointer disabled:hover:cursor-not-allowed touch-manipulation"
                  >
                    <Send className={`h-3.5 w-3.5 ${isAr ? "-scale-x-100" : ""}`} strokeWidth={1.75} />
                  </motion.button>
                </div>
              </form>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
