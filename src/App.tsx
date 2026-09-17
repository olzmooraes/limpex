import React, { useState, useEffect, useMemo } from 'react';
import { TabId, User, House, Badge, HouseMember, CleaningRecord } from './types';
import { MobileContainer } from './components/layout/MobileContainer';
import { Header } from './components/layout/Header';
import { BottomNavbar } from './components/layout/BottomNavbar';
import { AuthScreen } from './components/auth/AuthScreen';
import { AuditModal } from './components/dev/AuditModal';
import { BadgeManagementPanel } from './components/badges/BadgeManagementPanel';
import { BadgeCreateModal } from './components/badges/BadgeCreateModal';
import { BadgeEditModal } from './components/badges/BadgeEditModal';
import { BadgeDeleteModal } from './components/badges/BadgeDeleteModal';
import { CleaningFormPanel } from './components/cleaning/CleaningFormPanel';
import { CleaningCard } from './components/cleaning/CleaningCard';
import { authService } from './services/authService';
import { dbService } from './services/supabase';
import { MAX_TOTAL_BADGES } from './services/badgeDefinitions';
import { getStoredActiveHouseId, saveActiveHouseId, resolveActiveHouse } from './services/houseSelection';
import { deriveWeekContext, buildCleaningCardView, formatRecordCount } from './services/cleaningWeekView';
import { 
  Calendar, 
  Plus, 
  Copy, 
  Check, 
  Share2,
  ShieldCheck,
  Building2,
  Lock,
  LogIn,
  AlertTriangle,
  Trash2,
  Loader2
} from 'lucide-react';
import styles from './App.module.css';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [activeHouse, setActiveHouse] = useState<House | null>(null);
  const [userHouses, setUserHouses] = useState<House[]>([]);
  const [newHouseName, setNewHouseName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [housesMessage, setHousesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [housePendingDelete, setHousePendingDelete] = useState<string | null>(null);
  const [isDeletingHouse, setIsDeletingHouse] = useState(false);
  const [houseBadges, setHouseBadges] = useState<Badge[] | null>(null);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [houseMembers, setHouseMembers] = useState<HouseMember[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [weeklyRecords, setWeeklyRecords] = useState<CleaningRecord[] | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [homeRefreshNonce, setHomeRefreshNonce] = useState(0);
  const [isCreateBadgeModalOpen, setIsCreateBadgeModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [deletingBadge, setDeletingBadge] = useState<Badge | null>(null);

  // Carregar sessão existente ao iniciar
  useEffect(() => {
    const existing = authService.getCurrentUser();
    if (existing) {
      setCurrentUser(existing);
    }
  }, []);

  // Carregar as casas do usuário (TSK-203) e manter a casa ativa para o código de convite
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    dbService.getUserHouses(currentUser.id).then((houses) => {
      if (cancelled) return;
      setUserHouses(houses);
      // TSK-204: elege a casa ativa persistida ou a primeira da lista (RN-19)
      setActiveHouse(resolveActiveHouse(houses, getStoredActiveHouseId()));
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // TSK-302/SPEC-010: Carregar badges da casa ativa (RN-19) e recarregar ao trocar de casa
  useEffect(() => {
    if (!activeHouse) {
      setHouseBadges(null);
      setBadgesLoading(false);
      return;
    }
    let cancelled = false;
    setBadgesLoading(true);
    dbService.getHouseBadges(activeHouse.id).then((badges) => {
      if (cancelled) return;
      setHouseBadges(badges);
      setBadgesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeHouse]);

  // TSK-402/SPEC-015: Carregar membros da casa ativa (RN-09) e recarregar ao trocar de casa
  useEffect(() => {
    if (!activeHouse) {
      setHouseMembers(null);
      setMembersLoading(false);
      return;
    }
    let cancelled = false;
    setMembersLoading(true);
    dbService.getHouseMembers(activeHouse.id).then((members) => {
      if (cancelled) return;
      setHouseMembers(members);
      setMembersLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeHouse]);

  // TSK-404/SPEC-017: Carregar faxinas da semana vigente da casa ativa (RN-06/RN-08/RN-19)
  // Recarrega ao trocar de casa ou após um novo registro (homeRefreshNonce).
  useEffect(() => {
    if (!activeHouse) {
      setWeeklyRecords(null);
      setWeeklyLoading(false);
      return;
    }
    let cancelled = false;
    setWeeklyLoading(true);
    const { weekNumber, month, year } = deriveWeekContext(new Date());
    dbService.getCleaningRecords(activeHouse.id, { year, month, weekNumber }).then((records) => {
      if (cancelled) return;
      setWeeklyRecords(records);
      setWeeklyLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeHouse, homeRefreshNonce]);

  const refreshUserHouses = async (userId: string): Promise<House[]> => {
    const houses = await dbService.getUserHouses(userId);
    setUserHouses(houses);
    setActiveHouse(resolveActiveHouse(houses, getStoredActiveHouseId()));
    return houses;
  };

  const handleSelectHouse = (house: House) => {
    setActiveHouse(house);
    saveActiveHouseId(house.id);
  };

  const handleCreateHouse = async () => {
    if (!currentUser) return;
    const name = newHouseName.trim();
    if (!name) {
      setHousesMessage({ type: 'error', text: 'Informe um nome para a nova casa.' });
      return;
    }

    const res = await dbService.createHouse(name, currentUser.id, currentUser.name, currentUser.email);
    if (!res.success || !res.house) {
      setHousesMessage({
        type: 'error',
        text: res.errorCode === 'HOUSE_LIMIT_REACHED'
          ? 'Você já é criador de uma casa.' // SPEC-008 §5 (estado descritivo)
          : (res.error ?? 'Não foi possível criar a casa.')
      });
      return;
    }

    setNewHouseName('');
    setHousesMessage({ type: 'success', text: `Casa "${res.house.name}" criada com sucesso!` });
    await refreshUserHouses(currentUser.id);
    setActiveHouse(res.house);
    saveActiveHouseId(res.house.id);
  };

  const handleJoinHouse = async () => {
    if (!currentUser) return;
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setHousesMessage({ type: 'error', text: 'Informe o código de convite.' });
      return;
    }

    const res = await dbService.joinHouseByInviteCode(code, currentUser.id, currentUser.name, currentUser.email);
    if (!res.success || !res.house) {
      setHousesMessage({ type: 'error', text: res.error ?? 'Não foi possível entrar na casa.' });
      return;
    }

    setJoinCodeInput('');
    setHousesMessage({ type: 'success', text: `Você entrou na casa "${res.house.name}"!` });
    await refreshUserHouses(currentUser.id);
    setActiveHouse(res.house);
    saveActiveHouseId(res.house.id);
  };

  const activeInviteCode = activeHouse?.inviteCode ?? '------';

  // TSK-205: Exclusão de casa restrita exclusivamente ao proprietário (RN-21)
  const handleDeleteHouse = async (houseId: string) => {
    if (!currentUser) return;
    setIsDeletingHouse(true);
    const res = await dbService.deleteHouseWithLog(houseId, currentUser.id, currentUser.name);
    setIsDeletingHouse(false);
    setHousePendingDelete(null);

    if (!res.success) {
      setHousesMessage({
        type: 'error',
        text: res.errorCode === 'NOT_HOUSE_OWNER'
          ? 'Você não é o proprietário desta casa. Apenas o criador pode excluí-la.'
          : (res.error ?? 'Não foi possível excluir a casa.')
      });
      return;
    }

    setHousesMessage({ type: 'success', text: `Casa "${res.house?.name}" excluída com sucesso.` });
    await refreshUserHouses(currentUser.id);
    if (getStoredActiveHouseId() === houseId) {
      saveActiveHouseId(null);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(activeInviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareCode = async () => {
    const shareData = {
      title: `Convite para ${activeHouse?.name ?? 'a casa'}`,
      text: `Entre na casa "${activeHouse?.name ?? ''}" no Limpex usando o código de convite: ${activeInviteCode}`,
    };

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Silenciar: fallback para cópia na área de transferência
      }
    }

    handleCopyCode();
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // TSK-303: Criar badge customizado (RN-11 / RN-12)
  const handleCreateBadge = async (badgeName: string): Promise<{ success: boolean; error?: string }> => {
    if (!activeHouse) {
      return { success: false, error: 'Nenhuma casa ativa selecionada.' };
    }
    const res = await dbService.addCustomBadge(activeHouse.id, badgeName);
    if (res.success) {
      const updatedBadges = await dbService.getHouseBadges(activeHouse.id);
      setHouseBadges(updatedBadges);
    }
    return res;
  };

  // TSK-304: Renomear badge (RN-13 / RN-21) — apenas o criador da casa
  const handleEditBadge = async (badgeId: string, newName: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Nenhum usuário autenticado.' };
    }
    if (!activeHouse) {
      return { success: false, error: 'Nenhuma casa ativa selecionada.' };
    }
    const res = await dbService.renameBadge(activeHouse.id, badgeId, newName, currentUser.id);
    if (res.success) {
      const updatedBadges = await dbService.getHouseBadges(activeHouse.id);
      setHouseBadges(updatedBadges);
    }
    return res;
  };

  // TSK-305: Excluir badge (RN-14 / RN-15 / RN-21) — apenas o criador da casa
  const handleDeleteBadge = async (badgeId: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Nenhum usuário autenticado.' };
    }
    if (!activeHouse) {
      return { success: false, error: 'Nenhuma casa ativa selecionada.' };
    }
    const res = await dbService.deleteBadgeWithLog(
      activeHouse.id,
      badgeId,
      currentUser.id,
      currentUser.name
    );
    if (res.success) {
      const updatedBadges = await dbService.getHouseBadges(activeHouse.id);
      setHouseBadges(updatedBadges);
    }
    return res;
  };

  // TSK-403/SPEC-016: Persiste o payload do formulário de faxina (RN-20).
  const handleSubmitCleaning = async (payload: CleaningRecord): Promise<void> => {
    const res = await dbService.createCleaningRecord(payload);
    if (!res.success) {
      throw new Error(res.errorCode || 'Falha ao persistir o registro de faxina.');
    }
    // TSK-404/SPEC-017: nova faxina entra imediatamente na lista da semana vigente (RN-06/RN-08)
    setHomeRefreshNonce((n) => n + 1);
  };

  // TSK-404/SPEC-017: Cards da semana vigente derivados dos registros + badges da casa ativa
  const weekContext = deriveWeekContext(new Date());
  const weeklyCards = useMemo(
    () => (weeklyRecords ?? []).map((record) => buildCleaningCardView(record, houseBadges ?? [])),
    [weeklyRecords, houseBadges]
  );

  // Se o usuário não estiver autenticado, exibe a Tela de Autenticação (RN-01 a RN-05)
  if (!currentUser) {
    return (
      <MobileContainer>
        <AuthScreen onAuthSuccess={(user) => setCurrentUser(user)} />
        
        {/* Botão Flutuante de Auditoria do Épico 1 */}
        <button
          type="button"
          onClick={() => setIsAuditModalOpen(true)}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            padding: '6px 12px',
            borderRadius: '9999px',
            background: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 99
          }}
          title="Auditar Barreira de 100 Usuários"
        >
          <ShieldCheck size={14} />
          <span>Auditar 100 Users</span>
        </button>

        <AuditModal 
          isOpen={isAuditModalOpen} 
          onClose={() => setIsAuditModalOpen(false)} 
        />
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <Header 
        houses={userHouses}
        activeHouse={activeHouse}
        currentUserId={currentUser.id}
        onSelectHouse={handleSelectHouse}
        onManageHouses={() => setActiveTab('houses')}
        onLogout={handleLogout}
      />

      {/* Botão Flutuante de Auditoria do Épico 1 */}
      <button
        type="button"
        onClick={() => setIsAuditModalOpen(true)}
        style={{
          position: 'absolute',
          top: '68px',
          right: '12px',
          padding: '4px 10px',
          borderRadius: '9999px',
          background: 'rgba(30, 41, 59, 0.9)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#10b981',
          fontSize: '11px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 40
        }}
        title="Auditar Barreira de 100 Usuários"
      >
        <ShieldCheck size={13} />
        <span>Auditoria</span>
      </button>

      <AuditModal 
        isOpen={isAuditModalOpen} 
        onClose={() => setIsAuditModalOpen(false)} 
      />

      {/* Área de Conteúdo com Rolagem Touch */}
      <section className={styles.contentArea}>
        {/* ABA 1: INÍCIO / SEMANA VIGENTE — TSK-404/SPEC-017 */}
        {activeTab === 'home' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionTitleRow}>
              <div>
                <span className={styles.badgeLabel}>Semana Vigente</span>
                <h1 className={styles.sectionHeading}>Faxinas Realizadas</h1>
              </div>
              <div className={styles.counterPill}>
                {weeklyRecords ? formatRecordCount(weeklyRecords.length) : '···'}
              </div>
            </div>

            {weekContext && <p className={styles.helperText}>{weekContext.weekLabel}</p>}

            {!activeHouse ? (
              <p className={styles.helperText}>
                Selecione uma casa para visualizar as faxinas da semana vigente.
              </p>
            ) : weeklyLoading || weeklyRecords === null ? (
              <div className={styles.loadingState}>
                <Loader2 className={styles.spinner} size={22} />
                <span>Carregando faxinas da semana...</span>
              </div>
            ) : weeklyRecords.length === 0 ? (
              <div className={styles.emptyStateCard}>
                <Calendar className={styles.emptyStateIcon} size={22} />
                <p className={styles.emptyStateText}>Nenhuma faxina registrada nesta semana.</p>
                <p className={styles.emptyStateHint}>
                  Toque em "+ Faxina" na barra inferior para registrar a primeira atividade.
                </p>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setActiveTab('new-cleaning')}
                >
                  <Plus size={18} />
                  <span>Registrar faxina</span>
                </button>
              </div>
            ) : (
              <div className={styles.cardList}>
                {weeklyCards.map((card) => (
                  <CleaningCard
                    key={card.recordId}
                    card={card}
                    isExpanded={expandedCardId === card.recordId}
                    onToggleExpand={(recordId) =>
                      setExpandedCardId((prev) => (prev === recordId ? null : recordId))
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 2: GESTÃO DE BADGES (MÁX 34) */}
        {activeTab === 'badges' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionTitleRow}>
              <div>
                <span className={styles.badgeLabel}>Etiquetas de Faxina</span>
                <h1 className={styles.sectionHeading}>Badges da Casa</h1>
              </div>
              <div className={styles.counterPill}>
                {houseBadges ? `${houseBadges.length} / ${MAX_TOTAL_BADGES} badges` : `${MAX_TOTAL_BADGES} badges`}
              </div>
            </div>

            <p className={styles.helperText}>
              Apenas o criador da casa pode adicionar até 20 novos badges customizados (teto de 34 badges no total).
            </p>

            <BadgeManagementPanel
              house={activeHouse}
              badges={houseBadges}
              isLoading={badgesLoading}
              currentUserId={currentUser.id}
              onRequestCreateBadge={() => setIsCreateBadgeModalOpen(true)}
              onRequestEditBadge={(badge) => setEditingBadge(badge)}
              onRequestDeleteBadge={(badge) => setDeletingBadge(badge)}
            />
          </div>
        )}

        {/* ABA 3: NOVA FAXINA (+ FAXINA) — TSK-402/SPEC-015 */}
        {activeTab === 'new-cleaning' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionTitleRow}>
              <div>
                <span className={styles.badgeLabel}>Registro Rápido</span>
                <h1 className={styles.sectionHeading}>Nova Faxina</h1>
              </div>
            </div>

            <p className={styles.helperText}>
              Qualquer membro vinculado à casa pode registrar uma faxina (RN-20).
            </p>

            <CleaningFormPanel
              house={activeHouse}
              members={houseMembers}
              badges={houseBadges}
              isLoading={badgesLoading || membersLoading}
              currentUser={currentUser}
              onSubmit={handleSubmitCleaning}
            />
          </div>
        )}

        {/* ABA 4: CASAS & CONVITES */}
        {activeTab === 'houses' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionTitleRow}>
              <div>
                <span className={styles.badgeLabel}>Gestão Residencial</span>
                <h1 className={styles.sectionHeading}>Minhas Casas</h1>
              </div>
              <div className={styles.counterPill}>
                {userHouses.length} {userHouses.length === 1 ? 'casa' : 'casas'}
              </div>
            </div>

            {/* Feedback de sucesso / erro das ações de casa */}
            {housesMessage && (
              <div
                role={housesMessage.type === 'error' ? 'alert' : 'status'}
                className={`${styles.statusBanner} ${
                  housesMessage.type === 'success' ? styles.statusSuccess : styles.statusError
                }`}
              >
                {housesMessage.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                <span>{housesMessage.text}</span>
              </div>
            )}

            {/* Lista de casas do usuário (criador ou membro) */}
            {userHouses.length > 0 ? (
              <div className={styles.houseList}>
                {userHouses.map((house) => {
                  const isCreator = house.creatorId === currentUser.id;
                  const isPendingDelete = housePendingDelete === house.id;
                  return (
                    <div
                      key={house.id}
                      className={`${styles.houseCard} ${activeHouse?.id === house.id ? styles.houseCardActive : ''}`}
                    >
                      <div className={styles.houseCardHeader}>
                        <div className={styles.houseCardInfo}>
                          <div className={styles.houseIconWrap}>
                            <Building2 size={18} className={styles.houseIcon} />
                          </div>
                          <div>
                            <span className={styles.houseName}>{house.name}</span>
                            <span className={styles.houseInvite}>Código: {house.inviteCode}</span>
                          </div>
                        </div>
                        <span className={`${styles.roleBadge} ${isCreator ? styles.roleCreator : styles.roleMember}`}>
                          {isCreator ? 'Criador' : 'Membro'}
                        </span>
                      </div>

                      {/* TSK-205: Exclusão visível apenas para o proprietário (RN-21) */}
                      {isCreator && (
                        <div className={styles.houseDeleteRow}>
                          {isPendingDelete ? (
                            <>
                              <span className={styles.deleteConfirmText}>
                                Excluir a casa "{house.name}"? Essa ação é irreversível.
                              </span>
                              <div className={styles.deleteConfirmActions}>
                                <button
                                  type="button"
                                  className={styles.deleteCancelButton}
                                  onClick={() => setHousePendingDelete(null)}
                                  disabled={isDeletingHouse}
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  className={styles.deleteConfirmButton}
                                  onClick={() => handleDeleteHouse(house.id)}
                                  disabled={isDeletingHouse}
                                >
                                  <Trash2 size={16} />
                                  <span>{isDeletingHouse ? 'Excluindo...' : 'Confirmar'}</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              type="button"
                              className={styles.deleteButton}
                              onClick={() => setHousePendingDelete(house.id)}
                              title="Excluir casa (apenas o proprietário)"
                            >
                              <Trash2 size={16} />
                              <span>Excluir casa</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={styles.helperText}>
                Você ainda não participa de nenhuma casa. Crie uma nova casa ou entre com um código de convite abaixo.
              </p>
            )}

            {/* Código de Convite da Casa Ativa (TSK-202) */}
            {activeHouse && (
              <div className={styles.inviteCard}>
                <span className={styles.inviteCardSub}>Código de convite da casa ativa</span>
                <div className={styles.codeRow}>
                  <code className={styles.codeBox}>{activeInviteCode}</code>
                  <div className={styles.codeActions}>
                    <button 
                      type="button" 
                      className={styles.shareButton}
                      onClick={handleShareCode}
                      title="Compartilhar código de convite"
                    >
                      {copiedCode ? <Check size={18} color="#10b981" /> : <Share2 size={18} />}
                      <span>{copiedCode ? 'Copiado!' : 'Compartilhar'}</span>
                    </button>
                    <button 
                      type="button" 
                      className={styles.actionIconButton}
                      onClick={handleCopyCode}
                      title="Copiar código de convite"
                      aria-label="Copiar código de convite"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
                <span className={styles.inviteNote}>
                  Compartilhe este código com outros moradores para que eles participem desta casa.
                </span>
              </div>
            )}

            {/* Criar nova casa (RN-18: máximo de 1 casa por criador) */}
            {userHouses.some((h) => h.creatorId === currentUser.id) ? (
              <div className={styles.lockNotice}>
                <Lock size={16} />
                <span>Você já é criador de uma casa. Cada usuário pode criar no máximo 1 casa no Limpex.</span>
              </div>
            ) : (
              <div className={styles.panelCard}>
                <span className={styles.panelTitle}>
                  <Plus size={16} className={styles.panelTitleIcon} />
                  Criar nova casa
                </span>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="new-house-name">Nome da casa</label>
                  <input
                    id="new-house-name"
                    className={styles.textInput}
                    type="text"
                    value={newHouseName}
                    onChange={(e) => setNewHouseName(e.target.value)}
                    placeholder="Ex.: Ap 402 - Família"
                    maxLength={40}
                    autoComplete="off"
                  />
                </div>
                <button type="button" className={styles.primaryButton} onClick={handleCreateHouse}>
                  <Plus size={18} />
                  <span>Criar casa</span>
                </button>
              </div>
            )}

            {/* Entrar em casa existente (RN-17) */}
            <div className={styles.panelCard}>
              <span className={styles.panelTitle}>
                <LogIn size={16} className={styles.panelTitleIcon} />
                Entrar em uma casa existente
              </span>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="join-house-code">Código de convite</label>
                <input
                  id="join-house-code"
                  className={styles.codeInput}
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="EX.: QR6K9X"
                  maxLength={6}
                  autoCapitalize="characters"
                  autoComplete="off"
                />
              </div>
              <button type="button" className={styles.secondaryActionButton} onClick={handleJoinHouse}>
                <LogIn size={18} />
                <span>Entrar na casa</span>
              </button>
            </div>
          </div>
        )}

        {/* ABA 5: HISTÓRICO SEMANAL */}
        {activeTab === 'history' && (
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
                    { label: 'sab', active: false },
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
        )}
      </section>

      {/* 5. Bottom Navigation Bar Fixa */}
      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* TSK-303: Modal de criação de badge customizado */}
      <BadgeCreateModal
        isOpen={isCreateBadgeModalOpen}
        onClose={() => setIsCreateBadgeModalOpen(false)}
        onSubmit={handleCreateBadge}
        existingBadges={houseBadges ?? []}
      />

      {/* TSK-304: Modal de edição (renomear) de badge — apenas criador (RN-21) */}
      <BadgeEditModal
        isOpen={editingBadge !== null}
        badge={editingBadge}
        onClose={() => setEditingBadge(null)}
        onSubmit={handleEditBadge}
        existingBadges={houseBadges ?? []}
      />

      {/* TSK-305: Modal de confirmação de exclusão de badge — apenas criador (RN-21) */}
      <BadgeDeleteModal
        isOpen={deletingBadge !== null}
        badge={deletingBadge}
        onClose={() => setDeletingBadge(null)}
        onSubmit={handleDeleteBadge}
      />
    </MobileContainer>
  );
};
