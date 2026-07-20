// app/[locale]/dashboard/family-members/page.tsx
"use client";

import { useParams } from "next/navigation";
import FamilyMemberForm from "@/app/[locale]/account/family-members/new/page";
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api/client";
import { resolveMediaUrl } from "@/lib/media";

// ─── Types ──────────────────────────────────────────────────────────────
type Relationship =
  | "wife"
  | "mother"
  | "aunt"
  | "sister"
  | "daughter"
  | "friend"
  | "other";

type FamilyMember = {
  _id: string;
  name: string;
  relationship: Relationship;
  phone: string;
  email?: string;
  profilePic?: string;
  createdAt: string;
};

const KNOWN_RELATIONSHIPS = [
  "wife",
  "mother",
  "aunt",
  "sister",
  "daughter",
  "friend",
  "other",
];

const RELATIONSHIP_LABELS: Record<string, string> = {
  wife: "Wife",
  mother: "Mother",
  aunt: "Aunt",
  sister: "Sister",
  daughter: "Daughter",
  friend: "Friend",
  other: "Other",
};

// ─── Main Component ──────────────────────────────────────────────────
export default function FamilyMembersPage() {
  const params = useParams();
  const locale = params.locale as string;

  // State
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  // ── Fetch ──
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<{ items: FamilyMember[] }>(
        "/api/customer/family-members",
      );
      setMembers(data.items || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load family members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this family member?")) return;
    try {
      await api.delete(`/api/customer/family-members/${id}`);
      toast.success("Member removed");
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper to get display label for relationship
  const getRelationshipLabel = (rel: string) => {
    return RELATIONSHIP_LABELS[rel] || rel;
  };

  // Filter members
  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(term) ||
      m.phone.includes(term) ||
      (m.email && m.email.toLowerCase().includes(term)) ||
      getRelationshipLabel(m.relationship).toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (addingMember) {
    return (
      <div>
        <FamilyMemberForm
          onCancel={() => setAddingMember(false)}
          onSuccess={() => {
            fetchMembers();
            setAddingMember(false);
          }}
        />
      </div>
    );
  }

  if (editingMember) {
    return (
      <FamilyMemberForm
        initialData={editingMember}
        onCancel={() => setEditingMember(null)}
        onSuccess={() => {
          fetchMembers();
          setEditingMember(null);
        }}
      />
    );
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Search + Add Button */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
          />
        </div>
        <button
          onClick={() => setAddingMember(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition hover:cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Table */}
      {/* Mobile Cards + Desktop Table */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {searchTerm
              ? "No members match your search."
              : "No members added yet."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setAddingMember(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition hover:cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add your first member
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards - visible on small screens */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filteredMembers.map((member) => (
              <div
                key={member._id}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {member.profilePic ? (
                        <img
                          src={resolveMediaUrl(member.profilePic)}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover bg-gray-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-medium uppercase shrink-0">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-black truncate">
                          {member.name}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] sm:text-xs text-gray-500 truncate flex-1">
                            {getRelationshipLabel(member.relationship)}
                          </p>
                          <div className="flex gap-0.5 sm:gap-1 shrink-0">
                            <button
                              onClick={() => setEditingMember(member)}
                              className="p-1 sm:p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition"
                              aria-label="Edit"
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(member._id)}
                              className="p-1 sm:p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">Phone</p>
                      <p className="text-gray-700 font-medium truncate">
                        {member.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Email</p>
                      <p className="text-gray-700 font-medium truncate">
                        {member.email || "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Added</p>
                      <p className="text-gray-700 font-medium">
                        {formatDate(member.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table - hidden on small screens */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Relationship
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                      Added
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMembers.map((member) => (
                    <tr
                      key={member._id}
                      className="group hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {member.profilePic ? (
                            <img
                              src={resolveMediaUrl(member.profilePic)}
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover bg-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-medium uppercase">
                              {member.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm font-medium text-black">
                            {member.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
                        {getRelationshipLabel(member.relationship)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                        {member.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                        {member.email || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden xl:table-cell">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-start gap-2">
                          <button
                            onClick={() => setEditingMember(member)}
                            className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition hover:cursor-pointer"
                            aria-label="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition hover:cursor-pointer"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
