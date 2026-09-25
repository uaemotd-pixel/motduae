import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ActivityLogViewer from "@/components/activity-log/ActivityLogViewer";
import { ACTIVITY_LOG_URL_KEY } from "@/lib/activityLog/access";

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export const metadata: Metadata = {
  title: "Activity Log · MOTD",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ActivityLogPage({ params }: Props) {
  const { token: rawToken } = await params;
  const token = String(rawToken ?? "").trim();
  if (!token || token !== ACTIVITY_LOG_URL_KEY) {
    notFound();
  }

  return <ActivityLogViewer />;
}
