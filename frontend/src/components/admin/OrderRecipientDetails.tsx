import {
  formatOrderDeliveryLines,
  getOrderDeliveryAddress,
  getOrderRecipientName,
  type OrderDeliveryAddress,
} from "@/lib/orderDelivery";

type OrderRecipientDetailsProps = {
  order: {
    shippingAddress?: OrderDeliveryAddress | null;
    customerDeliveryAddress?: OrderDeliveryAddress | null;
  };
  accountName?: string;
  fallbackName: string;
  locale?: string;
  className?: string;
};

export default function OrderRecipientDetails({
  order,
  accountName,
  fallbackName,
  locale = "en",
  className = "",
}: OrderRecipientDetailsProps) {
  const address = getOrderDeliveryAddress(order);
  const recipientName = getOrderRecipientName(order, accountName, fallbackName);
  const account = String(accountName || "").trim();
  const showOrderedBy =
    Boolean(account) &&
    Boolean(recipientName) &&
    account.toLowerCase() !== recipientName.toLowerCase();
  const lines = formatOrderDeliveryLines(address);
  const phone = String(address?.phone || "").trim();
  const isAr = locale === "ar";

  return (
    <div className={className}>
      <p className="font-medium text-sm text-black">{recipientName}</p>
      {showOrderedBy ? (
        <p className="text-xs text-gray-500 mt-0.5">
          {isAr ? "صاحب الحساب" : "Ordered by"}: {account}
        </p>
      ) : null}
      {phone ? (
        <p className="text-xs text-gray-500 font-mono mt-0.5">{phone}</p>
      ) : null}
      {lines.length > 0 ? (
        <div className="mt-2 text-xs text-gray-600 leading-relaxed space-y-0.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-400">
            {isAr ? "عنوان التسليم" : "Delivery address"}
          </p>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
