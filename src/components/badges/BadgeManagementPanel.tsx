import React from 'react';
import { Tag, Plus, Sparkles, Loader2, AlertTriangle, Lock, Building2, Pencil, Trash2 } from 'lucide-react';
import { House, Badge } from '../../types';
import {
  MAX_TOTAL_BADGES,
  MAX_CUSTOM_BADGES,
  deriveBadgePanelState,
  canManageBadges
} from '../../services/badgeView';
import styles from './BadgeManagementPanel.module.css';

interface BadgeManagementPanelProps {
  house: House | null;
  badges: Badge[] | null;
  isLoading: boolean;
  currentUserId: string;
  onRequestCreateBadge?: () => void;
  onRequestEditBadge?: (badge: Badge) => void;
  onRequestDeleteBadge?: (badge: Badge) => void;
}

/**
 * TSK-302 / SPEC-010: Tela de Gestão de Badges (Item 2 da Bottom Navbar).
 * Exibe os badges reais da casa ativa (RN-19), agrupados em "Sistema" (RN-10)
 * e "Customizados" (RN-11), com contadores calculados em tempo real (RN-12).
 * Apenas o criador visualiza os pontos de entrada de criação/edição/exclusão
 * (RN-21), que ficam desabilitados ao atingir o teto de 34 badges (Restrição
 * Obrigatória nº 3).
 */
export const BadgeManagementPanel: React.FC<BadgeManagementPanelProps> = ({
  house,
  badges,
  isLoading,
  currentUserId,
  onRequestCreateBadge,
  onRequestEditBadge,
  onRequestDeleteBadge
}) => {
  const isCreator = canManageBadges(house?.creatorId, currentUserId);

  if (!house) {
    return (
      <div className={styles.emptyStateCard}>
        <div className={styles.emptyIconWrap}>
          <Building2 size={22} className={styles.emptyIcon} />
        </div>
        <p className={styles.emptyTitle}>Selecione uma casa</p>
        <p className={styles.emptyText}>
          Selecione uma casa no topo do aplicativo para visualizar e gerenciar os badges.
        </p>
      </div>
    );
  }

  if (isLoading || badges === null) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Carregando badges da casa...</span>
      </div>
    );
  }

  const derived = deriveBadgePanelState(badges);
  const { systemBadges, customBadges, customCount, capReached, customLimitReached } = derived;

  return (
    <div className={styles.panel}>
      {/* Subcontador discreto de customizados */}
      <div className={styles.subCounterRow}>
        <span className={styles.subCounter}>
          {customCount} de {MAX_CUSTOM_BADGES} badges customizados
        </span>
        <span className={styles.systemCounter}>
          {systemBadges.length} do sistema
        </span>
      </div>

      {customLimitReached && (
        <div className={styles.limitNotice}>
          <AlertTriangle size={14} />
          <span>Limite de {MAX_CUSTOM_BADGES} badges customizados atingido.</span>
        </div>
      )}
      {capReached && (
        <div className={styles.capNotice}>
          <Lock size={14} />
          <span>Teto de {MAX_TOTAL_BADGES} badges atingido. Remova um badge para adicionar outro.</span>
        </div>
      )}

      {/* Grupo: Badges do Sistema (RN-10) */}
      <section className={styles.group}>
        <span className={styles.groupTitle}>Badges do Sistema</span>
        <div className={styles.badgeGrid}>
          {systemBadges.map((badge) => (
            <div key={badge.id} className={styles.badgeChipWrap}>
              <div className={styles.systemBadgeItem}>
                <Tag size={13} className={styles.badgeIcon} />
                <span>{badge.name}</span>
              </div>
              {isCreator && (
                <div className={styles.badgeChipActions}>
                  <button
                    type="button"
                    className={styles.editBadgeButton}
                    onClick={() => onRequestEditBadge?.(badge)}
                    title={`Editar badge ${badge.name}`}
                    aria-label={`Editar badge ${badge.name}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className={styles.deleteBadgeButton}
                    onClick={() => onRequestDeleteBadge?.(badge)}
                    title={`Excluir badge ${badge.name}`}
                    aria-label={`Excluir badge ${badge.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Grupo: Badges Customizados (RN-11) — exibido apenas quando existirem */}
      {customBadges.length > 0 && (
        <section className={styles.group}>
          <span className={styles.groupTitle}>Badges Customizados</span>
          <div className={styles.badgeGrid}>
            {customBadges.map((badge) => (
              <div key={badge.id} className={styles.badgeChipWrap}>
                <div className={styles.customBadgeItem}>
                  <Sparkles size={13} className={styles.customBadgeIcon} />
                  <span>{badge.name}</span>
                </div>
                {isCreator && (
                  <div className={styles.badgeChipActions}>
                    <button
                      type="button"
                      className={styles.editBadgeButton}
                      onClick={() => onRequestEditBadge?.(badge)}
                      title={`Editar badge ${badge.name}`}
                      aria-label={`Editar badge ${badge.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBadgeButton}
                      onClick={() => onRequestDeleteBadge?.(badge)}
                      title={`Excluir badge ${badge.name}`}
                      aria-label={`Excluir badge ${badge.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RN-21: Ponto de entrada "Novo Badge" apenas para o criador da casa */}
      {isCreator && (
        <button
          type="button"
          className={`${styles.addBadgeButton} ${capReached ? styles.addBadgeButtonDisabled : ''}`}
          onClick={onRequestCreateBadge}
          disabled={capReached}
          title={capReached ? `Teto de ${MAX_TOTAL_BADGES} badges atingido` : 'Adicionar novo badge customizado'}
        >
          <Plus size={18} />
          <span>{capReached ? 'Teto de 34 badges atingido' : 'Novo Badge'}</span>
        </button>
      )}
    </div>
  );
};