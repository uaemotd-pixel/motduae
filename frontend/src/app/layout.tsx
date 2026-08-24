import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

// Required for root `not-found.tsx`. Do not render <html>/<body> here —
// `[locale]/layout.tsx` owns the document so `lang` and `dir` can follow
// the active locale. A second document tree hydrates as
// <html> inside <body>.
export default function RootLayout({ children }: Props) {
  return children;
}
