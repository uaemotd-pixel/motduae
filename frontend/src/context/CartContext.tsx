"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import {
  addAccountCartItem,
  cartItemToLine,
  clearAccountCart,
  getAccountCart,
  mergeAccountCart,
  removeAccountCartItem,
  setAccountCartQuantity,
  type AccountCart,
} from "@/lib/api/cart";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { broadcastSignedOut } from "@/lib/auth/sessionBroadcast";
import { CART_KEY, CART_OWNER_KEY, clearLocalCartStorage } from "@/lib/cartStorage";
import { isSecureIframeFocused } from "@/lib/secureIframeFocus";
import { buildRetailCheckoutItem } from "@/lib/fabrics";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  quantity: number;
  /** Cut length label for fabric cut lines (e.g. "3.5 m") */
  cutLength?: string;
  itemType?: "fabric" | "readyMade" | "addon";
  // undefined means "unknown / unlimited"
  maxStock?: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (
    item: Omit<CartItem, "quantity" | "maxStock"> & {
      maxStock: number;
      quantity?: number;
    },
  ) => void;
  removeItem: (id: string, options?: { silent?: boolean }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  /** Apply live stock from checkout preview; drops lines with maxStock < 1. */
  syncStockFromPreview: (
    stockByCartId: Array<{ id: string; maxStock: number }>,
  ) => string[];
  /** Drop sold-out / unavailable lines via checkout preview. */
  purgeUnavailableItems: (
    measurementUnit?: string,
  ) => Promise<{
    purgedNames: string[];
    lastError: string | null;
    remainingItems: CartItem[];
  }>;
  /** Re-fetch the signed-in account cart from the server (cross-device sync). */
  refreshFromAccount: () => Promise<void>;
  clearCart: () => void;
  totalItems: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function cartLineId(id: unknown): string {
  if (typeof id === "string") return id.trim();
  if (id == null) return "";
  if (typeof id === "object" && "toString" in id) {
    const text = String(id).trim();
    if (text && text !== "[object Object]") return text;
  }
  return "";
}

function readSize(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function readMaxStock(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : undefined;
}

function readItemType(value: unknown): CartItem["itemType"] {
  return value === "fabric" || value === "readyMade" || value === "addon"
    ? value
    : undefined;
}

function toCartLine(item: {
  id: unknown;
  slug?: unknown;
  name?: unknown;
  image?: unknown;
  price?: unknown;
  size?: unknown;
  quantity?: unknown;
  cutLength?: unknown;
  itemType?: unknown;
  maxStock?: unknown;
}): CartItem | null {
  const id = cartLineId(item.id);
  if (!id) return null;
  const maxStock = readMaxStock(item.maxStock);
  return {
    id,
    slug: typeof item.slug === "string" ? item.slug : "",
    name: typeof item.name === "string" ? item.name : "",
    image: typeof item.image === "string" ? item.image : "",
    price: Number(item.price) || 0,
    size: readSize(item.size),
    quantity: Math.max(1, Number(item.quantity) || 1),
    cutLength: typeof item.cutLength === "string" ? item.cutLength : undefined,
    itemType: readItemType(item.itemType),
    ...(maxStock != null ? { maxStock } : {}),
  };
}

export function isCartAvailabilityError(message: string): boolean {
  return /out of stock|insufficient stock|not available|product not found|not found:/i.test(
    message,
  );
}

function findUnavailableCartItem(
  items: CartItem[],
  message: string,
): CartItem | undefined {
  const normalized = message.toLowerCase();
  const byName = items.find(
    (item) => item.name && normalized.includes(item.name.toLowerCase()),
  );
  if (byName) return byName;

  const idMatches = message.match(/[a-f0-9]{24}/gi) || [];
  for (const productId of idMatches) {
    const match = items.find(
      (item) =>
        item.id === productId || item.id.startsWith(`${productId}::`),
    );
    if (match) return match;
  }

  return undefined;
}

function buildPreviewPayload(items: CartItem[], measurementUnit?: string) {
  return items.map((item) => {
    const built = buildRetailCheckoutItem(item);
    return {
      ...built,
      ...(item.size === "Per Meter" && !built.cutId && measurementUnit
        ? { measurementUnit }
        : {}),
    };
  });
}
function normalizeStoredItems(stored: unknown): CartItem[] {
  if (!Array.isArray(stored)) return [];
  const byId = new Map<string, CartItem>();
  for (const item of stored) {
    const line = item && typeof item === "object" ? toCartLine(item) : null;
    if (!line) continue;
    const previous = byId.get(line.id);
    if (!previous || line.quantity > previous.quantity) byId.set(line.id, line);
  }
  return [...byId.values()];
}

function addQuantity(
  existingQty: number,
  addQty: number,
  maxStock: number | undefined,
): number {
  const next = existingQty + addQty;
  if (maxStock == null || existingQty >= maxStock) return existingQty;
  return Math.min(next, maxStock);
}

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (!stored) return [];
    return normalizeStoredItems(JSON.parse(stored));
  } catch {
    return [];
  }
}

function writeCart(next: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(next));
}

function readOwner(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CART_OWNER_KEY) || "";
}

function writeOwner(userId: string) {
  if (userId) localStorage.setItem(CART_OWNER_KEY, userId);
  else localStorage.removeItem(CART_OWNER_KEY);
}

function clearLocalCart() {
  clearLocalCartStorage();
}

function errorStatus(error: unknown): number {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: unknown }).status);
    return Number.isFinite(status) ? status : 0;
  }
  return 0;
}

const cartMergeByUser = new Map<string, Promise<AccountCart>>();

function mergeAccountCartOnce(
  userId: string,
  items: Parameters<typeof mergeAccountCart>[0],
) {
  const pending = cartMergeByUser.get(userId);
  if (pending) return pending;
  const request = mergeAccountCart(items).finally(() => {
    cartMergeByUser.delete(userId);
  });
  cartMergeByUser.set(userId, request);
  return request;
}

/**
 * Apply a change to the saved cart, not this tab's memory.
 * Another tab may have added lines this tab has never seen.
 */
function commitCart(mutator: (current: CartItem[]) => CartItem[]): CartItem[] {
  const current = readCart();
  const next = mutator(current);
  if (JSON.stringify(next) === JSON.stringify(current)) return current;

  const payload = JSON.stringify(next);
  writeCart(next);
  if (localStorage.getItem(CART_KEY) === payload) return next;

  const retried = mutator(readCart());
  writeCart(retried);
  return retried;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const toastScheduledRef = useRef<string | null>(null);
  const chainRef = useRef(Promise.resolve());
  const generationRef = useRef(0);
  const accountUserIdRef = useRef("");
  /** Last authenticated (non-guest) user id — used to detect logout / switch. */
  const lastAccountUserIdRef = useRef("");

  const realUserId =
    !isLoading && user && !user.isGuest && user.id ? user.id : "";
  accountUserIdRef.current = realUserId;

  const enqueue = (task: () => Promise<void>) => {
    chainRef.current = chainRef.current.then(task).then(
      () => undefined,
      () => undefined,
    );
  };

  const applyAccountCart = (next: unknown, userId: string) => {
    const normalized = normalizeStoredItems(next);
    writeCart(normalized);
    writeOwner(userId);
    setItems((prev) =>
      JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized,
    );
  };

  const wipeAccountLocalCart = () => {
    clearLocalCart();
    writeOwner("");
    setItems([]);
  };

  const dropAccountCartSync = () => {
    accountUserIdRef.current = "";
    lastAccountUserIdRef.current = "";
    generationRef.current += 1;
    // Never leave a prior account cart as "guest" for the next user on this device.
    wipeAccountLocalCart();
    broadcastSignedOut();
  };

  const sessionEnded = (error: unknown): boolean => {
    const status = errorStatus(error);
    return status === 401 || status === 403;
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    if (toastScheduledRef.current === message) return;
    toastScheduledRef.current = message;
    if (type === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
    setTimeout(() => {
      toastScheduledRef.current = null;
    }, 500);
  };

  const reconcileAccountWrite = async (
    snapshot: CartItem[],
    error: unknown,
    userId: string,
  ) => {
    if (sessionEnded(error)) {
      dropAccountCartSync();
      return;
    }
    if (accountUserIdRef.current !== userId) return;

    if (errorStatus(error) > 0) {
      try {
        const data = await getAccountCart();
        if (accountUserIdRef.current !== userId) return;
        applyAccountCart(data.items, userId);
        showToast(getApiErrorMessage(error, "Could not update cart"), "error");
        return;
      } catch (retryError) {
        if (sessionEnded(retryError)) {
          dropAccountCartSync();
          return;
        }
      }
    }

    if (accountUserIdRef.current !== userId) return;
    writeCart(snapshot);
    setItems(snapshot);
    showToast(getApiErrorMessage(error, "Could not update cart"), "error");
  };

  useEffect(() => {
    setItems(readCart());
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const userId = user && !user.isGuest && user.id ? user.id : "";
    accountUserIdRef.current = userId;

    if (!userId) {
      cartMergeByUser.clear();
      const hadAccountSession =
        Boolean(lastAccountUserIdRef.current) || Boolean(readOwner());
      lastAccountUserIdRef.current = "";
      if (hadAccountSession) {
        // Account logout / session end: never leave that cart for the next user.
        wipeAccountLocalCart();
      } else {
        // Pure guest session — keep the anonymous local cart.
        setItems(readCart());
      }
      return;
    }

    const previousUserId = lastAccountUserIdRef.current;
    lastAccountUserIdRef.current = userId;

    const owner = readOwner();
    const switchedUser =
      (Boolean(owner) && owner !== userId) ||
      (Boolean(previousUserId) && previousUserId !== userId);

    // Another account's cart on this device — drop it before loading ours.
    if (switchedUser) {
      clearLocalCart();
      setItems([]);
    }

    // Same user / guest leftovers on this device: merge up so nothing stays
    // local-only. Empty local → pull the server cart (cross-device sync).
    const localSnapshot = switchedUser ? [] : readCart();

    enqueue(async () => {
      if (generationRef.current !== generation) return;
      if (accountUserIdRef.current !== userId) return;

      const loadCart = async (): Promise<AccountCart> => {
        if (localSnapshot.length > 0) {
          return mergeAccountCartOnce(
            userId,
            localSnapshot.map((item) => cartItemToLine(item, item.quantity)),
          );
        }
        return getAccountCart();
      };

      try {
        let data: AccountCart;
        try {
          data = await loadCart();
        } catch (firstError) {
          if (sessionEnded(firstError)) throw firstError;
          // Transient network / 409 — one retry so a new device still hydrates.
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (generationRef.current !== generation) return;
          if (accountUserIdRef.current !== userId) return;
          data = await getAccountCart();
        }

        if (generationRef.current !== generation) return;
        if (accountUserIdRef.current !== userId) return;
        applyAccountCart(data.items, userId);
      } catch (error) {
        if (generationRef.current !== generation) return;
        if (sessionEnded(error)) {
          dropAccountCartSync();
          setItems(readCart());
          return;
        }
        showToast(getApiErrorMessage(error, "Could not load your cart"), "error");
      }
    });
  }, [isLoading, user?.id, user?.isGuest]);

  const refreshFromAccount = () => {
    const userId =
      (user && !user.isGuest && user.id) || accountUserIdRef.current;
    if (!userId) return Promise.resolve();

    return new Promise<void>((resolve) => {
      enqueue(async () => {
        if (accountUserIdRef.current !== userId) {
          resolve();
          return;
        }
        try {
          const data = await getAccountCart();
          if (accountUserIdRef.current !== userId) {
            resolve();
            return;
          }
          applyAccountCart(data.items, userId);
        } catch (error) {
          if (sessionEnded(error)) {
            dropAccountCartSync();
          }
        } finally {
          resolve();
        }
      });
    });
  };

  useEffect(() => {
    const refreshFromStorage = () => setItems(readCart());
    const refreshAccount = () => {
      if (isSecureIframeFocused()) return;
      const userId = accountUserIdRef.current;
      if (!userId) {
        refreshFromStorage();
        return;
      }
      enqueue(async () => {
        // Do not abort on generation bumps — visibility refresh must still
        // pull the latest account cart (e.g. after shopping on another device).
        if (accountUserIdRef.current !== userId) return;
        try {
          const data = await getAccountCart();
          if (accountUserIdRef.current !== userId) return;
          applyAccountCart(data.items, userId);
        } catch (error) {
          if (sessionEnded(error)) {
            dropAccountCartSync();
          }
          refreshFromStorage();
        }
      });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CART_KEY && event.key !== CART_OWNER_KEY) return;
      refreshAccount();
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (isSecureIframeFocused()) return;
      refreshAccount();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refreshAccount();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const addItem = (
    item: Omit<CartItem, "quantity" | "maxStock"> & {
      maxStock: number;
      quantity?: number;
    },
  ) => {
    const id = cartLineId(item.id);
    if (!id) return;
    const addQty = Math.max(1, Number(item.quantity) || 1);
    const incomingMaxStock = readMaxStock(item.maxStock);
    const snapshot = readCart();
    let toastMessage = "";
    let toastType: "success" | "error" = "success";

    const next = commitCart((current) => {
      const existing = current.find((p) => p.id === id);

      if (existing) {
        const maxStock = incomingMaxStock ?? existing.maxStock;
        if (maxStock != null && existing.quantity >= maxStock) {
          toastMessage = `Only ${maxStock} in stock`;
          toastType = "error";
          return current;
        }

        const nextQty = addQuantity(existing.quantity, addQty, maxStock);
        toastMessage = `${item.name} quantity increased to ${nextQty}`;
        return current.map((p) =>
          p.id === id
            ? {
                ...p,
                quantity: nextQty,
                itemType: p.itemType ?? readItemType(item.itemType),
                ...(maxStock != null ? { maxStock } : {}),
              }
            : p,
        );
      }

      if (incomingMaxStock != null && incomingMaxStock < 1) {
        toastMessage = `${item.name} is out of stock`;
        toastType = "error";
        return current;
      }

      const initialQty =
        incomingMaxStock != null ? Math.min(addQty, incomingMaxStock) : addQty;
      const line = toCartLine({
        ...item,
        id,
        quantity: initialQty,
        maxStock: incomingMaxStock,
      });
      if (!line) return current;
      toastMessage = `${item.name} added to cart`;
      return [...current, line];
    });

    if (toastMessage) {
      setTimeout(() => showToast(toastMessage, toastType), 0);
    }
    setItems(next);

    // Prefer the live auth user so adds still sync if the ref was briefly cleared.
    const userId =
      (user && !user.isGuest && user.id) || accountUserIdRef.current;
    if (!userId) return;
    accountUserIdRef.current = userId;
    const previous = snapshot.find((line) => line.id === id);
    const saved = next.find((line) => line.id === id);
    const delta = (saved?.quantity || 0) - (previous?.quantity || 0);
    if (delta < 1) return;

    enqueue(async () => {
      if (accountUserIdRef.current !== userId) return;
      try {
        const data = await addAccountCartItem(
          cartItemToLine(
            { id, itemType: item.itemType ?? saved?.itemType },
            delta,
          ),
        );
        if (accountUserIdRef.current !== userId) return;
        applyAccountCart(data.items, userId);
      } catch (error) {
        await reconcileAccountWrite(snapshot, error, userId);
      }
    });
  };

  const removeItem = (id: string, options?: { silent?: boolean }) => {
    const lineId = cartLineId(id);
    if (!lineId) return;
    const snapshot = readCart();
    const removedItem = snapshot.find((p) => p.id === lineId);
    if (removedItem && !options?.silent) {
      showToast(`${removedItem.name} removed from cart`);
    }
    setItems(commitCart((current) => current.filter((p) => p.id !== lineId)));

    const userId =
      (user && !user.isGuest && user.id) || accountUserIdRef.current;
    if (!userId) return;
    accountUserIdRef.current = userId;
    enqueue(async () => {
      if (accountUserIdRef.current !== userId) return;
      try {
        const data = await removeAccountCartItem(lineId);
        if (accountUserIdRef.current !== userId) return;
        applyAccountCart(data.items, userId);
      } catch (error) {
        await reconcileAccountWrite(snapshot, error, userId);
      }
    });
  };

  const syncStockFromPreview = (
    stockByCartId: Array<{ id: string; maxStock: number }>,
  ): string[] => {
    const stockMap = new Map(
      stockByCartId.map((row) => [
        row.id,
        Math.max(0, Number(row.maxStock) || 0),
      ]),
    );
    const removedNames: string[] = [];
    const snapshot = readCart();
    const next = commitCart((current) => {
      const updated: CartItem[] = [];
      for (const item of current) {
        if (!stockMap.has(item.id)) {
          updated.push(item);
          continue;
        }
        const maxStock = stockMap.get(item.id)!;
        if (maxStock < 1) {
          removedNames.push(item.name || "Item");
          continue;
        }
        const quantity = Math.min(item.quantity, maxStock);
        updated.push({ ...item, maxStock, quantity });
      }
      return updated;
    });
    setItems(next);

    const userId =
      (user && !user.isGuest && user.id) || accountUserIdRef.current;
    if (!userId || JSON.stringify(snapshot) === JSON.stringify(next)) {
      return removedNames;
    }
    accountUserIdRef.current = userId;

    const removedIds = snapshot
      .filter((item) => !next.some((row) => row.id === item.id))
      .map((item) => item.id);
    const quantityChanges = next.filter((item) => {
      const previous = snapshot.find((row) => row.id === item.id);
      return previous && previous.quantity !== item.quantity;
    });

    enqueue(async () => {
      if (accountUserIdRef.current !== userId) return;
      try {
        for (const lineId of removedIds) {
          await removeAccountCartItem(lineId);
        }
        for (const item of quantityChanges) {
          await setAccountCartQuantity(item.id, item.quantity);
        }
        const data = await getAccountCart();
        if (accountUserIdRef.current !== userId) return;
        applyAccountCart(data.items, userId);
      } catch (error) {
        await reconcileAccountWrite(snapshot, error, userId);
      }
    });

    return removedNames;
  };

  const purgeUnavailableItems = async (
    measurementUnit?: string,
  ): Promise<{
    purgedNames: string[];
    lastError: string | null;
    remainingItems: CartItem[];
  }> => {
    const purgedNames: string[] = [];
    let remaining = readCart();
    let lastError: string | null = null;

    const dropItem = (item: CartItem) => {
      removeItem(item.id, { silent: true });
      purgedNames.push(item.name || "Item");
      remaining = remaining.filter((row) => row.id !== item.id);
    };

    const dropUnavailableByProbing = async () => {
      const candidates = [...remaining];
      const stillOk: CartItem[] = [];
      for (const item of candidates) {
        try {
          await api.post("/api/checkout/preview", {
            items: buildPreviewPayload([item], measurementUnit),
          });
          stillOk.push(item);
        } catch (err: unknown) {
          const message = getApiErrorMessage(err, "Failed to validate cart");
          if (isCartAvailabilityError(message)) {
            removeItem(item.id, { silent: true });
            purgedNames.push(item.name || "Item");
          } else {
            lastError = message;
            stillOk.push(item);
          }
        }
      }
      remaining = stillOk;
    };

    for (let attempt = 0; attempt < 12 && remaining.length > 0; attempt++) {
      try {
        await api.post("/api/checkout/preview", {
          items: buildPreviewPayload(remaining, measurementUnit),
        });
        lastError = null;
        break;
      } catch (err: unknown) {
        const message = getApiErrorMessage(err, "Failed to validate cart");
        lastError = message;

        if (!isCartAvailabilityError(message)) {
          break;
        }

        const match = findUnavailableCartItem(remaining, message);
        if (match) {
          dropItem(match);
          continue;
        }

        const before = remaining.length;
        await dropUnavailableByProbing();
        if (remaining.length === before || remaining.length === 0) {
          break;
        }
      }
    }

    return { purgedNames, lastError, remainingItems: remaining };
  };

  const updateQuantity = (id: string, quantity: number) => {
    const lineId = cartLineId(id);
    if (!lineId) return;
    const snapshot = readCart();
    const item = snapshot.find((p) => p.id === lineId);
    if (!item) {
      setItems(snapshot);
      return;
    }

    if (item.maxStock != null && quantity > item.maxStock) {
      showToast(`Only ${item.maxStock} in stock`, "error");
      setItems(snapshot);
      return;
    }
    if (quantity <= 0) {
      removeItem(lineId);
      return;
    }

    setItems(
      commitCart((latest) =>
        latest.map((p) => (p.id === lineId ? { ...p, quantity } : p)),
      ),
    );

    const userId =
      (user && !user.isGuest && user.id) || accountUserIdRef.current;
    if (!userId) return;
    accountUserIdRef.current = userId;
    enqueue(async () => {
      if (accountUserIdRef.current !== userId) return;
      try {
        const data = await setAccountCartQuantity(lineId, quantity);
        if (accountUserIdRef.current !== userId) return;
        applyAccountCart(data.items, userId);
      } catch (error) {
        await reconcileAccountWrite(snapshot, error, userId);
      }
    });
  };

  const clearCart = () => {
    const snapshot = readCart();
    writeCart([]);
    setItems([]);

    const userId =
      (user && !user.isGuest && user.id) || accountUserIdRef.current;
    if (!userId) return;
    accountUserIdRef.current = userId;
    enqueue(async () => {
      if (accountUserIdRef.current !== userId) return;
      try {
        await clearAccountCart();
        if (accountUserIdRef.current !== userId) return;
        writeCart([]);
        writeOwner(userId);
        setItems([]);
      } catch (error) {
        await reconcileAccountWrite(snapshot, error, userId);
      }
    });
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        syncStockFromPreview,
        purgeUnavailableItems,
        refreshFromAccount,
        clearCart,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
