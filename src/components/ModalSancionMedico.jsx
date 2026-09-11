import { useState } from "react";
import { X, AlertTriangle, ShieldAlert, Loader2, Send } from "lucide-react";
import { supabase } from "../config/supabaseClient";

export default function ModalSancionMedico({
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

    // 1. Calculamos la matemática
    let adv = medico.advertencias || 0;
    let strikes = medico.strikes || 0;
    let mensajeExtra = "";

    if (tipo === "Advertencia") {
      adv += 1;
      if (adv >= 3) {
        adv = 0;
        strikes += 1;
        mensajeExtra =
          "\n\n⚠️ **ATENCIÓN:** *Esta es tu tercera advertencia, por ende, se han removido las anteriores y se te ha aplicado un Strike automáticamente.*";
      }
    } else {
      strikes += 1;
    }

    // 2. Guardamos en Base de Datos
    const { error } = await supabase
      .from("miembros_same")
      .update({ advertencias: adv, strikes: strikes })
      .eq("discord_id", medico.discord_id);

    if (error) {
      alert("Error al actualizar la base de datos: " + error.message);
      setLoading(false);
      return;
    }

    // 3. Traemos el túnel (Webhook) de Discord
    const { data: configData, error: configError } = await supabase
      .from("config_same")
      .select("valor")
      .eq("clave", "webhook_sanciones")
      .single();

    if (configError || !configData) {
      alert(
        "Sanción guardada, pero NO se notificó en Discord: No se encontró el Webhook configurado o faltan permisos.",
      );
      console.error("Error webhook:", configError);
    } else if (configData && configData.valor) {
      // 4. Enviamos el mensaje directo a Discord desde la Web
      const payload = {
        content: `<@${medico.discord_id}>`,
        embeds: [
          {
            title: `🚨 NUEVA SANCIÓN APLICADA: ${tipo.toUpperCase()}`,
            color: 16711680,
            fields: [
              {
                name: "Miembro Sancionado",
                value: `<@${medico.discord_id}> (${medico.nombre_dni})`,
                inline: false,
              },
              { name: "Motivo", value: motivo, inline: false },
              {
                name: "Jefe Responsable",
                value: `<@${session.user.user_metadata.provider_id}> (Vía Web)`,
                inline: false,
              },
              {
                name: "Estado Actual",
                value: `**Advertencias:** ${adv}/3\n**Strikes:** ${strikes}/3${mensajeExtra}`,
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

      try {
        const res = await fetch(configData.valor, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok)
          alert("Error de Discord al enviar el Embed. Código: " + res.status);
      } catch (err) {
        alert("Error de red al intentar contactar a Discord.");
      }
    }

    setLoading(false);
    onSaveExitoso();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-surface border border-red-900/50 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-red-500">
          <ShieldAlert size={20} /> Aplicar Sanción
        </h2>
        <p className="text-zinc-400 text-sm mb-6">
          El aviso se publicará automáticamente en Discord.
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
              Tipo de Sanción
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${tipo === "Advertencia" ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500" : "bg-background border-zinc-800 text-zinc-400"}`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value="Advertencia"
                  checked={tipo === "Advertencia"}
                  onChange={(e) => setTipo(e.target.value)}
                  className="hidden"
                />
                <AlertTriangle size={24} />{" "}
                <span className="font-bold text-sm">Advertencia</span>
              </label>

              <label
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${tipo === "Strike" ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-background border-zinc-800 text-zinc-400"}`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value="Strike"
                  checked={tipo === "Strike"}
                  onChange={(e) => setTipo(e.target.value)}
                  className="hidden"
                />
                <ShieldAlert size={24} />{" "}
                <span className="font-bold text-sm">Strike</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Motivo Detallado
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows="3"
              className="w-full bg-background border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 resize-none"
              required
              placeholder="Describe por qué se aplica esta sanción..."
            ></textarea>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
              Aplicar y Notificar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
