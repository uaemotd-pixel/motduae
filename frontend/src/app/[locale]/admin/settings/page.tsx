import { redirect } from "next/navigation";

export default function AdminSettingsPage() {
  // Redirect to the general settings sub-page by default
  redirect("./general");
}

