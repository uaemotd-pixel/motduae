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
  X,
  Save,
  UserPlus,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api/client";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/media";

// ─── Types ──────────────────────────────────────────────────────────────
type Relationship = "mother" | "aunt" | "sister" | "daughter" | "other";

type FamilyMember = {
  _id: string;
  name: string;
  relationship: Relationship;
  phone: string;
  email?: string;
  profilePic?: string;
  createdAt: string;
};

type FormData = Omit<FamilyMember, "_id" | "createdAt">;

const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  mother: "Mother",
  aunt: "Aunt",
  sister: "Sister",
  daughter: "Daughter",
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

  // Stats
  const stats = {
    total: members.length,
    mothers: members.filter((m) => m.relationship === "mother").length,
    others: members.filter((m) => m.relationship !== "mother").length,
  };

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

  // Filter members
  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(term) ||
      m.phone.includes(term) ||
      (m.email && m.email.toLowerCase().includes(term)) ||
      RELATIONSHIP_LABELS[m.relationship].toLowerCase().includes(term)
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Total Members
          </p>
          <p className="text-2xl font-light text-black mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Mothers
          </p>
          <p className="text-2xl font-light text-black mt-1">{stats.mothers}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Other Relations
          </p>
          <p className="text-2xl font-light text-black mt-1">{stats.others}</p>
        </div>
      </div>

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
          Add Family Member
        </button>
      </div>

      {/* Table */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {searchTerm
              ? "No members match your search."
              : "No family members added yet."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setAddingMember(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              <Plus className="w-4 h-4" />
              Add your first member
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold uppercase">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-medium text-black">
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
                      {RELATIONSHIP_LABELS[member.relationship]}
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
                          className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition"
                          aria-label="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
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
      )}
    </div>
  );
}
