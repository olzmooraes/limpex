import React, { useState, useEffect, useMemo } from 'react';
import { TabId, House, Badge, HouseMember, CleaningRecord } from './types';
import { MobileContainer } from './components/layout/MobileContainer';
import { Header } from './components/layout/Header';
import { BottomNavbar } from './components/layout/BottomNavbar';
import { AuthScreen } from './components/auth/AuthScreen';
import { SetNewPasswordScreen } from './components/auth/SetNewPasswordScreen';
import { ConfigMissingScreen } from './components/auth/ConfigMissingScreen';
import { BadgeManagementPanel } from './components/badges/BadgeManagementPanel';
import { BadgeCreateModal } from './components/badges/BadgeCreateModal';
import { BadgeEditModal } from './components/badges/BadgeEditModal';
import { BadgeDeleteModal } from './components/badges/BadgeDeleteModal';
import { CleaningFormPanel } from './components/cleaning/CleaningFormPanel';
import { CleaningCard } from './components/cleaning/CleaningCard';
import { signOut } from './data/auth';
import { useSession } from './hooks/useSession';
import { getMyHouses, getHouseMembers, createHouse, joinHouse, deleteHouse } from './data/houses';
import { getBadges, activeBadges, createBadge, renameBadge, deleteBadge } from './data/badges';
import { getCleanings, createCleaning } from './data/cleanings';
import { toAppError } from './lib/appError';
import { MAX_TOTAL_BADGES } from './services/badgeDefinitions';
import { getStoredActiveHouseId, saveActiveHouseId, resolveActiveHouse } from './services/houseSelection';
import { buildCleaningCardView, formatRecordCount } from './services/cleaningWeekView';
import { useCurrentWeek } from './hooks/useCurrentWeek';
import { 
  Calendar, 
  Plus, 
  Copy, 
  Check, 
  Share2,
  Building2,
  Lock,
  LogIn,
  AlertTriangle,
  Trash2,
  Loader2
} from 'lucide-react';
import styles from './App.module.css';

export const App: React.FC = () => {
  // SPEC-022 E2: sessão real do Supabase Auth + perfil público
  const { session, completeRecovery } = useSession();
  const currentUser = session.status === 'signed-in' ? session.user : null;
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [activeHouse, setActiveHouse] = useState<House | null>(null);
  const [userHouses, setUserHouses] = useState<House[]>([]);
  const [newHouseName, setNewHouseName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [housesMessage, setHousesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
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
  // TSK-407/SPEC-020: semana vigente e "hoje" em Brasília, atualizados à meia-noite
  const weekContext = useCurrentWeek();

  // SPEC-022 E3: falha ao carregar dados da rede → aviso com "Tentar novamente"
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const reportLoadError = (err: unknown) => setDataError(toAppError(err).message);
  const retryLoad = () => {
    setDataError(null);
    setReloadNonce((n) => n + 1);
  };

  // SPEC-022: ao trocar de usuário (login/logout) a interface volta ao estado
  // inicial, sem aba, casa ou mensagens do usuário anterior. Declarado antes do
  // carregamento das casas para rodar primeiro.
  const currentUserId = currentUser?.id;
  useEffect(() => {
    setActiveTab('home');
    setUserHouses([]);
    setActiveHouse(null);
    setHousesMessage(null);
    setDataError(null);
    setExpandedCardId(null);
  }, [currentUserId]);

  // Carregar as casas do usuário (TSK-203) e manter a casa ativa para o código de convite
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    getMyHouses()
      .then((houses) => {
        if (cancelled) return;
        setUserHouses(houses);
        // TSK-204: elege a casa ativa persistida ou a primeira da lista (RN-19)
        setActiveHouse(resolveActiveHouse(houses, getStoredActiveHouseId()));
      })
      .catch((err) => !cancelled && reportLoadError(err));
    return () => {
      cancelled = true;
    };
  }, [currentUser, reloadNonce]);

  // TSK-302/SPEC-010: Carregar badges da casa ativa (RN-19), inclusive os excluídos,
  // que continuam nomeando tarefas no histórico (RN-14 revisada)
  useEffect(() => {
    if (!activeHouse) {
      setHouseBadges(null);
      setBadgesLoading(false);
      return;
    }
    let cancelled = false;
    setBadgesLoading(true);
    getBadges(activeHouse.id)
      .then((badges) => !cancelled && setHouseBadges(badges))
      .catch((err) => !cancelled && reportLoadError(err))
      .finally(() => !cancelled && setBadgesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeHouse, reloadNonce]);

  // TSK-402/SPEC-015: Carregar membros da casa ativa (RN-09) e recarregar ao trocar de casa
  useEffect(() => {
    if (!activeHouse) {
      setHouseMembers(null);
      setMembersLoading(false);
      return;
    }
    let cancelled = false;
    setMembersLoading(true);
    getHouseMembers(activeHouse.id)
      .then((members) => !cancelled && setHouseMembers(members))
      .catch((err) => !cancelled && reportLoadError(err))
      .finally(() => !cancelled && setMembersLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeHouse, reloadNonce]);

  // TSK-404/SPEC-017 + TSK-407/SPEC-020: Carregar faxinas da semana vigente (domingo a
  // sábado, Brasília) da casa ativa (RN-06/RN-08/RN-19). Recarrega ao trocar de casa,
  // após um novo registro (homeRefreshNonce) e na virada da semana.
  useEffect(() => {
    if (!activeHouse) {
      setWeeklyRecords(null);
      setWeeklyLoading(false);
      return;
    }
    let cancelled = false;
    setWeeklyLoading(true);
    getCleanings(activeHouse.id, { from: weekContext.start, to: weekContext.end })
      .then((records) => !cancelled && setWeeklyRecords(records))
      .catch((err) => !cancelled && reportLoadError(err))
      .finally(() => !cancelled && setWeeklyLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeHouse, homeRefreshNonce, weekContext.start, weekContext.end, reloadNonce]);

  const refreshUserHouses = async (): Promise<House[]> => {
    const houses = await getMyHouses();
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

    try {
      const house = await createHouse(name);
      setNewHouseName('');
      setHousesMessage({ type: 'success', text: `Casa "${house.name}" criada com sucesso!` });
      saveActiveHouseId(house.id);
      await refreshUserHouses();
    } catch (err) {
      setHousesMessage({ type: 'error', text: toAppError(err).message });
    }
  };

  const handleJoinHouse = async () => {
    if (!currentUser) return;
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setHousesMessage({ type: 'error', text: 'Informe o código de convite.' });
      return;
    }

    try {
      const house = await joinHouse(code);
      setJoinCodeInput('');
      setHousesMessage({ type: 'success', text: `Você entrou na casa "${house.name}"!` });
      saveActiveHouseId(house.id);
      await refreshUserHouses();
    } catch (err) {
      setHousesMessage({ type: 'error', text: toAppError(err).message });
    }
  };

  const activeInviteCode = activeHouse?.inviteCode ?? '------';

  // TSK-205: Exclusão de casa restrita ao proprietário (RN-21); o banco grava o log (RN-22)
  const handleDeleteHouse = async (houseId: string) => {
    if (!currentUser) return;
    const houseName = userHouses.find((h) => h.id === houseId)?.name ?? '';
    setIsDeletingHouse(true);
    try {
      await deleteHouse(houseId);
      if (getStoredActiveHouseId() === houseId) saveActiveHouseId(null);
      setHousesMessage({ type: 'success', text: `Casa "${houseName}" excluída com sucesso.` });
      await refreshUserHouses();
    } catch (err) {
      setHousesMessage({ type: 'error', text: toAppError(err).message });
    } finally {
      setIsDeletingHouse(false);
      setHousePendingDelete(null);
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

  // SPEC-022 E2: o useSession volta para a tela de login ao receber SIGNED_OUT
  const handleLogout = () => {
    signOut().catch(() => undefined);
  };

  // TSK-303/304/305: gestão de badges pelas RPCs; tetos (RN-11/12), permissão do
  // criador (RN-21) e log de exclusão (RN-15) são aplicados pelo banco.
  const runBadgeAction = async (action: (houseId: string) => Promise<unknown>): Promise<{ success: boolean; error?: string }> => {
    if (!activeHouse) return { success: false, error: 'Nenhuma casa ativa selecionada.' };
    try {
      await action(activeHouse.id);
      setHouseBadges(await getBadges(activeHouse.id));
      return { success: true };
    } catch (err) {
      return { success: false, error: toAppError(err).message };
    }
  };

  const handleCreateBadge = (badgeName: string) => runBadgeAction((houseId) => createBadge(houseId, badgeName));

  const handleEditBadge = (badgeId: string, newName: string) => runBadgeAction(() => renameBadge(badgeId, newName));

  const handleDeleteBadge = (badgeId: string) => runBadgeAction(() => deleteBadge(badgeId));

  // TSK-403/SPEC-016: registra a faxina pela RPC (RN-20); erros vêm traduzidos do banco.
  const handleSubmitCleaning = async (payload: CleaningRecord): Promise<void> => {
    try {
      await createCleaning({
        houseId: payload.houseId,
        responsibleId: payload.userId,
        cleaningDate: payload.cleaningDate,
        badgeIds: payload.badgeIds,
        notes: payload.notes
      });
    } catch (err) {
      throw toAppError(err);
    }
    // TSK-404/SPEC-017: nova faxina entra imediatamente na lista da semana vigente (RN-06/RN-08)
    setHomeRefreshNonce((n) => n + 1);
  };

  // RN-14 revisada: gestão, formulário e contadores usam só os badges ativos
  const activeHouseBadges = useMemo(() => (houseBadges ? activeBadges(houseBadges) : null), [houseBadges]);

  // TSK-404/SPEC-017: Cards da semana vigente derivados dos registros + badges da casa ativa
  const weeklyCards = useMemo(
    () => (weeklyRecords ?? []).map((record) => buildCleaningCardView(record, houseBadges ?? [])),
    [weeklyRecords, houseBadges]
  );

  // SPEC-022 E2: telas fora da sessão
  if (session.status === 'unconfigured') {
    return (
      <MobileContainer>
        <ConfigMissingScreen />
      </MobileContainer>
    );
  }
  if (session.status === 'loading') {
    return (
      <MobileContainer>
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={22} />
          <span>Carregando...</span>
        </div>
      </MobileContainer>
    );
  }
  if (session.status === 'password-recovery') {
    return (
      <MobileContainer>
        <SetNewPasswordScreen onDone={completeRecovery} />
      </MobileContainer>
    );
  }
  // Se o usuário não estiver autenticado, exibe a Tela de Autenticação (RN-01 a RN-05)
  if (!currentUser) {
    return (
      <MobileContainer>
        <AuthScreen />
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

      {/* Área de Conteúdo com Rolagem Touch */}
      <section className={styles.contentArea}>
        {/* SPEC-022 E3: falha de rede ao carregar dados */}
        {dataError && (
          <div role="alert" className={`${styles.statusBanner} ${styles.statusError}`}>
            <AlertTriangle size={16} />
            <span>{dataError}</span>
            <button type="button" className={styles.retryButton} onClick={retryLoad}>
              Tentar novamente
            </button>
          </div>
        )}

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

            <p className={styles.helperText}>{weekContext.label}</p>

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
                {activeHouseBadges ? `${activeHouseBadges.length} / ${MAX_TOTAL_BADGES} badges` : `${MAX_TOTAL_BADGES} badges`}
              </div>
            </div>

            <p className={styles.helperText}>
              Apenas o criador da casa pode adicionar até 20 novos badges customizados (teto de 34 badges no total).
            </p>

            <BadgeManagementPanel
              house={activeHouse}
              badges={activeHouseBadges}
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
              badges={activeHouseBadges}
              isLoading={badgesLoading || membersLoading}
              currentUser={currentUser}
              today={weekContext.today}
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
        existingBadges={activeHouseBadges ?? []}
      />

      {/* TSK-304: Modal de edição (renomear) de badge — apenas criador (RN-21) */}
      <BadgeEditModal
        isOpen={editingBadge !== null}
        badge={editingBadge}
        onClose={() => setEditingBadge(null)}
        onSubmit={handleEditBadge}
        existingBadges={activeHouseBadges ?? []}
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
