import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { axiosClient } from '../../api/axiosClient';
import BrandMark from '../../components/BrandMark';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { formatSuperficie } from '../../utils/formatSuperficie';

interface Parcelle {
  reference: string;
  nicad?: string;
  proprio_nom?: string;
  localisation?: string;
  superficie?: number | string;
}

type Decision = 'CERTIFIE' | 'REJETE';

export default function CertifierParcelle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parcelle, setParcelle] = useState<Parcelle | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);

  useEffect(() => {
    const fetchParcelle = async () => {
      try {
        const response = await axiosClient.get(`/validations/notaire/${id}`);
        setParcelle(response.data);
      } catch (err: any) {
        setLoadError(err.response?.data?.error || 'Impossible de charger le dossier à certifier.');
      } finally {
        setFetching(false);
      }
    };

    void fetchParcelle();
  }, [id]);

  const requestDecision = (decision: Decision) => {
    if (decision === 'REJETE' && !motif.trim()) {
      setDecisionError('Le motif est obligatoire en cas de rejet.');
      return;
    }

    setDecisionError('');
    setPendingDecision(decision);
  };

  const handleDecision = async () => {
    if (!pendingDecision) return;

    setLoading(true);
    try {
      const response = await axiosClient.post(`/validations/notaire/${id}`, { decision: pendingDecision, motif });
      navigate('/notaire', {
        state: { statusSyncPending: response.data.synchronisationEnAttente === true },
      });
    } catch (err: any) {
      setDecisionError(err.response?.data?.error || 'Erreur lors de la certification du dossier.');
      setPendingDecision(null);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-12 text-center text-sm text-gray-400">Chargement du dossier notarié...</div>;

  if (loadError || !parcelle) {
    return (
      <div className="workspace workspace--notaire min-h-screen text-gray-900">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
          <span className="inline-flex items-center gap-2 font-black text-xl text-gray-900">
            <BrandMark />
            FoncierSûr
          </span>
          <Link to="/notaire" className="text-sm font-semibold text-gray-900 hover:underline">
            Retour aux dossiers
          </Link>
        </header>
        <main className="mx-auto max-w-4xl p-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {loadError || 'Le dossier demandé est introuvable.'}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="workspace workspace--notaire min-h-screen bg-gray-50 pb-12 text-gray-900">
      <header className="flex justify-between items-center bg-white px-8 py-4 border-b border-gray-200">
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-2 font-black text-xl text-gray-900">
            <BrandMark />
            FoncierSûr
          </span>
          <Link to="/notaire" className="text-sm font-semibold text-gray-900 hover:underline">
            ← Retour aux dossiers
          </Link>
        </div>
        <span className="font-bold text-gray-900">Certification Notariée - {parcelle.reference}</span>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 p-8">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                Validée par le cadastre
              </span>
              <h2 className="mt-3 text-xl font-bold text-gray-900">Certifier {parcelle.reference}</h2>
              <p className="mt-1 text-xs text-gray-500">Vérifiez les informations avant la décision notariale.</p>
            </div>
            <div className="rounded-md bg-gray-50 px-4 py-3 text-right">
              <span className="block text-xs text-gray-500">Superficie</span>
              <span className="text-lg font-bold text-gray-900">
                {formatSuperficie(parcelle.superficie)}
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-4 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-gray-500">Référence</dt>
              <dd className="mt-1 font-semibold text-gray-800">{parcelle.reference}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">NICAD</dt>
              <dd className="mt-1 font-semibold text-gray-800">{parcelle.nicad || 'Non renseigné'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Propriétaire</dt>
              <dd className="mt-1 font-semibold text-gray-800">{parcelle.proprio_nom || 'Non renseigné'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Localisation</dt>
              <dd className="mt-1 font-semibold text-gray-800">{parcelle.localisation || 'Non renseignée'}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-900">Décision du notaire</h3>
            <p className="mt-1 text-xs text-gray-500">
              Confirmez la certification ou indiquez le motif de rejet.
            </p>
          </div>
          <div>
            <label htmlFor="notaire-motif" className="block text-xs font-semibold text-gray-600 mb-1.5">
              Observations / Motif de rejet
            </label>
            <textarea
              id="notaire-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Mentions légales, actes authentiques vérifiés..."
              className="w-full rounded-xl border border-gray-200 p-3.5 text-sm focus:border-gray-900 focus:outline-none h-28 transition"
            />
          </div>

          {decisionError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {decisionError}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => requestDecision('CERTIFIE')}
              className="rounded-md bg-[#b6532b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#98411f]"
            >
              Certifier la parcelle
            </button>
            <button
              onClick={() => requestDecision('REJETE')}
              className="rounded-md border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Rejeter
            </button>
          </div>
        </section>
      </main>
      {pendingDecision && (
        <ConfirmationDialog
          confirmLabel={pendingDecision === 'CERTIFIE' ? 'Confirmer la certification' : 'Confirmer le rejet'}
          destructive={pendingDecision === 'REJETE'}
          loading={loading}
          message={`Confirmez-vous votre décision pour la parcelle ${parcelle.reference} ?`}
          onCancel={() => setPendingDecision(null)}
          onConfirm={() => void handleDecision()}
          title="Confirmer la décision"
        />
      )}
    </div>
  );
}