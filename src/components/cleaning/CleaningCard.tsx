import React from 'react';
import type { CleaningCardView } from '../../services/cleaningWeekView';
import { deriveCardExpandableState } from '../../services/cardExpandable';
import { deriveNotesIndicatorState } from '../../services/cleaningNotesIndicator';
import { ChevronDown, FileText, Info } from 'lucide-react';
import styles from './CleaningCard.module.css';

export interface CleaningCardProps {
  card: CleaningCardView;
  isExpanded: boolean;
  onToggleExpand: (recordId: string) => void;
}

/**
 * TSK-405 / TSK-406 / SPEC-018 / SPEC-019: Componente de Card de Faxina da Semana Vigente
 * com micro-animação fluida a 60fps, gaveta CSS Grid, chevron rotativo e
 * indicador visual ergonômico de observações/ressalvas (Restrição nº 1 / RN-07).
 */
export const CleaningCard: React.FC<CleaningCardProps> = ({
  card,
  isExpanded,
  onToggleExpand,
}) => {
  const {
    isExpandable,
    initialBadges,
    overflowBadges,
    expandLabel,
    collapseLabel,
  } = deriveCardExpandableState(card);

  const notesState = deriveNotesIndicatorState(card.recordId, card.notes, isExpanded);
  const overflowDrawerId = `overflow-drawer-${card.recordId}`;

  return (
    <article className={styles.cleaningCard}>
      {/* Cabeçalho do Card: Avatar + Identificação + Indicador de Notas */}
      <div className={styles.cardHeader}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{card.initials}</div>
          <div>
            <h2 className={styles.userName}>{card.userName}</h2>
            <span className={styles.cleaningDay}>{card.weekdayLabel}</span>
          </div>
        </div>

        {notesState.isVisible && (
          <button
            type="button"
            className={`${styles.noteIndicator} ${notesState.isActive ? styles.noteIndicatorActive : ''}`}
            title={notesState.tooltip}
            aria-label={notesState.ariaLabel}
            aria-expanded={notesState.isActive}
            aria-controls={notesState.notesDrawerId}
            onClick={() => onToggleExpand(card.recordId)}
          >
            <FileText size={18} className={styles.noteIcon} />
            {notesState.hasDot && <span className={styles.noteDot} aria-hidden="true" />}
          </button>
        )}
      </div>

      {/* Badges Iniciais (sempre até 2 badges visíveis - RN-07) */}
      <div className={styles.badgeTags}>
        {initialBadges.map((name) => (
          <span key={name} className={styles.taskTag}>
            {name}
          </span>
        ))}
      </div>

      {/* Gaveta Animada com CSS Grid para Badges Excedentes (Tarefas 3..N) */}
      {isExpandable && (
        <div
          id={overflowDrawerId}
          className={`${styles.overflowDrawer} ${isExpanded ? styles.overflowDrawerExpanded : ''}`}
          aria-hidden={!isExpanded}
        >
          <div className={styles.drawerInner}>
            <div className={styles.overflowBadgesList}>
              {overflowBadges.map((name) => (
                <span key={name} className={styles.taskTag}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Botão de Expansão com Chevron Animado de 180° */}
      {isExpandable && (
        <button
          type="button"
          className={styles.expandButton}
          onClick={() => onToggleExpand(card.recordId)}
          aria-expanded={isExpanded}
          aria-controls={overflowDrawerId}
        >
          <span>{isExpanded ? collapseLabel : expandLabel}</span>
          <span className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}>
            <ChevronDown size={16} />
          </span>
        </button>
      )}

      {/* Gaveta Animada da Caixa de Observações (TSK-406 / SPEC-019) */}
      {notesState.isVisible && notesState.sanitizedNotes && (
        <div
          id={notesState.notesDrawerId}
          className={`${styles.notesDrawer} ${isExpanded ? styles.notesDrawerExpanded : ''}`}
          aria-hidden={!isExpanded}
        >
          <div className={styles.notesDrawerInner}>
            <div className={styles.notesBox}>
              <Info size={15} className={styles.notesIcon} />
              <p className={styles.notesText}>
                <strong className={styles.notesLabel}>Obs: </strong>
                {notesState.sanitizedNotes}
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
