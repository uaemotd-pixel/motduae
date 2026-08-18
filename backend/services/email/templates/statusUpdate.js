import { bodyText, ctaButton, escapeHtml, emailTheme, renderLayout } from "./layout.js";
import { env } from "../../../config/env.js";

const STATUS_MESSAGES = {
  confirmed: {
    en: {
      title: "Order Confirmed",
      desc: "We have received your payment and are preparing your order.",
    },
    ar: {
      title: "تم تأكيد الطلب",
      desc: "تم استلام الدفعة بنجاح وجاري البدء في تجهيز طلبك.",
    },
  },
  fabric_delivered: {
    en: {
      title: "Fabric Delivered",
      desc: "The fabric has been successfully delivered to our tailoring atelier.",
    },
    ar: {
      title: "تم تسليم القماش",
      desc: "تم تسليم القماش بنجاح إلى مشغل الخياطة الخاص بنا.",
    },
  },
  at_tailor: {
    en: {
      title: "At Tailor",
      desc: "Your order is now with the master tailor for review and preparation.",
    },
    ar: {
      title: "عند الخياط",
      desc: "طلبك الآن لدى خبير الخياطة للمراجعة والتحضير.",
    },
  },
  in_production: {
    en: {
      title: "In Production",
      desc: "Your custom Mukhawar is being crafted with precision and care.",
    },
    ar: {
      title: "قيد التنفيذ والإنتاج",
      desc: "يجري الآن تفصيل وتطريز المخور الخاص بك بكل دقة وعناية.",
    },
  },
  ready: {
    en: {
      title: "Order Ready",
      desc: "Your order is complete and is being packaged for courier pickup.",
    },
    ar: {
      title: "الطلب جاهز",
      desc: "تم الانتهاء من طلبك وجاري تغليفه وتسليمه لشركة التوصيل.",
    },
  },
  shipped: {
    en: {
      title: "Shipped",
      desc: "Your package has been shipped and is on its way to your destination.",
    },
    ar: {
      title: "تم الشحن",
      desc: "تم شحن طلبك بنجاح وهو الآن في طريقه إليك.",
    },
  },
  out_for_delivery: {
    en: {
      title: "Out for Delivery",
      desc: "Your order is out for delivery and will reach you today.",
    },
    ar: {
      title: "خارج للتوصيل",
      desc: "طلبك مع مندوب التوصيل وسيكون لديك اليوم.",
    },
  },
  delivered: {
    en: {
      title: "Order Delivered",
      desc: "Your package has been delivered successfully. Enjoy your beautiful Mukhawar!",
    },
    ar: {
      title: "تم التوصيل والاستلام",
      desc: "تم توصيل طلبك بنجاح. نتمنى أن ينال المخور إعجابك!",
    },
  },
  cancelled: {
    en: {
      title: "Order Cancelled",
      desc: "Your order has been cancelled.",
    },
    ar: {
      title: "تم إلغاء الطلب",
      desc: "تم إلغاء الطلب الخاص بك.",
    },
  },
  return_requested: {
    en: {
      title: "Return Requested",
      desc: "We have received your return request and are currently reviewing it.",
    },
    ar: {
      title: "تم تقديم طلب إرجاع",
      desc: "تلقينا طلب الإرجاع الخاص بك وجاري مراجعته حالياً.",
    },
  },
  return_approved: {
    en: {
      title: "Return Approved",
      desc: "Your return request has been approved. We will arrange the pickup/refund.",
    },
    ar: {
      title: "تمت الموافقة على الإرجاع",
      desc: "تمت الموافقة على طلب الإرجاع الخاص بك. سنقوم بترتيب استلام الشحنة والاسترداد.",
    },
  },
  return_rejected: {
    en: {
      title: "Return Rejected",
      desc: "Your return request was not approved. Please contact customer support for details.",
    },
    ar: {
      title: "تم رفض طلب الإرجاع",
      desc: "لم تتم الموافقة على طلب الإرجاع الخاص بك. يرجى التواصل مع الدعم الفني لمزيد من التفاصيل.",
    },
  },
  refund_processed: {
    en: {
      title: "Refund Processed",
      desc: "Your refund has been processed successfully. Please allow 3-5 business days for it to reflect.",
    },
    ar: {
      title: "تم استرداد المبلغ",
      desc: "تمت معالجة استرداد المبلغ الخاص بك بنجاح. قد يستغرق الأمر من 3 إلى 5 أيام عمل للظهور في حسابك.",
    },
  },
};

export function statusUpdateTemplate({ order, status }) {
  const locale = order.locale || "en";
  const isAr = locale === "ar";
  
  const config = STATUS_MESSAGES[status] || {
    en: { title: "Order Update", desc: `Your order status has changed to ${status.replace(/_/g, " ")}.` },
    ar: { title: "تحديث على الطلب", desc: `تغيرت حالة طلبك إلى ${status}.` },
  };

  const currentMsg = isAr ? config.ar : config.en;

  const t = {
    subject: isAr 
      ? `تحديث الطلب #${order._id}: ${currentMsg.title}` 
      : `Order #${order._id} Update: ${currentMsg.title}`,
    hello: isAr ? "مرحباً عميلنا العزيز،" : "Hello Customer,",
    intro: isAr 
      ? `نود إعلامك بحدوث تحديث جديد لحالة طلبك رقم #${order._id}:` 
      : `We wanted to let you know that there is an update to your order #${order._id}:`,
    statusLabel: isAr ? "الحالة الحالية" : "Current Status",
    ctaLabel: isAr ? "تتبع حالة الطلب" : "Track Order Status",
  };

  const subject = t.subject;
  const ctaUrl = `${env.frontendUrl || "https://uaemotd.ae"}/${locale}/account/orders`;

  const bodyHtml = `
    ${bodyText({ html: t.hello, color: emailTheme.nearBlack, margin: "0 0 8px 0" })}
    ${bodyText({ html: t.intro, color: emailTheme.muted, margin: "0 0 24px 0" })}

    <div style="background-color: ${emailTheme.pageBg}; border: 1px solid ${emailTheme.border}; border-left: 4px solid ${emailTheme.ink}; padding: 20px; border-radius: 4px; text-align: ${isAr ? "right" : "left"}; margin-bottom: 24px;">
      <span style="font-family: ${emailTheme.fontBody}; font-size: 11px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: ${emailTheme.muted}; display: block; margin-bottom: 6px;">
        ${t.statusLabel}
      </span>
      <h3 style="font-family: ${emailTheme.fontDisplay}; font-size: 20px; font-weight: normal; margin: 0 0 8px 0; color: ${emailTheme.nearBlack};">
        ${escapeHtml(currentMsg.title)}
      </h3>
      <p style="font-family: ${emailTheme.fontBody}; font-size: 14px; line-height: 1.6; color: ${emailTheme.muted}; margin: 0;">
        ${escapeHtml(currentMsg.desc)}
      </p>
    </div>

    ${ctaButton({ href: ctaUrl, label: t.ctaLabel })}
  `;

  const text = `
${t.subject}
=======================================
${t.hello}

${t.intro}

${t.statusLabel}: ${currentMsg.title}
${currentMsg.desc}

---------------------------------------
${t.ctaLabel}: ${ctaUrl}
  `.trim();

  return {
    subject,
    text,
    html: renderLayout({ title: currentMsg.title, bodyHtml, locale }),
  };
}
