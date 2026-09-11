import { useState, useEffect } from "react";
import {
  X,
  Edit,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  User,
  Loader2,
  Award,
  Medal,
  GraduationCap,
  ShieldCheck,
  Clock,
  Activity,
} from "lucide-react";
import { supabase } from "../config/supabaseClient";
import ModalSancionMedico from "./ModalSancionMedico";
import ModalRetirarSancion from "./ModalRetirarSancion";

export default function ModalPerfilMedico({
  medico,
  session,
  esJefatura,
  onClose,
  onEdit,
  onRefresh,
}) {
  const [borrando, setBorrando] = useState(false);
  const [modoSancion, setModoSancion] = useState(false);
  const [modoRetirar, setModoRetirar] = useState(false);

  // --- ESTADOS PARA BITÁCORA ---
  const [statsBitacora, setStatsBitacora] = useState({
    activoDesde: null,
    minutosSemana: 0,
    loading: true,
  });
  const [minutosEnCurso, setMinutosEnCurso] = useState(0);

  const formatTiempo = (minutos_totales) => {
    const h = Math.floor(minutos_totales / 60);
    const m = Math.floor(minutos_totales % 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hs`;
    return `${h} hs ${m} min`;
  };

  // Cargar estadísticas de bitácora al abrir el modal
  useEffect(() => {
    const fetchStatsBitacora = async () => {
      setStatsBitacora((prev) => ({ ...prev, loading: true }));

      const ahora = new Date();
      const inicioSemana = new Date(ahora);
      inicioSemana.setDate(
        ahora.getDate() - (ahora.getDay() === 0 ? 6 : ahora.getDay() - 1),
      );
      inicioSemana.setHours(0, 0, 0, 0);

      const [resActiva, resHistorial] = await Promise.all([
        supabase
          .from("bitacoras_activas")
          .select("inicio")
          .eq("discord_id", medico.discord_id)
          .maybeSingle(),
        supabase
          .from("bitacoras_historial")
          .select("minutos")
          .eq("discord_id", medico.discord_id)
          .gte("inicio", inicioSemana.toISOString()),
      ]);

      let minutosSemana = 0;
      if (resHistorial.data) {
        minutosSemana = resHistorial.data.reduce(
          (acc, curr) => acc + Number(curr.minutos),
          0,
        );
      }

      setStatsBitacora({
        activoDesde: resActiva.data ? resActiva.data.inicio : null,
        minutosSemana,
        loading: false,
      });
    };

    fetchStatsBitacora();
  }, [medico.discord_id]);

  // Actualizar minutos en vivo si está en servicio
  useEffect(() => {
    if (!statsBitacora.activoDesde) return;

    const calcularMinutos = () => {
      const inicio = new Date(statsBitacora.activoDesde);
      setMinutosEnCurso(Math.floor((new Date() - inicio) / 60000));
    };

    calcularMinutos();
    const interval = setInterval(calcularMinutos, 60000);
    return () => clearInterval(interval);
  }, [statsBitacora.activoDesde]);

  const handleBorrar = async () => {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas ELIMINAR permanentemente la ficha de ${medico.nombre_dni}?`,
    );
    if (!confirmar) return;

    setBorrando(true);
    const { error } = await supabase
      .from("miembros_same")
      .delete()
      .eq("discord_id", medico.discord_id);
    setBorrando(false);

    if (error) alert("Error al eliminar la ficha: " + error.message);
    else {
      onRefresh();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-surface border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col">
        <div className="bg-zinc-900/50 p-6 border-b border-zinc-800 flex items-start justify-between relative">
          <div className="flex gap-6 items-center">
            {medico.avatar_url ? (
              <img
                src={medico.avatar_url}
                alt="Avatar"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-zinc-700 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 bg-zinc-800 rounded-2xl flex items-center justify-center border-2 border-zinc-700 shadow-lg">
                <User size={40} className="text-zinc-500" />
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {medico.nombre_dni}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="bg-zinc-800 text-zinc-300 font-bold px-3 py-1 rounded-md text-sm uppercase tracking-wider border border-zinc-700">
                  {medico.rango}
                </span>

                {medico.es_tutor && (
                  <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 font-bold px-2 py-1 rounded-md text-xs uppercase tracking-wider border border-purple-500/30">
                    <GraduationCap size={14} /> Tutor
                  </span>
                )}
                {medico.same_mes && (
                  <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 font-bold px-2 py-1 rounded-md text-xs uppercase tracking-wider border border-yellow-500/30">
                    <Award size={14} /> SAME del Mes
                  </span>
                )}
                {medico.same_semana && (
                  <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 font-bold px-2 py-1 rounded-md text-xs uppercase tracking-wider border border-blue-500/30">
                    <Medal size={14} /> SAME de la Semana
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-sm mt-1 flex gap-4">
                <span>
                  <strong className="text-zinc-300">DNI:</strong>{" "}
                  {medico.dni || "S/D"}
                </span>
                <span>
                  <strong className="text-zinc-300">Legajo:</strong>{" "}
                  {medico.legajo}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-2 rounded-full mt-2"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background border border-zinc-800 p-4 rounded-xl">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                Fecha de Ingreso
              </span>
              <span className="text-zinc-200">
                {medico.fecha_ingreso || "No registrada"}
              </span>
            </div>
            <div className="bg-background border border-zinc-800 p-4 rounded-xl">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                Tutor a Cargo
              </span>
              <span className="text-zinc-200">{medico.tutor || "Ninguno"}</span>
            </div>

            {/* NUEVOS BLOQUES DE BITÁCORA */}
            <div className="bg-background border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Clock size={14} /> Horas Semanales
                </span>
                <span className="text-zinc-200 font-bold">
                  {statsBitacora.loading ? (
                    <Loader2 size={16} className="animate-spin text-zinc-500" />
                  ) : (
                    formatTiempo(statsBitacora.minutosSemana)
                  )}
                </span>
              </div>
            </div>

            <div className="bg-background border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Activity size={14} /> Estado Operativo
                </span>
                {statsBitacora.loading ? (
                  <Loader2 size={16} className="animate-spin text-zinc-500" />
                ) : statsBitacora.activoDesde ? (
                  <span className="flex items-center gap-2 text-green-400 font-bold text-sm">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    En Servicio ({formatTiempo(minutosEnCurso)})
                  </span>
                ) : (
                  <span className="text-zinc-500 font-bold text-sm">
                    Fuera de Servicio
                  </span>
                )}
              </div>
            </div>

            <div className="bg-background border border-zinc-800 p-4 rounded-xl col-span-2">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                Firma Registrada
              </span>
              <span className="text-zinc-200 italic font-serif">
                {medico.firma || "Sin firma digital"}
              </span>
            </div>
          </div>

          <div className="border border-red-900/30 bg-red-950/10 rounded-xl p-4 flex justify-around">
            <div className="flex flex-col items-center gap-1">
              <AlertTriangle className="text-yellow-500 mb-1" size={24} />
              <span className="text-2xl font-bold text-white">
                {medico.advertencias || 0}
              </span>
              <span className="text-xs text-zinc-400 font-bold uppercase">
                Advertencias
              </span>
            </div>
            <div className="w-px bg-zinc-800"></div>
            <div className="flex flex-col items-center gap-1">
              <ShieldAlert className="text-red-500 mb-1" size={24} />
              <span className="text-2xl font-bold text-white">
                {medico.strikes || 0}
              </span>
              <span className="text-xs text-zinc-400 font-bold uppercase">
                Strikes Totales
              </span>
            </div>
          </div>
        </div>

        {esJefatura && (
          <div className="bg-zinc-900/50 p-4 border-t border-zinc-800 flex justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <button
                onClick={() => setModoSancion(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-950/50 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/50 rounded-lg font-bold transition-all text-sm"
              >
                <AlertTriangle size={16} /> Aplicar Sanción
              </button>
              <button
                onClick={() => setModoRetirar(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-950/50 hover:bg-green-600 text-green-500 hover:text-white border border-green-900/50 rounded-lg font-bold transition-all text-sm"
              >
                <ShieldCheck size={16} /> Retirar Sanción
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBorrar}
                disabled={borrando}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-700 rounded-lg font-bold transition-all text-sm"
              >
                {borrando ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}{" "}
                Eliminar
              </button>
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-yellow-400 text-black rounded-lg font-bold transition-all text-sm"
              >
                <Edit size={16} /> Editar
              </button>
            </div>
          </div>
        )}

        {/* Modales de Sanciones Flotantes */}
        {modoSancion && (
          <ModalSancionMedico
            medico={medico}
            session={session}
            onClose={() => setModoSancion(false)}
            onSaveExitoso={() => {
              setModoSancion(false);
              onRefresh();
            }}
          />
        )}

        {modoRetirar && (
          <ModalRetirarSancion
            medico={medico}
            session={session}
            onClose={() => setModoRetirar(false)}
            onSaveExitoso={() => {
              setModoRetirar(false);
              onRefresh();
            }}
          />
        )}
      </div>
    </div>
  );
}
