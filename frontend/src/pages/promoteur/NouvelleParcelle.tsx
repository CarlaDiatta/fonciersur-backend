import { type FormEvent, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';
import BrandMark from '../../components/BrandMark';
import ParcelMapPreview from '../../components/ParcelMapPreview';
import { calculateParcelAreaSquareMeters, parseParcelCoordinates } from '../../utils/parcelGeometry';
import { formatSuperficie } from '../../utils/formatSuperficie';

const PARCEL_DRAFT_KEY = 'fonciersur:promoteur:parcelle-brouillon';

interface ParcelDraft {
  reference: string;
  numeroIdentificationCadastrale: string;
  localisation: string;
  type: string;
  coordinates: string;
}

interface ParcelDraftLoad {
  draft: ParcelDraft | null;
  error: string;
  message: string;
}

function isParcelDraft(value: unknown): value is ParcelDraft {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.reference === 'string' &&
    typeof draft.numeroIdentificationCadastrale === 'string' &&
    typeof draft.localisation === 'string' &&
    typeof draft.type === 'string' &&
    typeof draft.coordinates === 'string'
  );
}

function loadParcelDraft(): ParcelDraftLoad {
  let savedDraft: string | null;
  try {
    savedDraft = localStorage.getItem(PARCEL_DRAFT_KEY);
  } catch {
    return {
      draft: null,
      error: 'Impossible de lire le brouillon enregistré sur cet appareil.',
      message: '',
    };
  }

  if (!savedDraft) return { draft: null, error: '', message: '' };

  let parsedDraft: unknown;
  try {
    parsedDraft = JSON.parse(savedDraft) as unknown;
  } catch {
    return {
      draft: null,
      error: 'Le brouillon enregistré est illisible. Vous pouvez en enregistrer un nouveau.',
      message: '',
    };
  }

  if (!isParcelDraft(parsedDraft)) {
    return {
      draft: null,
      error: "Le brouillon enregistré n'a pas le bon format. Vous pouvez en enregistrer un nouveau.",
      message: '',
    };
  }

  return {
    draft: parsedDraft,
    error: '',
    message: 'Brouillon restauré. Sélectionnez de nouveau le titre ou le plan si nécessaire.',
  };
}

export default function NouvelleParcelle() {
  const [loadedDraft] = useState(loadParcelDraft);
  const [reference, setReference] = useState(loadedDraft.draft?.reference ?? '');
  const [numeroIdentificationCadastrale, setNumeroIdentificationCadastrale] = useState(
    loadedDraft.draft?.numeroIdentificationCadastrale ?? '',
  );
  const [localisation, setLocalisation] = useState(loadedDraft.draft?.localisation ?? '');
  const [type, setType] = useState(loadedDraft.draft?.type ?? 'URBAIN');
  const [coordinates, setCoordinates] = useState(loadedDraft.draft?.coordinates ?? '');
  const [titrePlan, setTitrePlan] = useState<File | null>(null);
  const [error, setError] = useState(loadedDraft.error);
  const [draftMessage, setDraftMessage] = useState(loadedDraft.message);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const superficieCalculee = calculateParcelAreaSquareMeters(coordinates);

  const handleSaveDraft = () => {
    setError('');
    try {
      const draft: ParcelDraft = {
        reference,
        numeroIdentificationCadastrale,
        localisation,
        type,
        coordinates,
      };
      localStorage.setItem(PARCEL_DRAFT_KEY, JSON.stringify(draft));
      setDraftMessage(
        'Brouillon enregistré sur cet appareil. Le titre ou le plan devra être sélectionné de nouveau à la reprise.',
      );
    } catch {
      setDraftMessage('');
      setError("Impossible d'enregistrer le brouillon sur cet appareil.");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    let parsedPolygon: unknown;
    try {
      parsedPolygon = JSON.parse(coordinates) as unknown;
    } catch {
      setError("Format des coordonnées GPS invalide (JSON attendu).");
      return;
    }

    if (!parseParcelCoordinates(parsedPolygon) || superficieCalculee === null) {
      setError("Format des coordonnées GPS invalide ou superficie impossible à calculer.");
      return;
    }

    const formData = new FormData();
    formData.append('reference', reference);
    formData.append('numeroIdentificationCadastrale', numeroIdentificationCadastrale);
    formData.append('localisation', localisation);
    formData.append('superficie', String(Math.round(superficieCalculee)));
    formData.append('superficieCalculee', String(Math.round(superficieCalculee)));
    formData.append('type', type);
    formData.append('polygon', JSON.stringify(parsedPolygon));
    if (titrePlan) formData.append('titrePlan', titrePlan);

    setLoading(true);
    try {
      await axiosClient.post('/parcelles', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err: unknown) {
      const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError(message || "Erreur lors de la création de la parcelle.");
      return;
    } finally {
      setLoading(false);
    }

    setSubmitted(true);
    try {
      localStorage.removeItem(PARCEL_DRAFT_KEY);
    } catch {
      setDraftMessage('Parcelle envoyée, mais le brouillon local n’a pas pu être supprimé.');
      return;
    }
    navigate('/promoteur');
  };

  return (
    <div className="workspace workspace--promoteur min-h-screen bg-gray-50 text-gray-900 pb-12">
      {/* En-tête */}
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
          <Link to="/promoteur" className="hover:text-gray-900 transition">Mes parcelles</Link>
          <Link to="/promoteur/nouvelle" className="text-gray-900 font-bold">Nouvelle parcelle</Link>
          <Link to="/blockchain-proof" state={{ returnTo: '/promoteur' }} className="hover:text-gray-900 transition">Preuve blockchain</Link>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-red-600 hover:text-red-700 transition">
            Déconnexion
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <Link to="/promoteur" className="text-sm font-semibold text-gray-900 hover:underline">
            ← Retour à la liste
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 mt-2">Déclarer une nouvelle parcelle</h2>
          <p className="text-xs text-gray-500 mt-1">
            Renseignez les détails techniques de votre terrain avant soumission.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form
            onSubmit={handleSubmit}
            onChange={() => setDraftMessage('')}
            className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            {draftMessage && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800" role="status">
                {draftMessage}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Référence foncière
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex. SN-DKR-2026-001"
                  className="w-full rounded-md border border-gray-200 p-3 text-sm focus:border-gray-900 focus:outline-none transition"
                  required
                />
              </div>
              <div>
                <label htmlFor="numero-cadastral" className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Numéro d'identification cadastrale
                </label>
                <input
                  id="numero-cadastral"
                  type="text"
                  value={numeroIdentificationCadastrale}
                  onChange={(e) => setNumeroIdentificationCadastrale(e.target.value)}
                  placeholder="Ex. DK-2026-001"
                  className="w-full rounded-md border border-gray-200 p-3 text-sm focus:border-gray-900 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Type de zone
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-md border border-gray-200 p-3 text-sm focus:border-gray-900 focus:outline-none bg-white transition"
                >
                  <option value="URBAIN">Urbain</option>
                  <option value="AGRICOLE">Agricole</option>
                  <option value="INDUSTRIEL">Industriel</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Localisation
                </label>
                <input
                  type="text"
                  value={localisation}
                  onChange={(e) => setLocalisation(e.target.value)}
                  placeholder="Ex. Diamniadio, Rufisque"
                  className="w-full rounded-md border border-gray-200 p-3 text-sm focus:border-gray-900 focus:outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5" htmlFor="superficie-calculee">
                  Superficie calculée
                </label>
                <output
                  id="superficie-calculee"
                  aria-live="polite"
                  className="flex min-h-[46px] w-full items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800"
                >
                  {superficieCalculee === null
                    ? 'À calculer à partir du tracé GPS'
                    : formatSuperficie(Math.round(superficieCalculee))}
                </output>
              </div>
            </div>

            <details className="rounded-md border border-gray-200 px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-semibold text-gray-700">
                Coordonnées GPS de la parcelle
              </summary>
              <div className="pt-3">
                <textarea
                  aria-label="Coordonnées GPS de la parcelle"
                  value={coordinates}
                  onChange={(e) => setCoordinates(e.target.value)}
                  placeholder="Collez les points GPS au format JSON ou GeoJSON"
                  rows={4}
                  className="w-full rounded-md border border-gray-200 p-3 font-mono text-xs focus:border-gray-900 focus:outline-none transition"
                  required
                />
                <p className="text-[11px] text-gray-500">
                  Entrez les points GPS ou un polygone GeoJSON. Le tracé est vérifié par PostGIS à la soumission.
                </p>
              </div>
            </details>

            <div>
              <label htmlFor="titre-plan" className="mb-1.5 block text-xs font-semibold text-gray-600">
                Titre ou plan
              </label>
              <input
                id="titre-plan"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] ?? null;
                  if (!selectedFile) {
                    setTitrePlan(null);
                    return;
                  }

                  const extension = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase();
                  if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(extension)) {
                    setError('Le document doit être au format PDF, JPG ou PNG.');
                    setTitrePlan(null);
                    e.target.value = '';
                    return;
                  }
                  if (selectedFile.size > 10 * 1024 * 1024) {
                    setError('Le document ne doit pas dépasser 10 Mo.');
                    setTitrePlan(null);
                    e.target.value = '';
                    return;
                  }

                  setError('');
                  setTitrePlan(selectedFile);
                }}
                className="w-full rounded-md border border-gray-200 bg-white p-2.5 text-xs focus:border-gray-900 focus:outline-none transition"
              />
              <p className="mt-1.5 text-[11px] text-gray-500">PDF, JPG ou PNG · 10 Mo maximum</p>
              {titrePlan && (
                <p className="mt-1 text-[11px] font-medium text-gray-700" role="status">
                  Fichier sélectionné : {titrePlan.name}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <p className="text-[11px] text-gray-500">
                Le chevauchement sera contrôlé par le cadastre.
              </p>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={loading || submitted}
                  className="rounded-md border border-gray-300 bg-white px-5 py-3 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Enregistrer le brouillon
                </button>
                <button
                  type="submit"
                  disabled={loading || submitted}
                  className="rounded-md bg-gray-900 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-black transition disabled:opacity-50"
                >
                  {loading ? 'Envoi en cours...' : submitted ? 'Parcelle envoyée' : 'Envoyer au cadastre'}
                </button>
              </div>
            </div>
          </form>

          <ParcelMapPreview coordinates={coordinates} reference={reference} localisation={localisation} />
        </div>
      </main>
    </div>
  );
}