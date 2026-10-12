import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { LEGAL_DOCUMENTS, LEGAL_REVISION, LEGAL_ENTITY, type LegalDocKey } from './legal-content';

const LINKS: Array<{ key: LegalDocKey; label: string }> = [
  { key: 'mentions-legales', label: 'Mentions légales' },
  { key: 'cgu', label: "Conditions générales d'utilisation" },
  { key: 'confidentialite', label: 'Politique de confidentialité' },
];

// Page publique (sans connexion) : exigée par les stores et accessible depuis l'app mobile
const LegalPage: React.FC = () => {
  const { doc } = useParams<{ doc: string }>();
  const document = doc ? LEGAL_DOCUMENTS[doc as LegalDocKey] : undefined;

  if (!document) {
    return <Navigate to="/legal/mentions-legales" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/home" className="font-semibold text-red-600">My Truck</Link>
          <nav className="flex flex-wrap gap-3 text-sm">
            {LINKS.map(l => (
              <Link
                key={l.key}
                to={`/legal/${l.key}`}
                className={l.key === doc ? 'text-red-600 font-medium' : 'text-gray-600 hover:text-gray-900'}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{document.title}</h1>
        {document.intro && <p className="text-gray-700 mb-6 leading-relaxed">{document.intro}</p>}

        <div className="space-y-6">
          {document.sections.map(section => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="text-gray-700 leading-relaxed mb-2">{p}</p>
              ))}
              {section.items && (
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  {section.items.map((item, i) => <li key={i} className="leading-relaxed">{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-10 pt-4 border-t border-gray-200 text-sm text-gray-500">
          <p>Version {LEGAL_REVISION.version} — en vigueur au {LEGAL_REVISION.date}.</p>
          <p className="mt-1">{LEGAL_ENTITY.raisonSociale} — {LEGAL_ENTITY.email}</p>
        </footer>
      </main>
    </div>
  );
};

export default LegalPage;
