export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* Solid background only — no app gradient in dashboard */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {children}
    </div>
  );
}
