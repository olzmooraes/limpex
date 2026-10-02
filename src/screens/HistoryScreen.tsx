import React from 'react';
import { Calendar } from 'lucide-react';
import styles from '../App.module.css';

/**
 * Aba 5 — Histórico semanal. Conteúdo ainda ilustrativo: a implementação real
 * (agrupamento por semana com weekOf) é o Épico 5.
 */
export const HistoryScreen: React.FC = () => (
  <div className={styles.tabContent}>
    <div className={styles.sectionTitleRow}>
      <div>
        <span className={styles.badgeLabel}>Linha do Tempo</span>
        <h1 className={styles.sectionHeading}>Histórico Semanal</h1>
      </div>
    </div>

    <div className={styles.historyList}>
      {/* Card Semana 1 */}
      <article className={styles.historyCard}>
        <div className={styles.historyHeader}>
          <Calendar size={18} className={styles.historyIcon} />
          <h2 className={styles.historyTitle}>Semana 1 de Setembro de 2026</h2>
        </div>

        {/* Blocos de 7 dias lado a lado sem quebra */}
        <div className={styles.weekDaysRow}>
          {[
            { label: 'dom', active: false },
            { label: 'seg', active: true },
            { label: 'ter', active: false },
            { label: 'qua', active: true },
            { label: 'qui', active: false },
            { label: 'sex', active: true },
            { label: 'sab', active: false }
          ].map((dayItem) => (
            <div
              key={dayItem.label}
              className={`${styles.weekDayBlock} ${dayItem.active ? styles.dayHasCleaning : ''}`}
            >
              <span>{dayItem.label}</span>
            </div>
          ))}
        </div>

        <div className={styles.historySummary}>
          <p>Consolidado: Cozinha, Banheiro, Sala, Varanda e Calçada limpos.</p>
        </div>
      </article>
    </div>
  </div>
);
