import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "../config/supabaseClient";
import logoSame from "../assets/SAME1.png";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  BookOpen,
  LogOut,
  Loader2,
} from "lucide-react";
import { Activity } from "lucide-react"; // No olvides importar el ícono

export default function DashboardLayout() {
  const [session, setSession] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const initLayout = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        // Buscamos si el ID de Discord está registrado en nuestra base de datos
        const discordId = session.user.user_metadata.provider_id;
        const { data } = await supabase
          .from("miembros_same")
          .select("*")
          .eq("discord_id", discordId)
          .single();

        if (data) setDbUser(data);
      }
      setLoading(false);
    };
    initLayout();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    );

  // Bloqueo de seguridad: Si tiene sesión de Discord pero no está en la base de datos del SAME
  if (!dbUser) {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-10">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
        <p className="text-zinc-400 mb-6">
          Tu usuario de Discord no figura en la base de datos del SAME.
        </p>
        <button
          onClick={handleLogout}
          className="bg-surface hover:bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  // Menú dinámico basado en permisos (Por ahora todos ven todo, luego lo filtramos)
  // Menú dinámico basado en permisos (Por ahora todos ven todo, luego lo filtramos)
  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Médicos", path: "/dashboard/medicos", icon: Users },
    { name: "Blacklist", path: "/dashboard/blacklist", icon: ShieldAlert },
    { name: "Protocolos", path: "/dashboard/protocolos", icon: BookOpen },
    { name: "Bitácoras", path: "/dashboard/bitacoras", icon: Activity }, // <-- ¡Esta es la línea nueva!
  ];

  return (
    <div className="min-h-screen bg-background text-white flex">
      {/* Sidebar calcada a tu diseño */}
      <aside className="w-64 bg-surface border-r border-zinc-800 flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logoSame}
              alt="Logo SAME"
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-lg tracking-wider">
              SAME ZONA SUR
            </span>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-800 text-primary"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Perfil del usuario al fondo de la sidebar */}
        <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={session.user.user_metadata.avatar_url}
              alt="Avatar"
              className="w-9 h-9 rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold truncate">
                {dbUser.nombre_dni}
              </span>
              <span className="text-xs text-zinc-500 truncate">
                {dbUser.rango}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-500 hover:text-red-400"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Contenedor Principal (Aquí se inyectan las páginas) */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet context={{ dbUser, session }} />
      </main>
    </div>
  );
}
