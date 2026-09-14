"use client";

import { useParams } from "next/navigation";
import TailorDesignForm from "@/components/tailor/TailorDesignForm";

export default function AdminEditDesignPage() {
  const params = useParams();
  const id = params.id as string;

  return <TailorDesignForm mode="admin" designId={id} />;
}
