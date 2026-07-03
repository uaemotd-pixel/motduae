"use client";

import { useState, useEffect, FormEvent, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import ImageUpload from "@/components/admin/ImageUpload";
import { getTranslation } from "@/lib/getTranslation";
import {
  defaultReadyMadeForm,
  fromApiProduct,
  toApiPayload,
  type ReadyMadeFormData,
} from "@/lib/readyMadeAdmin";
import toast from "react-hot-toast";

// Predefined tag and color options (same as create form)
const TAG_OPTIONS = [
  { value: "new", en: "New", ar: "جديد" },
  { value: "bestseller", en: "Bestseller", ar: "الأكثر مبيعاً" },
  { value: "premium", en: "Premium", ar: "ممتاز" },
  { value: "limited", en: "Limited", ar: "محدود" },
  { value: "exclusive", en: "Exclusive", ar: "حصري" },
  { value: "trending", en: "Trending", ar: "رائج" },
  { value: "handmade", en: "Handmade", ar: "يدوي" },
];

const COLOR_OPTIONS = [
  { value: "aqua", en: "Aqua", ar: "أزرق مائي" },
  { value: "aquamarine", en: "Aquamarine", ar: "أزرق بحري" },
  { value: "beige", en: "Beige", ar: "بيج" },
  { value: "bisque", en: "Bisque", ar: "بسكويتي" },
  { value: "black", en: "Black", ar: "أسود" },
  { value: "blue", en: "Blue", ar: "أزرق" },
  { value: "blueviolet", en: "Blue Violet", ar: "بنفسجي مزرق" },
  { value: "brown", en: "Brown", ar: "بني" },
  { value: "burlywood", en: "Burlywood", ar: "بني فاتح" },
  { value: "cadetblue", en: "Cadet Blue", ar: "أزرق كاديت" },
  { value: "chocolate", en: "Chocolate", ar: "شوكولاتة" },
  { value: "coral", en: "Coral", ar: "مرجاني" },
  { value: "cornflowerblue", en: "Cornflower Blue", ar: "أزرق ردة الذرة" },
  { value: "cornsilk", en: "Cornsilk", ar: "حرير الذرة" },
  { value: "crimson", en: "Crimson", ar: "قرمزي" },
  { value: "cyan", en: "Cyan", ar: "سيان" },
  { value: "darkblue", en: "Dark Blue", ar: "أزرق غامق" },
  { value: "darkcyan", en: "Dark Cyan", ar: "سيان غامق" },
  { value: "darkgoldenrod", en: "Dark Goldenrod", ar: "ذهبي غامق" },
  { value: "darkgray", en: "Dark Gray", ar: "رمادي غامق" },
  { value: "darkgreen", en: "Dark Green", ar: "أخضر غامق" },
  { value: "darkkhaki", en: "Dark Khaki", ar: "كاكي غامق" },
  { value: "darkmagenta", en: "Dark Magenta", ar: "أرجواني غامق" },
  { value: "darkorchid", en: "Dark Orchid", ar: "أوركيد غامق" },
  { value: "darkred", en: "Dark Red", ar: "أحمر غامق" },
  { value: "darksalmon", en: "Dark Salmon", ar: "سلمون غامق" },
  { value: "darkseagreen", en: "Dark Sea Green", ar: "أخضر بحري غامق" },
  { value: "darkslateblue", en: "Dark Slate Blue", ar: "أزرق أردوازي غامق" },
  { value: "darkslategray", en: "Dark Slate Gray", ar: "رمادي أردوازي غامق" },
  { value: "darkturquoise", en: "Dark Turquoise", ar: "فيروزي غامق" },
  { value: "darkviolet", en: "Dark Violet", ar: "بنفسجي غامق" },
  { value: "deeppink", en: "Deep Pink", ar: "وردي غامق" },
  { value: "deepskyblue", en: "Deep Sky Blue", ar: "أزرق سماوي غامق" },
  { value: "dimgray", en: "Dim Gray", ar: "رمادي خافت" },
  { value: "dodgerblue", en: "Dodger Blue", ar: "أزرق دودجر" },
  { value: "firebrick", en: "Firebrick", ar: "أحمر طوب" },
  { value: "fuchsia", en: "Fuchsia", ar: "فوشيا" },
  { value: "gainsboro", en: "Gainsboro", ar: "رمادي فاتح" },
  { value: "gold", en: "Gold", ar: "ذهبي" },
  { value: "goldenrod", en: "Goldenrod", ar: "ذهبي محمر" },
  { value: "gray", en: "Gray", ar: "رمادي" },
  { value: "green", en: "Green", ar: "أخضر" },
  { value: "greenyellow", en: "Green Yellow", ar: "أصفر مخضر" },
  { value: "grey", en: "Grey", ar: "رمادي" },
  { value: "hotpink", en: "Hot Pink", ar: "وردي ساخن" },
  { value: "indianred", en: "Indian Red", ar: "أحمر هندي" },
  { value: "indigo", en: "Indigo", ar: "نيلي" },
  { value: "ivory", en: "Ivory", ar: "عاجي" },
  { value: "khaki", en: "Khaki", ar: "كاكي" },
  { value: "lavender", en: "Lavender", ar: "لافندر" },
  { value: "lightblue", en: "Light Blue", ar: "أزرق فاتح" },
  { value: "lightgray", en: "Light Gray", ar: "رمادي فاتح" },
  { value: "lightgreen", en: "Light Green", ar: "أخضر فاتح" },
  { value: "lightpink", en: "Light Pink", ar: "وردي فاتح" },
  { value: "lightsalmon", en: "Light Salmon", ar: "سلمون فاتح" },
  { value: "lightseagreen", en: "Light Sea Green", ar: "أخضر بحري فاتح" },
  { value: "lightskyblue", en: "Light Sky Blue", ar: "أزرق سماوي فاتح" },
  { value: "lightslategray", en: "Light Slate Gray", ar: "رمادي أردوازي فاتح" },
  { value: "lightsteelblue", en: "Light Steel Blue", ar: "أزرق فولاذي فاتح" },
  { value: "maroon", en: "Maroon", ar: "كستنائي" },
  { value: "mediumblue", en: "Medium Blue", ar: "أزرق متوسط" },
  { value: "mediumpurple", en: "Medium Purple", ar: "بنفسجي متوسط" },
  { value: "mediumseagreen", en: "Medium Sea Green", ar: "أخضر بحري متوسط" },
  {
    value: "mediumslateblue",
    en: "Medium Slate Blue",
    ar: "أزرق أردوازي متوسط",
  },
  { value: "mediumturquoise", en: "Medium Turquoise", ar: "فيروزي متوسط" },
  {
    value: "mediumvioletred",
    en: "Medium Violet Red",
    ar: "أحمر بنفسجي متوسط",
  },
  { value: "midnightblue", en: "Midnight Blue", ar: "أزرق منتصف الليل" },
  { value: "moccasin", en: "Moccasin", ar: "موكاسين" },
  { value: "navy", en: "Navy Blue", ar: "كحلي" },
  { value: "olive", en: "Olive", ar: "زيتوني" },
  { value: "olivedrab", en: "Olive Drab", ar: "زيتوني باهت" },
  { value: "orange", en: "Orange", ar: "برتقالي" },
  { value: "orchid", en: "Orchid", ar: "أوركيد" },
  { value: "palegoldenrod", en: "Pale Goldenrod", ar: "ذهبي باهت" },
  { value: "palegreen", en: "Pale Green", ar: "أخضر باهت" },
  { value: "paleturquoise", en: "Pale Turquoise", ar: "فيروزي باهت" },
  { value: "palevioletred", en: "Pale Violet Red", ar: "أحمر بنفسجي باهت" },
  { value: "peachpuff", en: "Peach Puff", ar: "خوخي" },
  { value: "pink", en: "Pink", ar: "وردي" },
  { value: "plum", en: "Plum", ar: "برقوقي" },
  { value: "powderblue", en: "Powder Blue", ar: "أزرق بودرة" },
  { value: "purple", en: "Purple", ar: "بنفسجي" },
  { value: "rebeccapurple", en: "Rebecca Purple", ar: "بنفسجي ريبيكا" },
  { value: "red", en: "Red", ar: "أحمر" },
  { value: "rosybrown", en: "Rosy Brown", ar: "بني وردي" },
  { value: "royalblue", en: "Royal Blue", ar: "أزرق ملكي" },
  { value: "saddlebrown", en: "Saddle Brown", ar: "بني السرج" },
  { value: "salmon", en: "Salmon", ar: "سلمون" },
  { value: "sandybrown", en: "Sandy Brown", ar: "بني رملي" },
  { value: "seagreen", en: "Sea Green", ar: "أخضر بحري" },
  { value: "silver", en: "Silver", ar: "فضي" },
  { value: "skyblue", en: "Sky Blue", ar: "أزرق سماوي" },
  { value: "slateblue", en: "Slate Blue", ar: "أزرق أردوازي" },
  { value: "slategray", en: "Slate Gray", ar: "رمادي أردوازي" },
  { value: "steelblue", en: "Steel Blue", ar: "أزرق فولاذي" },
  { value: "tan", en: "Tan", ar: "سمراء" },
  { value: "teal", en: "Teal", ar: "بطي" },
  { value: "thistle", en: "Thistle", ar: "شوكي" },
  { value: "tomato", en: "Tomato", ar: "طماطمي" },
  { value: "turquoise", en: "Turquoise", ar: "فيروزي" },
  { value: "violet", en: "Violet", ar: "بنفسجي" },
  { value: "wheat", en: "Wheat", ar: "قمحي" },
  { value: "white", en: "White", ar: "أبيض" },
  { value: "yellow", en: "Yellow", ar: "أصفر" },
  { value: "yellowgreen", en: "Yellow Green", ar: "أصفر مخضر" },
];

const sanitizeName = (value: string) =>
  value.replace(/[^a-zA-Z\u0600-\u06FF\s\-']/g, "");

export default function EditReadyMadePage() {
  const router = useRouter();
  const params = useParams();
  const localeParam = params.locale as string;
  const id = params.id as string;
  const t = getTranslation(localeParam);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ReadyMadeFormData | null>(null);
  const [fabricWidth, setFabricWidth] = useState<"single" | "double">("single");
  const [colorsOpen, setColorsOpen] = useState(false);
  const colorsDropdownRef = useRef<HTMLDivElement>(null);

  // Dropdown options states
  const [fabricShops, setFabricShops] = useState<any[]>([]);
  const [allFabrics, setAllFabrics] = useState<any[]>([]);
  const [tailorShops, setTailorShops] = useState<any[]>([]);
  const [allDesigns, setAllDesigns] = useState<any[]>([]);

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [shopsRes, fabricsRes, tailorsRes, designsRes] =
          await Promise.all([
            api.get<any>("/api/admin/fabric-shops"),
            api.get<any[]>("/api/admin/fabrics"),
            api.get<any>("/api/admin/tailors"),
            api.get<any[]>("/api/admin/designs"),
          ]);
        setFabricShops(shopsRes.items || []);
        setAllFabrics(fabricsRes || []);
        setTailorShops(tailorsRes.items || []);
        setAllDesigns(designsRes || []);
      } catch (err) {
        toast.error("Failed to load store or catalog data for dropdowns");
      }
    };
    loadDropdownData();
  }, []);

  // Filter fabrics by selected fabric store
  const filteredFabrics = useMemo(() => {
    if (!formData?.fabricShopId) return [];
    return allFabrics.filter((f) => {
      const shopId =
        typeof f.fabricShopId === "object" &&
        f.fabricShopId !== null &&
        "_id" in f.fabricShopId
          ? (f.fabricShopId as any)._id
          : f.fabricShopId;
      return shopId === formData.fabricShopId;
    });
  }, [allFabrics, formData?.fabricShopId]);

  // Filter designs by selected tailor shop
  const filteredDesigns = useMemo(() => {
    if (!formData?.tailorShopId) return [];
    return allDesigns.filter((d) => {
      const shopId =
        typeof d.tailorShopId === "object"
          ? d.tailorShopId?._id
          : d.tailorShopId;
      return shopId === formData.tailorShopId;
    });
  }, [allDesigns, formData?.tailorShopId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorsDropdownRef.current &&
        !colorsDropdownRef.current.contains(event.target as Node)
      ) {
        setColorsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch item
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        let found: Record<string, unknown> | undefined;

        try {
          found = await api.get<Record<string, unknown>>(
            `/api/admin/ready-made/${id}`,
          );
        } catch (directErr: unknown) {
          const status =
            directErr && typeof directErr === "object" && "status" in directErr
              ? (directErr as { status: number }).status
              : undefined;

          if (status === 404) {
            const items = await api.get<Record<string, unknown>[]>(
              "/api/admin/ready-made",
            );
            found = items.find((item) => item._id === id);
          } else {
            throw directErr;
          }
        }

        if (!found) {
          toast.error("Product not found");
          return;
        }

        const data = fromApiProduct(found);
        setFormData(data);

        if (found.fabricWidth) {
          setFabricWidth(found.fabricWidth as "single" | "double");
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load product";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  // Handlers
  const handleChange = (field: keyof ReadyMadeFormData, value: unknown) => {
    if (!formData) return;
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleNameChange = (
    field: "name" | "nameAr" | "tailorName" | "tailorNameAr",
    value: string,
  ) => {
    const sanitized = sanitizeName(value);
    handleChange(field, sanitized);
  };

  const handleNumberChange = (
    field: keyof ReadyMadeFormData,
    value: string,
  ) => {
    if (value === "") {
      handleChange(field, 0);
    } else {
      const num = Number(value);
      if (!isNaN(num) && num >= 0) {
        handleChange(field, num);
      }
    }
  };

  const getNumberDisplay = (value: number): string => {
    return value === 0 ? "" : String(value);
  };

  // Image handlers
  const addImage = () => {
    if (!formData) return;
    if (formData.images.length < 5) {
      handleChange("images", [...formData.images, ""]);
    }
  };

  const removeImage = (index: number) => {
    if (!formData) return;
    const newImages = formData.images.filter((_, i) => i !== index);
    handleChange("images", newImages);
  };

  const handleImageChange = (index: number, url: string) => {
    if (!formData) return;
    const newImages = [...formData.images];
    newImages[index] = url;
    handleChange("images", newImages);
  };

  // Color toggle
  const toggleColor = (colorValue: string) => {
    if (!formData) return;
    const current = formData.colors;
    const index = current.indexOf(colorValue);
    const updated =
      index === -1
        ? [...current, colorValue]
        : current.filter((c) => c !== colorValue);
    handleChange("colors", updated);
  };

  // Validation
  const validate = (): boolean => {
    if (!formData) return false;
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Name required";
    if (!formData.fabricShopId) errors.fabricShopId = "Fabric store required";
    if (!formData.fabricId) errors.fabricId = "Fabric required";

    const hasImage = formData.images.some((img) => img.trim() !== "");
    if (!hasImage) errors.images = "At least one image is required";

    if (formData.metersPerFabric <= 0)
      errors.metersPerFabric = "Meters must be greater than 0";
    if (formData.fabricPriceAED < 0)
      errors.fabricPriceAED = "Price cannot be negative";
    if (formData.mukhawarPriceAED < 0)
      errors.mukhawarPriceAED = "Price cannot be negative";
    if (formData.finalSellingPriceAED < 0)
      errors.finalSellingPriceAED = "Price cannot be negative";
    if (formData.availableFabricStock < 0)
      errors.availableFabricStock = "Stock cannot be negative";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    if (!validate()) {
      const errorMessages = Object.values(fieldErrors).filter(Boolean);
      let errorText = "Please check the highlighted fields and try again.";
      if (errorMessages.length > 0) {
        errorText = `Please fix: ${errorMessages.join("; ")}.`;
      }
      toast.error(errorText);
      return;
    }

    setSubmitting(true);

    const firstImage = formData.images.find((img) => img.trim() !== "") || "";
    const payload = toApiPayload({
      ...formData,
      thumbnailImage: firstImage,
    });
    (payload as any).fabricWidth = fabricWidth;

    try {
      await api.put(`/api/admin/ready-made/${id}`, payload);
      toast.success("Product updated successfully!");
      setTimeout(() => {
        router.push("/admin/ready-made");
      }, 2000);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update product"));
    } finally {
      setSubmitting(false);
    }
  };

  // Loading / error states
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-10 text-center">
        <div className="w-12 h-12 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading product...</p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          Product not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
          Edit Ready-Made Product
        </h1>
        <p className="text-gray-500 text-sm mt-1">Update the product details</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NAME */}
          <FormField
            label="Name (ENG)"
            name="name"
            required
            error={fieldErrors.name}
          >
            <input
              value={formData.name}
              onChange={(e) => handleNameChange("name", e.target.value)}
              placeholder="Chiffon Silk Mukhawar"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start"
            />
          </FormField>

          {/* NAME AR */}
          <FormField
            label="Name (AR)"
            name="nameAr"
            required
            error={fieldErrors.nameAr}
          >
            <input
              value={formData.nameAr}
              onChange={(e) => handleNameChange("nameAr", e.target.value)}
              placeholder="مخاوير شيفون حرير"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end"
            />
          </FormField>

          {/* DESCRIPTION (EN) */}
          <FormField label="Description">
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Buy our Premium Mukhawar ...."
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start bg-transparent resize-none overflow-hidden leading-[1.6]"
            />
          </FormField>

          {/* DESCRIPTION (AR) */}
          <FormField label="Description (AR)">
            <textarea
              rows={2}
              value={formData.descriptionAr}
              onChange={(e) => handleChange("descriptionAr", e.target.value)}
              placeholder="... اشترِ مخورنا الفاخر"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end bg-transparent resize-none overflow-hidden leading-[1.6]"
            />
          </FormField>

          {/* CODE */}
          <FormField label="Code (OPTIONAL)" name="code">
            <input
              value={formData.code}
              onChange={(e) => handleChange("code", e.target.value)}
              placeholder="0000"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          {/* STOCK */}
          <FormField
            label="Available Stock"
            error={fieldErrors.availableFabricStock}
            required
          >
            <input
              type="number"
              min="0"
              step="1"
              placeholder="05"
              value={getNumberDisplay(formData.availableFabricStock)}
              onChange={(e) =>
                handleNumberChange("availableFabricStock", e.target.value)
              }
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          {/* FABRIC STORE */}
          <FormField
            label="Fabric Store"
            name="fabricShopId"
            error={fieldErrors.fabricShopId}
            required
          >
            <select
              value={formData.fabricShopId}
              onChange={(e) => {
                const shopId = e.target.value;
                handleChange("fabricShopId", shopId);
                handleChange("fabricId", ""); // Reset selected fabric
              }}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent hover:cursor-pointer text-[14px]"
            >
              <option value="">Select Fabric Store</option>
              {fabricShops.map((shop) => (
                <option key={shop._id} value={shop._id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* FABRIC */}
          <FormField
            label="Fabric"
            name="fabricId"
            error={fieldErrors.fabricId}
            required
          >
            <select
              value={formData.fabricId}
              onChange={(e) => handleChange("fabricId", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent hover:cursor-pointer text-[14px]"
              disabled={!formData.fabricShopId}
            >
              <option value="">Select Fabric</option>
              {filteredFabrics.map((f) => (
                <option key={f._id} value={f._id}>
                  {localeParam === "ar" ? f.nameAr || f.name : f.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* TAILOR SHOP */}
          <FormField
            label="Tailor Shop"
            name="tailorShopId"
            error={fieldErrors.tailorShopId}
          >
            <select
              value={formData.tailorShopId}
              onChange={(e) => {
                const shopId = e.target.value;
                handleChange("tailorShopId", shopId);
                handleChange("designId", ""); // Reset selected design
              }}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent hover:cursor-pointer text-[14px]"
            >
              <option value="">Select Tailor Shop</option>
              {tailorShops.map((shop) => (
                <option key={shop._id} value={shop._id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* DESIGN */}
          <FormField
            label="Design"
            name="designId"
            error={fieldErrors.designId}
          >
            <select
              value={formData.designId}
              onChange={(e) => handleChange("designId", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent hover:cursor-pointer text-[14px]"
              disabled={!formData.tailorShopId}
            >
              <option value="">Select Design</option>
              {filteredDesigns.map((d) => (
                <option key={d._id} value={d._id}>
                  {localeParam === "ar" ? d.nameAr || d.name : d.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* METERS */}
          <FormField
            label="Fabric length (in meters)"
            error={fieldErrors.metersPerFabric}
            required
          >
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="3.5"
              value={getNumberDisplay(formData.metersPerFabric)}
              onChange={(e) => {
                if (e.target.value === "") {
                  handleChange("metersPerFabric", 0);
                } else {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    handleChange("metersPerFabric", val);
                  }
                }
              }}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          {/* FABRIC WIDTH */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
              Fabric Width
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="fabricWidth"
                  value="single"
                  checked={fabricWidth === "single"}
                  onChange={() => setFabricWidth("single")}
                  className="accent-black"
                />
                Single Width
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="fabricWidth"
                  value="double"
                  checked={fabricWidth === "double"}
                  onChange={() => setFabricWidth("double")}
                  className="accent-black"
                />
                Double Width
              </label>
            </div>
          </div>

          {/* PRICES */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              label="Fabric Price AED"
              error={fieldErrors.fabricPriceAED}
            >
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="450"
                value={getNumberDisplay(formData.fabricPriceAED)}
                onChange={(e) =>
                  handleNumberChange("fabricPriceAED", e.target.value)
                }
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
              />
            </FormField>

            <FormField
              label="Mukhawar Price AED"
              error={fieldErrors.mukhawarPriceAED}
            >
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="650"
                value={getNumberDisplay(formData.mukhawarPriceAED)}
                onChange={(e) =>
                  handleNumberChange("mukhawarPriceAED", e.target.value)
                }
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
              />
            </FormField>

            <FormField
              label="Final Selling Price AED"
              error={fieldErrors.finalSellingPriceAED}
              required
            >
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="1250"
                value={getNumberDisplay(formData.finalSellingPriceAED)}
                onChange={(e) =>
                  handleNumberChange("finalSellingPriceAED", e.target.value)
                }
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
              />
            </FormField>
          </div>

          {/* TAG + Color in one line */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Tag (ENG)" name="tag">
              <select
                value={formData.tag}
                onChange={(e) => handleChange("tag", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-start bg-transparent"
              >
                <option value="">Select tag</option>
                {TAG_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.en}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Tag (AR)" name="tagAr">
              <select
                value={formData.tagAr}
                onChange={(e) => handleChange("tagAr", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none text-end bg-transparent"
              >
                <option value="">اختر الوسم</option>
                {TAG_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.ar}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Colors" name="colors" required>
              <div className="relative" ref={colorsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setColorsOpen((prev) => !prev)}
                  className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent min-h-7 flex items-center"
                >
                  {formData.colors.length === 0 ? (
                    <span className="text-xs text-black/60 leading-none">
                      Select colors
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2 items-center">
                      {COLOR_OPTIONS.filter((c) =>
                        formData.colors.includes(c.value),
                      ).map((c) => (
                        <span
                          key={c.value}
                          className="inline-flex items-center justify-center"
                          title={c.en}
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-gray-200"
                            style={{ background: c.value }}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                {colorsOpen && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm p-3 z-50">
                    <div className="max-h-44 overflow-auto flex flex-col gap-2">
                      {COLOR_OPTIONS.map((opt) => {
                        const selected = formData.colors.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleColor(opt.value)}
                              className="accent-black"
                            />
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-full border border-gray-200"
                                style={{ background: opt.value }}
                              />
                              <span className="text-xs">
                                {opt.en} / {opt.ar}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </FormField>
          </div>

          {/* IMAGES */}
          <div className="md:col-span-2">
            <div className="mb-2 text-xs uppercase tracking-widest text-gray-500">
              Images (max 5) *
            </div>
            {fieldErrors.images && (
              <p className="text-red-500 text-sm mb-2">{fieldErrors.images}</p>
            )}

            {formData.images.map((img, idx) => (
              <div key={idx} className="mb-3">
                <ImageUpload
                  value={img}
                  onChange={(val) => handleImageChange(idx, val)}
                  chooseFileLabel={`Upload Image ${idx + 1}`}
                  uploadingLabel="Uploading..."
                  uploadFailedLabel="Failed"
                  removeLabel="Remove"
                />
                {formData.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="text-xs text-red-500 mt-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {formData.images.length < 5 && (
              <button
                type="button"
                onClick={addImage}
                className="text-xs underline"
              >
                + Add Image
              </button>
            )}
          </div>

          {/* IS ACTIVE */}
          <div className="md:col-span-2">
            <FormField label="Active Status" name="isActive">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange("isActive", e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Product is active (visible to customers)
                </label>
              </div>
            </FormField>
          </div>
        </div>

        {/* SUBMIT */}
        <div className="flex gap-3 pt-6 mt-3 border-t border-gray-100">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Update Product"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
