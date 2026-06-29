"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, type ApiError } from "@/lib/api/client";
import toast from "react-hot-toast";
import { Star } from "lucide-react";

interface Review {
  _id: string;
  rating: number;
  quoteEn: string;
  quoteAr: string;
  titleEn: string;
  titleAr: string;
  createdAt: string;
}

const TOAST_BASE = {
  position: "top-right" as const,
  duration: 6000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    letterSpacing: "0.04em",
    borderRadius: "0",
    padding: "14px 18px",
    maxWidth: "360px",
  },
};

const SUCCESS_TOAST = {
  ...TOAST_BASE,
  style: {
    ...TOAST_BASE.style,
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #86efac",
  },
  iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
};

const ERROR_TOAST = {
  ...TOAST_BASE,
  style: {
    ...TOAST_BASE.style,
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
  },
  iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
};

const INPUT_CLASS =
  "w-full border border-gray-200 bg-white px-4 py-3 text-[14px] [font-family:var(--font-body)] text-black focus:border-black focus:outline-none transition-colors";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[100px] resize-y`;

export default function CustomerReviewsView() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  
  // Form State
  const [rating, setRating] = useState<number>(5);
  const [quoteEn, setQuoteEn] = useState("");
  const [quoteAr, setQuoteAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const fetchProfileAndReviews = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/customer/profile");
      if (data && data.reviews) {
        // Sort reviews: newest first
        const sorted = [...data.reviews].sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setReviews(sorted);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndReviews();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!quoteEn.trim()) {
      toast.error("Please enter a review comment.", ERROR_TOAST);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        rating,
        quoteEn: quoteEn.trim(),
        quoteAr: quoteAr.trim() || undefined,
        titleEn: titleEn.trim() || undefined,
        titleAr: titleAr.trim() || undefined,
      };

      await api.post("/api/customer/reviews", payload);
      
      toast.success("Review submitted successfully! It will appear on the homepage.", SUCCESS_TOAST);
      
      // Reset form
      setQuoteEn("");
      setQuoteAr("");
      setTitleEn("");
      setTitleAr("");
      setRating(5);
      
      // Reload reviews
      fetchProfileAndReviews();
    } catch (err: any) {
      const msg = err.message || "Failed to submit review. Make sure your profile is completed.";
      toast.error(msg, ERROR_TOAST);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-10 justify-center">
        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        <span className="[font-family:var(--font-ui)] text-sm tracking-widest uppercase text-gray-500">Loading reviews…</span>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Add Review Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-['Ivy_Ora'] mb-2 text-black">
          Write a Review
        </h2>
        <p className="text-gray-500 text-sm font-['TT_Norms_Pro'] mb-6">
          Share your experience with MOTD. Your review will be featured on the homepage.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating Select */}
          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
              Rating
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = star <= (hoverRating ?? rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        isSelected
                          ? "fill-black stroke-black text-black"
                          : "fill-none stroke-gray-300 text-gray-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[11px] uppercase tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
                Review (English) *
              </label>
              <textarea
                value={quoteEn}
                onChange={(e) => setQuoteEn(e.target.value)}
                placeholder="The fabrics and tailoring were exceptional..."
                className={TEXTAREA_CLASS}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] uppercase tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
                التقييم (العربية) - اختياري
              </label>
              <textarea
                value={quoteAr}
                onChange={(e) => setQuoteAr(e.target.value)}
                placeholder="كانت الأقمشة والتفصيل استثنائية..."
                className={TEXTAREA_CLASS}
                dir="rtl"
              />
            </div>
          </div>

          {/* Title / Description inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[11px] uppercase tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
                Your Job / Location (English)
              </label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. Architect · Dubai"
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] uppercase tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
                المهنة والمدينة (العربية)
              </label>
              <input
                type="text"
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder="مثال: مهندسة معمارية · دبي"
                className={INPUT_CLASS}
                dir="rtl"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-gray-800 transition disabled:opacity-50 [font-family:var(--font-ui)] cursor-pointer"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>

      {/* Past Reviews List */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-['Ivy_Ora'] mb-6 text-black">
          My Past Reviews
        </h2>

        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm font-['TT_Norms_Pro']">
            You haven't submitted any reviews yet.
          </p>
        ) : (
          <div className="space-y-6 divide-y divide-gray-100">
            {reviews.map((rev, index) => (
              <div key={rev._id} className={`pt-6 ${index === 0 ? "pt-0" : ""}`}>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rev.rating
                          ? "fill-black stroke-black text-black"
                          : "fill-none stroke-gray-300 text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-400 ml-2 font-['TT_Norms_Pro']">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-[13px] text-gray-400 font-['TT_Norms_Pro'] uppercase tracking-[0.1em] mb-1">
                      English: {rev.titleEn || "Client"}
                    </p>
                    <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed italic text-gray-800">
                      "{rev.quoteEn}"
                    </p>
                  </div>
                  {rev.quoteAr && (
                    <div className="text-right">
                      <p className="text-[13px] text-gray-400 font-['TT_Norms_Pro'] uppercase tracking-[0.1em] mb-1" dir="rtl">
                        العربية: {rev.titleAr || "عميل"}
                      </p>
                      <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed italic text-gray-800" dir="rtl">
                        "{rev.quoteAr}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
