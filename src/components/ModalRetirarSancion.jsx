import { useState } from "react";
import { X, CheckCircle, Loader2, Send } from "lucide-react";
import { supabase } from "../config/supabaseClient";

export default function ModalRetirarSancion({
  medico,
  session,
  onClose,
  onSaveExitoso,
}) {
  const [tipo, setTipo] = useState("Advertencia");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let adv = medico.advertencias || 0;
    let strikes = medico.strikes || 0;

    if (tipo === "Advertencia") {
      if (adv <= 0) {
        alert("Operación denegada: El miembro ya tiene 0 advertencias.");
        setLoading(false);
        return;
      }
      adv -= 1;
    } else {
      if (strikes <= 0) {
        alert("Operación denegada: El miembro ya tiene 0 strikes.");
        setLoading(false);
        return;
      }
      strikes -= 1;
    }

    const { error } = await supabase
      .from("miembros_same")
      .update({ advertencias: adv, strikes: strikes })
      .eq("discord_id", medico.discord_id);

    if (error) {
      alert("Error al actualizar la base de datos: " + error.message);
      setLoading(false);
      return;
    }

    const { data: configData } = await supabase
      .from("config_same")
      .select("valor")
      .eq("clave", "webhook_sanciones")
      .single();

    if (configData && configData.valor) {
      const payload = {
        content: `<@${medico.discord_id}>`,
        embeds: [
          {
            title: `✅ SANCIÓN RETIRADA: ${tipo.toUpperCase()}`,
            color: 65280, // Verde en decimal
            fields: [
              {
                name: "Miembro Perdonado",
                value: `<@${medico.discord_id}> (${medico.nombre_dni})`,
                inline: false,
              },
              { name: "Motivo del Retiro", value: motivo, inline: false },
              {
                name: "Jefe Responsable",
                value: `<@${session.user.user_metadata.provider_id}> (Vía Web)`,
                inline: false,
              },
              {
                name: "Estado Actualizado",
                value: `**Advertencias:** ${adv}/3\n**Strikes:** ${strikes}/3`,
                inline: false,
              },
            ],
            footer: { text: "SAME Zona Sur - Dashboard Web" },
            thumbnail: {
              url:
                medico.avatar_url ||
                "https://cdn.discordapp.com/embed/avatars/0.png",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await fetch(configData.valor, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setLoading(false);
    onSaveExitoso();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-surface border border-green-900/50 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-green-500">
          <CheckCircle size={20} /> Retirar Sanción
        </h2>
        <p className="text-zinc-400 text-sm mb-6">
          El retiro se publicará en Discord y se actualizará su historial.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Miembro
            </label>
            <div className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-300 font-bold flex items-center gap-3">
              <img
                src={medico.avatar_url}
                alt="Avatar"
                className="w-6 h-6 rounded-full"
              />
              {medico.nombre_dni}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Sanción a Retirar
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${tipo === "Advertencia" ? "bg-green-500/10 border-green-500/50 text-green-500" : "bg-background border-zinc-800 text-zinc-400"}`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value="Advertencia"
                  checked={tipo === "Advertencia"}
                  onChange={(e) => setTipo(e.target.value)}
                  className="hidden"
                />
                <span className="font-bold text-sm">Advertencia</span>
              </label>

              <label
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${tipo === "Strike" ? "bg-green-500/10 border-green-500/50 text-green-500" : "bg-background border-zinc-800 text-zinc-400"}`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value="Strike"
                  checked={tipo === "Strike"}
                  onChange={(e) => setTipo(e.target.value)}
                  className="hidden"
                />
                <span className="font-bold text-sm">Strike</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Motivo Detallado del Indulto
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows="3"
              className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 resize-none"
              required
              placeholder="Describe por qué se retira esta sanción..."
            ></textarea>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
              Retirar y Notificar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
