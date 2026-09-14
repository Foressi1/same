import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../config/supabaseClient";
import {
  Clock,
  Calendar,
  Activity,
  Loader2,
  User,
  Search,
  History,
  Trash2,
  XCircle,
  Edit,
  Save,
  X,
  PlusCircle,
  MinusCircle,
} from "lucide-react";

export default function Bitacoras() {
  const { dbUser } = useOutletContext();
  const [activas, setActivas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [miembros, setMiembros] = useState({});
  const [configCorte, setConfigCorte] = useState({
    dia: 0,
    hora: 0,
    minuto: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filtros Avanzados
  const [busqueda, setBusqueda] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("semana");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Gestión Individual (Jefatura)
  const [medicoSeleccionado, setMedicoSeleccionado] = useState("");
  const [ajuste, setAjuste] = useState({
    tipo: "suma",
    horas: "",
    minutos: "",
  });
  const [edicion, setEdicion] = useState({ id: null, minutos_totales: 0 });

  const rolesJefatura = [
    "Director",
    "Subdirector",
    "Jefe",
    "Subjefe",
    "Encargado de Turnos",
  ];
  const esJefe = rolesJefatura.includes(dbUser.rango);

  const formatTiempo = (minutos_totales) => {
    const h = Math.floor(minutos_totales / 60);
    const m = Math.floor(minutos_totales % 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hs`;
    return `${h} hs ${m} min`;
  };

  const fetchBitacoras = async () => {
    setLoading(true);
    const [resActivas, resHistorial, resMiembros, resConfig] =
      await Promise.all([
        supabase.from("bitacoras_activas").select("*"),
        supabase
          .from("bitacoras_historial")
          .select("*")
          .order("fin", { ascending: false }),
        supabase
          .from("miembros_same")
          .select("discord_id, nombre_dni, avatar_url"),
        supabase
          .from("config_same")
          .select("clave, valor")
          .in("clave", ["corte_dia", "corte_hora", "corte_minuto"]),
      ]);

    if (resConfig.data) {
      let d = 0,
        h = 0,
        m = 0;
      resConfig.data.forEach((c) => {
        if (c.clave === "corte_dia") d = parseInt(c.valor);
        if (c.clave === "corte_hora") h = parseInt(c.valor);
        if (c.clave === "corte_minuto") m = parseInt(c.valor);
      });
      setConfigCorte({ dia: d, hora: h, minuto: m });
    }

    if (resMiembros.data) {
      const dictMiembros = {};
      resMiembros.data.forEach((m) => (dictMiembros[m.discord_id] = m));
      setMiembros(dictMiembros);
    }

    if (resActivas.data) setActivas(resActivas.data);
    if (resHistorial.data) setHistorial(resHistorial.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBitacoras();
  }, []);

  // --- ACCIONES DE JEFATURA ---
  const handleForzarCierre = async (activa, nombre, guardarHoras) => {
    const mensaje = guardarHoras
      ? `¿Cerrar la bitácora de ${nombre} GUARDANDO las horas acumuladas?`
      : `¿Cerrar la bitácora de ${nombre} BORRANDO las horas acumuladas?`;

    if (!window.confirm(mensaje)) return;

    let horasGuardadasTxt = "";

    if (guardarHoras) {
      const fechaInicio = new Date(activa.inicio);
      const ahora = new Date();
      const minutosTotales = (ahora.getTime() - fechaInicio.getTime()) / 60000;

      const nuevoRegistro = {
        discord_id: activa.discord_id,
        inicio: activa.inicio,
        fin: ahora.toISOString(),
        minutos: minutosTotales,
        tipo: "guardia",
      };

      const { data, error } = await supabase
        .from("bitacoras_historial")
        .insert([nuevoRegistro])
        .select();

      if (!error && data) {
        await supabase
          .from("bitacoras_activas")
          .delete()
          .eq("discord_id", activa.discord_id);
        setActivas((prev) =>
          prev.filter((a) => a.discord_id !== activa.discord_id),
        );
        setHistorial((prev) => [data[0], ...prev]);
        horasGuardadasTxt = `Se guardaron **${formatTiempo(minutosTotales)}** en su historial.`;
      }
    } else {
      await supabase
        .from("bitacoras_activas")
        .delete()
        .eq("discord_id", activa.discord_id);
      setActivas((prev) =>
        prev.filter((a) => a.discord_id !== activa.discord_id),
      );
      horasGuardadasTxt = `⚠️ **Se descartaron todas las horas acumuladas en esta sesión.**`;
    }

    // WEBHOOK DISCORD
    const { data: configData } = await supabase
      .from("config_same")
      .select("valor")
      .eq("clave", "webhook_bitacoras")
      .single();
    if (configData && configData.valor) {
      const payload = {
        content: `<@${activa.discord_id}>`,
        embeds: [
          {
            title: `🔒 BITÁCORA CERRADA POR JEFATURA`,
            description: `El turno de **${nombre}** fue cerrado forzosamente desde el Dashboard Web.`,
            color: guardarHoras ? 3066993 : 15158332,
            fields: [
              {
                name: "Médico",
                value: `<@${activa.discord_id}>`,
                inline: true,
              },
              {
                name: "Cerrada por",
                value: `<@${dbUser.discord_id}> (${dbUser.nombre_dni})`,
                inline: true,
              },
              {
                name: "Resultado de Horas",
                value: horasGuardadasTxt,
                inline: false,
              },
            ],
            footer: { text: "SAME Zona Sur - Dashboard Web" },
            timestamp: new Date().toISOString(),
          },
        ],
      };
      try {
        await fetch(configData.valor, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Error Webhook:", err);
      }
    }
  };

  const handleEliminarRegistro = async (idRegistro) => {
    if (!window.confirm("¿Eliminar este registro histórico permanentemente?"))
      return;
    await supabase.from("bitacoras_historial").delete().eq("id", idRegistro);
    setHistorial((prev) => prev.filter((h) => h.id !== idRegistro));
  };

  const handleAplicarAjuste = async (e) => {
    e.preventDefault();
    const horas = parseInt(ajuste.horas) || 0;
    const minutos = parseInt(ajuste.minutos) || 0;
    let totalMinutos = horas * 60 + minutos;
    if (totalMinutos <= 0) return alert("Ingresa un tiempo válido.");
    if (ajuste.tipo === "resta") totalMinutos = -totalMinutos;

    const ahoraIso = new Date().toISOString();
    const nuevoRegistro = {
      discord_id: medicoSeleccionado,
      inicio: ahoraIso,
      fin: ahoraIso,
      minutos: totalMinutos,
      tipo: `ajuste_${ajuste.tipo}`,
    };

    const { data, error } = await supabase
      .from("bitacoras_historial")
      .insert([nuevoRegistro])
      .select();
    if (!error && data) {
      setHistorial((prev) => [data[0], ...prev]);
      setAjuste({ tipo: "suma", horas: "", minutos: "" });
    }
  };

  const handleGuardarEdicion = async (id) => {
    if (edicion.minutos_totales === "") return;
    const nuevosMinutos = parseFloat(edicion.minutos_totales);
    const { error } = await supabase
      .from("bitacoras_historial")
      .update({ minutos: nuevosMinutos })
      .eq("id", id);
    if (!error) {
      setHistorial((prev) =>
        prev.map((h) => (h.id === id ? { ...h, minutos: nuevosMinutos } : h)),
      );
      setEdicion({ id: null, minutos_totales: 0 });
    }
  };

  // --- LÓGICA TEMPORAL SINCRONIZADA CON DISCORD ---
  const ahora = new Date();

  // 1. Traductor de Días (Python Lunes=0 -> JS Lunes=1)
  const mapPythonToJS = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0 };
  const jsDiaCorte = mapPythonToJS[configCorte.dia] ?? 1;

  // 2. Calcular exacto Inicio de Semana
  const inicioSemana = new Date(ahora);
  inicioSemana.setHours(configCorte.hora, configCorte.minuto, 0, 0); // <-- Ahora suma los minutos

  const esAntesDelCorte =
    ahora.getDay() === jsDiaCorte &&
    (ahora.getHours() < configCorte.hora ||
      (ahora.getHours() === configCorte.hora &&
        ahora.getMinutes() < configCorte.minuto));

  if (esAntesDelCorte) {
    inicioSemana.setDate(inicioSemana.getDate() - 7);
  } else {
    while (inicioSemana.getDay() !== jsDiaCorte) {
      inicioSemana.setDate(inicioSemana.getDate() - 1);
    }
  }

  // 3. Calcular exacto Inicio de Mes
  const inicioMes = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    1,
    configCorte.hora,
    configCorte.minuto,
    0,
    0,
  );
  if (ahora < inicioMes) {
    inicioMes.setMonth(inicioMes.getMonth() - 1);
  }

  const baseFiltrada = esJefe
    ? medicoSeleccionado
      ? historial.filter((r) => r.discord_id === medicoSeleccionado)
      : historial
    : historial.filter((reg) => reg.discord_id === dbUser.discord_id);

  let minSemana = 0;
  let minMes = 0;
  let minTotal = 0;

  baseFiltrada.forEach((reg) => {
    const fechaFin = new Date(reg.fin);
    minTotal += Number(reg.minutos);
    if (fechaFin >= inicioSemana) minSemana += Number(reg.minutos);
    if (fechaFin >= inicioMes) minMes += Number(reg.minutos);
  });

  const historialFiltrado = baseFiltrada.filter((reg) => {
    const fecha = new Date(reg.fin);
    const medico = miembros[reg.discord_id];
    const coincideBusqueda =
      medico?.nombre_dni.toLowerCase().includes(busqueda.toLowerCase()) ||
      false;

    let coincideFecha = true;
    if (filtroPeriodo === "semana") {
      coincideFecha = fecha >= inicioSemana;
    } else if (filtroPeriodo === "mes") {
      coincideFecha = fecha >= inicioMes;
    } else if (filtroPeriodo === "personalizado") {
      if (fechaDesde)
        coincideFecha =
          coincideFecha && fecha >= new Date(fechaDesde + "T00:00:00");
      if (fechaHasta)
        coincideFecha =
          coincideFecha && fecha <= new Date(fechaHasta + "T23:59:59");
    }

    return coincideFecha && (busqueda === "" || coincideBusqueda);
  });

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    );

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Activity className="text-primary" size={32} />
          {esJefe ? "Auditoría de Bitácoras" : "Ficha Operativa"}
        </h1>
        {esJefe && (
          <div className="bg-surface border border-zinc-800 p-2 rounded-xl flex items-center gap-3">
            <span className="text-sm font-bold text-zinc-400 pl-2">
              Viendo estadísticas de:
            </span>
            <select
              value={medicoSeleccionado}
              onChange={(e) => setMedicoSeleccionado(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary font-bold min-w-[200px]"
            >
              <option value="">Hospital Completo (Global)</option>
              {Object.values(miembros).map((m) => (
                <option key={m.discord_id} value={m.discord_id}>
                  {m.nombre_dni}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-surface border border-zinc-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg">
          <div className="bg-primary/20 p-3 rounded-xl text-primary">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-bold uppercase">
              Esta Semana
            </p>
            <p className="text-2xl font-bold text-white">
              {formatTiempo(minSemana)}
            </p>
          </div>
        </div>
        <div className="bg-surface border border-zinc-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg">
          <div className="bg-blue-500/20 p-3 rounded-xl text-blue-500">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-bold uppercase">
              Este Mes
            </p>
            <p className="text-2xl font-bold text-white">
              {formatTiempo(minMes)}
            </p>
          </div>
        </div>
        <div className="bg-surface border border-zinc-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg">
          <div className="bg-purple-500/20 p-3 rounded-xl text-purple-500">
            <History size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-bold uppercase">
              Histórico Acumulado
            </p>
            <p className="text-2xl font-bold text-white">
              {formatTiempo(minTotal)}
            </p>
          </div>
        </div>
      </div>

      {esJefe && medicoSeleccionado && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-center gap-6 animate-fade-in mb-6">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {miembros[medicoSeleccionado]?.avatar_url ? (
              <img
                src={miembros[medicoSeleccionado].avatar_url}
                className="w-12 h-12 rounded-full border-2 border-zinc-700"
                alt=""
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                <User className="text-zinc-500" />
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase">
                Ajuste Manual
              </p>
              <p className="text-lg font-bold text-white">
                {miembros[medicoSeleccionado]?.nombre_dni}
              </p>
            </div>
          </div>
          <form
            onSubmit={handleAplicarAjuste}
            className="flex flex-wrap items-center gap-3 w-full md:flex-1"
          >
            <select
              value={ajuste.tipo}
              onChange={(e) => setAjuste({ ...ajuste, tipo: e.target.value })}
              className="bg-background border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary"
            >
              <option value="suma">Sumar Horas (+)</option>
              <option value="resta">Restar Horas (-)</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder="0 hs"
              value={ajuste.horas}
              onChange={(e) => setAjuste({ ...ajuste, horas: e.target.value })}
              className="bg-background border border-zinc-700 rounded-lg w-20 px-3 py-2 text-sm text-center text-white focus:border-primary"
            />
            <input
              type="number"
              min="0"
              placeholder="0 min"
              value={ajuste.minutos}
              onChange={(e) =>
                setAjuste({ ...ajuste, minutos: e.target.value })
              }
              className="bg-background border border-zinc-700 rounded-lg w-24 px-3 py-2 text-sm text-center text-white focus:border-primary"
            />
            <button
              type="submit"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-transform active:scale-95 ${ajuste.tipo === "suma" ? "bg-primary text-black hover:bg-yellow-400" : "bg-red-500 text-white hover:bg-red-600"}`}
            >
              {ajuste.tipo === "suma" ? (
                <PlusCircle size={16} />
              ) : (
                <MinusCircle size={16} />
              )}
              Aplicar
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-surface border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              En Servicio ({activas.length})
            </h2>
            <div className="space-y-3">
              {activas.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">
                  Sin personal activo.
                </p>
              ) : (
                activas.map((activa) => {
                  const medico = miembros[activa.discord_id];
                  return (
                    <div
                      key={activa.discord_id}
                      className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-xl border border-zinc-800"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {medico?.avatar_url ? (
                          <img
                            src={medico.avatar_url}
                            className="w-10 h-10 rounded-full border border-zinc-700"
                            alt=""
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                            <User size={20} className="text-zinc-500" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-white truncate">
                            {medico ? medico.nombre_dni : "S/D"}
                          </p>
                          <p className="text-xs text-green-400 font-bold">
                            Ingresó:{" "}
                            {new Date(activa.inicio).toLocaleTimeString(
                              "es-AR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </p>
                        </div>
                      </div>
                      {esJefe && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              handleForzarCierre(
                                activa,
                                medico?.nombre_dni,
                                true,
                              )
                            }
                            className="p-1.5 text-zinc-500 hover:bg-green-500/20 hover:text-green-400 rounded-lg transition-colors"
                            title="Cerrar y GUARDAR"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={() =>
                              handleForzarCierre(
                                activa,
                                medico?.nombre_dni,
                                false,
                              )
                            }
                            className="p-1.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
                            title="Cerrar y BORRAR"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-surface border border-zinc-800 rounded-2xl shadow-lg flex flex-col overflow-hidden">
          <div className="p-5 border-b border-zinc-800 bg-zinc-900/30 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="text-primary" size={20} /> Historial
                Operativo
              </h2>
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                {esJefe && !medicoSeleccionado && (
                  <div className="relative flex-1 sm:w-48">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full bg-background border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
                <select
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value)}
                  className="bg-background border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-bold"
                >
                  <option value="semana">Esta Semana</option>
                  <option value="mes">Este Mes</option>
                  <option value="historico">Histórico Completo</option>
                  <option value="personalizado">Rango Específico...</option>
                </select>
              </div>
            </div>
            {filtroPeriodo === "personalizado" && (
              <div className="flex gap-4 items-center bg-zinc-900 p-3 rounded-lg border border-zinc-800 animate-fade-in">
                <div className="flex flex-col">
                  <label className="text-xs text-zinc-500 mb-1">Desde</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="bg-background border border-zinc-700 rounded-md px-2 py-1 text-sm text-white"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-zinc-500 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="bg-background border border-zinc-700 rounded-md px-2 py-1 text-sm text-white"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-zinc-900/90 text-zinc-400 text-xs uppercase font-bold sticky top-0 backdrop-blur-sm z-10">
                <tr>
                  {esJefe && !medicoSeleccionado && (
                    <th className="px-6 py-4">Médico</th>
                  )}
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Detalle</th>
                  <th className="px-6 py-4">Tiempo Final</th>
                  {esJefe && <th className="px-6 py-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {historialFiltrado.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-zinc-500"
                    >
                      No hay registros para mostrar.
                    </td>
                  </tr>
                ) : (
                  historialFiltrado.map((reg) => {
                    const medico = miembros[reg.discord_id];
                    const fInicio = new Date(reg.inicio);
                    const fFin = new Date(reg.fin);
                    const isEditing = edicion.id === reg.id;
                    return (
                      <tr
                        key={reg.id}
                        className="hover:bg-zinc-900/30 transition-colors"
                      >
                        {esJefe && !medicoSeleccionado && (
                          <td className="px-6 py-3 font-bold text-white flex items-center gap-3">
                            {medico?.avatar_url && (
                              <img
                                src={medico.avatar_url}
                                className="w-6 h-6 rounded-full"
                                alt=""
                              />
                            )}
                            {medico ? medico.nombre_dni : "S/D"}
                          </td>
                        )}
                        <td className="px-6 py-3 text-zinc-300">
                          {fFin.toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-1 mr-2 text-[10px] font-bold uppercase rounded-md border ${reg.tipo.includes("ajuste") ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-zinc-800 text-zinc-300 border-zinc-700"}`}
                          >
                            {reg.tipo.replace("_", " ")}
                          </span>
                          <span className="text-zinc-400 font-mono text-xs">
                            {reg.tipo.includes("ajuste")
                              ? ""
                              : `${fInicio.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} → ${fFin.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={edicion.minutos_totales}
                                onChange={(e) =>
                                  setEdicion({
                                    ...edicion,
                                    minutos_totales: e.target.value,
                                  })
                                }
                                className="w-20 bg-background border border-primary rounded px-2 py-1 text-white text-xs text-center"
                                autoFocus
                              />{" "}
                              <span className="text-xs text-zinc-500">min</span>
                            </div>
                          ) : (
                            <span
                              className={`font-bold ${reg.minutos < 0 ? "text-red-400" : "text-primary"}`}
                            >
                              {reg.minutos < 0 ? "-" : "+"}
                              {formatTiempo(Math.abs(reg.minutos))}
                            </span>
                          )}
                        </td>
                        {esJefe && (
                          <td className="px-6 py-3 text-right flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleGuardarEdicion(reg.id)}
                                  className="p-1.5 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() =>
                                    setEdicion({ id: null, minutos_totales: 0 })
                                  }
                                  className="p-1.5 text-zinc-500 hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    setEdicion({
                                      id: reg.id,
                                      minutos_totales: reg.minutos,
                                    })
                                  }
                                  className="p-1.5 text-zinc-500 hover:bg-primary/20 hover:text-primary rounded-lg transition-colors"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleEliminarRegistro(reg.id)}
                                  className="p-1.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
