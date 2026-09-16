import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, LogOut, Home, ChevronDown, Check, Building2 } from 'lucide-react';
import { House } from '../../types';
import styles from './Header.module.css';

interface HeaderProps {
  houses: House[];
  activeHouse: House | null;
  currentUserId: string;
  onSelectHouse: (house: House) => void;
  onManageHouses?: () => void;
  onLogout: () => void;
}

/**
 * TSK-204 / SPEC-008: Seletor de casa ativa no topo do aplicativo (RN-19).
 * Permite alternar entre as múltiplas casas do usuário em qualquer aba,
 * com área de toque >= 44px e dropdown mobile-first.
 */
export const Header: React.FC<HeaderProps> = ({
  houses,
  activeHouse,
  currentUserId,
  onSelectHouse,
  onManageHouses,
  onLogout
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar o menu ao clicar fora dele ou pressionar Esc
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const hasMultipleHouses = houses.length > 1;
  const activeHouseName = activeHouse?.name ?? 'Minha Casa';

  const handleSelect = (house: House) => {
    onSelectHouse(house);
    setIsMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logoBadge}>
          <Sparkles size={18} className={styles.logoIcon} />
        </div>
        <span className={styles.brandTitle}>Limpex</span>
      </div>

      <div className={styles.actions}>
        <div className={styles.houseSelector} ref={menuRef}>
          <button
            type="button"
            className={styles.houseButton}
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={isMenuOpen}
            title="Trocar casa ativa"
          >
            <Home size={15} className={styles.houseIcon} />
            <span className={styles.houseName}>{activeHouseName}</span>
            {hasMultipleHouses && (
              <ChevronDown size={14} className={isMenuOpen ? styles.chevronUp : styles.chevronDown} />
            )}
          </button>

          {isMenuOpen && (
            <div className={styles.houseMenu} role="listbox" aria-label="Casas do usuário">
              <span className={styles.houseMenuLabel}>Trocar casa ativa</span>

              <div className={styles.houseMenuList}>
                {houses.map((house) => {
                  const isCreator = house.creatorId === currentUserId;
                  const isActive = activeHouse?.id === house.id;
                  return (
                    <button
                      key={house.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`${styles.houseMenuItem} ${isActive ? styles.houseMenuItemActive : ''}`}
                      onClick={() => handleSelect(house)}
                    >
                      <span className={styles.houseMenuIconWrap}>
                        <Building2 size={16} className={styles.houseMenuIcon} />
                      </span>
                      <span className={styles.houseMenuInfo}>
                        <span className={styles.houseMenuName}>{house.name}</span>
                        <span className={styles.houseMenuCode}>Código: {house.inviteCode}</span>
                      </span>
                      <span className={`${styles.roleBadge} ${isCreator ? styles.roleCreator : styles.roleMember}`}>
                        {isCreator ? 'Criador' : 'Membro'}
                      </span>
                      {isActive && <Check size={16} className={styles.activeCheck} />}
                    </button>
                  );
                })}
              </div>

              {onManageHouses && (
                <button
                  type="button"
                  className={styles.manageButton}
                  onClick={() => {
                    setIsMenuOpen(false);
                    onManageHouses();
                  }}
                >
                  Gerenciar casas
                </button>
              )}
            </div>
          )}
        </div>

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