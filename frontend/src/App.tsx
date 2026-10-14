import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CadastreDashboard from './pages/Cadastre/Dashboard';
import ValiderParcelle from './pages/Cadastre/ValiderParcelle';
import CadastreHistorique from './pages/Cadastre/Historique';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/cadastre" element={<CadastreDashboard />} />
        <Route path="/cadastre/valider/:id" element={<ValiderParcelle />} />
        <Route path="/cadastre/historique" element={<CadastreHistorique />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
