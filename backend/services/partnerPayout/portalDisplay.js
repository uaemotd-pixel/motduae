function roundAed(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function addFils(map, orderId, amountFils) {
  map.set(orderId, (map.get(orderId) || 0) + amountFils);
}

function filsMapToAed(filsMap, toAed) {
  const aedMap = new Map();
  for (const [orderId, fils] of filsMap) {
    aedMap.set(orderId, toAed(fils));
  }
  return aedMap;
}

/**
 * Fold payout batches + lines into completed vs processing per order.
 * Pure: no Mongo. `toAed` converts integer fils to AED.
 */
export function foldPayoutTotals(batches = [], lines = [], toAed) {
  const statusByPayoutId = new Map();
  for (const batch of batches) {
    statusByPayoutId.set(String(batch._id), batch.status);
  }

  const linesByPayout = new Map();
  const paidByOrderFils = new Map();
  const processingByOrderFils = new Map();

  for (const line of lines) {
    const payoutKey = String(line.payoutId);
    if (!linesByPayout.has(payoutKey)) linesByPayout.set(payoutKey, []);
    linesByPayout.get(payoutKey).push(line);

    const orderId = String(line.orderId || "");
    if (!orderId) continue;

    const amount = Number(line.amountFils) || 0;
    const status = statusByPayoutId.get(payoutKey);
    if (status === "completed") addFils(paidByOrderFils, orderId, amount);
    else if (status === "processing") {
      addFils(processingByOrderFils, orderId, amount);
    }
  }

  let paidTotalFils = 0;
  for (const batch of batches) {
    if (batch.status === "completed") {
      paidTotalFils += Number(batch.amountFils) || 0;
    }
  }

  const releases = batches.map((batch) => {
    const payoutLines = linesByPayout.get(String(batch._id)) || [];
    return {
      _id: batch._id,
      amount: toAed(batch.amountFils),
      currency: batch.currency || "AED",
      orderCount: payoutLines.length,
      orders: payoutLines.map((line) => ({
        orderId: String(line.orderId),
        orderType: line.orderType,
        amount: toAed(line.amountFils),
      })),
      releasedAt: batch.releasedAt,
      note: batch.note || "",
      status: batch.status,
    };
  });

  return {
    paidTotal: toAed(paidTotalFils),
    paidByOrderId: filsMapToAed(paidByOrderFils, toAed),
    processingByOrderId: filsMapToAed(processingByOrderFils, toAed),
    releases,
  };
}

/**
 * Clamp completed / processing slices against an order's partner net (AED).
 * Paid never includes in-progress money.
 */
export function allocateOrderPayout({ net = 0, paid = 0, processing = 0 } = {}) {
  const netAed = Math.max(0, roundAed(net));
  const paidClamped = Math.min(Math.max(0, roundAed(paid)), netAed);
  const processingClamped = Math.min(
    Math.max(0, roundAed(processing)),
    roundAed(netAed - paidClamped),
  );
  const pending = roundAed(netAed - paidClamped - processingClamped);

  let paymentStatus = "pending_payment";
  if (netAed <= 0) {
    paymentStatus = "pending";
  } else if (pending <= 0 && processingClamped <= 0 && paidClamped > 0) {
    paymentStatus = "paid";
  } else if (pending <= 0 && paidClamped <= 0 && processingClamped > 0) {
    paymentStatus = "processing";
  } else if (paidClamped <= 0 && processingClamped <= 0) {
    paymentStatus = "pending_payment";
  } else {
    paymentStatus = "partially_paid";
  }

  return {
    paid: paidClamped,
    processing: processingClamped,
    pending,
    paymentStatus,
  };
}

export function payoutFromSettlement(orderId, net, settlement) {
  const id = String(orderId || "");
  const paid = Number(settlement?.paidByOrderId?.get?.(id)) || 0;
  const processing = Number(settlement?.processingByOrderId?.get?.(id)) || 0;
  return allocateOrderPayout({ net, paid, processing });
}

export function payoutWindowStatus({ net = 0, pending = 0, processing = 0 } = {}) {
  if (net <= 0) return null;
  if (pending > 0) return "pending";
  if (processing > 0) return "processing";
  return "approved";
}

export function serializePortalReleases(releases) {
  return (releases || []).map((row) => ({
    _id: row._id,
    amount: row.amountAed,
    currency: row.currency || "AED",
    orderCount: Array.isArray(row.orders) ? row.orders.length : 0,
    orders: row.orders || [],
    releasedAt: row.releasedAt,
    note: row.note || "",
    status: row.status,
    bankRef: row.bankRef || "",
  }));
}
