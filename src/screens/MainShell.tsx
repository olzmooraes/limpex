import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { MobileContainer } from '../components/layout/MobileContainer';
import { Header } from '../components/layout/Header';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { signOut } from '../data/auth';
import { useCurrentWeek } from '../hooks/useCurrentWeek';
import { useHouses } from '../hooks/useHouses';
import { useHouseData } from '../hooks/useHouseData';
import type { TabId, User } from '../types';
import { HomeScreen } from './HomeScreen';
import { BadgesScreen } from './BadgesScreen';
import { NewCleaningScreen } from './NewCleaningScreen';
import { HousesScreen } from './HousesScreen';
import { HistoryScreen } from './HistoryScreen';
import styles from '../App.module.css';

interface MainShellProps {
  user: User;
}

/**
 * SPEC-022 E4: app autenticado — cabeçalho com a casa ativa, as 5 abas e a
 * Bottom Navbar (Restrição nº 1). O App monta este componente com
 * key = id do usuário, então trocar de conta recomeça do estado inicial.
 */
export const MainShell: React.FC<MainShellProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  // TSK-407/SPEC-020: semana vigente e "hoje" em Brasília, atualizados à meia-noite
  const week = useCurrentWeek();
  const { houses, activeHouse, selectHouse, refresh, error: housesError, retry: retryHouses } = useHouses();
  const data = useHouseData(activeHouse, week);

  // SPEC-022 E3: falha de rede ao carregar dados → aviso com "Tentar novamente"
  const loadError = housesError ?? data.error;
  const retryLoad = () => {
    retryHouses();
    data.retry();
  };

  return (
    <MobileContainer>
      <Header
        houses={houses}
        activeHouse={activeHouse}
        currentUserId={user.id}
        onSelectHouse={selectHouse}
        onManageHouses={() => setActiveTab('houses')}
        onLogout={() => signOut().catch(() => undefined)}
      />

      {/* Área de Conteúdo com Rolagem Touch */}
      <section className={styles.contentArea}>
        {loadError && (
          <div role="alert" className={`${styles.statusBanner} ${styles.statusError}`}>
            <AlertTriangle size={16} />
            <span>{loadError}</span>
            <button type="button" className={styles.retryButton} onClick={retryLoad}>
              Tentar novamente
            </button>
          </div>
        )}

        {activeTab === 'home' && (
          <HomeScreen
            house={activeHouse}
            weekLabel={week.label}
            records={data.weeklyRecords}
            badges={data.badges}
            isLoading={data.weeklyLoading}
            expandedCardId={expandedCardId}
            onToggleExpand={(recordId) => setExpandedCardId((prev) => (prev === recordId ? null : recordId))}
            onRegister={() => setActiveTab('new-cleaning')}
          />
        )}

        {activeTab === 'badges' && (
          <BadgesScreen
            house={activeHouse}
            badges={data.activeBadges}
            isLoading={data.badgesLoading}
            currentUserId={user.id}
            onChanged={data.refreshBadges}
          />
        )}

        {activeTab === 'new-cleaning' && (
          <NewCleaningScreen
            house={activeHouse}
            members={data.members}
            badges={data.activeBadges}
            isLoading={data.badgesLoading || data.membersLoading}
            currentUser={user}
            today={week.today}
            onRegistered={data.refreshWeek}
          />
        )}

        {activeTab === 'houses' && (
          <HousesScreen currentUser={user} houses={houses} activeHouse={activeHouse} onChanged={refresh} />
        )}

        {activeTab === 'history' && <HistoryScreen />}
      </section>

      {/* Bottom Navigation Bar Fixa */}
      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} />
    </MobileContainer>
  );
};
