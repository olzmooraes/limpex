# Workflow: Checklist de Homologação e Release (Release Checklist)

Checklist obrigatória a ser executada antes de qualquer marco de entrega ou release de versão do Limpex.

---

## 1. Verificação de Restrições Críticas (Gate 0)
- [ ] O limite de 100 usuários está ativo no banco e impedindo o 101º cadastro?
- [ ] A tela inicial oculta novos cadastros quando a marca de 100 for alcançada?
- [ ] Apenas o criador da casa consegue criar, editar ou excluir badges?
- [ ] Apenas o criador da casa consegue excluir a casa?
- [ ] O teto de 34 badges totais por casa é respeitado estritamente?
- [ ] Todas as exclusões de badges e casas registram logs imutáveis com autor, data/hora e identificação do item?

---

## 2. Experiência Mobile-First e UX (Gate 1)
- [ ] A navegação por Bottom Navbar responde fluidamente e sem atrasos em 5 posições?
- [ ] Alvos de toque possuem dimensão mínima de 44x44px?
- [ ] O botão central de "+ Faxina" está em destaque visual e ergonomicamente acessível?
- [ ] Cards de faxina com mais de 2 itens possuem expansão funcional sem quebrar layout?
- [ ] Cards de histórico exibem a linha de 7 dias (`dom` a `sab`) sem quebra de linha?
- [ ] Apenas semanas com registros de faxina são listadas no histórico?
- [ ] O visual respeita Safe Areas (entalhe de câmera e barra de gestos do smartphone)?

---

## 3. Qualidade Técnica e Resiliência (Gate 2)
- [ ] Suíte de testes unitários e de integração executada com 100% de sucesso?
- [ ] Ausência de erros ou avisos críticos no console?
- [ ] Estados de carregamento (skeletons/spinners) e tratamento de erros de rede presentes em todas as telas?
- [ ] Manifest PWA configurado com ícones e suporte a instalação no smartphone?
