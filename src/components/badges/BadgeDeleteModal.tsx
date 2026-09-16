import React, { useState } from 'react';
import { Badge } from '../../types';
import { X, AlertTriangle, Trash2, Loader2, Tag, Sparkles } from 'lucide-react';
import styles from './BadgeDeleteModal.module.css';

interface BadgeDeleteModalProps {
  isOpen: boolean;
  badge: Badge | null;
  onClose: () => void;
  onSubmit: (badgeId: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * TSK-305 / SPEC-013 / RN-14 / RN-15 / RN-21: Modal de confirmação de exclusão
 * de badge. A exclusão é destrutiva e irreversível: além de remover o badge da
 * casa ativa (RN-19), gera obrigatoriamente um log de auditoria (Restrição nº 5).
 */
export const BadgeDeleteModal: React.FC<BadgeDeleteModalProps> = ({
  isOpen,
  badge,
  onClose,
  onSubmit
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen || !badge) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await onSubmit(badge.id);
      if (res.success) {
        onClose();
      } else {
        setSubmitError(res.error ?? 'Não foi possível excluir o badge.');
      }
    } catch {
      setSubmitError('Erro inesperado ao excluir o badge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Excluir badge">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleRow}>
            <div className={styles.iconWrapper}>
              <AlertTriangle size={20} className={styles.headerIcon} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>Excluir Badge</h2>
              <span className={styles.modalSubtitle}>
                {badge.isSystem ? 'Badge do sistema' : 'Badge customizado'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.badgeNameRow}>
            {badge.isSystem
              ? <Tag size={16} className={styles.badgeNameIcon} />
              : <Sparkles size={16} className={styles.badgeNameIcon} />}
            <span className={styles.badgeName}>{badge.name}</span>
          </div>

          <p className={styles.warningText}>
            Esta ação é <strong>irreversível</strong>. O badge será removido da casa ativa e
            não poderá mais ser usado em novos registros.
          </p>
          <p className={styles.auditText}>
            A exclusão será registrada no log de auditoria com data/hora, autor e descrição do
            badge excluído (Restrição Obrigatória nº 5).
          </p>

          {submitError && (
            <div className={styles.submitError}>
              <AlertTriangle size={14} />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : (
              <Trash2 size={16} />
            )}
            <span>{isSubmitting ? 'Excluindo...' : 'Excluir'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};