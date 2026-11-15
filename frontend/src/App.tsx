import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Espace Cadastre
import CadastreDashboard from './pages/Cadastre/Dashboard';
import ValiderParcelle from './pages/Cadastre/ValiderParcelle';
import CadastreHistorique from './pages/Cadastre/Historique';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentification */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Espace Cadastre */}
        <Route path="/cadastre" element={<CadastreDashboard />} />
        <Route path="/cadastre/valider/:id" element={<ValiderParcelle />} />
        <Route path="/cadastre/historique" element={<CadastreHistorique />} />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}