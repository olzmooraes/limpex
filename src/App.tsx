import React, { useState, useEffect } from 'react';
import { TabId, User } from './types';
import { MobileContainer } from './components/layout/MobileContainer';
import { Header } from './components/layout/Header';
import { BottomNavbar } from './components/layout/BottomNavbar';
import { AuthScreen } from './components/auth/AuthScreen';
import { AuditModal } from './components/dev/AuditModal';
import { authService } from './services/authService';
import { 
  CheckCircle2, 
  Calendar, 
  Tag, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Copy, 
  Check, 
  Sparkles,
  Info,
  ShieldCheck
} from 'lucide-react';
import styles from './App.module.css';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [activeHouseName, setActiveHouseName] = useState('Ap 402 - Família');
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>('demo-1');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Carregar sessão existente ao iniciar
  useEffect(() => {
    const existing = authService.getCurrentUser();
    if (existing) {
      setCurrentUser(existing);
    }
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText('LMP-9842');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

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
        currentHouseName={activeHouseName} 
        onLogout={handleLogout}
        onSelectHouse={() => setActiveTab('houses')}
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
        {/* ABA 1: INÍCIO / SEMANA VIGENTE */}
        {activeTab === 'home' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionTitleRow}>
              <div>
                <span className={styles.badgeLabel}>Semana Vigente</span>
                <h1 className={styles.sectionHeading}>Faxinas Realizadas</h1>
              </div>
              <div className={styles.counterPill}>3 registradas</div>
            </div>

            <div className={styles.cardList}>
              {/* Card 1: Com mais de 2 tarefas (Expansível) */}
              <article className={styles.cleaningCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>CO</div>
                    <div>
                      <h2 className={styles.userName}>Carlos Oliveira</h2>
                      <span className={styles.cleaningDay}>Quarta-feira</span>
                    </div>
                  </div>
                  <div className={styles.noteIndicator} title="Contém observações adicionais">
                    <FileText size={16} />
                  </div>
                </div>

                <div className={styles.badgeTags}>
                  <span className={styles.taskTag}>Cozinha</span>
                  <span className={styles.taskTag}>Banheiro</span>
                  {expandedCardId === 'demo-1' && (
                    <>
                      <span className={styles.taskTag}>Janelas</span>
                      <span className={styles.taskTag}>Garagem</span>
                    </>
                  )}
                </div>

                <button 
                  type="button" 
                  className={styles.expandButton}
                  onClick={() => setExpandedCardId(expandedCardId === 'demo-1' ? null : 'demo-1')}
                >
                  {expandedCardId === 'demo-1' ? (
                    <>
                      <span>Recolher</span>
                      <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      <span>+ 2 tarefas executadas</span>
                      <ChevronDown size={16} />
                    </>
                  )}
                </button>

                {expandedCardId === 'demo-1' && (
                  <div className={styles.notesBox}>
                    <Info size={14} className={styles.notesIcon} />
                    <p>Obs: Foi passado desinfetante especial no piso da cozinha.</p>
                  </div>
                )}
              </article>

              {/* Card 2: 2 tarefas */}
              <article className={styles.cleaningCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>MS</div>
                    <div>
                      <h2 className={styles.userName}>Mariana Silva</h2>
                      <span className={styles.cleaningDay}>Segunda-feira</span>
                    </div>
                  </div>
                </div>

                <div className={styles.badgeTags}>
                  <span className={styles.taskTag}>Sala</span>
                  <span className={styles.taskTag}>Varanda</span>
                </div>
              </article>
            </div>
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
              <div className={styles.counterPill}>14 / 34 badges</div>
            </div>

            <p className={styles.helperText}>
              Apenas o criador da casa pode adicionar até 20 novos badges customizados (teto de 34 badges no total).
            </p>

            <div className={styles.badgeGrid}>
              {[
                'Janelas', 'Portas', 'Quarto 1', 'Quarto 2', 'Quarto 3',
                'Banheiro', 'Varanda', 'Cozinha', 'Sala', 'Casa completa',
                'Garagem', 'Calçada', 'Área gourmet', 'Mobília'
              ].map((badge) => (
                <div key={badge} className={styles.systemBadgeItem}>
                  <Tag size={13} className={styles.badgeIcon} />
                  <span>{badge}</span>
                </div>
              ))}

              <button type="button" className={styles.addBadgeButton}>
                <Plus size={16} />
                <span>Novo Badge</span>
              </button>
            </div>
          </div>
        )}

        {/* ABA 3: NOVA FAXINA (+ FAXINA) */}
        {activeTab === 'new-cleaning' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionTitleRow}>
              <div>
                <span className={styles.badgeLabel}>Registro Rápido</span>
                <h1 className={styles.sectionHeading}>Nova Faxina</h1>
              </div>
            </div>

            <form className={styles.formContainer} onSubmit={(e) => e.preventDefault()}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Responsável pela Limpeza</label>
                <select className={styles.formSelect} defaultValue="me">
                  <option value="me">Você (Luiz Otávio)</option>
                  <option value="carlos">Carlos Oliveira</option>
                  <option value="mariana">Mariana Silva</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Dia da Semana</label>
                <div className={styles.dayPickerRow}>
                  {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'].map((day, idx) => (
                    <button
                      key={day}
                      type="button"
                      className={`${styles.dayPill} ${idx === 3 ? styles.dayPillActive : ''}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tarefas Realizadas (Badges)</label>
                <div className={styles.badgePicker}>
                  {['Cozinha', 'Banheiro', 'Sala', 'Quarto 1', 'Varanda'].map((tag, i) => (
                    <span 
                      key={tag} 
                      className={`${styles.selectBadgeChip} ${i < 2 ? styles.chipSelected : ''}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Observações (Opcional)</label>
                <textarea 
                  className={styles.formTextarea} 
                  placeholder="Alguma ressalva, produto utilizado ou aviso aos moradores..."
                  rows={3}
                />
              </div>

              <button type="button" className={styles.submitButton}>
                <Sparkles size={18} />
                <span>Salvar Registro de Faxina</span>
              </button>
            </form>
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
            </div>

            {/* Código de Convite da Casa Ativa */}
            <div className={styles.inviteCard}>
              <span className={styles.inviteCardSub}>Código de convite da casa ativa</span>
              <div className={styles.codeRow}>
                <code className={styles.codeBox}>LMP-9842</code>
                <button 
                  type="button" 
                  className={styles.copyButton}
                  onClick={handleCopyCode}
                  title="Copiar código de convite"
                >
                  {copiedCode ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
                  <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <span className={styles.inviteNote}>
                Compartilhe este código com outros moradores para que eles participem desta casa.
              </span>
            </div>

            <div className={styles.actionsList}>
              <button type="button" className={styles.secondaryActionButton}>
                <Plus size={18} />
                <span>Entrar em outra casa com código</span>
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
    </MobileContainer>
  );
};
