import { useEffect, useRef, useState } from 'react';
import { getLoanRequests, updateLoanRequestStatus } from '../api/loan-request-api.js';
import { LoanRequestCard } from '../components/LoanRequestCard.jsx';
import { PageState } from '../components/PageState.jsx';
import styles from './RequestsPage.module.css';

const TRANSITION_CONFIRMATIONS = {
  ACCEPTED: 'Vuoi accettare questa richiesta? Il libro diventerà non disponibile.',
  REJECTED: 'Vuoi rifiutare questa richiesta?',
  CANCELLED: 'Vuoi annullare questa richiesta?',
  RETURNED: 'Confermi che il libro è stato restituito?',
};

const TRANSITION_NOTICES = {
  ACCEPTED: 'Richiesta accettata. Il libro è ora non disponibile.',
  REJECTED: 'Richiesta rifiutata.',
  CANCELLED: 'Richiesta annullata.',
  RETURNED: 'Restituzione confermata. Il libro è nuovamente disponibile.',
};

export function RequestsPage() {
  const incomingTabRef = useRef(null);
  const outgoingTabRef = useRef(null);
  const [revision, setRevision] = useState(0);
  const [activeDirection, setActiveDirection] = useState('incoming');
  const [state, setState] = useState({
    status: 'loading',
    incoming: [],
    outgoing: [],
    error: '',
  });
  const [actionState, setActionState] = useState({ pendingId: null, error: '', notice: '' });

  useEffect(() => {
    const controller = new window.AbortController();

    async function loadRequests() {
      setState((current) => ({ ...current, status: 'loading', error: '' }));

      try {
        const [incoming, outgoing] = await Promise.all([
          getLoanRequests('incoming', { signal: controller.signal }),
          getLoanRequests('outgoing', { signal: controller.signal }),
        ]);
        setState({ status: 'ready', incoming, outgoing, error: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState({
            status: 'error',
            incoming: [],
            outgoing: [],
            error: error.message ?? 'Non è stato possibile caricare le richieste.',
          });
        }
      }
    }

    void loadRequests();
    return () => controller.abort();
  }, [revision]);

  async function handleTransition(loanRequest, nextStatus) {
    if (!window.confirm(TRANSITION_CONFIRMATIONS[nextStatus])) {
      return;
    }

    setActionState({ pendingId: loanRequest.id, error: '', notice: '' });

    try {
      const updated = await updateLoanRequestStatus(loanRequest.id, nextStatus);
      setState((current) => ({
        ...current,
        incoming: current.incoming.map((request) =>
          request.id === updated.id ? updated : request,
        ),
        outgoing: current.outgoing.map((request) =>
          request.id === updated.id ? updated : request,
        ),
      }));
      setActionState({ pendingId: null, error: '', notice: TRANSITION_NOTICES[nextStatus] });
    } catch (error) {
      setActionState({
        pendingId: null,
        error: error.message ?? 'Non è stato possibile aggiornare la richiesta.',
        notice: '',
      });
    }
  }

  function handleTabKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const nextDirection = activeDirection === 'incoming' ? 'outgoing' : 'incoming';
    setActiveDirection(nextDirection);
    const nextTab = nextDirection === 'incoming' ? incomingTabRef : outgoingTabRef;
    nextTab.current?.focus();
  }

  if (state.status === 'loading') {
    return <PageState title="Richieste di prestito" message="Caricamento delle richieste…" />;
  }

  if (state.status === 'error') {
    return (
      <PageState
        title="Richieste non disponibili"
        message={state.error}
        kind="error"
        action={{ label: 'Riprova', onClick: () => setRevision((current) => current + 1) }}
      />
    );
  }

  const activeRequests = state[activeDirection];
  const activeLabel = activeDirection === 'incoming' ? 'In entrata' : 'In uscita';

  return (
    <section className={styles.page}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Prestiti simulati</p>
        <h1>Richieste di prestito</h1>
        <p>
          Gestisci le richieste ricevute per i tuoi libri e controlla lo stato di quelle inviate.
        </p>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Direzione delle richieste">
        <button
          ref={incomingTabRef}
          id="incoming-tab"
          type="button"
          role="tab"
          aria-selected={activeDirection === 'incoming'}
          aria-controls="loan-requests-panel"
          tabIndex={activeDirection === 'incoming' ? 0 : -1}
          onClick={() => setActiveDirection('incoming')}
          onKeyDown={handleTabKeyDown}
        >
          In entrata ({state.incoming.length})
        </button>
        <button
          ref={outgoingTabRef}
          id="outgoing-tab"
          type="button"
          role="tab"
          aria-selected={activeDirection === 'outgoing'}
          aria-controls="loan-requests-panel"
          tabIndex={activeDirection === 'outgoing' ? 0 : -1}
          onClick={() => setActiveDirection('outgoing')}
          onKeyDown={handleTabKeyDown}
        >
          In uscita ({state.outgoing.length})
        </button>
      </div>

      {actionState.notice ? (
        <p className={styles.notice} role="status">
          {actionState.notice}
        </p>
      ) : null}
      {actionState.error ? (
        <p className={styles.error} role="alert">
          {actionState.error}
        </p>
      ) : null}

      <section
        id="loan-requests-panel"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby={`${activeDirection}-tab`}
      >
        <h2>{activeLabel}</h2>
        {activeRequests.length > 0 ? (
          <div className={styles.list}>
            {activeRequests.map((loanRequest) => (
              <LoanRequestCard
                key={loanRequest.id}
                loanRequest={loanRequest}
                direction={activeDirection}
                pending={actionState.pendingId === loanRequest.id}
                onTransition={handleTransition}
              />
            ))}
          </div>
        ) : (
          <p className={styles.empty} role="status">
            {activeDirection === 'incoming'
              ? 'Non hai richieste in entrata.'
              : 'Non hai ancora inviato richieste.'}
          </p>
        )}
      </section>
    </section>
  );
}
