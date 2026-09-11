import { useOutletContext } from "react-router-dom";
import { UserCircle } from "lucide-react";

export default function DashboardHome() {
  const { dbUser, session } = useOutletContext();

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold">
          Bienvenido <span className="text-primary">{dbUser.nombre_dni}</span>,
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta Principal (Tu ficha) */}
        <div className="md:col-span-2 bg-surface p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="bg-zinc-800 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <UserCircle className="text-primary w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold mb-2">Tu Ficha Médica</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Administra tu perfil, revisa el estado de tus expedientes y accede
              a tu historial operativo dentro del SAME.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-zinc-500 mb-2">
              <span>ESTADO DE CUENTA</span>
              <span>ACTIVO</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-6">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: "100%" }}
              ></div>
            </div>
            <button className="bg-primary hover:bg-yellow-400 text-black font-bold py-2.5 px-6 rounded-lg text-sm transition-transform active:scale-95">
              Gestionar Perfil →
            </button>
          </div>
        </div>

        {/* Tarjeta Secundaria (Estado y Rol) */}
        <div className="bg-surface p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 mb-4">
            🛡️ Seguridad y Accesos
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
              <span className="text-sm">Autenticación (Discord)</span>
              <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-md font-bold">
                Vinculado
              </span>
            </div>
            <div>
              <span className="text-sm text-zinc-400 block mb-2">
                Nivel de Acceso
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-zinc-800 px-3 py-1.5 rounded-md text-zinc-300 border border-zinc-700">
                  🔑 {dbUser.rango}
                </span>
                <span className="text-xs bg-zinc-800 px-3 py-1.5 rounded-md text-zinc-300 border border-zinc-700">
                  Legajo: {dbUser.legajo}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-8 text-xs text-zinc-600 text-center border-t border-zinc-800 pt-4">
            Discord ID: {session.user.user_metadata.provider_id}
          </div>
        </div>
      </div>
    </div>
  );
}
