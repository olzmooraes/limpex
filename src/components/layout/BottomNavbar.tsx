import React from 'react';
import { Home, Tags, Plus, Building2, History } from 'lucide-react';
import { TabId } from '../../types';
import styles from './BottomNavbar.module.css';

interface BottomNavbarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export const BottomNavbar: React.FC<BottomNavbarProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <nav className={styles.navbar} aria-label="Navegação principal">
      {/* 1. Início / Semana Vigente */}
      <button
        type="button"
        className={`${styles.navItem} ${activeTab === 'home' ? styles.active : ''}`}
        onClick={() => onTabChange('home')}
        aria-label="Início e faxinas da semana"
      >
        <div className={styles.iconContainer}>
          <Home size={20} />
        </div>
        <span className={styles.label}>Início</span>
      </button>

      {/* 2. Gestão de Badges */}
      <button
        type="button"
        className={`${styles.navItem} ${activeTab === 'badges' ? styles.active : ''}`}
        onClick={() => onTabChange('badges')}
        aria-label="Gestão de badges e tarefas"
      >
        <div className={styles.iconContainer}>
          <Tags size={20} />
        </div>
        <span className={styles.label}>Badges</span>
      </button>

      {/* 3. Botão Central em Destaque: + Faxina */}
      <div className={styles.centralButtonWrapper}>
        <button
          type="button"
          className={`${styles.centralButton} ${activeTab === 'new-cleaning' ? styles.centralActive : ''}`}
          onClick={() => onTabChange('new-cleaning')}
          aria-label="Registrar nova faxina"
          title="Nova Faxina"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
        <span className={styles.centralLabel}>+ Faxina</span>
      </div>

      {/* 4. Criar / Vincular a Casas */}
      <button
        type="button"
        className={`${styles.navItem} ${activeTab === 'houses' ? styles.active : ''}`}
        onClick={() => onTabChange('houses')}
        aria-label="Casas e membros"
      >
        <div className={styles.iconContainer}>
          <Building2 size={20} />
        </div>
        <span className={styles.label}>Casas</span>
      </button>

      {/* 5. Histórico Semanal */}
      <button
        type="button"
        className={`${styles.navItem} ${activeTab === 'history' ? styles.active : ''}`}
        onClick={() => onTabChange('history')}
        aria-label="Histórico de limpezas"
      >
        <div className={styles.iconContainer}>
          <History size={20} />
        </div>
        <span className={styles.label}>Histórico</span>
      </button>
    </nav>
  );
};
