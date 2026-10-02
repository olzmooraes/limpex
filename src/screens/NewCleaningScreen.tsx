import React from 'react';
import { CleaningFormPanel } from '../components/cleaning/CleaningFormPanel';
import { createCleaning } from '../data/cleanings';
import { toAppError } from '../lib/appError';
import type { Badge, CleaningRecord, House, HouseMember, User } from '../types';
import styles from '../App.module.css';

interface NewCleaningScreenProps {
  house: House | null;
  members: HouseMember[] | null;
  /** Só os badges ativos (RN-14 revisada). */
  badges: Badge[] | null;
  isLoading: boolean;
  currentUser: User;
  /** Hoje em Brasília (SPEC-020). */
  today: string;
  /** Recarrega a semana vigente depois do registro. */
  onRegistered: () => void;
}

/** Aba 3 — Registro de faxina (TSK-402/403/407/408); validação final no banco (RN-20). */
export const NewCleaningScreen: React.FC<NewCleaningScreenProps> = ({
  house,
  members,
  badges,
  isLoading,
  currentUser,
  today,
  onRegistered
}) => {
  const handleSubmit = async (payload: CleaningRecord): Promise<void> => {
    try {
      await createCleaning({
        houseId: payload.houseId,
        responsibleId: payload.userId,
        cleaningDate: payload.cleaningDate,
        badgeIds: payload.badgeIds,
        notes: payload.notes
      });
    } catch (err) {
      throw toAppError(err);
    }
    onRegistered();
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionTitleRow}>
        <div>
          <span className={styles.badgeLabel}>Registro Rápido</span>
          <h1 className={styles.sectionHeading}>Nova Faxina</h1>
        </div>
      </div>

      <p className={styles.helperText}>Qualquer membro vinculado à casa pode registrar uma faxina (RN-20).</p>

      <CleaningFormPanel
        house={house}
        members={members}
        badges={badges}
        isLoading={isLoading}
        currentUser={currentUser}
        today={today}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
