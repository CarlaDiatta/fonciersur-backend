import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Espace Cadastre
import CadastreDashboard from './pages/Cadastre/Dashboard';
import ValiderParcelle from './pages/Cadastre/ValiderParcelle';
import CadastreHistorique from './pages/Cadastre/Historique';

// Espace Promoteur
import PromoteurDashboard from './pages/promoteur/PromoteurDashboard';
import NouvelleParcelle from './pages/promoteur/NouvelleParcelle';

// Espace Notaire
import NotaireDashboard from './pages/notaire/NotaireDashboard';
import CertifierParcelle from './pages/notaire/CertifierParcelle';

// Public / Blockchain
import BlockchainProof from './pages/BlockchainProof';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentification & Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/blockchain-proof" element={<BlockchainProof />} />

        {/* Espace Cadastre */}
        <Route path="/cadastre" element={<CadastreDashboard />} />
        <Route path="/cadastre/valider/:id" element={<ValiderParcelle />} />
        <Route path="/cadastre/historique" element={<CadastreHistorique />} />

        {/* Espace Promoteur */}
        <Route path="/promoteur" element={<PromoteurDashboard />} />
        <Route path="/promoteur/nouvelle" element={<NouvelleParcelle />} />

        {/* Espace Notaire */}
        <Route path="/notaire" element={<NotaireDashboard />} />
        <Route path="/notaire/certifier/:id" element={<CertifierParcelle />} />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}