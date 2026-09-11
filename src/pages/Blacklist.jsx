import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../config/supabaseClient";
import {
  ShieldAlert,
  Plus,
  Trash2,
  Search,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";

export default function Blacklist() {
  const { dbUser, session } = useOutletContext();
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    discord_id: "",
    nombre: "",
    motivo: "",
  });
  const [guardando, setGuardando] = useState(false);

  // Verificación estricta de seguridad
  const esJefatura = ["Directora", "Jefe", "SubJefe"].includes(dbUser.rango);

  const fetchBlacklist = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blacklist_same")
      .select("*")
      .order("fecha_agregado", { ascending: false });

    if (!error && data) setBlacklist(data);
    setLoading(false);
  };

  useEffect(() => {
    if (esJefatura) fetchBlacklist();
  }, [esJefatura]);

  // Si no es jefatura, bloqueamos la vista por completo
  if (!esJefatura) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-4 opacity-80" />
        <h1 className="text-3xl font-bold mb-2">Acceso Restringido</h1>
        <p className="text-zinc-400 max-w-md">
          El registro de Blacklist es información clasificada. Solo la
          Directora, Jefes y SubJefes tienen autorización para acceder a este
          panel.
        </p>
      </div>
    );
  }

  const handleAgregar = async (e) => {
    e.preventDefault();
    setGuardando(true);

    const discordIdAutor = session.user.user_metadata.provider_id;

    const { error } = await supabase.from("blacklist_same").insert({
      discord_id: formData.discord_id,
      nombre: formData.nombre,
      motivo: formData.motivo,
      autor_id: discordIdAutor,
    });

    setGuardando(false);

    if (error) {
      alert("Error al agregar a la Blacklist: " + error.message);
    } else {
      setShowModal(false);
      setFormData({ discord_id: "", nombre: "", motivo: "" });
      fetchBlacklist();
    }
  };

  const handleEliminar = async (id, nombre) => {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas indultar a ${nombre} y quitarlo de la Blacklist?`,
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("blacklist_same")
      .delete()
      .eq("id", id);

    if (error) alert("Error al eliminar: " + error.message);
    else fetchBlacklist();
  };

  // Filtrado de búsqueda
  const filtrados = blacklist.filter(
    (item) =>
      item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.discord_id.includes(busqueda),
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Cabecera */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface p-5 rounded-2xl border border-red-900/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-xl font-bold flex items-center gap-2 text-red-500">
            <ShieldAlert size={24} /> Registro de Blacklist
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Usuarios vetados permanentemente de la facción SAME.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="relative z-10 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
        >
          <Plus size={18} /> Añadir Sancionado
        </button>
      </header>

      {/* Barra de Búsqueda */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          size={18}
        />
        <input
          type="text"
          placeholder="Buscar por nombre o Discord ID..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-surface border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
        />
      </div>

      {/* Tabla de Blacklist */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-red-500 w-8 h-8" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-surface border border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
          No hay usuarios registrados en la Blacklist con esos parámetros.
        </div>
      ) : (
        <div className="bg-surface border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 text-zinc-400 uppercase text-xs font-bold border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Discord ID</th>
                  <th className="px-6 py-4">Motivo del Veto</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtrados.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-500" />
                      {item.nombre}
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-400">
                      {item.discord_id}
                    </td>
                    <td
                      className="px-6 py-4 text-zinc-300 max-w-xs truncate"
                      title={item.motivo}
                    >
                      {item.motivo}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">
                      {new Date(item.fecha_agregado).toLocaleDateString(
                        "es-AR",
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEliminar(item.id, item.nombre)}
                        className="text-zinc-500 hover:text-red-400 transition-colors bg-zinc-900 p-2 rounded-lg border border-zinc-800"
                        title="Eliminar de la Blacklist"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Añadir */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface border border-red-900/50 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-red-500">
              <ShieldAlert size={20} /> Añadir a Blacklist
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              El usuario perderá el acceso a la facción permanentemente.
            </p>

            <form onSubmit={handleAgregar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Nombre / Identidad
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Discord ID (Requerido)
                </label>
                <input
                  type="text"
                  value={formData.discord_id}
                  onChange={(e) =>
                    setFormData({ ...formData, discord_id: e.target.value })
                  }
                  placeholder="Ej: 83921839281923"
                  className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Motivo detallado
                </label>
                <textarea
                  value={formData.motivo}
                  onChange={(e) =>
                    setFormData({ ...formData, motivo: e.target.value })
                  }
                  rows="3"
                  className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 resize-none"
                  required
                ></textarea>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {guardando ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <ShieldAlert size={20} />
                  )}
                  Registrar Veto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
