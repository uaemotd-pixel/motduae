"use client";

import { useParams } from "next/navigation";

export default function RejectedTailorsPage() {
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/5 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-light text-black tracking-tight">
            Fasten your seatbelt.
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Rejected tailors are coming
          </p>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Admin oversight • Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
