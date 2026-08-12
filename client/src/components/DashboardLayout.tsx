import AppLayout from "@/components/AppLayout";

/**
 * Compatibility wrapper retained for feature pages created before CourtVision
 * adopted its full coaching workspace navigation. Every authenticated tool now
 * shares the same branded purple-and-gold shell and complete route menu.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
