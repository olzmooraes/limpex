import React, { useState } from 'react';
import { AlertTriangle, Building2, Check, Copy, Lock, LogIn, Plus, Share2, Trash2 } from 'lucide-react';
import { createHouse, deleteHouse, joinHouse } from '../data/houses';
import { toAppError } from '../lib/appError';
import { getStoredActiveHouseId, saveActiveHouseId } from '../services/houseSelection';
import type { House, User } from '../types';
import styles from '../App.module.css';

interface HousesScreenProps {
  currentUser: User;
  houses: House[];
  activeHouse: House | null;
  /** Recarrega as casas e reelege a casa ativa. */
  onChanged: () => Promise<void>;
}

type Message = { type: 'success' | 'error'; text: string };

/**
 * Aba 4 — Casas e convites (TSK-202 a 205). Limite de 1 casa por criador
 * (RN-18), entrada por código (RN-17) e exclusão só pelo criador com log
 * (RN-21/22) são aplicados pelo banco.
 */
export const HousesScreen: React.FC<HousesScreenProps> = ({ currentUser, houses, activeHouse, onChanged }) => {
  const [newHouseName, setNewHouseName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [housePendingDelete, setHousePendingDelete] = useState<string | null>(null);
  const [isDeletingHouse, setIsDeletingHouse] = useState(false);

  const activeInviteCode = activeHouse?.inviteCode ?? '------';

  const handleCreateHouse = async () => {
    const name = newHouseName.trim();
    if (!name) {
      setMessage({ type: 'error', text: 'Informe um nome para a nova casa.' });
      return;
    }
    try {
      const house = await createHouse(name);
      setNewHouseName('');
      setMessage({ type: 'success', text: `Casa "${house.name}" criada com sucesso!` });
      saveActiveHouseId(house.id);
      await onChanged();
    } catch (err) {
      setMessage({ type: 'error', text: toAppError(err).message });
    }
  };

  const handleJoinHouse = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setMessage({ type: 'error', text: 'Informe o código de convite.' });
      return;
    }
    try {
      const house = await joinHouse(code);
      setJoinCodeInput('');
      setMessage({ type: 'success', text: `Você entrou na casa "${house.name}"!` });
      saveActiveHouseId(house.id);
      await onChanged();
    } catch (err) {
      setMessage({ type: 'error', text: toAppError(err).message });
    }
  };

  const handleDeleteHouse = async (houseId: string) => {
    const houseName = houses.find((h) => h.id === houseId)?.name ?? '';
    setIsDeletingHouse(true);
    try {
      await deleteHouse(houseId);
      if (getStoredActiveHouseId() === houseId) saveActiveHouseId(null);
      setMessage({ type: 'success', text: `Casa "${houseName}" excluída com sucesso.` });
      await onChanged();
    } catch (err) {
      setMessage({ type: 'error', text: toAppError(err).message });
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
      text: `Entre na casa "${activeHouse?.name ?? ''}" no Limpex usando o código de convite: ${activeInviteCode}`
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

  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionTitleRow}>
        <div>
          <span className={styles.badgeLabel}>Gestão Residencial</span>
          <h1 className={styles.sectionHeading}>Minhas Casas</h1>
        </div>
        <div className={styles.counterPill}>
          {houses.length} {houses.length === 1 ? 'casa' : 'casas'}
        </div>
      </div>

      {/* Feedback de sucesso / erro das ações de casa */}
      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`${styles.statusBanner} ${message.type === 'success' ? styles.statusSuccess : styles.statusError}`}
        >
          {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Lista de casas do usuário (criador ou membro) */}
      {houses.length > 0 ? (
        <div className={styles.houseList}>
          {houses.map((house) => {
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
      {houses.some((h) => h.creatorId === currentUser.id) ? (
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
            <label className={styles.formLabel} htmlFor="new-house-name">
              Nome da casa
            </label>
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
          <label className={styles.formLabel} htmlFor="join-house-code">
            Código de convite
          </label>
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
  );
};
