"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CUSTOM_ORDER_STORAGE_KEY,
  CUSTOM_ORDER_DELIVERY_TYPE_KEY,
  type CustomOrderDeliveryAddress,
  type CustomOrderDraft,
  type CustomOrderFabricSelection,
  type CustomOrderFirstStep,
  type CustomOrderLineItem,
  type CustomOrderMeasurements,
  type CustomOrderPreviewPayload,
  type CustomOrderSelectedDesign,
  type FabricSource,
  buildAutoLineItemsFromSelections,
  createEmptyCustomOrderDraft,
  getLineItemPairKey,
  normalizeCustomOrderDraft,
  pruneLineItemsForSelections,
  toggleDesignInList,
  toggleFabricInList,
  useOwnFabric,
  buildCustomOrderPreviewPayload,
  FabricUnit,
} from "@/lib/customOrder";
import { getToken } from "@/lib/auth/token";

type CustomOrderContextType = {
  draft: CustomOrderDraft;
  isHydrated: boolean;
  deliveryType: "pickup" | "delivery";
  useOwnFabric: boolean;
  addPocket: boolean;
  addBottomWideFold: boolean;
  setFabricSource: (source: FabricSource) => void;
  setUseOwnFabric: (value: boolean) => void;
  setDeliveryType: (type: "pickup" | "delivery") => void;
  setAddPocket: (val: boolean) => void;
  setAddBottomWideFold: (val: boolean) => void;
  toggleFabric: (fabric: CustomOrderFabricSelection) => void;
  selectSingleFabric: (fabric: CustomOrderFabricSelection) => void;
  toggleDesign: (design: CustomOrderSelectedDesign) => void;
  selectSingleDesign: (design: CustomOrderSelectedDesign) => void;
  addLineItem: (item: CustomOrderLineItem) => void;
  updateLineItemMeters: (itemId: string, meters: number | null) => void;
  removeLineItem: (itemId: string) => void;
  setLineItems: (items: CustomOrderLineItem[]) => void;
  setFabricMeters: (meters: number | null) => void;
  updateMeasurements: (measurements: Partial<CustomOrderMeasurements>) => void;
  updateDeliveryAddress: (address: Partial<CustomOrderDeliveryAddress>) => void;
  resetOrder: (firstStep?: CustomOrderFirstStep | null) => void;
  setFirstStepIfUnset: (step: CustomOrderFirstStep) => void;
  getPreviewPayload: () => CustomOrderPreviewPayload | null;
  syncAutoLineItems: () => void;
  updateLineItemUnit: (itemId: string, unit: FabricUnit) => void;
  toggleAddon: (addonId: string) => void;
};

const CustomOrderContext = createContext<CustomOrderContextType | undefined>(
  undefined,
);

export function CustomOrderProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<CustomOrderDraft>(
    createEmptyCustomOrderDraft,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">(
    "delivery",
  );
  const [addPocket, setAddPocket] = useState<boolean>(false);
  const [addBottomWideFold, setAddBottomWideFold] = useState<boolean>(false);

  // Hydrate from sessionStorage only if user is authenticated.
  useEffect(() => {
    const token = getToken();

    if (!token) {
      // Clear any previous draft from earlier sessions for logged-out users.
      sessionStorage.removeItem(CUSTOM_ORDER_STORAGE_KEY);
      sessionStorage.removeItem(CUSTOM_ORDER_DELIVERY_TYPE_KEY);
      sessionStorage.removeItem("customOrderAddPocket");
      sessionStorage.removeItem("customOrderAddBottomFold");
      setDraft(createEmptyCustomOrderDraft());
      setDeliveryType("delivery");
      setAddPocket(false);
      setAddBottomWideFold(false);
      setIsHydrated(true);
      return;
    }

    const stored = sessionStorage.getItem(CUSTOM_ORDER_STORAGE_KEY);
    if (stored) {
      try {
        setDraft(normalizeCustomOrderDraft(JSON.parse(stored)));
      } catch {
        setDraft(createEmptyCustomOrderDraft());
      }
    }

    setDeliveryType("delivery");

    const storedPocket = sessionStorage.getItem("customOrderAddPocket");
    if (storedPocket !== null) {
      setAddPocket(storedPocket === "true");
    }
    const storedFold = sessionStorage.getItem("customOrderAddBottomFold");
    if (storedFold !== null) {
      setAddBottomWideFold(storedFold === "true");
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    sessionStorage.setItem(CUSTOM_ORDER_STORAGE_KEY, JSON.stringify(draft));
  }, [draft, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    sessionStorage.setItem(CUSTOM_ORDER_DELIVERY_TYPE_KEY, deliveryType);
  }, [deliveryType, isHydrated]);

  const setFabricSource = useCallback((source: FabricSource) => {
    setDraft((prev) => ({
      ...prev,
      fabricSource: source,
      selectedFabrics: source === "self" ? [] : prev.selectedFabrics,
      lineItems:
        source === "self"
          ? prev.lineItems.map((item) => ({ ...item, fabric: null }))
          : prev.lineItems,
    }));
  }, []);

  const setUseOwnFabricFlag = useCallback(
    (value: boolean) => {
      setFabricSource(value ? "self" : "storefront");
    },
    [setFabricSource],
  );

  const toggleFabric = useCallback((fabric: CustomOrderFabricSelection) => {
    setDraft((prev) => {
      const selectedFabrics = toggleFabricInList(prev.selectedFabrics, fabric);
      const lineItems = pruneLineItemsForSelections(
        prev.lineItems,
        selectedFabrics,
        prev.selectedDesigns,
        "storefront",
      );

      return {
        ...prev,
        fabricSource: "storefront",
        selectedFabrics,
        lineItems,
      };
    });
  }, []);

  const selectSingleFabric = useCallback(
    (fabric: CustomOrderFabricSelection) => {
      setDraft((prev) => {
        const selectedFabrics = [fabric];
        const lineItems = pruneLineItemsForSelections(
          prev.lineItems,
          selectedFabrics,
          prev.selectedDesigns,
          "storefront",
        );

        return {
          ...prev,
          fabricSource: "storefront",
          selectedFabrics,
          lineItems,
        };
      });
    },
    [],
  );

  const toggleDesign = useCallback((design: CustomOrderSelectedDesign) => {
    setDraft((prev) => {
      const selectedDesigns = toggleDesignInList(prev.selectedDesigns, design);
      const lineItems = pruneLineItemsForSelections(
        prev.lineItems,
        prev.selectedFabrics,
        selectedDesigns,
        prev.fabricSource,
      );

      return {
        ...prev,
        selectedDesigns,
        lineItems,
      };
    });
  }, []);

  const selectSingleDesign = useCallback(
    (design: CustomOrderSelectedDesign) => {
      setDraft((prev) => {
        const selectedDesigns = [design];
        const lineItems = pruneLineItemsForSelections(
          prev.lineItems,
          prev.selectedFabrics,
          selectedDesigns,
          prev.fabricSource,
        );

        return {
          ...prev,
          selectedDesigns,
          lineItems,
        };
      });
    },
    [],
  );

  const addLineItem = useCallback((item: CustomOrderLineItem) => {
    setDraft((prev) => {
      const pairKey = getLineItemPairKey(
        item.design._id,
        item.fabric?._id ?? null,
      );
      const exists = prev.lineItems.some(
        (entry) =>
          getLineItemPairKey(entry.design._id, entry.fabric?._id ?? null) ===
          pairKey,
      );
      if (exists) return prev;

      return {
        ...prev,
        lineItems: [...prev.lineItems, item],
      };
    });
  }, []);

  const updateLineItemMeters = useCallback(
    (itemId: string, meters: number | null) => {
      setDraft((prev) => ({
        ...prev,
        lineItems: prev.lineItems.map((item) =>
          item.id === itemId ? { ...item, fabricMeters: meters } : item,
        ),
      }));
    },
    [],
  );

  const removeLineItem = useCallback((itemId: string) => {
    setDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== itemId),
    }));
  }, []);

  const setLineItems = useCallback((items: CustomOrderLineItem[]) => {
    setDraft((prev) => ({
      ...prev,
      lineItems: items,
    }));
  }, []);

  const setFabricMeters = useCallback((meters: number | null) => {
    setDraft((prev) => {
      if (prev.lineItems.length !== 1) return prev;
      return {
        ...prev,
        lineItems: prev.lineItems.map((item) => ({
          ...item,
          fabricMeters: meters,
        })),
      };
    });
  }, []);

  const syncAutoLineItems = useCallback(() => {
    setDraft((prev) => {
      if (prev.lineItems.length > 0) return prev;

      const autoItems = buildAutoLineItemsFromSelections(
        prev.selectedFabrics,
        prev.selectedDesigns,
        prev.fabricSource,
      );

      if (autoItems.length === 0) return prev;

      return {
        ...prev,
        lineItems: autoItems,
      };
    });
  }, []);

  const updateMeasurements = useCallback(
    (measurements: Partial<CustomOrderMeasurements>) => {
      setDraft((prev) => ({
        ...prev,
        measurements: {
          ...prev.measurements,
          ...measurements,
        },
      }));
    },
    [],
  );

  const updateDeliveryAddress = useCallback(
    (address: Partial<CustomOrderDeliveryAddress>) => {
      setDraft((prev) => ({
        ...prev,
        deliveryAddress: {
          ...prev.deliveryAddress,
          ...address,
        },
      }));
    },
    [],
  );

  const updateLineItemUnit = (itemId: string, unit: FabricUnit) => {
    setDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === itemId ? { ...item, fabricUnit: unit } : item,
      ),
    }));
  };

  const toggleAddon = useCallback((addonId: string) => {
    setDraft((prev) => {
      const addonIds = prev.addonIds || [];
      const index = addonIds.indexOf(addonId);
      const nextAddonIds =
        index > -1
          ? addonIds.filter((id) => id !== addonId)
          : [...addonIds, addonId];
      return {
        ...prev,
        addonIds: nextAddonIds,
      };
    });
  }, []);

  const resetOrder = useCallback(
    (firstStep: CustomOrderFirstStep | null = null) => {
      setDraft(createEmptyCustomOrderDraft(firstStep));
      setDeliveryType("delivery");
    },
    [],
  );

  const setFirstStepIfUnset = useCallback((step: CustomOrderFirstStep) => {
    setDraft((prev) => ({
      ...prev,
      firstStep: prev.firstStep ?? step,
    }));
  }, []);

  const getPreviewPayload = useCallback(
    () => buildCustomOrderPreviewPayload(draft),
    [draft],
  );

  const setAddPocketAction = useCallback((val: boolean) => {
    setAddPocket(val);
    sessionStorage.setItem("customOrderAddPocket", String(val));
  }, []);

  const setAddBottomWideFoldAction = useCallback((val: boolean) => {
    setAddBottomWideFold(val);
    sessionStorage.setItem("customOrderAddBottomFold", String(val));
  }, []);

  const setDeliveryTypeAction = useCallback((type: "pickup" | "delivery") => {
    setDeliveryType("delivery");
    sessionStorage.setItem(CUSTOM_ORDER_DELIVERY_TYPE_KEY, "delivery");
  }, []);

  const value = useMemo<CustomOrderContextType>(
    () => ({
      draft,
      isHydrated,
      deliveryType,
      useOwnFabric: useOwnFabric(draft),
      addPocket,
      addBottomWideFold,
      setFabricSource,
      setUseOwnFabric: setUseOwnFabricFlag,
      setDeliveryType: setDeliveryTypeAction,
      setAddPocket: setAddPocketAction,
      setAddBottomWideFold: setAddBottomWideFoldAction,
      toggleFabric,
      selectSingleFabric,
      toggleDesign,
      selectSingleDesign,
      addLineItem,
      updateLineItemMeters,
      removeLineItem,
      setLineItems,
      setFabricMeters,
      updateMeasurements,
      updateDeliveryAddress,
      resetOrder,
      setFirstStepIfUnset,
      getPreviewPayload,
      syncAutoLineItems,
      updateLineItemUnit,
      toggleAddon,
    }),
    [
      draft,
      isHydrated,
      deliveryType,
      addPocket,
      addBottomWideFold,
      setFabricSource,
      setUseOwnFabricFlag,
      toggleFabric,
      selectSingleFabric,
      toggleDesign,
      selectSingleDesign,
      addLineItem,
      updateLineItemMeters,
      removeLineItem,
      setLineItems,
      setFabricMeters,
      updateMeasurements,
      updateDeliveryAddress,
      resetOrder,
      setFirstStepIfUnset,
      getPreviewPayload,
      syncAutoLineItems,
      updateLineItemUnit,
      setDeliveryTypeAction,
      setAddPocketAction,
      setAddBottomWideFoldAction,
      toggleAddon,
    ],
  );

  return (
    <CustomOrderContext.Provider value={value}>
      {children}
    </CustomOrderContext.Provider>
  );
}

export function useCustomOrder() {
  const context = useContext(CustomOrderContext);
  if (!context) {
    throw new Error("useCustomOrder must be used inside CustomOrderProvider");
  }
  return context;
}
