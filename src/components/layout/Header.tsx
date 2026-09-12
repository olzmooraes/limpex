import React from 'react';
import { Sparkles, LogOut, Home } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  currentHouseName?: string;
  onLogout: () => void;
  onSelectHouse?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentHouseName = 'Minha Residência',
  onLogout,
  onSelectHouse
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logoBadge}>
          <Sparkles size={18} className={styles.logoIcon} />
        </div>
        <span className={styles.brandTitle}>Limpex</span>
      </div>

      <div className={styles.actions}>
        {onSelectHouse && (
          <button 
            type="button" 
            className={styles.houseButton} 
            onClick={onSelectHouse}
            title="Trocar ou gerenciar casa"
          >
            <Home size={15} className={styles.houseIcon} />
            <span className={styles.houseName}>{currentHouseName}</span>
          </button>
        )}

        <button 
          type="button" 
          className={styles.logoutButton} 
          onClick={onLogout}
          aria-label="Sair da conta"
          title="Sair (Logout)"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
