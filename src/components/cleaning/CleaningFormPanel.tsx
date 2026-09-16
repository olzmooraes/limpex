import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Tag,
  User,
  CalendarDays
} from 'lucide-react';
import { House, HouseMember, Badge, CleaningRecord, User as AppUser, DayOfWeek } from '../../types';
import {
  WEEKDAY_ORDER,
  WEEKDAY_LABELS,
  CLEANING_NOTES_MAX_LENGTH,
  CleaningFormDraft,
  deriveCleaningFormState,
  getTodayDayOfWeek,
  validateCleaningRegistration,
  buildCleaningRecordPayload
} from '../../services/cleaningRegistration';
import styles from './CleaningFormPanel.module.css';

interface CleaningFormPanelProps {
  house: House | null;
  members: HouseMember[] | null;
  badges: Badge[] | null;
  isLoading: boolean;
  currentUser: AppUser | null;
  onSubmit: (payload: CleaningRecord) => Promise<void> | void;
}

/**
 * TSK-402 / SPEC-015: Tela de Registro de Faxina (Item Central da Navbar — aba
 * `new-cleaning`). Formulário mobile-first com responsável (RN-09), dia da semana,
 * seleção múltipla de badges da casa ativa (RN-19) e observações. A persistência
 * real fica a cargo da TSK-403 via onSubmit(payload).
 */
export const CleaningFormPanel: React.FC<CleaningFormPanelProps> = ({
  house,
  members,
  badges,
  isLoading,
  currentUser,
  onSubmit
}) => {
  const [draft, setDraft] = useState<CleaningFormDraft>({
    responsibleMemberId: '',
    dayOfWeek: 'dom',
    badgeIds: [],
    notes: ''
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastPayload, setLastPayload] = useState<CleaningRecord | null>(null);

  // Re-derivar quando a casa ativa ou a lista de membros muda: responsável =
  // usuário logado (RN-09) e dia de hoje; preserva seleções já feitas.
  useEffect(() => {
    if (!house || !members || !currentUser) return;
    setDraft((prev) => {
      const responsibleStillValid = members.some((m) => m.userId === prev.responsibleMemberId);
      if (responsibleStillValid) return prev;
      return deriveCleaningFormState(members, currentUser.id);
    });
    setErrorMessage(null);
  }, [house, members, currentUser]);

  const selectedMember = useMemo(
    () => members?.find((m) => m.userId === draft.responsibleMemberId) ?? null,
    [members, draft.responsibleMemberId]
  );

  const today = useMemo(() => getTodayDayOfWeek(), []);

  // Estado vazio: nenhuma casa ativa selecionada (RN-19)
  if (!house) {
    return (
      <div className={styles.emptyStateCard}>
        <div className={styles.emptyIconWrap}>
          <Building2 size={22} className={styles.emptyIcon} />
        </div>
        <p className={styles.emptyTitle}>Selecione uma casa</p>
        <p className={styles.emptyText}>
          Selecione uma casa no topo do aplicativo para registrar uma faxina.
        </p>
      </div>
    );
  }

  // Carregamento dos dados da casa ativa
  if (isLoading || members === null || badges === null || !currentUser) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={24} className={styles.spinner} />
        <span>Carregando membros e badges da casa...</span>
      </div>
    );
  }

  const toggleBadge = (badgeId: string) => {
    setLastPayload(null);
    setErrorMessage(null);
    setDraft((prev) => {
      const selected = prev.badgeIds.includes(badgeId);
      return {
        ...prev,
        badgeIds: selected ? prev.badgeIds.filter((id) => id !== badgeId) : [...prev.badgeIds, badgeId]
      };
    });
  };

  const selectDay = (day: DayOfWeek) => {
    setLastPayload(null);
    setErrorMessage(null);
    setDraft((prev) => ({ ...prev, dayOfWeek: day }));
  };

  const handleSubmit = () => {
    if (!currentUser || !house) return;
    const result = validateCleaningRegistration(draft, members, badges);
    if (!result.valid) {
      setErrorMessage(result.message);
      setLastPayload(null);
      return;
    }
    const payload = buildCleaningRecordPayload(draft, {
      houseId: house.id,
      members,
      registeredById: currentUser.id
    });
    setErrorMessage(null);
    setIsSubmitting(true);
    Promise.resolve(onSubmit(payload))
      .then(() => {
        // Persistência concluída (TSK-403/SPEC-016): celebra o registro salvo.
        setLastPayload(payload);
        setDraft((prev) => ({ ...prev, badgeIds: [], notes: '' }));
      })
      .catch((err: unknown) => {
        // Falha de persistência (ex.: membro removido, badge de outra casa).
        setLastPayload(null);
        const message =
          err instanceof Error && err.message ? err.message : 'Falha ao salvar o registro de faxina.';
        setErrorMessage(message);
      })
      .finally(() => setIsSubmitting(false));
  };

  const notesLength = draft.notes.length;

  return (
    <form
      className={styles.panel}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {/* Feedback de sucesso após a persistência do registro (TSK-403 / SPEC-016) */}
      {lastPayload && (
        <div className={styles.successBanner} role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <div>
            <strong>Registro de faxina salvo com sucesso.</strong>
            <span>
              {lastPayload.userName} · {WEEKDAY_LABELS[lastPayload.dayOfWeek]} ·{' '}
              {lastPayload.badgeIds.length}{' '}
              {lastPayload.badgeIds.length === 1 ? 'tarefa' : 'tarefas'}
            </span>
          </div>
        </div>
      )}

      {/* Feedback de erro de validação (SPEC-015 §3 Cenários 5-7) */}
      {errorMessage && (
        <div className={styles.errorBanner} role="alert" aria-live="assertive">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* -- Responsável pela Limpeza (RN-09 §8.1) */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="cleaning-responsible">
          <User size={13} className={styles.labelIcon} />
          Responsável pela Limpeza
        </label>
        <select
          id="cleaning-responsible"
          className={styles.responsibleSelect}
          value={draft.responsibleMemberId}
          onChange={(e) => {
            setLastPayload(null);
            setErrorMessage(null);
            setDraft((prev) => ({ ...prev, responsibleMemberId: e.target.value }));
          }}
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.userId === currentUser.id ? `Você (${m.userName})` : m.userName}
            </option>
          ))}
        </select>
        {selectedMember && (
          <span className={styles.fieldHint}>
            {selectedMember.userId === currentUser.id
              ? 'Pré-selecionado com você — altere se outra pessoa realizou a faxina.'
              : `Registro em nome de ${selectedMember.userName}.`}
          </span>
        )}
      </div>

      {/* -- Dia da Semana (RN-09 §8.2) */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel} id="cleaning-day-label">
          <CalendarDays size={13} className={styles.labelIcon} />
          Dia da Semana
        </label>
        <div
          className={styles.dayPickerRow}
          role="group"
          aria-labelledby="cleaning-day-label"
        >
          {WEEKDAY_ORDER.map((day) => {
            const active = draft.dayOfWeek === day;
            return (
              <button
                key={day}
                type="button"
                className={`${styles.dayPill} ${active ? styles.dayPillActive : ''}`}
                onClick={() => selectDay(day)}
                aria-pressed={active}
                aria-label={WEEKDAY_LABELS[day]}
                title={WEEKDAY_LABELS[day]}
              >
                {day}
              </button>
            );
          })}
        </div>
        <span className={styles.fieldHint}>Hoje é {WEEKDAY_LABELS[today]} — ajuste se necessário.</span>
      </div>

      {/* -- Tarefas Realizadas (Badges da casa ativa — RN-09 §8.3) */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          <Tag size={13} className={styles.labelIcon} />
          Tarefas Realizadas (Badges)
        </label>
        {badges.length === 0 ? (
          <div className={styles.noBadgesNotice}>
            <AlertTriangle size={14} />
            <span>Esta casa ainda não possui badges de tarefas. Solicite ao criador da casa.</span>
          </div>
        ) : (
          <div className={styles.badgePicker}>
            {badges.map((badge) => {
              const selected = draft.badgeIds.includes(badge.id);
              return (
                <button
                  key={badge.id}
                  type="button"
                  className={`${styles.badgeChip} ${selected ? styles.badgeChipSelected : ''}`}
                  onClick={() => toggleBadge(badge.id)}
                  aria-pressed={selected}
                  title={badge.name}
                >
                  <Tag size={13} className={styles.badgeChipIcon} />
                  <span>{badge.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <span className={styles.fieldHint}>
          {draft.badgeIds.length} de {badges.length} tarefas selecionadas.
        </span>
      </div>

      {/* -- Observações (RN-09 §8.4) */}
      <div className={styles.formGroup}>
        <div className={styles.notesLabelRow}>
          <label className={styles.formLabel} htmlFor="cleaning-notes">
            Observações (Opcional)
          </label>
          <span className={`${styles.notesCounter} ${notesLength > CLEANING_NOTES_MAX_LENGTH ? styles.notesCounterOver : ''}`}>
            {notesLength}/{CLEANING_NOTES_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="cleaning-notes"
          className={styles.notesTextarea}
          placeholder="Alguma ressalva, produto utilizado ou aviso aos moradores..."
          rows={3}
          maxLength={CLEANING_NOTES_MAX_LENGTH + 10}
          value={draft.notes}
          onChange={(e) => {
            setLastPayload(null);
            setErrorMessage(null);
            setDraft((prev) => ({ ...prev, notes: e.target.value }));
          }}
        />
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting || badges.length === 0}
      >
        {isSubmitting ? (
          <Loader2 size={18} className={styles.spinner} />
        ) : (
          <Sparkles size={18} />
        )}
        <span>{isSubmitting ? 'Gerando registro...' : 'Salvar Registro de Faxina'}</span>
      </button>
    </form>
  );
};