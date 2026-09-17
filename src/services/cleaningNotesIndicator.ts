/**
 * TSK-406 / SPEC-019: Camada de Domínio para o Ícone Indicativo de Observações/Ressalvas
 * Regra RN-07: Exibir ícone visível caso o registro contenha notas/ressalvas.
 * Restrição nº 1: Padrão UX/UI Mobile-First com alvo de toque mínimo de 44x44px e acessibilidade.
 */

export const NOTES_TOUCH_TARGET_MIN = 44;
export const NOTES_ARIA_LABEL_EXPAND = 'Ver observações adicionais desta faxina';
export const NOTES_ARIA_LABEL_COLLAPSE = 'Ocultar observações adicionais desta faxina';
export const NOTES_TOOLTIP_DEFAULT = 'Contém observações ou ressalvas (toque para ver)';
export const NOTES_TOOLTIP_ACTIVE = 'Observações abertas (toque para recolher)';

export interface CleaningNotesIndicatorState {
  /** Indica se o ícone indicativo deve ser exibido visualmente */
  isVisible: boolean;
  /** Texto sanitizado da observação (aparado e garantido sem espaços residuais) */
  sanitizedNotes?: string;
  /** Identificador semântico do elemento da gaveta de notas (para aria-controls) */
  notesDrawerId: string;
  /** Rótulo acessível dinâmico dependente do estado de expansão */
  ariaLabel: string;
  /** Dica de ferramenta (title / tooltip) descritiva */
  tooltip: string;
  /** Se o card/observação está no estado ativo/aberto */
  isActive: boolean;
  /** Se deve exibir o ponto de alerta visual (badge dot) no ícone */
  hasDot: boolean;
}

/**
 * Verifica de forma estrita se a string de notas possui conteúdo válido e legível.
 * Retorna false para undefined, null, string vazia ou composta exclusivamente de espaços.
 */
export function hasValidNotes(notes?: string | null): boolean {
  if (!notes) return false;
  return notes.trim().length > 0;
}

/**
 * Gera o identificador HTML padronizado para a gaveta de observações do card.
 */
export function getNotesDrawerId(recordId: string): string {
  return `notes-drawer-${recordId}`;
}

/**
 * Deriva de forma determinística o estado completo do indicador visual de observações.
 */
export function deriveNotesIndicatorState(
  recordId: string,
  rawNotes?: string | null,
  isExpanded: boolean = false
): CleaningNotesIndicatorState {
  const isValid = hasValidNotes(rawNotes);
  const notesDrawerId = getNotesDrawerId(recordId);

  if (!isValid) {
    return {
      isVisible: false,
      sanitizedNotes: undefined,
      notesDrawerId,
      ariaLabel: '',
      tooltip: '',
      isActive: false,
      hasDot: false,
    };
  }

  const sanitizedNotes = rawNotes!.trim();
  const isActive = Boolean(isExpanded);

  return {
    isVisible: true,
    sanitizedNotes,
    notesDrawerId,
    ariaLabel: isActive ? NOTES_ARIA_LABEL_COLLAPSE : NOTES_ARIA_LABEL_EXPAND,
    tooltip: isActive ? NOTES_TOOLTIP_ACTIVE : NOTES_TOOLTIP_DEFAULT,
    isActive,
    hasDot: !isActive, // Exibe o ponto chamativo quando colapsado
  };
}

/**
 * Gera um preview truncado seguro da observação para exibições compactas.
 */
export function formatNotesPreview(notes: string, maxLength: number = 80): string {
  const trimmed = notes.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
}
