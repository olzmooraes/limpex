import React from 'react';
import { Home, Tags, Plus, Building2, History, LucideIcon } from 'lucide-react';
import { TabId } from '../../types';
import { BOTTOM_NAV_ORDER, NavIcon } from '../../services/navConfig';
import styles from './BottomNavbar.module.css';

interface BottomNavbarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  tags: Tags,
  plus: Plus,
  building: Building2,
  history: History
};

/**
 * TSK-401 / SPEC-014: Bottom Navigation Bar fixa de 5 posições com botão
 * central "+ Faxina" elevado. Renderizada a partir da fonte única de verdade
 * BOTTOM_NAV_ORDER (src/services/navConfig.ts).
 */
export const BottomNavbar: React.FC<BottomNavbarProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <nav className={styles.navbar} aria-label="Navegação principal">
      {BOTTOM_NAV_ORDER.map((tab) => {
        const Icon = NAV_ICONS[tab.icon];
        const isActive = activeTab === tab.id;

        if (tab.isCentral) {
          return (
            <div key={tab.id} className={styles.centralButtonWrapper}>
              <button
                type="button"
                className={`${styles.centralButton} ${isActive ? styles.centralActive : ''}`}
                onClick={() => onTabChange(tab.id)}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                title="Nova Faxina"
              >
                <Icon size={26} strokeWidth={2.5} />
              </button>
              <span className={styles.centralLabel}>{tab.label}</span>
            </div>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.ariaLabel}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className={styles.iconContainer}>
              <Icon size={20} />
            </div>
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};