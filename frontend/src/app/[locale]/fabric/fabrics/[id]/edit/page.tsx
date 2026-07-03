"use client";

import { useParams } from "next/navigation";
import FabricDesignForm from "@/components/fabric/FabricDesignForm";

export default function EditFabricPage() {
    const params = useParams();
    const id = params.id as string;

    return <FabricDesignForm fabricId={id} />;
}
