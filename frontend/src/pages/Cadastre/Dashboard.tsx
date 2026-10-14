import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function CadastreDashboard() {
  const [parcelles, setParcelles] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch('http://localhost:5000/api/v1/validations/cadastre', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setParcelles(data);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-center bg-white px-8 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="font-black text-xl text-indigo-900">FoncierSûr</span>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">Espace Cadastre</span>
        </div>
        <nav className="flex space-x-6 text-sm font-semibold text-gray-600">
          <Link to="/cadastre" className="text-indigo-600">Dossiers à valider</Link>
          <Link to="/cadastre/historique" className="hover:text-indigo-600">Historique</Link>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-red-500 hover:underline">Déconnexion</button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-gray-900">En attente ({parcelles.length})</h2>
        </div>

        <div className="grid gap-4">
          {parcelles.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-gray-900 text-lg">{p.reference}</span>
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">{p.statut}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {p.localisation || 'Diamniadio, Rufisque'} • {p.type} • <span className="font-semibold text-gray-700">{p.superficie} m²</span>
                </p>
              </div>
              <Link
                to={`/cadastre/valider/${p.id}`}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
              >
                Examiner
              </Link>
            </div>
          ))}
          {parcelles.length === 0 && (
            <div className="bg-white p-12 text-center rounded-xl border border-gray-100 text-gray-400">
              Aucune parcelle en attente de validation technique.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
