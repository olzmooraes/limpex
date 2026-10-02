import React, { useMemo } from 'react';
import { Calendar, Loader2, Plus } from 'lucide-react';
import { CleaningCard } from '../components/cleaning/CleaningCard';
import { buildCleaningCardView, formatRecordCount } from '../services/cleaningWeekView';
import type { Badge, CleaningRecord, House } from '../types';
import styles from '../App.module.css';

interface HomeScreenProps {
  house: House | null;
  weekLabel: string;
  records: CleaningRecord[] | null;
  /** Todos os badges da casa, inclusive excluídos (nomeiam tarefas antigas). */
  badges: Badge[] | null;
  isLoading: boolean;
  expandedCardId: string | null;
  onToggleExpand: (recordId: string) => void;
  onRegister: () => void;
}

/** Aba 1 — Início: faxinas da semana vigente (TSK-404 / SPEC-017 / SPEC-020). */
export const HomeScreen: React.FC<HomeScreenProps> = ({
  house,
  weekLabel,
  records,
  badges,
  isLoading,
  expandedCardId,
  onToggleExpand,
  onRegister
}) => {
  const cards = useMemo(
    () => (records ?? []).map((record) => buildCleaningCardView(record, badges ?? [])),
    [records, badges]
  );

  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionTitleRow}>
        <div>
          <span className={styles.badgeLabel}>Semana Vigente</span>
          <h1 className={styles.sectionHeading}>Faxinas Realizadas</h1>
        </div>
        <div className={styles.counterPill}>{records ? formatRecordCount(records.length) : '···'}</div>
      </div>

      <p className={styles.helperText}>{weekLabel}</p>

      {!house ? (
        <p className={styles.helperText}>Selecione uma casa para visualizar as faxinas da semana vigente.</p>
      ) : isLoading || records === null ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={22} />
          <span>Carregando faxinas da semana...</span>
        </div>
      ) : records.length === 0 ? (
        <div className={styles.emptyStateCard}>
          <Calendar className={styles.emptyStateIcon} size={22} />
          <p className={styles.emptyStateText}>Nenhuma faxina registrada nesta semana.</p>
          <p className={styles.emptyStateHint}>
            Toque em "+ Faxina" na barra inferior para registrar a primeira atividade.
          </p>
          <button type="button" className={styles.primaryButton} onClick={onRegister}>
            <Plus size={18} />
            <span>Registrar faxina</span>
          </button>
        </div>
      ) : (
        <div className={styles.cardList}>
          {cards.map((card) => (
            <CleaningCard
              key={card.recordId}
              card={card}
              isExpanded={expandedCardId === card.recordId}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};
