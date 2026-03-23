import { verifyAdmin } from "@/lib/admin";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      {children}
    </div>
  );
}

async function AdminNav() {
  const isAdmin = await verifyAdmin();

  if (!isAdmin) return null;

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link
              href="/admin/dashboard"
              className="font-bold text-slate-900"
            >
              Cmotion Admin
            </Link>
            <Link
              href="/admin/dashboard"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Voir le site →
            </Link>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-red-600 hover:text-red-800"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
