import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./config/supabaseClient";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import Medicos from "./pages/Medicos";
import Blacklist from "./pages/Blacklist";
import Protocolos from "./pages/Protocolos";
import Bitacoras from "./pages/Bitacoras";

// Componente placeholder para las vistas que armaremos luego
const Placeholder = ({ title }) => (
  <h1 className="text-2xl font-bold">{title} (En construcción)</h1>
);

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={session ? <Navigate to="/dashboard" /> : <Login />}
        />

        {/* Rutas protegidas envueltas en el Layout */}
        <Route
          path="/dashboard"
          element={session ? <DashboardLayout /> : <Navigate to="/" />}
        >
          <Route index element={<DashboardHome />} />
          <Route path="medicos" element={<Medicos />} />
          <Route path="blacklist" element={<Blacklist />} />
          <Route path="protocolos" element={<Protocolos />} />
          <Route path="bitacoras" element={<Bitacoras />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
