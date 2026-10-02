"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
  HelpCircle,
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
} from "lucide-react";
import {
  FAQ_ITEMS,
  CHATBOT_FAQ_SECTIONS,
  type FAQItem,
} from "@/data/motdFaqs";
import { useAuth } from "@/context/AuthContext";
import { api, getApiErrorMessage } from "@/lib/api/client";

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

function findBestFaq(query: string, isAr: boolean): FAQItem | null {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;

  const tokens = q.split(/\s+/).filter((t) => t.length > 2);
  let best: FAQItem | null = null;
  let bestScore = 0;

  for (const item of FAQ_ITEMS) {
    const question = (isAr ? item.questionAr : item.questionEn).toLowerCase();
    const answer = (isAr ? item.answerAr : item.answerEn).toLowerCase();
    let score = 0;

    if (question.includes(q) || q.includes(question)) score += 12;
    for (const token of tokens) {
      if (question.includes(token)) score += 3;
      if (answer.includes(token)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore >= 3 ? best : null;
}

function SupportNotFoundButton({
  label,
  onClick,
  disabled,
  className = "",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-dashed border-[#C8C8C0] bg-[#FFFDF9] px-3 py-2.5 text-center [font-family:var(--font-body)] text-[11.5px] sm:text-[12px] leading-snug text-[#5A5A56] transition hover:border-black hover:text-black disabled:opacity-50 hover:cursor-pointer touch-manipulation ${className}`}
    >
      <HelpCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
      <span className="break-words [overflow-wrap:anywhere]">{label}</span>
    </button>
  );
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
  const [supportRef, setSupportRef] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formConcern, setFormConcern] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportError, setSupportError] = useState("");
  /** Meaningful user exchanges (topic/question/typed). Support CTA unlocks after 2. */
  const [userTurns, setUserTurns] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awaitingNameRef = useRef(false);
  const greetingStartedRef = useRef(false);

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
          `تشرفنا يا ${name}! كيف يمكنني مساعدتك اليوم؟ اختر موضوعاً أو اكتبي سؤالك أدناه.`,
        welcomeNamedMember: (name: string) =>
          `مرحباً بعودتك يا ${name}! يسعدنا مساعدتك. اختر موضوعاً أو اكتبي سؤالك أدناه.`,
        intro: "مرحباً! أهلاً بك في رعاية MOTD.",
        welcome:
          "مرحباً! أنا فريق رعاية MOTD. كيف يمكنني مساعدتك اليوم؟ اختر موضوعاً للبدء، أو اكتبي سؤالك أدناه.",
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
            ? `${name}، لم أجد إجابة دقيقة على ذلك. يمكنك اختيار موضوع أدناه، أو مراسلتنا على care@motd.ae.`
            : "لم أجد إجابة دقيقة على ذلك. يمكنك اختيار موضوع أدناه، أو مراسلتنا على care@motd.ae.",
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
        notFoundLabel: "لم أجد ما أبحث عنه؟ تواصل مع وكيل الدعم",
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
      }
    : {
        title: "MOTD Care",
        online: "ONLINE",
        chooseTopic: "Choose a topic",
        askName: "Before we begin — what's your name?",
        nameHint: "Please type your name below, then press send.",
        welcomeNamed: (name: string) =>
          `Nice to meet you, ${name}! How can I help you today? Pick a topic, or type your question below.`,
        welcomeNamedMember: (name: string) =>
          `Welcome back, ${name}! How can I help you today? Pick a topic, or type your question below.`,
        intro: "Hi! Welcome to MOTD Care.",
        welcome:
          "Hi! I'm with the MOTD Care team. How can I help you today? Pick a topic, or type your question below.",
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
            ? `${name}, I couldn't find an exact answer for that. You can choose a topic below, or email us at care@motd.ae.`
            : "I couldn't find an exact answer for that. You can choose a topic below, or email us at care@motd.ae.",
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
        notFoundLabel: "Did not find what you want? Contact with support agent",
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
  /** Hide on first screen; unlock after ~2 exchanges, or once they've seen an FAQ answer. */
  const showNotFoundCta =
    userTurns >= 2 || quickReplies?.kind === "afterAnswer";

  const bumpUserTurn = useCallback(() => {
    setUserTurns((n) => n + 1);
  }, []);

  const resetSupportState = useCallback(() => {
    setSupportView(null);
    setSupportRef("");
    setFormName("");
    setFormEmail("");
    setFormConcern("");
    setSupportSubmitting(false);
    setSupportError("");
  }, []);

  const openSupportForm = () => {
    if (busy || awaitingNameRef.current || supportSubmitting) return;
    pushUser(copy.notFoundLabel);
    setQuickReplies(null);
    setSupportError("");
    setSupportRef("");
    setFormConcern("");
    setSupportView("form");

    const member = getMemberProfile();
    if (member) {
      setFormName(member.name);
      setFormEmail(member.email);
      return;
    }

    // Guests: empty fields with placeholders only — never pre-fill
    setFormName("");
    setFormEmail("");
  };

  const finishSupportSuccess = (referenceNumber: string) => {
    setSupportRef(referenceNumber);
    setSupportView("success");
    setMessages((prev) => [
      ...prev,
      {
        id: nextId("b"),
        role: "bot",
        text: isAr
          ? `${copy.supportSuccessBody}\n\n${copy.supportRefLabel}: ${referenceNumber}`
          : `${copy.supportSuccessBody}\n\n${copy.supportRefLabel}: ${referenceNumber}`,
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
      const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRx.test(email)) {
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

    const concern = formConcern.trim();
    if (concern.length < 10 || concern.length > 2000) {
      setSupportError(copy.supportInvalidConcern);
      return;
    }

    setSupportSubmitting(true);
    try {
      const data = await api.post<{ success: boolean; referenceNumber: string }>(
        "/api/faq-support/requests",
        { name, email, concern, locale }
      );
      finishSupportSuccess(data.referenceNumber);
    } catch (err) {
      setSupportError(
        getApiErrorMessage(
          err,
          isAr
            ? "تعذر إرسال الطلب. حاولي مرة أخرى أو راسلينا على care@motd.ae."
            : "Could not send your request. Please try again or email care@motd.ae."
        )
      );
    } finally {
      setSupportSubmitting(false);
    }
  };

  const backFromSupport = () => {
    resetSupportState();
    setQuickReplies({ kind: "sections" });
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
    setUserTurns(0);
    resetSupportState();

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
              ? `مرحباً بعودتك يا ${short}! يسعدنا مساعدتك. اختر موضوعاً أو اكتبي سؤالك أدناه.`
              : `Welcome back, ${short}! How can I help you today? Pick a topic, or type your question below.`,
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
  }, [getMemberProfile, isAr, resetSupportState]);

  // Start greeting when chat opens (wait briefly for auth, but never hang)
  useEffect(() => {
    if (!open) {
      greetingStartedRef.current = false;
      return;
    }
    if (greetingStartedRef.current) return;

    if (!authLoading) {
      beginGreeting();
      return;
    }

    const fallback = window.setTimeout(() => {
      beginGreeting();
    }, 700);

    return () => window.clearTimeout(fallback);
  }, [open, authLoading, beginGreeting]);

  const openChat = () => {
    greetingStartedRef.current = false;
    setMessages([]);
    setQuickReplies(null);
    setAwaitingName(false);
    awaitingNameRef.current = false;
    setVisitorName("");
    setDraft("");
    setTyping(false);
    setBusy(false);
    setUserTurns(0);
    resetSupportState();
    setOpen(true);
  };

  const closeChat = () => {
    setOpen(false);
    greetingStartedRef.current = false;
    setUserTurns(0);
    resetSupportState();
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
    bumpUserTurn();
    pushUser(title);
    botReply(
      copy.sectionReply(title, displayName || undefined),
      { kind: "questions", topicId }
    );
  };

  const selectQuestion = (faq: FAQItem) => {
    if (busy || awaitingNameRef.current) return;
    const question = isAr ? faq.questionAr : faq.questionEn;
    const answer = isAr ? faq.answerAr : faq.answerEn;
    bumpUserTurn();
    pushUser(question);
    botReply(answer, { kind: "afterAnswer", topicId: faq.chatTopicId }, 780);
  };

  const showSectionsAgain = () => {
    if (busy || awaitingNameRef.current) return;
    bumpUserTurn();
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
    bumpUserTurn();
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
    bumpUserTurn();
    pushUser(text);

    const match = findBestFaq(text, isAr);
    if (match) {
      const answer = isAr ? match.answerAr : match.answerEn;
      botReply(answer, { kind: "afterAnswer", topicId: match.chatTopicId }, 780);
      return;
    }

    botReply(copy.noMatch(displayName || undefined), { kind: "sections" }, 700);
  };

  const sectionQuestions = (topicId: string) =>
    FAQ_ITEMS.filter((item) => item.chatTopicId === topicId);

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
              className="fixed z-50 flex min-h-0 max-w-[100vw] flex-col overflow-hidden overflow-x-hidden rounded-2xl border border-white/10 bg-[#FFFDF9] shadow-[0_24px_80px_rgba(0,0,0,0.28)] outline-none bottom-[max(0.75rem,var(--safe-bottom))] start-[max(0.75rem,var(--safe-left))] end-[max(0.75rem,var(--safe-right))] w-auto h-[min(88dvh,42rem)] max-h-[calc(100dvh-1.5rem-var(--safe-top)-var(--safe-bottom))] sm:start-auto sm:bottom-[max(1.25rem,var(--safe-bottom))] sm:end-[max(1.25rem,var(--safe-right))] sm:w-[min(100vw-2.5rem,26rem)] sm:max-w-[26rem] sm:h-[min(84dvh,44rem)] md:bottom-[max(1.5rem,var(--safe-bottom))] md:end-[max(1.5rem,var(--safe-right))] md:w-[28rem] md:max-w-[28rem] md:h-[min(82dvh,46rem)]"
            >
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
                {supportView && !typing && !awaitingName && (
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
                          <p className="[font-family:var(--font-display)] text-[14px] text-black">
                            {copy.supportFormTitle}
                          </p>
                          <p className="mt-1 [font-family:var(--font-body)] text-[12px] leading-relaxed text-[#5A5A56]">
                            {isRegisteredMember
                              ? copy.supportMemberHint
                              : copy.supportGuestHint}
                          </p>
                        </div>

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
                                placeholder={copy.supportEmailPlaceholder}
                                className="rounded-xl border border-[#E8E8E4] bg-white px-3 py-2.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] text-black outline-none placeholder:text-[#8A8A80] focus:border-black disabled:opacity-60"
                              />
                            </label>
                          </div>
                        )}

                        <label className="flex flex-col gap-1">
                          <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#8A8A80]">
                            {copy.supportConcern}
                          </span>
                          <textarea
                            value={formConcern}
                            onChange={(e) => setFormConcern(e.target.value)}
                            disabled={supportSubmitting}
                            rows={4}
                            maxLength={2000}
                            placeholder={copy.supportConcernPlaceholder}
                            className="resize-y rounded-xl border border-[#E8E8E4] bg-white px-3 py-2.5 [font-family:var(--font-body)] text-[16px] sm:text-[13px] leading-relaxed text-black outline-none placeholder:text-[#8A8A80] focus:border-black disabled:opacity-60"
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
                            className="inline-flex flex-1 items-center justify-center rounded-full border border-black bg-black px-4 py-2.5 [font-family:var(--font-body)] text-[12px] text-white transition hover:bg-white hover:text-black disabled:opacity-50 hover:cursor-pointer"
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
                            {copy.supportSuccessBody}
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

              {/* Quick replies */}
              <AnimatePresence mode="wait">
                {quickReplies && !typing && !awaitingName && !supportView && (
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
                                      className="group flex w-full min-w-0 items-center gap-3 rounded-xl border border-[#E8E8E4] bg-[#FFFDF9] px-3 py-3 sm:py-2.5 text-start transition-colors hover:border-black hover:bg-black hover:text-white disabled:opacity-50 hover:cursor-pointer touch-manipulation"
                                    >
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white transition-colors group-hover:bg-white group-hover:text-black">
                                        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                                      </span>
                                      <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] [font-family:var(--font-body)] text-[12.5px] leading-snug">
                                        {isAr ? section.titleAr : section.titleEn}
                                      </span>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {showNotFoundCta ? (
                          <SupportNotFoundButton
                            label={copy.notFoundLabel}
                            onClick={openSupportForm}
                            disabled={busy}
                            className="mt-1"
                          />
                        ) : null}
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

                          {showNotFoundCta ? (
                            <SupportNotFoundButton
                              label={copy.notFoundLabel}
                              onClick={openSupportForm}
                              disabled={busy}
                              className="mt-1"
                            />
                          ) : null}
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
                              primary: !showNotFoundCta,
                            },
                            ...(showNotFoundCta
                              ? [
                                  {
                                    key: "notfound",
                                    label: copy.notFoundLabel,
                                    icon: HelpCircle,
                                    onClick: openSupportForm,
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
                                disabled={busy}
                                onClick={action.onClick}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className={
                                  action.key === "notfound"
                                    ? "inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border border-black bg-black px-3.5 py-2.5 text-center [font-family:var(--font-body)] text-[12px] leading-snug text-white transition hover:bg-white hover:text-black disabled:opacity-50 hover:cursor-pointer"
                                    : action.primary
                                      ? "inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-3.5 py-2 [font-family:var(--font-body)] text-[12px] text-white transition hover:bg-white hover:text-black disabled:opacity-50 hover:cursor-pointer"
                                      : "inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E4] bg-[#FFFDF9] px-3.5 py-2 [font-family:var(--font-body)] text-[12px] text-black transition hover:border-black hover:bg-black hover:text-white disabled:opacity-50 hover:cursor-pointer"
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

              {/* Free-text input */}
              {!supportView ? (
              <form
                onSubmit={handleSend}
                className="shrink-0 overflow-x-hidden border-t border-[#E8E8E4] bg-white px-2.5 py-2 sm:px-3 sm:py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:pb-2.5"
              >
                {awaitingName && (
                  <p className="mb-2 px-1 [font-family:var(--font-body)] text-[11px] text-[#8A8A80]">
                    {copy.nameHint}
                  </p>
                )}
                <div className="flex min-w-0 w-full items-center gap-2 rounded-full border border-[#E8E8E4] bg-[#FFFDF9] px-2.5 py-1 sm:px-3 sm:py-1.5 transition focus-within:border-black">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={busy}
                    placeholder={awaitingName ? copy.namePlaceholder : copy.placeholder}
                    aria-label={awaitingName ? copy.namePlaceholder : copy.placeholder}
                    enterKeyHint="send"
                    autoComplete={awaitingName ? "given-name" : "off"}
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
