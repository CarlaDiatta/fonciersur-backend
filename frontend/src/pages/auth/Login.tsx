import { type FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      if (response.data.user.role === 'CADASTRE') {
        navigate('/cadastre');
      } else {
        setError('Accès réservé au profil Cadastre sur cette interface.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Identifiants invalides');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-indigo-900">FoncierSûr</h1>
          <p className="text-sm text-gray-500 mt-1">Le foncier sénégalais, traçable et infalsifiable.</p>
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-1">Connexion</h2>
        <p className="text-xs text-gray-500 mb-6">Accédez à votre espace professionnel.</p>

        {error && <div className="mb-4 rounded bg-red-50 p-3 text-xs text-red-600 font-medium">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Adresse e-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.sn"
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
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-600 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            Se connecter
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          Pas encore de compte ? <Link to="/register" className="text-indigo-600 font-semibold hover:underline">Créer un compte</Link>
        </div>
      </div>
    </div>
  );
}
