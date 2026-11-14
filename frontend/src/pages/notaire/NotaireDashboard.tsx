import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';
import BrandMark from '../../components/BrandMark';
import { formatSuperficie } from '../../utils/formatSuperficie';

interface Dossier {
  id: string;
  reference: string;
  localisation?: string;
  superficie?: number | string;
  proprio_nom?: string;
}

export default function NotaireDashboard() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const statusSyncPending = (location.state as { statusSyncPending?: boolean } | null)?.statusSyncPending;

  useEffect(() => {
    const fetchDossiers = async () => {
      try {
        const response = await axiosClient.get('/validations/notaire');
        if (Array.isArray(response.data)) {
          setDossiers(response.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Erreur lors du chargement des dossiers notariés.");
      } finally {
        setLoading(false);
      }
    };

    void fetchDossiers();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const superficies = dossiers
    .map((dossier) => dossier.superficie)
    .filter((superficie) => superficie != null && superficie !== '')
    .map(Number)
    .filter(Number.isFinite);
  const superficieTotale = superficies.reduce((total, superficie) => total + superficie, 0);
  const localisationsRenseignees = new Set(
    dossiers.map((dossier) => dossier.localisation?.trim()).filter(Boolean),
  ).size;

  return (
    <div className="workspace workspace--notaire min-h-screen bg-gray-50 text-gray-900">
      <header className="flex justify-between items-center bg-white px-8 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center gap-2 font-black text-xl text-gray-900">
            <BrandMark />
            FoncierSûr
          </span>
          <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-semibold">
            Espace Notaire
          </span>
        </div>
        <nav className="flex space-x-6 text-sm font-medium text-gray-600">
          <Link to="/notaire" className="text-gray-900 font-bold">Dossiers à certifier</Link>
          <Link to="/blockchain-proof" state={{ returnTo: '/notaire' }} className="hover:text-gray-900 transition">Preuve blockchain</Link>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-700 transition">
            Déconnexion
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dossiers à certifier</h2>
          <p className="mt-1 text-xs text-gray-500">Examinez les dossiers validés par le cadastre avant certification.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}
        {statusSyncPending && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800" role="status">
            Décision enregistrée. La mise à jour du service Promoteur est en attente et sera réessayée automatiquement.
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Dossiers à certifier</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{dossiers.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Superficie totale</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {superficies.length > 0 ? `${superficieTotale.toLocaleString('fr-FR')} m²` : 'Non renseignée'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Localisations renseignées</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{localisationsRenseignees}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Chargement des dossiers...</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50/70">
                  <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="p-4">Référence</th>
                    <th className="p-4">Localisation</th>
                    <th className="p-4">Superficie</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dossiers.map((dossier) => (
                    <tr key={dossier.id} className="hover:bg-gray-50/60">
                      <td className="p-4 font-semibold text-gray-900">{dossier.reference}</td>
                      <td className="p-4 text-gray-600">{dossier.localisation || 'Non renseignée'}</td>
                      <td className="p-4 text-gray-600">
                        {formatSuperficie(dossier.superficie)}
                      </td>
                      <td className="p-4">
                        <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          Validé cadastre
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to={`/notaire/certifier/${dossier.id}`}
                          className="inline-block rounded-md bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black"
                        >
                          Examiner
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {dossiers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-sm text-gray-500">
                        Aucun dossier en attente de certification notariée.
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