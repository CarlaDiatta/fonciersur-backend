import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';
import BrandMark from '../../components/BrandMark';
import { formatSuperficie } from '../../utils/formatSuperficie';

interface Parcelle {
  id: string;
  reference: string;
  localisation: string;
  surface?: number | string;
  superficie?: number | string;
  statut: 'SOUMISE' | 'VALIDE_CADASTRE' | 'CERTIFIEE' | 'REJETE_CADASTRE' | 'REJETE_NOTAIRE' | 'BROUILLON';
  motifRejet?: string;
}

export default function PromoteurDashboard() {
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchParcelles = async () => {
      try {
        const response = await axiosClient.get('/parcelles');
        if (Array.isArray(response.data)) {
          setParcelles(response.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Erreur lors du chargement des parcelles.");
      } finally {
        setLoading(false);
      }
    };

    void fetchParcelles();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Helper pour afficher les badges de statut selon la charte
  const renderStatutBadge = (statut: string) => {
    switch (statut) {
      case 'SOUMISE':
        return <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-amber-50 text-amber-700 border border-amber-200">• SOUMISE</span>;
      case 'VALIDE_CADASTRE':
        return <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-blue-50 text-blue-700 border border-blue-200">• VALIDÉ CADASTRE</span>;
      case 'CERTIFIEE':
        return <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">• CERTIFIÉE</span>;
      case 'REJETE_CADASTRE':
      case 'REJETE_NOTAIRE':
        return <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-red-50 text-red-700 border border-red-200">REJETÉ</span>;
      case 'BROUILLON':
        return <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-gray-100 text-gray-700 border border-gray-200">• BROUILLON</span>;
      default:
        return <span className="px-2.5 py-1 text-xs rounded-md font-semibold bg-gray-100 text-gray-700">{statut}</span>;
    }
  };

  return (
    <div className="workspace workspace--promoteur min-h-screen bg-gray-50 text-gray-900">
      {/* Barre de navigation supérieure */}
      <header className="flex justify-between items-center bg-white px-8 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center gap-2 font-black text-xl text-gray-900">
            <BrandMark />
            FoncierSûr
          </span>
          <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-semibold">
            Espace Promoteur
          </span>
        </div>
        <nav className="flex space-x-6 text-sm font-medium text-gray-600">
          <Link to="/promoteur" className="text-gray-900 font-bold">Mes parcelles</Link>
          <Link to="/promoteur/nouvelle" className="hover:text-gray-900 transition">Nouvelle parcelle</Link>
          <Link to="/blockchain-proof" state={{ returnTo: '/promoteur' }} className="hover:text-gray-900 transition">Preuve blockchain</Link>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-700 transition">
            Déconnexion
          </button>
        </nav>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mes parcelles</h2>
            <p className="text-xs text-gray-500 mt-1">
              Suivez l'avancement de chaque dossier, du brouillon à la certification.
            </p>
          </div>
          <Link
            to="/promoteur/nouvelle"
            className="bg-gray-900 text-white px-5 py-3 rounded-xl text-xs font-semibold hover:bg-black transition shadow-sm"
          >
            Nouvelle parcelle
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Chargement de vos parcelles...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-4">Référence</th>
                    <th className="p-4">Localisation</th>
                    <th className="p-4">Surface</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {parcelles.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-bold text-gray-900">{p.reference}</td>
                      <td className="p-4 text-gray-600">{p.localisation}</td>
                      <td className="p-4 text-gray-600">{formatSuperficie(p.superficie ?? p.surface)}</td>
                      <td className="p-4">
                        <div>{renderStatutBadge(p.statut)}</div>
                        {p.motifRejet && (
                          <p className="text-xs text-red-500 mt-1">Motif : {p.motifRejet}</p>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {p.statut === 'BROUILLON' ? (
                          <span className="text-xs font-medium text-gray-500">Brouillon</span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">En cours de traitement</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {parcelles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-400 text-sm">
                        Aucune parcelle enregistrée pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}