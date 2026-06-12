"use client";

import { useParams } from "next/navigation";
import TailorDesignForm from "@/components/tailor/TailorDesignForm";

export default function EditTailorDesignPage() {
    const params = useParams();
    const designId = params.id as string;

    return <TailorDesignForm designId={designId} />;
}
