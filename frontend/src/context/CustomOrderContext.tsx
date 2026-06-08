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
    type CustomOrderDesignSelection,
    type CustomOrderDraft,
    type CustomOrderFabricSelection,
    type CustomOrderMeasurements,
    type CustomOrderPreviewPayload,
    type CustomOrderTailorSelection,
    type FabricSource,
    buildCustomOrderPreviewPayload,
    createEmptyCustomOrderDraft,
    normalizeCustomOrderDraft,
    useOwnFabric,
} from "@/lib/customOrder";

type CustomOrderContextType = {
    draft: CustomOrderDraft;
    isHydrated: boolean;
    useOwnFabric: boolean;
    setFabricSource: (source: FabricSource) => void;
    setUseOwnFabric: (value: boolean) => void;
    setFabric: (fabric: CustomOrderFabricSelection | null) => void;
    setTailor: (tailor: CustomOrderTailorSelection | null) => void;
    setDesign: (design: CustomOrderDesignSelection | null) => void;
    setFabricMeters: (meters: number | null) => void;
    updateMeasurements: (measurements: Partial<CustomOrderMeasurements>) => void;
    updateDeliveryAddress: (address: Partial<CustomOrderDeliveryAddress>) => void;
    resetOrder: () => void;
    getPreviewPayload: () => CustomOrderPreviewPayload | null;
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
            fabric: source === "self" ? null : prev.fabric,
        }));
    }, []);

    const setUseOwnFabricFlag = useCallback((value: boolean) => {
        setFabricSource(value ? "self" : "storefront");
    }, [setFabricSource]);

    const setFabric = useCallback((fabric: CustomOrderFabricSelection | null) => {
        setDraft((prev) => ({
            ...prev,
            fabricSource: fabric ? "storefront" : prev.fabricSource,
            fabric,
        }));
    }, []);

    const setTailor = useCallback((tailor: CustomOrderTailorSelection | null) => {
        setDraft((prev) => ({
            ...prev,
            tailor,
            design:
                !tailor || prev.tailor?._id !== tailor._id ? null : prev.design,
        }));
    }, []);

    const setDesign = useCallback((design: CustomOrderDesignSelection | null) => {
        setDraft((prev) => ({
            ...prev,
            design,
            fabricMeters:
                design?.estimatedMeters && design.estimatedMeters > 0
                    ? design.estimatedMeters
                    : prev.fabricMeters,
        }));
    }, []);

    const setFabricMeters = useCallback((meters: number | null) => {
        setDraft((prev) => ({
            ...prev,
            fabricMeters: meters,
        }));
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

    const resetOrder = useCallback(() => {
        setDraft(createEmptyCustomOrderDraft());
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
            setFabric,
            setTailor,
            setDesign,
            setFabricMeters,
            updateMeasurements,
            updateDeliveryAddress,
            resetOrder,
            getPreviewPayload,
        }),
        [
            draft,
            isHydrated,
            setFabricSource,
            setUseOwnFabricFlag,
            setFabric,
            setTailor,
            setDesign,
            setFabricMeters,
            updateMeasurements,
            updateDeliveryAddress,
            resetOrder,
            getPreviewPayload,
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
