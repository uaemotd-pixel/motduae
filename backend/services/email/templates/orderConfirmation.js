import { bodyText, ctaButton, escapeHtml, emailTheme, renderLayout } from "./layout.js";
import { env } from "../../../config/env.js";

const getAbsoluteUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const baseUrl = env.frontendUrl || "https://uaemotd.ae";
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

export function orderConfirmationTemplate({ order, user }) {
  const locale = order.locale || "en";
  const isAr = locale === "ar";
  const isCustom = order.orderItems === undefined; // CustomOrder has items, RetailOrder has orderItems

  // Translations
  const t = {
    subject: isAr ? `تأكيد الطلب #${order._id}` : `Order Confirmation #${order._id}`,
    headerTitle: isAr ? "تم تأكيد طلبك" : "Your order is confirmed",
    hello: isAr ? `مرحباً ${user.name || "عميلنا العزيز"}،` : `Hello ${user.name || "Customer"},`,
    intro: isAr 
      ? "شكراً لتسوقك معنا. لقد تم استلام دفعتك وتأكيد طلبك بنجاح. إليك تفاصيل طلبك:" 
      : "Thank you for shopping with us. Your payment has been received and your order is confirmed. Here are your order details:",
    itemHeader: isAr ? "الأصناف" : "Items",
    summaryHeader: isAr ? "الملخص" : "Summary",
    subtotal: isAr ? "المجموع الفرعي" : "Subtotal",
    vat: isAr ? `ضريبة القيمة المضافة (${((order.vatRate || 0.05) * 100).toFixed(0)}%)` : `VAT (${((order.vatRate || order.pricing?.vatRate || 0.05) * 100).toFixed(0)}%)`,
    shipping: isAr ? "الشحن والتوصيل" : "Shipping & Delivery",
    total: isAr ? "الإجمالي" : "Total",
    deliveredTo: isAr ? "عنوان التوصيل" : "Delivered To",
    viewOrder: isAr ? "عرض تفاصيل الطلب" : "View Order Details",
    size: isAr ? "المقاس:" : "Size:",
    meters: isAr ? "أمتار:" : "Meters:",
    addons: isAr ? "الإضافات:" : "Add-ons:",
  };

  const subject = t.subject;

  // Build items html list
  let itemsHtml = "";
  const itemsList = isCustom ? (order.items || []) : (order.orderItems || []);

  itemsList.forEach((item) => {
    let name = "";
    let subDetail = "";
    let imageUrl = "";

    if (isCustom) {
      // Custom Order Item
      name = isAr 
        ? `${item.designSnapshot?.nameAr || item.designSnapshot?.name || "تصميم مخصص"} × ${item.fabricSnapshot?.nameAr || item.fabricSnapshot?.name || "قماش مخصص"}`
        : `${item.designSnapshot?.name || "Custom Design"} × ${item.fabricSnapshot?.name || "Custom Fabric"}`;
      
      subDetail = `${t.meters} ${item.fabricMeters || 0}m`;
      
      const designImage = item.designSnapshot?.thumbnailImage || item.designSnapshot?.image;
      const fabricImage = item.fabricSnapshot?.thumbnailImage || item.fabricSnapshot?.image;
      imageUrl = designImage || fabricImage || "";
    } else {
      // Retail Order Item
      name = isAr ? (item.nameAr || item.name) : item.name;
      subDetail = `${t.size} ${item.size}`;
      imageUrl = item.image || "";
    }

    const absImg = getAbsoluteUrl(imageUrl);
    const formattedPrice = `AED ${(item.price * item.quantity).toFixed(2)}`;
    const qtyText = isAr ? `الكمية: ${item.quantity}` : `Qty: ${item.quantity}`;

    itemsHtml += `
      <tr style="border-bottom: 1px solid ${emailTheme.border};">
        <td style="padding: 12px 0; vertical-align: middle;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              ${absImg ? `
              <td width="60" style="padding-right: 12px; vertical-align: middle;">
                <img src="${absImg}" width="50" height="50" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; display: block; border: 1px solid ${emailTheme.border};" alt="${escapeHtml(name)}" />
              </td>
              ` : ""}
              <td style="vertical-align: middle; text-align: ${isAr ? "right" : "left"};">
                <span style="font-family: ${emailTheme.fontBody}; font-size: 14px; font-weight: 500; color: ${emailTheme.nearBlack}; display: block;">${escapeHtml(name)}</span>
                <span style="font-family: ${emailTheme.fontBody}; font-size: 12px; color: ${emailTheme.muted}; display: block; margin-top: 2px;">${escapeHtml(subDetail)} | ${qtyText}</span>
              </td>
            </tr>
          </table>
        </td>
        <td style="padding: 12px 0; font-family: ${emailTheme.fontBody}; font-size: 14px; color: ${emailTheme.nearBlack}; text-align: ${isAr ? "left" : "right"}; vertical-align: middle; font-weight: 500;">
          ${formattedPrice}
        </td>
      </tr>
    `;
  });

  // Invoice calculations
  const subtotalVal = isCustom ? (order.pricing?.subtotal || 0) : (order.itemsPrice || 0);
  const vatVal = isCustom ? (order.pricing?.vatAmount || 0) : (order.vatAmount || 0);
  const shippingVal = isCustom ? (order.pricing?.deliveryFee || 0) : (order.shippingPrice || 0);
  const totalVal = isCustom ? (order.pricing?.total || 0) : (order.totalPrice || 0);

  // Address
  const addr = isCustom ? order.customerDeliveryAddress : order.shippingAddress;
  let addrHtml = "";
  if (addr) {
    const emirateLabel = isAr ? (addr.emirateAr || addr.emirate) : (addr.emirateEn || addr.emirate);
    addrHtml = `
      <div style="background-color: ${emailTheme.pageBg}; border: 1px solid ${emailTheme.border}; padding: 16px; margin-top: 20px; border-radius: 4px; text-align: ${isAr ? "right" : "left"};">
        <h4 style="margin: 0 0 8px 0; font-family: ${emailTheme.fontBody}; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; color: ${emailTheme.nearBlack};">${t.deliveredTo}</h4>
        <p style="margin: 0; font-family: ${emailTheme.fontBody}; font-size: 14px; line-height: 1.5; color: ${emailTheme.muted};">
          <strong>${escapeHtml(addr.fullName)}</strong><br/>
          ${escapeHtml(addr.line1 || addr.street)}${addr.building ? `, ${escapeHtml(addr.building)}` : ""}<br/>
          ${escapeHtml(addr.city)}, ${escapeHtml(emirateLabel)}<br/>
          ${escapeHtml(addr.phone)}
        </p>
      </div>
    `;
  }

  const ctaUrl = `${env.frontendUrl || "https://uaemotd.ae"}/${locale}/account/orders`;

  const bodyHtml = `
    ${bodyText({ html: t.hello, color: emailTheme.nearBlack, margin: "0 0 8px 0" })}
    ${bodyText({ html: t.intro, color: emailTheme.muted, margin: "0 0 24px 0" })}

    <h3 style="font-family: ${emailTheme.fontDisplay}; font-size: 18px; font-weight: normal; margin: 24px 0 12px 0; color: ${emailTheme.nearBlack}; text-align: ${isAr ? "right" : "left"}; border-bottom: 2px solid ${emailTheme.nearBlack}; padding-bottom: 8px;">
      ${t.itemHeader}
    </h3>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
      ${itemsHtml}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin-top: 24px;">
      <tr>
        <td style="padding: 6px 0; font-family: ${emailTheme.fontBody}; font-size: 14px; color: ${emailTheme.muted}; text-align: ${isAr ? "right" : "left"};">${t.subtotal}</td>
        <td style="padding: 6px 0; font-family: ${emailTheme.fontBody}; font-size: 14px; color: ${emailTheme.nearBlack}; text-align: ${isAr ? "left" : "right"};">AED ${subtotalVal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-family: ${emailTheme.fontBody}; font-size: 14px; color: ${emailTheme.muted}; text-align: ${isAr ? "right" : "left"};">${t.shipping}</td>
        <td style="padding: 6px 0; font-family: ${emailTheme.fontBody}; font-size: 14px; color: ${emailTheme.nearBlack}; text-align: ${isAr ? "left" : "right"};">AED ${shippingVal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-family: ${emailTheme.fontBody}; font-size: 14px; color: ${emailTheme.muted}; text-align: ${isAr ? "right" : "left"};">${t.vat}</td>
        <td style="padding: 6px 0; font-family: ${emailTheme.fontBody}; font-size: 14px; color: ${emailTheme.nearBlack}; text-align: ${isAr ? "left" : "right"};">AED ${vatVal.toFixed(2)}</td>
      </tr>
      <tr style="border-top: 1px solid ${emailTheme.border}; font-weight: bold;">
        <td style="padding: 12px 0 0 0; font-family: ${emailTheme.fontBody}; font-size: 16px; color: ${emailTheme.nearBlack}; text-align: ${isAr ? "right" : "left"};">${t.total}</td>
        <td style="padding: 12px 0 0 0; font-family: ${emailTheme.fontBody}; font-size: 16px; color: ${emailTheme.nearBlack}; text-align: ${isAr ? "left" : "right"};">AED ${totalVal.toFixed(2)}</td>
      </tr>
    </table>

    ${addrHtml}

    ${ctaButton({ href: ctaUrl, label: t.viewOrder })}
  `;

  // Text fallback
  const textItems = itemsList.map((item) => {
    const name = isCustom 
      ? `${item.designSnapshot?.name || "Custom"} × ${item.fabricSnapshot?.name || "Fabric"}`
      : item.name;
    const qty = item.quantity;
    const price = (item.price * item.quantity).toFixed(2);
    return `- ${name} (Qty: ${qty}) - AED ${price}`;
  }).join("\n");

  const text = `
${t.headerTitle}
=======================================
${t.hello}

${t.intro}

${textItems}

---------------------------------------
${t.subtotal}: AED ${subtotalVal.toFixed(2)}
${t.shipping}: AED ${shippingVal.toFixed(2)}
${t.vat}: AED ${vatVal.toFixed(2)}
${t.total}: AED ${totalVal.toFixed(2)}

${t.viewOrder}: ${ctaUrl}
  `.trim();

  return {
    subject,
    text,
    html: renderLayout({ title: t.headerTitle, bodyHtml, locale }),
  };
}
