import { type FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';

export default function Register() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CADASTRE');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await axiosClient.post('/auth/register', { nom, email, password, role });
      alert('Compte créé avec succès ! Vous pouvez vous connecter.');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur lors de l'inscription");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
        <h1 className="text-2xl font-black text-indigo-900 mb-1">FoncierSûr</h1>
        <p className="text-xs text-gray-500 mb-6">Créer un compte professionnel.</p>

        {error && <div className="mb-4 rounded bg-red-50 p-3 text-xs text-red-600 font-medium">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Nom complet</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Adresse e-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Profil / Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm bg-white focus:border-indigo-600 focus:outline-none"
            >
              <option value="CADASTRE">Cadastre</option>
              <option value="PROMOTEUR">Promoteur</option>
              <option value="NOTAIRE">Notaire</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            S'inscrire
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          Déjà un compte ? <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
