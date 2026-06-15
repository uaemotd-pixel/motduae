"use client";

import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api/client";

export interface FabricStorePartner {
  _id: string;
  name: string;
  email: string;
}

type StorePartnerPickerProps = {
  value: string;
  onChange: (partnerId: string) => void;
  error?: string;
  label: string;
  placeholder: string;
  loadingLabel: string;
  emptyLabel: string;
  required?: boolean;
};

export default function StorePartnerPicker({
  value,
  onChange,
  error,
  label,
  placeholder,
  loadingLabel,
  emptyLabel,
  required,
}: StorePartnerPickerProps) {
  const [partners, setPartners] = useState<FabricStorePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoading(true);
        const data = await api.get<FabricStorePartner[]>(
          "/api/admin/partners/fabric-stores",
        );
        setPartners(data);
        setLoadError(null);
      } catch (err) {
        setLoadError(getApiErrorMessage(err, emptyLabel));
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [emptyLabel]);

  return (
    <div>
      <label className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block mb-1">
        {label}
        {required ? " *" : ""}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || partners.length === 0}
        className={`w-full py-1 border-b focus:outline-none ${
          error ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-black"
        }`}
      >
        <option value="">
          {loading ? loadingLabel : partners.length === 0 ? emptyLabel : placeholder}
        </option>
        {partners.map((partner) => (
          <option key={partner._id} value={partner._id}>
            {partner.name} ({partner.email})
          </option>
        ))}
      </select>
      {(error || loadError) && (
        <p className="text-xs text-red-500 mt-1">{error || loadError}</p>
      )}
    </div>
  );
}
