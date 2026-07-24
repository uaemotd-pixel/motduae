"use client";

import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  Check,
  Tags,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";

interface Tag {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Helper: convert to lowercase slug format
const toSlug = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

// Helper: lowercase with spaces preserved for display
const toLowerPreserveSpaces = (str: string): string => {
  return str.toLowerCase().trim();
};

export default function AdminSettingsTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formNameAr, setFormNameAr] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDescriptionAr, setFormDescriptionAr] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const data = await api.get<Tag[]>("/api/admin/tags");
      setTags(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to load tags"));
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const filteredTags = tags.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  });

  const openAddModal = () => {
    setEditingTag(null);
    setFormName("");
    setFormNameAr("");
    setFormDescription("");
    setFormDescriptionAr("");
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormNameAr(tag.nameAr || "");
    setFormDescription(tag.description || "");
    setFormDescriptionAr(tag.descriptionAr || "");
    setFormIsActive(tag.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name: toSlug(formName),
      nameAr: toLowerPreserveSpaces(formNameAr),
      domain: "general",
      description: formDescription,
      descriptionAr: formDescriptionAr,
      isActive: formIsActive,
    };
    try {
      if (editingTag) {
        await api.put(`/api/admin/tags/${editingTag._id}`, payload);
        toast.success("Tag updated");
      } else {
        await api.post("/api/admin/tags", payload);
        toast.success("Tag created");
      }
      setShowModal(false);
      fetchTags();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to save tag"));
    } finally {
      setSubmitting(false);
    }
  };

  const promptDelete = (id: string) => {
    setTagToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!tagToDelete) return;
    setDeletingId(tagToDelete);
    setShowDeleteConfirm(false);
    try {
      await api.delete(`/api/admin/tags/${tagToDelete}`);
      toast.success("Tag deleted");
      fetchTags();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete tag"));
    } finally {
      setDeletingId(null);
      setTagToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setTagToDelete(null);
  };

  const toggleActive = async (tag: Tag) => {
    const newIsActive = !tag.isActive;
    setTags((prev) =>
      prev.map((t) =>
        t._id === tag._id ? { ...t, isActive: newIsActive } : t,
      ),
    );
    setTogglingId(tag._id);
    try {
      await api.put(`/api/admin/tags/${tag._id}`, {
        isActive: newIsActive,
      });
      toast.success(`Tag ${newIsActive ? "activated" : "deactivated"}`);
    } catch (err: unknown) {
      setTags((prev) =>
        prev.map((t) =>
          t._id === tag._id ? { ...t, isActive: !newIsActive } : t,
        ),
      );
      toast.error(getApiErrorMessage(err, "Failed to update tag"));
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return "";
    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(new Date(d));
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-lg">
              <Tags className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
                Tags
              </h1>
              <p className="text-gray-500 text-sm">
                Manage tags used to label products across your platform
              </p>
            </div>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={openAddModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 transition-all hover:cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Tag
        </motion.button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags by name or description..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-shadow shadow-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition hover:cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Count badge */}
      {!loading && tags.length > 0 && (
        <div className="text-xs text-gray-400 font-medium tracking-wide uppercase">
          {filteredTags.length === tags.length
            ? `${tags.length} tag${tags.length === 1 ? "" : "s"} total`
            : `${filteredTags.length} of ${tags.length} tag${tags.length === 1 ? "" : "s"}`}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-gray-200 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-500 mt-4">Loading tags...</p>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-20 h-20 bg-linear-to-br from-gray-50 to-gray-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
            <Tags className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {searchQuery ? "No matching tags" : "No tags yet"}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            {searchQuery
              ? "Try a different search term or clear the filter."
              : "Create your first tag to start labeling products."}
          </p>
          {!searchQuery && (
            <motion.button
              type="button"
              onClick={openAddModal}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium shadow-lg shadow-gray-900/20 hover:shadow-xl transition-all hover:cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Tag
            </motion.button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {filteredTags.map((tag, index) => (
              <motion.div
                key={tag._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                        {tag.name}
                      </h3>
                      {tag.nameAr && (
                        <span
                          dir="rtl"
                          className="text-sm text-gray-400 font-normal"
                        >
                          {tag.nameAr}
                        </span>
                      )}
                      <motion.button
                        type="button"
                        onClick={() => toggleActive(tag)}
                        disabled={togglingId === tag._id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={`Click to ${tag.isActive ? "deactivate" : "activate"}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                          tag.isActive
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 hover:bg-red-50 hover:text-red-600 hover:ring-red-300"
                            : "bg-gray-50 text-gray-400 ring-1 ring-gray-300/20 hover:bg-gray-100 hover:text-gray-500"
                        }`}
                      >
                        {togglingId === tag._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : tag.isActive ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {tag.isActive ? "Active" : "Inactive"}
                      </motion.button>
                    </div>
                    {tag.description && (
                      <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {tag.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {tag.createdAt && (
                        <span className="text-xs text-gray-400">
                          Created {formatDate(tag.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      type="button"
                      onClick={() => openEditModal(tag)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-all hover:cursor-pointer"
                      aria-label="Edit tag"
                    >
                      <Pencil className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      type="button"
                      disabled={deletingId === tag._id}
                      onClick={() => promptDelete(tag._id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all hover:cursor-pointer disabled:opacity-50"
                      aria-label="Delete tag"
                    >
                      {deletingId === tag._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingTag ? "Edit Tag" : "New Tag"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {editingTag
                        ? "Update the tag details below."
                        : "Fill in the details to create a new tag."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition hover:cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. new-arrival (will become lowercase slug)"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-shadow"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Will be saved as: {formName ? toSlug(formName) : "..."}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Name (Arabic) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formNameAr}
                        onChange={(e) => setFormNameAr(e.target.value)}
                        dir="rtl"
                        placeholder="مثال: الوصلات الجديدة"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-shadow"
                      />
                      <p className="text-xs text-gray-400 mt-1 text-right">
                        {formNameAr ? toLowerPreserveSpaces(formNameAr) : "..."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={3}
                        placeholder="Brief description in English..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-shadow resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description (Arabic)
                      </label>
                      <textarea
                        value={formDescriptionAr}
                        onChange={(e) => setFormDescriptionAr(e.target.value)}
                        rows={3}
                        dir="rtl"
                        placeholder="وصف باللغة العربية..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-shadow resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <label
                      htmlFor="isActive"
                      className="text-sm text-gray-700 cursor-pointer select-none"
                    >
                      <span className="font-medium">Active</span>
                      <span className="text-gray-400 ml-1">
                        — visible and usable across the platform
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition hover:cursor-pointer"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-2.5 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium shadow-lg shadow-gray-900/20 hover:shadow-xl transition-all disabled:opacity-50 hover:cursor-pointer inline-flex items-center gap-2"
                    >
                      {submitting && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      {submitting
                        ? "Saving..."
                        : editingTag
                          ? "Update Tag"
                          : "Create Tag"}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Tag"
        message="Are you sure you want to delete this tag? This action cannot be undone. Products using this tag may be affected."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={deletingId !== null}
        isDanger
      />
    </div>
  );
}
