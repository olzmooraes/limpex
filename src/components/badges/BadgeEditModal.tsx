import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '../../types';
import { X, Pencil, AlertTriangle, Tag, Loader2 } from 'lucide-react';
import { validateBadgeEditName } from '../../services/badgeEdit';
import { BADGE_NAME_MAX_LENGTH } from '../../services/badgeCreation';
import styles from './BadgeEditModal.module.css';

interface BadgeEditModalProps {
  isOpen: boolean;
  badge: Badge | null;
  onClose: () => void;
  onSubmit: (badgeId: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  existingBadges: Badge[];
}

/**
 * TSK-304 / SPEC-012 / RN-13 / RN-21: Modal de edição de badge.
 * Permite ao criador da casa renomear qualquer badge (sistema ou customizado)
 * com validação em tempo real (nome vazio, duplicata case-insensitive, 40 chars).
 */
export const BadgeEditModal: React.FC<BadgeEditModalProps> = ({
  isOpen,
  badge,
  onClose,
  onSubmit,
  existingBadges
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(badge?.name ?? '');
      setError(null);
      setSubmitError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, badge]);

  useEffect(() => {
    if (!badge) return;
    if (!name.trim()) {
      setError(null);
      return;
    }
    const result = validateBadgeEditName(name, badge.id, existingBadges);
    setError(result.valid ? null : (result.errorMessage ?? null));
  }, [name, badge, existingBadges]);

  if (!isOpen || !badge) return null;

  const unchanged = name.trim() === badge.name;
  const canSubmit = !error && !!name.trim() && !unchanged;

  const handleSubmit = async () => {
    if (!badge) return;
    const result = validateBadgeEditName(name, badge.id, existingBadges);
    if (!result.valid) {
      setError(result.errorMessage ?? 'Nome inválido.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await onSubmit(badge.id, name.trim());
      if (res.success) {
        onClose();
      } else {
        setSubmitError(res.error ?? 'Não foi possível salvar o badge.');
      }
    } catch {
      setSubmitError('Erro inesperado ao salvar o badge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting && canSubmit) {
      handleSubmit();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Editar badge">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleRow}>
            <div className={styles.iconWrapper}>
              <Pencil size={20} className={styles.headerIcon} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>Editar Badge</h2>
              <span className={styles.modalSubtitle}>
                {badge.isSystem ? 'Badge do sistema' : 'Badge customizado'} · renomear "{badge.name}"
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
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="badge-edit-input">
              Novo nome do badge
            </label>
            <div className={styles.inputRow}>
              <Tag size={16} className={styles.inputIcon} />
              <input
                ref={inputRef}
                id="badge-edit-input"
                className={`${styles.nameInput} ${error ? styles.nameInputError : ''}`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex.: Cozinha Principal..."
                maxLength={BADGE_NAME_MAX_LENGTH}
                autoComplete="off"
                disabled={isSubmitting}
              />
            </div>
            <div className={styles.inputMeta}>
              {error ? (
                <span className={styles.errorText}>{error}</span>
              ) : (
                <span className={styles.charCount}>
                  {name.length}/{BADGE_NAME_MAX_LENGTH}
                </span>
              )}
            </div>
          </div>

          {submitError && (
            <div className={styles.submitError}>
              <AlertTriangle size={14} />
              <span>{submitError}</span>
            </div>
          )}

          <div className={styles.hint}>
            O novo nome será aplicado a todos os registros futuros que usarem este badge na casa.
          </div>
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
            className={styles.saveButton}
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : (
              <Pencil size={16} />
            )}
            <span>Salvar</span>
          </button>
        </div>
      </div>
    </div>
  );
};