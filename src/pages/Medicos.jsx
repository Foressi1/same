import { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../config/supabaseClient";
import { User, Loader2, GraduationCap, Award, Medal } from "lucide-react";
import ModalEditarMedico from "../components/ModalEditarMedico";
import ModalPerfilMedico from "../components/ModalPerfilMedico";

export default function Medicos() {
  const { dbUser, session } = useOutletContext();
  const [medicos, setMedicos] = useState([]);
  const [activas, setActivas] = useState([]); // <-- Nuevo estado para bitácoras activas
  const [loading, setLoading] = useState(true);

  const [medicoSeleccionado, setMedicoSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  const esJefatura = ["Directora", "Jefe", "SubJefe"].includes(dbUser.rango);
  const esTutor = dbUser.es_tutor === true;

  const fetchMedicos = useCallback(async () => {
    setLoading(true);
    let queryMedicos = supabase.from("miembros_same").select("*");

    if (!esJefatura && esTutor) {
      queryMedicos = queryMedicos.or(
        `tutor.eq."${dbUser.nombre_dni}",discord_id.eq.${dbUser.discord_id}`,
      );
    } else if (!esJefatura && !esTutor) {
      queryMedicos = queryMedicos.eq("discord_id", dbUser.discord_id);
    }

    // Traemos los médicos y las bitácoras activas en paralelo
    const [resMedicos, resActivas] = await Promise.all([
      queryMedicos,
      supabase.from("bitacoras_activas").select("discord_id"),
    ]);

    if (resActivas.data) {
      // Guardamos un array simple solo con los IDs de Discord en servicio
      setActivas(resActivas.data.map((a) => a.discord_id));
    }

    if (!resMedicos.error && resMedicos.data) {
      const ordenados = resMedicos.data.sort((a, b) => {
        if (a.discord_id === dbUser.discord_id) return -1;
        if (b.discord_id === dbUser.discord_id) return 1;
        return 0;
      });
      setMedicos(ordenados);
    }
    setLoading(false);
  }, [dbUser, esJefatura, esTutor]);

  useEffect(() => {
    fetchMedicos();
  }, [fetchMedicos]);

  const handleRefrescarDatos = () => {
    setModoEdicion(false);
    setMedicoSeleccionado(null);
    fetchMedicos();
  };

  if (loading && medicos.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex justify-between items-center bg-surface p-5 rounded-2xl border border-zinc-800">
        <div>
          <h1 className="text-xl font-bold">Panel de Control</h1>
          <p className="text-zinc-400 text-sm">
            {esJefatura
              ? "Gestión de todo el personal del SAME"
              : esTutor
                ? "Tus médicos en seguimiento y tu perfil"
                : "Tu ficha operativa"}
          </p>
        </div>

        <div className="flex gap-2">
          <span className="bg-zinc-800 text-zinc-300 px-4 py-1.5 rounded-lg text-sm font-bold border border-zinc-700">
            Médicos: {medicos.length}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {medicos.map((med) => (
          <div
            key={med.discord_id}
            onClick={() => {
              setMedicoSeleccionado(med);
              setModoEdicion(false);
            }}
            className="bg-surface border border-zinc-800 rounded-2xl p-5 flex flex-col items-center relative group transition-all hover:border-zinc-600 hover:shadow-lg cursor-pointer hover:-translate-y-1"
          >
            {med.discord_id === dbUser.discord_id && (
              <div className="absolute inset-0 border-2 border-primary/20 rounded-2xl pointer-events-none"></div>
            )}

            {/* Iconos de Méritos (Izquierda) */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
              {med.es_tutor && (
                <GraduationCap
                  size={16}
                  className="text-purple-400 drop-shadow-md"
                />
              )}
              {med.same_mes && (
                <Award size={16} className="text-yellow-500 drop-shadow-md" />
              )}
              {med.same_semana && (
                <Medal size={16} className="text-blue-400 drop-shadow-md" />
              )}
            </div>

            {/* Indicador de "En Servicio" (Derecha) */}
            {activas.includes(med.discord_id) && (
              <div className="absolute top-3 right-3 z-10" title="En Servicio">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            )}

            {med.avatar_url ? (
              <img
                src={med.avatar_url}
                alt="Avatar"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
                className="w-24 h-24 rounded-2xl mb-4 object-cover border border-zinc-700 shadow-inner group-hover:border-primary/50 transition-colors relative z-0"
              />
            ) : null}

            <div
              className={`w-24 h-24 bg-zinc-800 rounded-2xl mb-4 items-center justify-center border border-zinc-700 shadow-inner group-hover:border-primary/50 transition-colors relative z-0 ${med.avatar_url ? "hidden" : "flex"}`}
            >
              <User size={40} className="text-zinc-600" />
            </div>

            <h3 className="font-bold text-center text-lg leading-tight mb-1 relative z-10">
              {med.nombre_dni}
              {med.discord_id === dbUser.discord_id && (
                <span className="text-zinc-500 text-xs ml-1">(Tú)</span>
              )}
            </h3>
            <span className="text-xs text-primary font-bold mb-4 uppercase tracking-wider">
              {med.rango}
            </span>

            <div className="w-full flex justify-between text-xs text-zinc-400 bg-background p-2.5 rounded-xl border border-zinc-800 mt-auto">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="text-orange-500">🏷️</span> {med.legajo}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="text-yellow-500">📅</span>{" "}
                {med.fecha_ingreso || "S/D"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {medicoSeleccionado && !modoEdicion && (
        <ModalPerfilMedico
          medico={medicoSeleccionado}
          session={session}
          esJefatura={esJefatura}
          onClose={() => setMedicoSeleccionado(null)}
          onEdit={() => setModoEdicion(true)}
          onRefresh={handleRefrescarDatos}
        />
      )}

      {medicoSeleccionado && modoEdicion && (
        <ModalEditarMedico
          medico={medicoSeleccionado}
          onClose={() => setModoEdicion(false)}
          onSaveExitoso={handleRefrescarDatos}
        />
      )}
    </div>
  );
}
