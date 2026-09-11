import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../config/supabaseClient";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  FileText,
  Loader2,
} from "lucide-react";

// Importamos el Editor y sus estilos originales
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

export default function Protocolos() {
  const { dbUser, session } = useOutletContext();
  const [protocolos, setProtocolos] = useState([]);
  const [protocoloSeleccionado, setProtocoloSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    titulo: "",
    contenido: "",
  });

  const esJefatura = ["Directora", "Jefe", "SubJefe"].includes(dbUser.rango);

  // Configuración de las herramientas del Editor (qué botones mostrar)
  const modulosEditor = {
    toolbar: [
      [{ header: [1, 2, 3, false] }], // Tamaños de títulos
      ["bold", "italic", "underline", "strike"], // Estilos de texto
      [{ list: "ordered" }, { list: "bullet" }], // Listas
      ["link", "image"], // Enlaces e Imágenes
      ["clean"], // Borrar formato
    ],
  };

  const fetchProtocolos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("normativas_same")
      .select("*")
      .order("id", { ascending: true });

    if (!error && data) {
      setProtocolos(data);
      if (data.length > 0 && !protocoloSeleccionado && !modoEdicion) {
        setProtocoloSeleccionado(data[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProtocolos();
  }, []);

  const handleNuevoTema = () => {
    setProtocoloSeleccionado(null);
    setFormData({ id: null, titulo: "", contenido: "" });
    setModoEdicion(true);
  };

  const handleEditarTema = () => {
    setFormData({
      id: protocoloSeleccionado.id,
      titulo: protocoloSeleccionado.titulo,
      contenido: protocoloSeleccionado.contenido,
    });
    setModoEdicion(true);
  };

  const handleGuardar = async () => {
    if (!formData.titulo || !formData.contenido) {
      return alert("El título y el contenido son obligatorios.");
    }

    setGuardando(true);
    const autorId = session.user.user_metadata.provider_id;

    let error;
    if (formData.id) {
      const res = await supabase
        .from("normativas_same")
        .update({
          titulo: formData.titulo,
          contenido: formData.contenido,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq("id", formData.id);
      error = res.error;
    } else {
      const res = await supabase.from("normativas_same").insert({
        titulo: formData.titulo,
        contenido: formData.contenido,
        autor_id: autorId,
      });
      error = res.error;
    }

    setGuardando(false);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setModoEdicion(false);
      fetchProtocolos();
    }
  };

  const handleBorrar = async () => {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar el tema "${protocoloSeleccionado.titulo}"?`,
    );
    if (!confirmar) return;

    setLoading(true);
    const { error } = await supabase
      .from("normativas_same")
      .delete()
      .eq("id", protocoloSeleccionado.id);

    if (error) {
      alert("Error al eliminar: " + error.message);
      setLoading(false);
    } else {
      setProtocoloSeleccionado(null);
      fetchProtocolos();
    }
  };

  if (loading && protocolos.length === 0 && !modoEdicion) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* PANEL IZQUIERDO: Índice */}
      <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col bg-surface border border-zinc-800 rounded-2xl overflow-hidden h-full flex-shrink-0">
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2 text-lg">
            <BookOpen className="text-primary" size={20} /> Normativas
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {protocolos.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No hay temas creados.
            </p>
          ) : (
            protocolos.map((prot) => (
              <button
                key={prot.id}
                onClick={() => {
                  setProtocoloSeleccionado(prot);
                  setModoEdicion(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  protocoloSeleccionado?.id === prot.id && !modoEdicion
                    ? "bg-primary/10 text-primary font-bold border border-primary/20"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white border border-transparent"
                }`}
              >
                <FileText size={16} className="flex-shrink-0" />
                <span className="truncate">{prot.titulo}</span>
              </button>
            ))
          )}
        </div>

        {esJefatura && (
          <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={handleNuevoTema}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-primary hover:text-black text-white py-3 rounded-xl font-bold transition-colors"
            >
              <Plus size={18} /> Nuevo Tema
            </button>
          </div>
        )}
      </div>

      {/* PANEL DERECHO */}
      <div className="flex-1 bg-surface border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-full">
        {/* MODO LECTURA */}
        {!modoEdicion && protocoloSeleccionado && (
          <>
            <div className="p-6 md:p-8 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-start">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {protocoloSeleccionado.titulo}
                </h1>
                <p className="text-xs text-zinc-500">
                  Última actualización:{" "}
                  {new Date(
                    protocoloSeleccionado.fecha_actualizacion ||
                      protocoloSeleccionado.fecha_creacion,
                  ).toLocaleDateString("es-AR")}
                </p>
              </div>

              {esJefatura && (
                <div className="flex gap-2">
                  <button
                    onClick={handleEditarTema}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-zinc-700"
                    title="Editar"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={handleBorrar}
                    className="p-2 bg-red-950/50 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-colors border border-red-900/50"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {/* Aquí usamos dangerouslySetInnerHTML para renderizar el HTML que guardó el editor */}
              <div
                className="vista-protocolo text-zinc-300 leading-relaxed text-[15px]"
                dangerouslySetInnerHTML={{
                  __html: protocoloSeleccionado.contenido,
                }}
              />
            </div>
          </>
        )}

        {/* PANTALLA VACÍA */}
        {!modoEdicion && !protocoloSeleccionado && (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
            <BookOpen size={60} className="mb-4 opacity-20" />
            <h2 className="text-xl font-bold mb-2">Central de Protocolos</h2>
            <p>
              Selecciona un tema del índice a la izquierda para leer su
              contenido.
            </p>
          </div>
        )}

        {/* MODO EDICIÓN / CREACIÓN */}
        {modoEdicion && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2 text-primary">
                <Edit size={20} />{" "}
                {formData.id ? "Editando Tema" : "Creando Nuevo Tema"}
              </h2>
              <button
                onClick={() => setModoEdicion(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Título del Protocolo
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary text-lg font-bold"
                  placeholder="Ej: Código de Vestimenta, Uso de Radio..."
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Contenido Documental
                </label>
                {/* Reemplazamos el textarea por el ReactQuill */}
                <div className="flex-1 pb-10">
                  <ReactQuill
                    theme="snow"
                    modules={modulosEditor}
                    value={formData.contenido}
                    onChange={(val) =>
                      setFormData({ ...formData, contenido: val })
                    }
                    className="h-full"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="flex items-center gap-2 bg-primary hover:bg-yellow-400 text-black px-6 py-2.5 rounded-lg font-bold transition-all disabled:opacity-50 mt-4 md:mt-0"
              >
                {guardando ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                Guardar Documento
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
