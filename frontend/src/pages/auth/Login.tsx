import { type FormEvent, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';
import BrandMark from '../../components/BrandMark';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const location = useLocation();
  const [success, setSuccess] = useState(
    (location.state as { registered?: boolean } | null)?.registered === true,
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      const role = response.data.user.role;
      if (role === 'PROMOTEUR') {
        navigate('/promoteur');
      } else if (role === 'CADASTRE') {
        navigate('/cadastre');
      } else if (role === 'NOTAIRE') {
        navigate('/notaire');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen auth-screen--login min-h-screen flex flex-col md:flex-row bg-white text-gray-900">
      {/* Colonne de gauche : Slogan et explications (Conforme maquette) */}
      <div className="auth-screen__intro md:w-1/2 p-8 md:p-16 flex flex-col justify-between bg-gray-50 border-r border-gray-100">
        <div>
          <h1 className="mb-6 inline-flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
            <BrandMark />
            FoncierSûr
          </h1>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            Le foncier sénégalais, traçable et infalsifiable.
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Chaque étape (dépôt, validation technique, certification notariale) est inscrite sur la blockchain et consultable à tout moment.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[#b6532b]" />
            Promoteur
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[#4f9b72]" />
            Cadastre
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[#8585bd]" />
            Notaire
          </span>
        </div>
      </div>

      {/* Colonne de droite : Formulaire de connexion */}
      <div className="auth-screen__content md:w-1/2 p-8 md:p-16 flex flex-col justify-center max-w-xl w-full mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Connexion</h2>
          <p className="text-xs text-gray-500">Votre espace s'ouvre selon le rôle de votre compte.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700" role="status">
            Votre compte a été créé. Vous pouvez vous connecter.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Adresse e-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.sn"
              className="w-full rounded-xl border border-gray-200 p-3.5 text-sm focus:border-gray-900 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 p-3.5 text-sm focus:border-gray-900 focus:outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-black transition disabled:opacity-50"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-500">
          <p>
            Pas encore de compte Promoteur ?{' '}
            <Link to="/register" className="font-semibold text-gray-900 underline hover:text-black">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}