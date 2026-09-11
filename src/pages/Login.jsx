import { ArrowRight } from "lucide-react";
import { supabase } from "../config/supabaseClient";

export default function Login() {
  const handleLogin = async () => {
    // Esto abrirá el pop-up oficial de Discord
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
    });
    if (error) console.error("Error iniciando sesión:", error.message);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      {/* Botón central */}
      <div className="flex-1 flex items-center justify-center -mt-20">
        <button
          onClick={handleLogin}
          className="bg-primary hover:bg-yellow-400 text-black font-semibold py-3 px-6 rounded-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
        >
          Ingresa a la Dashboard
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
