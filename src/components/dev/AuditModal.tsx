import React, { useState } from 'react';
import { runEpic1Audit, Epic1AuditReport } from '../../tests/runEpic1Audit';
import { 
  ShieldCheck, 
  X, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import styles from './AuditModal.module.css';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<Epic1AuditReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');

  if (!isOpen) return null;

  const handleRunAudit = async () => {
    setIsRunning(true);
    setReport(null);
    try {
      const res = await runEpic1Audit((stepNum, stepName) => {
        setCurrentStep(`Executando Gate ${stepNum}/7: ${stepName}...`);
      });
      setReport(res);
    } catch (err) {
      console.error('Erro na auditoria:', err);
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleRow}>
            <div className={styles.shieldIconWrapper}>
              <ShieldCheck size={22} className={styles.shieldIcon} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>Auditoria de Conformidade</h2>
              <span className={styles.modalSubtitle}>Épico 1 — Barreira dos 100 Usuários</span>
            </div>
          </div>
          <button 
            type="button" 
            className={styles.closeButton} 
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          <div className={styles.introCard}>
            <p>
              Executa a validação exaustiva em <strong>7 gates técnicos</strong> garantindo a 
              <strong> Restrição Obrigatória nº 2</strong>: bloqueio incondicional do 101º cadastro 
              manual e Google OAuth, e a preservação de acessos já existentes.
            </p>
          </div>

          {isRunning && (
            <div className={styles.progressBox}>
              <Loader2 size={24} className={styles.spinner} />
              <span className={styles.progressText}>{currentStep}</span>
            </div>
          )}

          {report && (
            <div className={styles.reportContainer}>
              <div className={`${styles.statusBadge} ${report.allPassed ? styles.statusSuccess : styles.statusError}`}>
                {report.allPassed ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>7 de 7 Gates Aprovados com Sucesso (100%)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} />
                    <span>{report.failedGates} Falha(s) Detectada(s)</span>
                  </>
                )}
              </div>

              <div className={styles.gateList}>
                {report.gates.map((gate) => (
                  <div key={gate.id} className={`${styles.gateCard} ${gate.passed ? styles.gatePassed : styles.gateFailed}`}>
                    <div className={styles.gateIcon}>
                      {gate.passed ? <CheckCircle2 size={18} color="#10b981" /> : <XCircle size={18} color="#ef4444" />}
                    </div>
                    <div className={styles.gateInfo}>
                      <div className={styles.gateTitleRow}>
                        <span className={styles.gateName}>Gate {gate.id}: {gate.name}</span>
                        <span className={styles.duration}>
                          <Clock size={12} /> {gate.durationMs}ms
                        </span>
                      </div>
                      <p className={styles.gateDescription}>{gate.description}</p>
                      <p className={styles.gateMessage}>{gate.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.runButton}
            onClick={handleRunAudit}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 size={18} className={styles.spinner} />
            ) : (
              <>
                <Play size={18} />
                <span>{report ? 'Executar Auditoria Novamente' : 'Disparar Auditoria dos 7 Gates'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
