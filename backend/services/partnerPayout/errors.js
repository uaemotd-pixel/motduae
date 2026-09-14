export class PartnerPayoutError extends Error {
  constructor(message, status = 400, code = "PAYOUT_ERROR") {
    super(message);
    this.name = "PartnerPayoutError";
    this.status = status;
    this.code = code;
  }
}

export function isReplicaSetRequiredError(err) {
  const msg = String(err?.message || "");
  return (
    err?.code === 20 ||
    /Transaction numbers are only allowed on a replica set/i.test(msg) ||
    /replica set member or mongos/i.test(msg)
  );
}
