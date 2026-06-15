"use client";

import FormField from "@/components/admin/FormField";
import FabricImageUpload from "@/components/admin/FabricImageUpload";
import StorePartnerPicker from "@/components/admin/StorePartnerPicker";
import {
  FABRIC_MATERIALS,
  FabricFormData,
  FabricMaterial,
  getTagColorSelectOptions,
  getTagSelectOptions,
  PickupAddress,
} from "@/lib/createFabricAdmin";

type FabricFormCopy = {
  form: {
    name_label: string;
    name_placeholder: string;
    name_ar_label: string;
    name_ar_placeholder: string;
    description_label: string;
    description_placeholder: string;
    description_ar_label: string;
    description_ar_placeholder: string;
    material_label: string;
    material_placeholder: string;
    color_label: string;
    color_placeholder: string;
    city_label: string;
    city_placeholder: string;
    tag_label: string;
    tag_placeholder: string;
    tag_color_label: string;
    tag_color_placeholder: string;
    price_label: string;
    price_placeholder: string;
    store_partner_label: string;
    store_partner_placeholder: string;
    store_partner_loading: string;
    store_partner_empty: string;
    pickup_heading: string;
    emirate_label: string;
    emirate_placeholder: string;
    pickup_city_label: string;
    pickup_city_placeholder: string;
    street_label: string;
    street_placeholder: string;
    building_label: string;
    building_placeholder: string;
    phone_label: string;
    phone_placeholder: string;
    images_label: string;
    add_image_button: string;
    remove_image_button: string;
    upload_image_button: string;
    uploading_image: string;
    upload_failed: string;
    status_label: string;
    status_active: string;
  };
};

type FabricAdminFormFieldsProps = {
  formData: FabricFormData;
  fieldErrors: Record<string, string>;
  copy: FabricFormCopy;
  onFieldChange: (field: keyof FabricFormData, value: unknown) => void;
  onPickupChange: (subfield: keyof PickupAddress, value: string) => void;
  onImageChange: (index: number, url: string) => void;
  onAddImage: () => void;
  onRemoveImage: (index: number) => void;
};

export default function FabricAdminFormFields({
  formData,
  fieldErrors,
  copy,
  onFieldChange,
  onPickupChange,
  onImageChange,
  onAddImage,
  onRemoveImage,
}: FabricAdminFormFieldsProps) {
  const f = copy.form;
  const materialOptions = FABRIC_MATERIALS.map((material) => ({
    value: material,
    label: material.charAt(0).toUpperCase() + material.slice(1),
  }));
  const tagOptions = getTagSelectOptions(formData.tag);
  const tagColorOptions = getTagColorSelectOptions(formData.tagColor);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField label={f.name_label} name="name" required error={fieldErrors.name}>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
          placeholder={f.name_placeholder}
        />
      </FormField>

      <FormField label={f.name_ar_label} name="nameAr" required error={fieldErrors.nameAr}>
        <input
          type="text"
          value={formData.nameAr}
          onChange={(e) => onFieldChange("nameAr", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
          placeholder={f.name_ar_placeholder}
        />
      </FormField>

      <FormField
        label={f.description_label}
        name="description"
        required
        error={fieldErrors.description}
      >
        <textarea
          rows={2}
          value={formData.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
          placeholder={f.description_placeholder}
        />
      </FormField>

      <FormField
        label={f.description_ar_label}
        name="descriptionAr"
        required
        error={fieldErrors.descriptionAr}
      >
        <textarea
          rows={2}
          value={formData.descriptionAr}
          onChange={(e) => onFieldChange("descriptionAr", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
          placeholder={f.description_ar_placeholder}
        />
      </FormField>

      <FormField
        label={f.material_label}
        name="material"
        required
        error={fieldErrors.material}
      >
        <select
          value={formData.material}
          onChange={(e) => onFieldChange("material", e.target.value as FabricMaterial)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
        >
          <option value="">{f.material_placeholder}</option>
          {materialOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={f.color_label} name="color" required error={fieldErrors.color}>
        <input
          type="text"
          value={formData.color}
          onChange={(e) => onFieldChange("color", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
          placeholder={f.color_placeholder}
        />
      </FormField>

      <FormField label={f.city_label} name="city" required error={fieldErrors.city}>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => onFieldChange("city", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
          placeholder={f.city_placeholder}
        />
      </FormField>

      <FormField label={f.tag_label} name="tag" required error={fieldErrors.tag}>
        <select
          value={formData.tag}
          onChange={(e) => onFieldChange("tag", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
        >
          <option value="">{f.tag_placeholder}</option>
          {tagOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label={f.tag_color_label}
        name="tagColor"
        required
        error={fieldErrors.tagColor}
      >
        <select
          value={formData.tagColor}
          onChange={(e) => onFieldChange("tagColor", e.target.value)}
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
        >
          <option value="">{f.tag_color_placeholder}</option>
          {tagColorOptions.map((color) => (
            <option key={color.value} value={color.value}>
              {color.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label={f.price_label}
        name="pricePerMeter"
        required
        error={fieldErrors.pricePerMeter}
      >
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.pricePerMeter === 0 ? "" : formData.pricePerMeter}
          onChange={(e) =>
            onFieldChange(
              "pricePerMeter",
              e.target.value === "" ? 0 : parseFloat(e.target.value),
            )
          }
          className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
          placeholder={f.price_placeholder}
        />
      </FormField>

      <div className="md:col-span-2">
        <StorePartnerPicker
          value={formData.listedByStore}
          onChange={(partnerId) => onFieldChange("listedByStore", partnerId)}
          error={fieldErrors.listedByStore}
          label={f.store_partner_label}
          placeholder={f.store_partner_placeholder}
          loadingLabel={f.store_partner_loading}
          emptyLabel={f.store_partner_empty}
          required
        />
      </div>

      <div className="md:col-span-2">
        <h3 className="text-sm font-medium text-gray-700 mb-3">{f.pickup_heading}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label={f.emirate_label}
            name="pickupAddress.emirate"
            required
            error={fieldErrors["pickupAddress.emirate"]}
          >
            <input
              type="text"
              value={formData.pickupAddress.emirate}
              onChange={(e) => onPickupChange("emirate", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
              placeholder={f.emirate_placeholder}
            />
          </FormField>
          <FormField
            label={f.pickup_city_label}
            name="pickupAddress.city"
            required
            error={fieldErrors["pickupAddress.city"]}
          >
            <input
              type="text"
              value={formData.pickupAddress.city}
              onChange={(e) => onPickupChange("city", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
              placeholder={f.pickup_city_placeholder}
            />
          </FormField>
          <FormField label={f.street_label} name="pickupAddress.street">
            <input
              type="text"
              value={formData.pickupAddress.street}
              onChange={(e) => onPickupChange("street", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
              placeholder={f.street_placeholder}
            />
          </FormField>
          <FormField label={f.building_label} name="pickupAddress.building">
            <input
              type="text"
              value={formData.pickupAddress.building}
              onChange={(e) => onPickupChange("building", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
              placeholder={f.building_placeholder}
            />
          </FormField>
          <FormField label={f.phone_label} name="pickupAddress.phone">
            <input
              type="text"
              value={formData.pickupAddress.phone}
              onChange={(e) => onPickupChange("phone", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none"
              placeholder={f.phone_placeholder}
            />
          </FormField>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="mb-2 flex justify-between items-center">
          <span className="font-label-sm text-[11px] text-black/60 uppercase tracking-[0.2em]">
            {f.images_label} *
          </span>
          {formData.images.length < 5 && (
            <button
              type="button"
              onClick={onAddImage}
              className="text-xs text-black underline"
            >
              {f.add_image_button}
            </button>
          )}
        </div>
        {formData.images.map((url, idx) => (
          <div key={idx} className="mb-4">
            <FabricImageUpload
              value={url}
              onChange={(val) => onImageChange(idx, val)}
              chooseFileLabel={f.upload_image_button}
              uploadingLabel={f.uploading_image}
              uploadFailedLabel={f.upload_failed}
              removeLabel={f.remove_image_button}
              error={fieldErrors.images && idx === 0 ? fieldErrors.images : undefined}
            />
            {formData.images.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveImage(idx)}
                className="text-xs text-red-500 mt-1"
              >
                {f.remove_image_button}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="md:col-span-2">
        <FormField label={f.status_label} name="isActive">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => onFieldChange("isActive", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              {f.status_active}
            </label>
          </div>
        </FormField>
      </div>
    </div>
  );
}
