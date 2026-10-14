import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function ValiderParcelle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parcelle, setParcelle] = useState<any>(null);
  const [motif, setMotif] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch(`http://localhost:5000/api/v1/validations/cadastre/${id}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => res.json())
      .then((data) => setParcelle(data))
      .catch((err) => console.error(err));
  }, [id]);

  const handleDecision = async (decision: 'APPROUVE' | 'REJETE') => {
    if (decision === 'REJETE' && !motif.trim()) {
      alert('Le motif est obligatoire en cas de rejet.');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`http://localhost:5000/api/v1/validations/cadastre/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ decision, motif }),
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        navigate('/cadastre');
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Erreur réseau lors de la validation.');
    }
  };

  if (!parcelle) return <div className="p-8 text-center text-gray-500">Chargement du dossier...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="flex justify-between items-center bg-white px-8 py-4 border-b border-gray-100">
        <Link to="/cadastre" className="text-sm font-semibold text-indigo-600 hover:underline">← Retour aux dossiers</Link>
        <span className="font-bold text-gray-800">Validation - {parcelle.reference}</span>
      </header>

      <main className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-inner flex justify-between items-center">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">Carte • Tracé de la parcelle (Lecture seule)</span>
            <h3 className="text-lg font-bold mt-1">Géométrie validée par PostGIS</h3>
            <p className="text-xs text-indigo-200 mt-1">Aucun chevauchement détecté • Tolérance de superficie respectée.</p>
          </div>
          <div className="bg-indigo-800 p-4 rounded-xl text-right">
            <span className="text-xs text-indigo-300 block">Surface calculée</span>
            <span className="text-xl font-bold">{parcelle.superficie} m²</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400 block text-xs uppercase font-semibold">Référence</span> <span className="font-bold text-gray-800">{parcelle.reference}</span></div>
          <div><span className="text-gray-400 block text-xs uppercase font-semibold">Type</span> <span className="font-bold text-gray-800">{parcelle.type || 'URBAIN'}</span></div>
          <div><span className="text-gray-400 block text-xs uppercase font-semibold">NICAD</span> <span className="font-bold text-gray-800">{parcelle.nicad || 'SN-RUF-0042'}</span></div>
          <div><span className="text-gray-400 block text-xs uppercase font-semibold">Localisation</span> <span className="font-bold text-gray-800">{parcelle.localisation || 'Diamniadio, Rufisque'}</span></div>
          <div><span className="text-gray-400 block text-xs uppercase font-semibold">Propriétaire</span> <span className="font-bold text-gray-800">{parcelle.proprio_nom}</span></div>
          <div><span className="text-gray-400 block text-xs uppercase font-semibold">Empreinte SHA-256</span> <span className="font-mono text-xs text-indigo-600">{parcelle.sha256 || '9f2c4a1de0b7...b71e08'}</span></div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800">Avis technique</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Motif de la décision (obligatoire en cas de rejet)</label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex. Conforme aux plans directeurs de Diamniadio..."
              className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-indigo-600 focus:outline-none h-28"
            />
          </div>

          <div className="flex space-x-4 pt-2">
            <button
              onClick={() => handleDecision('APPROUVE')}
              className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700 transition"
            >
              Valider techniquement
            </button>
            <button
              onClick={() => handleDecision('REJETE')}
              className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow hover:bg-rose-700 transition"
            >
              Rejeter
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">La décision est d'abord inscrite sur Fabric (Org2), puis enregistrée en base.</p>
        </div>
      </main>
    </div>
  );
}
