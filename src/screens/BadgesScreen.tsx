import React, { useState } from 'react';
import { BadgeManagementPanel } from '../components/badges/BadgeManagementPanel';
import { BadgeCreateModal } from '../components/badges/BadgeCreateModal';
import { BadgeEditModal } from '../components/badges/BadgeEditModal';
import { BadgeDeleteModal } from '../components/badges/BadgeDeleteModal';
import { createBadge, deleteBadge, renameBadge } from '../data/badges';
import { toAppError } from '../lib/appError';
import { MAX_TOTAL_BADGES } from '../services/badgeDefinitions';
import type { Badge, House } from '../types';
import styles from '../App.module.css';

interface BadgesScreenProps {
  house: House | null;
  /** Só os badges ativos (RN-14 revisada). */
  badges: Badge[] | null;
  isLoading: boolean;
  currentUserId: string;
  /** Recarrega os badges da casa depois de criar, renomear ou excluir. */
  onChanged: () => Promise<void>;
}

type ActionResult = { success: boolean; error?: string };

/**
 * Aba 2 — Gestão de badges (TSK-302 a 305). Tetos (RN-11/12), permissão do
 * criador (RN-21) e log de exclusão (RN-15) são aplicados pelo banco.
 */
export const BadgesScreen: React.FC<BadgesScreenProps> = ({ house, badges, isLoading, currentUserId, onChanged }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [deletingBadge, setDeletingBadge] = useState<Badge | null>(null);

  const run = async (action: (houseId: string) => Promise<unknown>): Promise<ActionResult> => {
    if (!house) return { success: false, error: 'Nenhuma casa ativa selecionada.' };
    try {
      await action(house.id);
      await onChanged();
      return { success: true };
    } catch (err) {
      return { success: false, error: toAppError(err).message };
    }
  };

  return (
    <>
      <div className={styles.tabContent}>
        <div className={styles.sectionTitleRow}>
          <div>
            <span className={styles.badgeLabel}>Etiquetas de Faxina</span>
            <h1 className={styles.sectionHeading}>Badges da Casa</h1>
          </div>
          <div className={styles.counterPill}>
            {badges ? `${badges.length} / ${MAX_TOTAL_BADGES} badges` : `${MAX_TOTAL_BADGES} badges`}
          </div>
        </div>

        <p className={styles.helperText}>
          Apenas o criador da casa pode adicionar até 20 novos badges customizados (teto de 34 badges no total).
        </p>

        <BadgeManagementPanel
          house={house}
          badges={badges}
          isLoading={isLoading}
          currentUserId={currentUserId}
          onRequestCreateBadge={() => setIsCreateOpen(true)}
          onRequestEditBadge={(badge) => setEditingBadge(badge)}
          onRequestDeleteBadge={(badge) => setDeletingBadge(badge)}
        />
      </div>

      {/* Modais fora do conteúdo animado (transform) para manter o position: fixed */}
      <BadgeCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={(name) => run((houseId) => createBadge(houseId, name))}
        existingBadges={badges ?? []}
      />
      <BadgeEditModal
        isOpen={editingBadge !== null}
        badge={editingBadge}
        onClose={() => setEditingBadge(null)}
        onSubmit={(badgeId, newName) => run(() => renameBadge(badgeId, newName))}
        existingBadges={badges ?? []}
      />
      <BadgeDeleteModal
        isOpen={deletingBadge !== null}
        badge={deletingBadge}
        onClose={() => setDeletingBadge(null)}
        onSubmit={(badgeId) => run(() => deleteBadge(badgeId))}
      />
    </>
  );
};
