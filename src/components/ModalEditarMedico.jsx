import { useState } from "react";
import { X, Save, Loader2, Award, Medal, GraduationCap } from "lucide-react";
import { supabase } from "../config/supabaseClient";

export default function ModalEditarMedico({ medico, onClose, onSaveExitoso }) {
  const [formData, setFormData] = useState({
    nombre_dni: medico.nombre_dni || "",
    rango: medico.rango || "Médico",
    tutor: medico.tutor || "",
    dni: medico.dni || "",
    fecha_ingreso: medico.fecha_ingreso || "",
    firma: medico.firma || "",
    legajo: medico.legajo || "",
    es_tutor: medico.es_tutor || false,
    same_mes: medico.same_mes || false,
    same_semana: medico.same_semana || false,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("miembros_same")
      .update({
        nombre_dni: formData.nombre_dni,
        rango: formData.rango,
        tutor: formData.tutor === "" ? null : formData.tutor,
        dni: formData.dni,
        fecha_ingreso: formData.fecha_ingreso,
        firma: formData.firma,
        legajo: formData.legajo,
        es_tutor: formData.es_tutor,
        same_mes: formData.same_mes,
        same_semana: formData.same_semana,
      })
      .eq("discord_id", medico.discord_id);

    setLoading(false);

    if (error) alert("Error al actualizar: " + error.message);
    else onSaveExitoso();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4 overflow-y-auto">
      <div className="bg-surface border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1">Editar Ficha Médica</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Modificando los datos operativos de {medico.nombre_dni}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Nombre Completo (DNI)
            </label>
            <input
              type="text"
              name="nombre_dni"
              value={formData.nombre_dni}
              onChange={handleChange}
              className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                DNI
              </label>
              <input
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Legajo
              </label>
              <input
                type="text"
                name="legajo"
                value={formData.legajo}
                onChange={handleChange}
                className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Rango
              </label>
              <select
                name="rango"
                value={formData.rango}
                onChange={handleChange}
                className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              >
                <option value="Directora">Directora</option>
                <option value="Jefe">Jefe</option>
                <option value="SubJefe">SubJefe</option>
                <option value="Instructor">Instructor</option>
                <option value="Cirujano">Cirujano</option>
                <option value="Psiquiatra">Psiquiatra</option>
                <option value="Médico">Médico</option>
                <option value="Enfermero">Enfermero</option>
                <option value="Auxiliar de Enfermería">
                  Auxiliar de Enfermería
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Fecha de Ingreso
              </label>
              <input
                type="text"
                name="fecha_ingreso"
                value={formData.fecha_ingreso}
                onChange={handleChange}
                placeholder="Ej: 15/10/2025"
                className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Firma Registrada
              </label>
              <input
                type="text"
                name="firma"
                value={formData.firma}
                onChange={handleChange}
                className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Tutor Asignado (Quién le enseña)
              </label>
              <input
                type="text"
                name="tutor"
                value={formData.tutor}
                onChange={handleChange}
                placeholder="Dejar vacío si no tiene"
                className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Sección de Insignias */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 border-t border-zinc-800 pt-4">
              Insignias y Distinciones
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.es_tutor ? "bg-purple-500/10 border-purple-500/50 text-purple-400" : "bg-background border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
              >
                <input
                  type="checkbox"
                  name="es_tutor"
                  checked={formData.es_tutor}
                  onChange={handleChange}
                  className="hidden"
                />
                <GraduationCap size={20} />{" "}
                <span className="font-bold text-sm">Es Tutor</span>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.same_mes ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500" : "bg-background border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
              >
                <input
                  type="checkbox"
                  name="same_mes"
                  checked={formData.same_mes}
                  onChange={handleChange}
                  className="hidden"
                />
                <Award size={20} />{" "}
                <span className="font-bold text-sm">Del Mes</span>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.same_semana ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "bg-background border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
              >
                <input
                  type="checkbox"
                  name="same_semana"
                  checked={formData.same_semana}
                  onChange={handleChange}
                  className="hidden"
                />
                <Medal size={20} />{" "}
                <span className="font-bold text-sm">De la Semana</span>
              </label>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-yellow-400 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Save size={20} />
              )}
              Guardar Todos los Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
