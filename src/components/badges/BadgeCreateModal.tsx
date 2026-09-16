import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '../../types';
import { X, Sparkles, AlertTriangle, Tag, Loader2 } from 'lucide-react';
import { validateBadgeName, BADGE_NAME_MAX_LENGTH } from '../../services/badgeCreation';
import { MAX_TOTAL_BADGES, MAX_CUSTOM_BADGES } from '../../services/badgeDefinitions';
import styles from './BadgeCreateModal.module.css';

interface BadgeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<{ success: boolean; error?: string }>;
  existingBadges: Badge[];
}

/**
 * TSK-303 / SPEC-011: Modal de criação de badge customizado.
 * Permite ao criador da casa adicionar um novo badge customizado com
 * validação em tempo real (nome, duplicatas, teto de 20 customizados / 34 totais).
 * RN-11 (customizados ≤ 20), RN-12 (teto 34 / Restrição nº 3).
 */
export const BadgeCreateModal: React.FC<BadgeCreateModalProps> = ({
  isOpen,
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
      setName('');
      setError(null);
      setSubmitError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!name.trim()) {
      setError(null);
      return;
    }
    const result = validateBadgeName(name, existingBadges);
    setError(result.valid ? null : (result.errorMessage ?? null));
  }, [name, existingBadges]);

  if (!isOpen) return null;

  const customCount = existingBadges.filter((b) => !b.isSystem).length;
  const total = existingBadges.length;
  const canCreate = customCount < MAX_CUSTOM_BADGES && total < MAX_TOTAL_BADGES;

  const handleSubmit = async () => {
    const result = validateBadgeName(name, existingBadges);
    if (!result.valid) {
      setError(result.errorMessage ?? 'Nome inválido.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await onSubmit(name.trim());
      if (res.success) {
        onClose();
      } else {
        setSubmitError(res.error ?? 'Não foi possível criar o badge.');
      }
    } catch {
      setSubmitError('Erro inesperado ao criar o badge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting && !error && name.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Criar novo badge">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleRow}>
            <div className={styles.iconWrapper}>
              <Sparkles size={20} className={styles.headerIcon} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>Novo Badge Customizado</h2>
              <span className={styles.modalSubtitle}>
                {total}/{MAX_TOTAL_BADGES} badges · {customCount}/{MAX_CUSTOM_BADGES} customizados
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
          {!canCreate ? (
            <div className={styles.limitNotice}>
              <AlertTriangle size={16} />
              <span>
                {total >= MAX_TOTAL_BADGES
                  ? `Teto de ${MAX_TOTAL_BADGES} badges atingido. Remova um badge para adicionar outro.`
                  : `Limite de ${MAX_CUSTOM_BADGES} badges customizados atingido.`}
              </span>
            </div>
          ) : (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="badge-name-input">
                  Nome do badge
                </label>
                <div className={styles.inputRow}>
                  <Tag size={16} className={styles.inputIcon} />
                  <input
                    ref={inputRef}
                    id="badge-name-input"
                    className={`${styles.nameInput} ${error ? styles.nameInputError : ''}`}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex.: Lavanderia, Escritório..."
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
                O badge será adicionado ao final da lista de badges customizados da casa.
              </div>
            </>
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
          {canCreate && (
            <button
              type="button"
              className={styles.createButton}
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim() || !!error}
            >
              {isSubmitting ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : (
                <Sparkles size={16} />
              )}
              <span>Criar Badge</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
