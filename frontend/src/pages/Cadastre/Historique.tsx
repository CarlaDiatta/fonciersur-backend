import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function CadastreHistorique() {
  const [historique, setHistorique] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch('http://localhost:5000/api/v1/validations/cadastre/historique', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHistorique(data);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-center bg-white px-8 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="font-black text-xl text-indigo-900">FoncierSûr</span>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">Historique Cadastre</span>
        </div>
        <nav className="flex space-x-6 text-sm font-semibold text-gray-600">
          <Link to="/cadastre" className="hover:text-indigo-600">Dossiers à valider</Link>
          <Link to="/cadastre/historique" className="text-indigo-600">Historique</Link>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-red-500 hover:underline">Déconnexion</button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <h2 className="text-xl font-extrabold text-gray-900 mb-6">Dossiers traités</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3 text-left">Référence</th>
                <th className="px-6 py-3 text-left">Propriétaire</th>
                <th className="px-6 py-3 text-left">Superficie</th>
                <th className="px-6 py-3 text-left">Statut</th>
                <th className="px-6 py-3 text-left">Date de traitement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {historique.map((h) => (
                <tr key={h.id}>
                  <td className="px-6 py-4 font-bold">{h.reference}</td>
                  <td className="px-6 py-4">{h.proprio_nom}</td>
                  <td className="px-6 py-4">{h.superficie} m²</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded font-bold bg-indigo-50 text-indigo-700">{h.statut}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{new Date(h.updated_at || h.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {historique.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Aucun historique disponible pour le moment.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
