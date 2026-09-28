"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import {
  addAccountWishlistItem,
  clearAccountWishlist,
  getAccountWishlist,
  mergeAccountWishlist,
  removeAccountWishlistItem,
  setAccountWishlistQuantity,
  wishlistItemToLine,
  type AccountWishlist,
} from "@/lib/api/wishlist";
import { getApiErrorMessage } from "@/lib/api/client";
import { broadcastSignedOut } from "@/lib/auth/sessionBroadcast";
import { isSecureIframeFocused } from "@/lib/secureIframeFocus";
import {
  WISHLIST_KEY,
  WISHLIST_OWNER_KEY,
  clearLocalWishlistStorage,
} from "@/lib/wishlistStorage";

export type WishlistItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  quantity: number;
  cutLength?: string;
  maxStock?: number;
  type: "design" | "fabric" | "readyMade" | "addons";
};

type WishlistContextType = {
  wishItems: WishlistItem[];
  /** False until localStorage has been read (and account sync has settled when logged in). */
  isHydrated: boolean;
  addItem: (
    item: Omit<WishlistItem, "quantity"> & { maxStock?: number },
  ) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleItem: (
    item: Omit<WishlistItem, "quantity"> & { maxStock?: number },
  ) => void;
  clearWishlist: () => void;
  totalItems: number;
  isInWishlist: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

function wishlistLineId(id: unknown): string {
  if (typeof id === "string") return id.trim();
  if (id == null) return "";
  if (typeof id === "object" && "toString" in id) {
    const text = String(id).trim();
    if (text && text !== "[object Object]") return text;
  }
  return "";
}

function readType(value: unknown): WishlistItem["type"] {
  return value === "design" ||
    value === "fabric" ||
    value === "readyMade" ||
    value === "addons"
    ? value
    : "readyMade";
}

function toWishlistLine(item: {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  image?: unknown;
  price?: unknown;
  size?: unknown;
  quantity?: unknown;
  cutLength?: unknown;
  maxStock?: unknown;
  type?: unknown;
}): WishlistItem | null {
  const id = wishlistLineId(item.id);
  if (!id) return null;
  const parsed = Number(item.maxStock);
  const maxStock = Number.isFinite(parsed) ? Math.max(0, parsed) : undefined;
  return {
    id,
    slug: typeof item.slug === "string" ? item.slug : "",
    name: typeof item.name === "string" ? item.name : "",
    image: typeof item.image === "string" ? item.image : "",
    price: Number(item.price) || 0,
    size:
      typeof item.size === "string"
        ? item.size
        : typeof item.size === "number" && Number.isFinite(item.size)
          ? String(item.size)
          : "",
    quantity: 1,
    cutLength: typeof item.cutLength === "string" ? item.cutLength : undefined,
    type: readType(item.type),
    ...(maxStock != null ? { maxStock } : {}),
  };
}

function normalizeStoredItems(stored: unknown): WishlistItem[] {
  if (!Array.isArray(stored)) return [];
  const seen = new Set<string>();
  return stored.flatMap((item) => {
    const line = item && typeof item === "object" ? toWishlistLine(item) : null;
    if (!line || seen.has(line.id)) return [];
    seen.add(line.id);
    return [line];
  });
}

function readWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(WISHLIST_KEY);
    if (!stored) return [];
    return normalizeStoredItems(JSON.parse(stored));
  } catch {
    return [];
  }
}

function writeWishlist(next: WishlistItem[]) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
}

function readOwner(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(WISHLIST_OWNER_KEY) || "";
}

function writeOwner(userId: string) {
  if (userId) localStorage.setItem(WISHLIST_OWNER_KEY, userId);
  else localStorage.removeItem(WISHLIST_OWNER_KEY);
}

function errorStatus(error: unknown): number {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: unknown }).status);
    return Number.isFinite(status) ? status : 0;
  }
  return 0;
}

function commitWishlist(
  mutator: (current: WishlistItem[]) => WishlistItem[],
): WishlistItem[] {
  const current = readWishlist();
  const next = mutator(current);
  if (JSON.stringify(next) === JSON.stringify(current)) return current;

  const payload = JSON.stringify(next);
  writeWishlist(next);
  if (localStorage.getItem(WISHLIST_KEY) === payload) return next;

  const retried = mutator(readWishlist());
  writeWishlist(retried);
  return retried;
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
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

  const markHydrated = () => setIsHydrated(true);

  const applyAccountWishlist = (next: unknown, userId: string) => {
    const normalized = normalizeStoredItems(next);
    writeWishlist(normalized);
    writeOwner(userId);
    setItems((prev) =>
      JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized,
    );
  };

  /** Pull server wishlist, but push any local lines up first so we never clobber a fuller local list. */
  const loadAccountWishlist = async (
    userId: string,
    localSnapshot: WishlistItem[],
  ): Promise<AccountWishlist> => {
    if (localSnapshot.length > 0) {
      return mergeAccountWishlist(
        localSnapshot.map((item) => wishlistItemToLine(item, item.quantity)),
      );
    }
    return getAccountWishlist();
  };

  const wipeAccountLocalWishlist = () => {
    clearLocalWishlistStorage();
    writeOwner("");
    setItems([]);
  };

  const dropAccountWishlistSync = () => {
    accountUserIdRef.current = "";
    lastAccountUserIdRef.current = "";
    generationRef.current += 1;
    // Never leave a prior account wishlist as "guest" for the next user.
    wipeAccountLocalWishlist();
    broadcastSignedOut();
  };

  const sessionEnded = (error: unknown) => {
    const status = errorStatus(error);
    return status === 401 || status === 403;
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    if (toastScheduledRef.current === message) return;
    toastScheduledRef.current = message;
    (type === "success" ? toast.success : toast.error)(message);
    setTimeout(() => {
      toastScheduledRef.current = null;
    }, 500);
  };

  const reconcileAccountWrite = async (
    snapshot: WishlistItem[],
    error: unknown,
    userId: string,
    generation: number,
  ) => {
    if (sessionEnded(error)) {
      dropAccountWishlistSync();
      return;
    }
    if (generationRef.current !== generation) return;
    if (accountUserIdRef.current !== userId) return;

    if (errorStatus(error) > 0) {
      try {
        const data = await getAccountWishlist();
        if (generationRef.current !== generation) return;
        if (accountUserIdRef.current !== userId) return;
        applyAccountWishlist(data.items, userId);
        showToast(
          getApiErrorMessage(error, "Could not update wishlist"),
          "error",
        );
        return;
      } catch (retryError) {
        if (sessionEnded(retryError)) {
          dropAccountWishlistSync();
          return;
        }
      }
    }

    if (generationRef.current !== generation) return;
    if (accountUserIdRef.current !== userId) return;
    writeWishlist(snapshot);
    setItems(snapshot);
    showToast(getApiErrorMessage(error, "Could not update wishlist"), "error");
  };

  useEffect(() => {
    setItems(readWishlist());
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const userId = user && !user.isGuest && user.id ? user.id : "";
    accountUserIdRef.current = userId;

    if (!userId) {
      // Only wipe when an account session ended in this tab (logout / mid-session 401).
      // A fresh page load with a leftover owner key must NOT clear localStorage.
      const hadInMemorySession = Boolean(lastAccountUserIdRef.current);
      lastAccountUserIdRef.current = "";
      if (hadInMemorySession) {
        wipeAccountLocalWishlist();
      } else {
        setItems(readWishlist());
      }
      markHydrated();
      return;
    }

    const previousUserId = lastAccountUserIdRef.current;
    lastAccountUserIdRef.current = userId;

    const owner = readOwner();
    const switchedUser =
      (Boolean(owner) && owner !== userId) ||
      (Boolean(previousUserId) && previousUserId !== userId);

    // Another account's wishlist on this device — drop it before loading ours.
    if (switchedUser) {
      clearLocalWishlistStorage();
      setItems([]);
    }

    // Same user / guest leftovers: merge up so nothing stays local-only.
    const localSnapshot = switchedUser ? [] : readWishlist();

    enqueue(async () => {
      if (generationRef.current !== generation) return;
      if (accountUserIdRef.current !== userId) return;
      try {
        let data: AccountWishlist;
        try {
          data = await loadAccountWishlist(userId, localSnapshot);
        } catch (firstError) {
          if (sessionEnded(firstError)) throw firstError;
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (generationRef.current !== generation) return;
          if (accountUserIdRef.current !== userId) return;
          data = await loadAccountWishlist(userId, readWishlist());
        }

        if (generationRef.current !== generation) return;
        if (accountUserIdRef.current !== userId) return;
        applyAccountWishlist(data.items, userId);
      } catch (error) {
        if (generationRef.current !== generation) return;
        if (sessionEnded(error)) {
          dropAccountWishlistSync();
          setItems(readWishlist());
          return;
        }
        showToast(
          getApiErrorMessage(error, "Could not load your wishlist"),
          "error",
        );
      } finally {
        markHydrated();
      }
    });
  }, [isLoading, user?.id, user?.isGuest]);

  useEffect(() => {
    const refreshFromStorage = () => setItems(readWishlist());
    const refreshAccount = () => {
      if (isSecureIframeFocused()) return;
      const userId = accountUserIdRef.current;
      if (!userId) {
        refreshFromStorage();
        return;
      }
      enqueue(async () => {
        // Do not abort on generation bumps — visibility refresh must still
        // pull the latest account wishlist (e.g. after shopping on another device).
        if (accountUserIdRef.current !== userId) return;
        try {
          const data = await loadAccountWishlist(userId, readWishlist());
          if (accountUserIdRef.current !== userId) return;
          applyAccountWishlist(data.items, userId);
        } catch (error) {
          if (sessionEnded(error)) {
            dropAccountWishlistSync();
          }
          refreshFromStorage();
        }
      });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== WISHLIST_KEY && event.key !== WISHLIST_OWNER_KEY) return;
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
    item: Omit<WishlistItem, "quantity"> & { maxStock?: number },
  ) => {
    const id = wishlistLineId(item.id);
    if (!id) return;
    const snapshot = readWishlist();
    let toastMessage = "";

    const next = commitWishlist((current) => {
      if (current.some((p) => p.id === id)) return current;

      const line = toWishlistLine({ ...item, id, quantity: 1 });
      if (!line) return current;
      toastMessage = `${item.name} added to wishlist`;
      return [...current, line];
    });

    if (toastMessage) {
      setTimeout(() => showToast(toastMessage), 0);
    }
    setItems(next);

    const userId = accountUserIdRef.current;
    if (!userId) return;
    const previous = snapshot.find((line) => line.id === id);
    const saved = next.find((line) => line.id === id);
    const delta = (saved?.quantity || 0) - (previous?.quantity || 0);
    if (delta < 1) return;

    const generation = generationRef.current;
    enqueue(async () => {
      if (generationRef.current !== generation) return;
      if (accountUserIdRef.current !== userId) return;
      try {
        const data = await addAccountWishlistItem(
          wishlistItemToLine(
            { id, type: item.type ?? saved?.type ?? "readyMade" },
            delta,
          ),
        );
        if (generationRef.current !== generation) return;
        if (accountUserIdRef.current !== userId) return;
        applyAccountWishlist(data.items, userId);
      } catch (error) {
        await reconcileAccountWrite(snapshot, error, userId, generation);
      }
    });
  };

  const removeItem = (id: string) => {
    const lineId = wishlistLineId(id);
    if (!lineId) return;
    const snapshot = readWishlist();
    const removed = snapshot.find((p) => p.id === lineId);
    if (removed) showToast(`${removed.name} removed from wishlist`);
    setItems(commitWishlist((current) => current.filter((p) => p.id !== lineId)));

    const userId = accountUserIdRef.current;
    if (!userId) return;
    const generation = generationRef.current;
    enqueue(async () => {
      if (generationRef.current !== generation) return;
      if (accountUserIdRef.current !== userId) return;
      try {
        const data = await removeAccountWishlistItem(lineId);
        if (generationRef.current !== generation) return;
        if (accountUserIdRef.current !== userId) return;
        applyAccountWishlist(data.items, userId);
      } catch (error) {
        await reconcileAccountWrite(snapshot, error, userId, generation);
      }
    });
  };

  const toggleItem = (
    item: Omit<WishlistItem, "quantity"> & { maxStock?: number },
  ) => {
    const id = wishlistLineId(item.id);
    if (!id) return;
    const exists = readWishlist().some((entry) => entry.id === id);
    if (exists) removeItem(id);
    else addItem(item);
  };

  const updateQuantity = (id: string, quantity: number) => {
    const lineId = wishlistLineId(id);
    if (!lineId) return;
    const snapshot = readWishlist();
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
      commitWishlist((latest) =>
        latest.map((p) => (p.id === lineId ? { ...p, quantity } : p)),
      ),
    );

    const userId = accountUserIdRef.current;
    if (!userId) return;
    const generation = generationRef.current;
    enqueue(async () => {
      if (generationRef.current !== generation) return;
      if (accountUserIdRef.current !== userId) return;
      try {
        const data = await setAccountWishlistQuantity(lineId, quantity);
        if (generationRef.current !== generation) return;
        if (accountUserIdRef.current !== userId) return;
        applyAccountWishlist(data.items, userId);
      } catch (error) {
        await reconcileAccountWrite(snapshot, error, userId, generation);
      }
    });
  };

  const clearWishlist = () => {
    const snapshot = readWishlist();
    writeWishlist([]);
    setItems([]);

    const userId = accountUserIdRef.current;
    if (!userId) return;
    const generation = generationRef.current;
    enqueue(async () => {
      if (generationRef.current !== generation) return;
      if (accountUserIdRef.current !== userId) return;
      try {
        await clearAccountWishlist();
        if (generationRef.current !== generation) return;
        if (accountUserIdRef.current !== userId) return;
        writeWishlist([]);
        writeOwner(userId);
        setItems([]);
      } catch (error) {
        await reconcileAccountWrite(snapshot, error, userId, generation);
      }
    });
  };

  const totalItems = items.length;
  const isInWishlist = (id: string) => {
    const lineId = wishlistLineId(id);
    return lineId ? items.some((i) => i.id === lineId) : false;
  };

  return (
    <WishlistContext.Provider
      value={{
        wishItems: items,
        isHydrated,
        addItem,
        toggleItem,
        removeItem,
        updateQuantity,
        clearWishlist,
        totalItems,
        isInWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
