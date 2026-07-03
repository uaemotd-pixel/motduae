"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, type ApiError } from "@/lib/api/client";
import type { FabricDetailItem } from "@/lib/fabrics";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import FabricDetailView from "@/components/fabric/FabricDetailView";
import { Link } from "@/i18n/navigation";

const colorOptions = [
  { name: "Aqua", value: "aqua", bg: "#00FFFF" },
  { name: "Aquamarine", value: "aquamarine", bg: "#7FFFD4" },
  { name: "Beige", value: "beige", bg: "#F5F5DC" },
  { name: "Bisque", value: "bisque", bg: "#FFE4C4" },
  { name: "Black", value: "black", bg: "#000000" },
  { name: "Blue", value: "blue", bg: "#0000FF" },
  { name: "Blue Violet", value: "blueviolet", bg: "#8A2BE2" },
  { name: "Brown", value: "brown", bg: "#A52A2A" },
  { name: "Burlywood", value: "burlywood", bg: "#DEB887" },
  { name: "Cadet Blue", value: "cadetblue", bg: "#5F9EA0" },
  { name: "Chocolate", value: "chocolate", bg: "#D2691E" },
  { name: "Coral", value: "coral", bg: "#FF7F50" },
  { name: "Cornflower Blue", value: "cornflowerblue", bg: "#6495ED" },
  { name: "Cornsilk", value: "cornsilk", bg: "#FFF8DC" },
  { name: "Crimson", value: "crimson", bg: "#DC143C" },
  { name: "Cyan", value: "cyan", bg: "#00FFFF" },
  { name: "Dark Blue", value: "darkblue", bg: "#00008B" },
  { name: "Dark Cyan", value: "darkcyan", bg: "#008B8B" },
  { name: "Dark Goldenrod", value: "darkgoldenrod", bg: "#B8860B" },
  { name: "Dark Gray", value: "darkgray", bg: "#A9A9A9" },
  { name: "Dark Green", value: "darkgreen", bg: "#006400" },
  { name: "Dark Khaki", value: "darkkhaki", bg: "#BDB76B" },
  { name: "Dark Magenta", value: "darkmagenta", bg: "#8B008B" },
  { name: "Dark Orchid", value: "darkorchid", bg: "#9932CC" },
  { name: "Dark Red", value: "darkred", bg: "#8B0000" },
  { name: "Dark Salmon", value: "darksalmon", bg: "#E9967A" },
  { name: "Dark Sea Green", value: "darkseagreen", bg: "#8FBC8F" },
  { name: "Dark Slate Blue", value: "darkslateblue", bg: "#483D8B" },
  { name: "Dark Slate Gray", value: "darkslategray", bg: "#2F4F4F" },
  { name: "Dark Turquoise", value: "darkturquoise", bg: "#00CED1" },
  { name: "Dark Violet", value: "darkviolet", bg: "#9400D3" },
  { name: "Deep Pink", value: "deeppink", bg: "#FF1493" },
  { name: "Deep Sky Blue", value: "deepskyblue", bg: "#00BFFF" },
  { name: "Dim Gray", value: "dimgray", bg: "#696969" },
  { name: "Dodger Blue", value: "dodgerblue", bg: "#1E90FF" },
  { name: "Firebrick", value: "firebrick", bg: "#B22222" },
  { name: "Fuchsia", value: "fuchsia", bg: "#FF00FF" },
  { name: "Gainsboro", value: "gainsboro", bg: "#DCDCDC" },
  { name: "Gold", value: "gold", bg: "#FFD700" },
  { name: "Goldenrod", value: "goldenrod", bg: "#DAA520" },
  { name: "Gray", value: "gray", bg: "#808080" },
  { name: "Green", value: "green", bg: "#008000" },
  { name: "Green Yellow", value: "greenyellow", bg: "#ADFF2F" },
  { name: "Grey", value: "grey", bg: "#808080" },
  { name: "Hot Pink", value: "hotpink", bg: "#FF69B4" },
  { name: "Indian Red", value: "indianred", bg: "#CD5C5C" },
  { name: "Indigo", value: "indigo", bg: "#4B0082" },
  { name: "Ivory", value: "ivory", bg: "#FFFFF0" },
  { name: "Khaki", value: "khaki", bg: "#F0E68C" },
  { name: "Lavender", value: "lavender", bg: "#E6E6FA" },
  { name: "Light Blue", value: "lightblue", bg: "#ADD8E6" },
  { name: "Light Gray", value: "lightgray", bg: "#D3D3D3" },
  { name: "Light Green", value: "lightgreen", bg: "#90EE90" },
  { name: "Light Pink", value: "lightpink", bg: "#FFB6C1" },
  { name: "Light Salmon", value: "lightsalmon", bg: "#FFA07A" },
  { name: "Light Sea Green", value: "lightseagreen", bg: "#20B2AA" },
  { name: "Light Sky Blue", value: "lightskyblue", bg: "#87CEFA" },
  { name: "Light Slate Gray", value: "lightslategray", bg: "#778899" },
  { name: "Light Steel Blue", value: "lightsteelblue", bg: "#B0C4DE" },
  { name: "Maroon", value: "maroon", bg: "#800000" },
  { name: "Medium Blue", value: "mediumblue", bg: "#0000CD" },
  { name: "Medium Purple", value: "mediumpurple", bg: "#9370DB" },
  { name: "Medium Sea Green", value: "mediumseagreen", bg: "#3CB371" },
  { name: "Medium Slate Blue", value: "mediumslateblue", bg: "#7B68EE" },
  { name: "Medium Turquoise", value: "mediumturquoise", bg: "#48D1CC" },
  { name: "Medium Violet Red", value: "mediumvioletred", bg: "#C71585" },
  { name: "Midnight Blue", value: "midnightblue", bg: "#191970" },
  { name: "Moccasin", value: "moccasin", bg: "#FFE4B5" },
  { name: "Navy", value: "navy", bg: "#000080" },
  { name: "Olive", value: "olive", bg: "#808000" },
  { name: "Olive Drab", value: "olivedrab", bg: "#6B8E23" },
  { name: "Orange", value: "orange", bg: "#FFA500" },
  { name: "Orchid", value: "orchid", bg: "#DA70D6" },
  { name: "Pale Goldenrod", value: "palegoldenrod", bg: "#EEE8AA" },
  { name: "Pale Green", value: "palegreen", bg: "#98FB98" },
  { name: "Pale Turquoise", value: "paleturquoise", bg: "#AFEEEE" },
  { name: "Pale Violet Red", value: "palevioletred", bg: "#DB7093" },
  { name: "Peach Puff", value: "peachpuff", bg: "#FFDAB9" },
  { name: "Pink", value: "pink", bg: "#FFC0CB" },
  { name: "Plum", value: "plum", bg: "#DDA0DD" },
  { name: "Powder Blue", value: "powderblue", bg: "#B0E0E6" },
  { name: "Purple", value: "purple", bg: "#800080" },
  { name: "Rebecca Purple", value: "rebeccapurple", bg: "#663399" },
  { name: "Red", value: "red", bg: "#FF0000" },
  { name: "Rosy Brown", value: "rosybrown", bg: "#BC8F8F" },
  { name: "Royal Blue", value: "royalblue", bg: "#4169E1" },
  { name: "Saddle Brown", value: "saddlebrown", bg: "#8B4513" },
  { name: "Salmon", value: "salmon", bg: "#FA8072" },
  { name: "Sandy Brown", value: "sandybrown", bg: "#F4A460" },
  { name: "Sea Green", value: "seagreen", bg: "#2E8B57" },
  { name: "Silver", value: "silver", bg: "#C0C0C0" },
  { name: "Sky Blue", value: "skyblue", bg: "#87CEEB" },
  { name: "Slate Blue", value: "slateblue", bg: "#6A5ACD" },
  { name: "Slate Gray", value: "slategray", bg: "#708090" },
  { name: "Steel Blue", value: "steelblue", bg: "#4682B4" },
  { name: "Tan", value: "tan", bg: "#D2B48C" },
  { name: "Teal", value: "teal", bg: "#008080" },
  { name: "Thistle", value: "thistle", bg: "#D8BFD8" },
  { name: "Tomato", value: "tomato", bg: "#FF6347" },
  { name: "Turquoise", value: "turquoise", bg: "#40E0D0" },
  { name: "Violet", value: "violet", bg: "#EE82EE" },
  { name: "Wheat", value: "wheat", bg: "#F5DEB3" },
  { name: "White", value: "white", bg: "#FFFFFF" },
  { name: "Yellow", value: "yellow", bg: "#FFFF00" },
  { name: "Yellow Green", value: "yellowgreen", bg: "#9ACD32" },
];

export default function FabricDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("FabricDetail");
  const slug = params.slug as string;
  const locale = params.locale === "ar" ? "ar" : "en";

  const [fabric, setFabric] = useState<FabricDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFabric = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api.get<{
          success: boolean;
          item: FabricDetailItem;
        }>(`/api/fabrics/${slug}`);

        if (!data?.success || !data.item) {
          throw new Error("Fabric not found");
        }

        setFabric(data.item);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load fabric");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchFabric();
  }, [slug]);

  // Helper to get color display
  const getColorDisplay = (colors: string[] | undefined) => {
    if (!colors || colors.length === 0) {
      return locale === "ar" ? "بدون لون" : "No color";
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {colors.slice(0, 8).map((color, index) => {
          const colorObj = colorOptions.find(
            (c) => c.value.toLowerCase() === color.toLowerCase()
          );
          return (
            <span
              key={index}
              className="w-6 h-6 rounded-full border border-[#E4E0D8] shrink-0"
              style={{
                backgroundColor: colorObj?.bg || "#CCCCCC",
              }}
              title={color}
            />
          );
        })}
        {colors.length > 8 && (
          <span className="text-[10px] text-[#8A8A80] font-mono">
            +{colors.length - 8}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
            {t("loading")}
          </p>
        </div>
      </MainLayout>
    );
  }

  if (error || !fabric) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="[font-family:var(--font-display)] text-2xl text-black mb-3">
              {t("notFoundTitle")}
            </h1>
            <p className="text-sm text-(--color-grey-muted) mb-6">
              {error || t("notFound")}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/fabrics/fabricStore"
                className="px-6 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition"
              >
                {t("browseAll")}
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-black text-[10px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition"
              >
                {t("goBack")}
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Pass colors as visual circles to FabricDetailView
  const enhancedFabric = {
    ...fabric,
    colorDisplay: getColorDisplay(fabric.color),
  };

  return (
    <MainLayout>
      <FadeInSection>
        <FabricDetailView
          fabric={enhancedFabric}
          locale={locale}
          labels={{
            fabrics: t("fabrics"),
            material: t("material"),
            color: [t("color")],
            city: t("city"),
            perMeter: t("perMeter"),
            selectForCustomOrder: t("selectForCustomOrder"),
            storeTitle: t("storeTitle"),
            pickupLabel: t("pickupLabel"),
            partnerNote: t("partnerNote"),
          }}
        />
      </FadeInSection>
    </MainLayout>
  );
}