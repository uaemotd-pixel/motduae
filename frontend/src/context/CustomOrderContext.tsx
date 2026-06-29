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
} from "@/lib/customOrder";

type CustomOrderContextType = {
    draft: CustomOrderDraft;
    isHydrated: boolean;
    useOwnFabric: boolean;
    setFabricSource: (source: FabricSource) => void;
    setUseOwnFabric: (value: boolean) => void;
    toggleFabric: (fabric: CustomOrderFabricSelection) => void;
    toggleDesign: (design: CustomOrderSelectedDesign) => void;
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
};

const CustomOrderContext = createContext<CustomOrderContextType | undefined>(
    undefined,
);

export function CustomOrderProvider({ children }: { children: ReactNode }) {
    const [draft, setDraft] = useState<CustomOrderDraft>(
        createEmptyCustomOrderDraft,
    );
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem(CUSTOM_ORDER_STORAGE_KEY);
        if (stored) {
            try {
                setDraft(normalizeCustomOrderDraft(JSON.parse(stored)));
            } catch {
                setDraft(createEmptyCustomOrderDraft());
            }
        }
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        sessionStorage.setItem(CUSTOM_ORDER_STORAGE_KEY, JSON.stringify(draft));
    }, [draft, isHydrated]);

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

    const setUseOwnFabricFlag = useCallback((value: boolean) => {
        setFabricSource(value ? "self" : "storefront");
    }, [setFabricSource]);

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

    const updateLineItemMeters = useCallback((itemId: string, meters: number | null) => {
        setDraft((prev) => ({
            ...prev,
            lineItems: prev.lineItems.map((item) =>
                item.id === itemId ? { ...item, fabricMeters: meters } : item,
            ),
        }));
    }, []);

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

    const resetOrder = useCallback((firstStep: CustomOrderFirstStep | null = null) => {
        setDraft(createEmptyCustomOrderDraft(firstStep));
    }, []);

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

    const value = useMemo<CustomOrderContextType>(
        () => ({
            draft,
            isHydrated,
            useOwnFabric: useOwnFabric(draft),
            setFabricSource,
            setUseOwnFabric: setUseOwnFabricFlag,
            toggleFabric,
            toggleDesign,
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
        }),
        [
            draft,
            isHydrated,
            setFabricSource,
            setUseOwnFabricFlag,
            toggleFabric,
            toggleDesign,
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
