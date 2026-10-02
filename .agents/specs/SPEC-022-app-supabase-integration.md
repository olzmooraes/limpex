# SPEC-022: App Conectado ao Supabase (Auth Real e Camada de Dados)

- **Status**: IMPLEMENTED
- **Épico**: [ÉPICO 7 - Refundação Técnica](../backlog/backlog.md)
- **Autor**: Agente AI / Arquiteto
- **Data de Criação**: 2026-10-01
- **Última Atualização**: 2026-10-01
- **Tarefa Relacionada**: `TSK-703`. Absorve a `TSK-704`, porque os testes de integração pela API passam a fazer parte desta tarefa.
- **Depende de**: [SPEC-021](SPEC-021-database-baseline.md) (banco) e [SPEC-020](SPEC-020-week-rule-and-cleaning-date.md) (datas)

---

## 1. Contexto e Objetivo

O banco real existe (SPEC-021), mas o app ainda usa um mock no `localStorage`:

- **Autenticação simulada:** qualquer e-mail entra sem senha.
- **Dados presos ao navegador:** os moradores não compartilham a casa de verdade.

Esta spec liga o app ao Supabase e remove o mock. É dividida em **4 entregas**, um commit cada, na mesma branch:

| Entrega | Conteúdo | O app continua funcionando? |
|---------|----------|-----------------------------|
| **E1** Fundação do cliente | `@supabase/supabase-js`, cliente configurado, tipos gerados do banco, tradução de erros, seed de desenvolvimento | Sim (ainda no mock) |
| **E2** Autenticação real | Cadastro, login, sessão, logout, recuperação de senha, teto de 100 | Sim |
| **E3** Camada de dados real | Casas, membros, badges e faxinas via RLS + RPCs; mock removido; testes de integração | Sim, 100% no banco |
| **E4** Divisão do `App.tsx` | Telas e hooks separados, sem mudança de comportamento | Sim |

---

## 2. Regras de Negócio Envolvidas

- [x] Limite de 100 usuários (RN-01 a RN-05)
- [x] RN-05 revisada: e-mail e senha (mínimo de 6), sem confirmação de e-mail, com recuperação de senha; Google depois (TSK-705)
- [x] Todas as regras de casas, badges e faxinas passam a ser aplicadas pelo banco (SPEC-021); o cliente só antecipa validações para dar retorno imediato.

---

## 3. Cenários de Aceite BDD

### E1 — Fundação
1. **Configuração ausente:** **Dado** que `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` não estão definidas, **Quando** o app abre, **Então** mostra a tela "Limpex indisponível" com instrução de configuração, em vez de quebrar.
2. **Tipos do banco:** `npm run db:types` regenera `src/types/database.ts` a partir do banco local, e `npm run typecheck` passa.
3. **Erros em português**
   - Um erro de RPC (`P0001`, código em `message`, texto em `details`) vira a mensagem em pt-BR e preserva o código.
   - Falha de rede vira "Sem conexão com o servidor. Tente novamente."
   - Qualquer outro erro vira uma mensagem genérica.
4. **Seed local:** `npm run db:reset` cria 3 contas de teste (Luiz Otávio, Carlos Oliveira, Mariana Silva) com senha de desenvolvimento, a casa "Ap 402 - Família" com os três como membros e algumas faxinas da semana. **Só no banco local; nunca em produção.**

### E2 — Autenticação
5. **Cadastro:** nome, e-mail e senha com 6 ou mais caracteres criam a conta e já entram logados; o perfil usa o nome informado.
6. **E-mail repetido:** cadastro com e-mail já usado mostra "Este e-mail já está cadastrado."
7. **Teto de 100**
   - Com 100 contas, a tela mostra o aviso e esconde o cadastro.
   - Se uma corrida fizer a 101ª tentativa chegar ao servidor, a mensagem é a de limite atingido.
8. **Senha errada:** login com senha errada mostra "E-mail ou senha incorretos." **Não existe mais login sem senha.**
9. **Sessão:** a sessão persiste ao recarregar a página; "Sair" encerra a sessão e volta para a tela de login.
10. **Esqueci minha senha**
    - "Esqueci minha senha" envia o e-mail de recuperação. No ambiente local, ele aparece no Mailpit.
    - O link abre a tela "Definir nova senha"; depois disso, a nova senha funciona.
11. **Atalhos e Google**
    - As "Contas rápidas de teste" só aparecem em desenvolvimento (`npm run dev`) e entram com a senha do seed.
    - O botão do Google fica oculto até a TSK-705.

### E3 — Dados
12. **Casas:** a aba Casas lista as casas do usuário com o papel. Criar, entrar por código e excluir usam as RPCs, e os erros aparecem traduzidos (ex.: `HOUSE_LIMIT_REACHED` → "Você já é criador de uma casa...").
13. **Badges:** a gestão e o formulário mostram só badges ativos; criar, renomear e excluir usam as RPCs; os contadores refletem o banco.
14. **Faxinas**
    - O registro usa `create_cleaning`.
    - A aba Início lista a semana atual com o nome do responsável (`responsible_name`) e os nomes das tarefas, incluindo badges excluídos, que são histórico.
    - Faxina sem tarefas aparece com "Sem tarefas".
15. **Compartilhamento real:** Carlos registra uma faxina no navegador dele; Luiz, membro da mesma casa, a vê ao abrir o app noutro navegador.
16. **Isolamento:** trocar a casa ativa recarrega tudo; dados de outra casa nunca aparecem.
17. **Mock removido**
    - Não existe mais `dbService`/`authService` simulados.
    - O único uso de `localStorage` é a preferência da casa ativa no dispositivo.

### E4 — Organização
18. **Sem mudança de comportamento:** `App.tsx` passa a orquestrar telas (`screens/`) e hooks (`useSession`, `useHouses`, `useHouseData`). Todos os testes e a verificação manual dão o mesmo resultado de antes.

---

## 4. Contratos

### 4.1 Cliente e erros (`src/lib/`)

```typescript
// src/lib/supabase.ts
export const supabase: SupabaseClient<Database> | null; // null quando faltam variáveis (Cenário 1)

// src/lib/appError.ts
export class AppError extends Error {
  code: string;    // ex.: 'HOUSE_LIMIT_REACHED', 'NETWORK_ERROR', 'UNKNOWN'
  message: string; // texto em pt-BR para exibir
}
export function toAppError(error: unknown): AppError;
```

### 4.2 Camada de dados (`src/data/`), substituindo `services/supabase.ts`

```typescript
// Leituras (RLS)
getMyHouses(): Promise<HouseWithRole[]>;
getHouseMembers(houseId): Promise<HouseMember[]>;
getActiveBadges(houseId): Promise<Badge[]>;
getAllBadges(houseId): Promise<Badge[]>;          // inclui excluídos, para resolver nomes no histórico
getCleanings(houseId, { from, to }): Promise<CleaningRecord[]>; // com badgeIds

// Escritas (RPCs da SPEC-021); falham com AppError
createHouse(name); joinHouse(code); deleteHouse(houseId);
createBadge(houseId, name); renameBadge(badgeId, name); deleteBadge(badgeId);
createCleaning({ houseId, responsibleId, cleaningDate, badgeIds, notes });
```

As linhas do banco (`snake_case`) são convertidas para os tipos do app (`camelCase`) por funções de mapeamento testadas.

### Ajustes de tipos
- **`Badge`** ganha `deletedAt?`.
- **`CleaningRecord.userName`** passa a vir de `responsible_name`.
- **IDs** passam a ser UUIDs gerados pelo banco: o payload de criação deixa de levar `id` e `createdAt`.

### 4.3 Ambiente
- **Variáveis:** `.env.local` (fora do git) com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- **`npm run env:local`:** gera esse arquivo a partir de `supabase status`, para o banco local.
- **`.env.example`:** é atualizado, e `VITE_ENABLE_MOCK_FALLBACK` sai.

---

## 5. UX/UI

### Tela de login
- **"Esqueci minha senha":** link discreto abaixo do campo de senha. Abre um formulário só com e-mail e a confirmação "Se houver uma conta com este e-mail, enviamos um link de recuperação".
- **"Definir nova senha":** aberta pelo link do e-mail. Tem um campo de senha com o mínimo de 6 caracteres e o botão "Salvar nova senha".
- **Botão do Google:** oculto até a TSK-705.
- **Contas rápidas de teste:** só em desenvolvimento.

### Demais telas
- **Estados novos de carregamento e erro:** como os dados passam a vir da rede, as listas mostram "Carregando..." e, em caso de falha, um aviso com "Tentar novamente".
- **Layout:** os demais componentes e o visual não mudam.

---

## 6. Plano de Testes

### Unitários (Vitest, `npm test`)
- `toAppError`
- funções de mapeamento linha → tipo do app
- os testes de domínio existentes

### Integração (Vitest, `npm run test:integration`, Supabase local)
| Arquivo | Conteúdo |
|---------|----------|
| `auth.int.spec.ts` | Cenários 5 a 10. A recuperação de senha é verificada pela API do Mailpit, e o teto é testado criando contas pela API administrativa local. |
| `data.int.spec.ts` | Cenários 12 a 17, com dois usuários reais em sessões separadas. |

- As chaves locais são lidas de `supabase status` durante o teste; nada vai para o repositório.

### Suítes legadas
`src/tests/*.test.ts` e `legacy-suites.spec.ts` testam o mock e são **removidas** na E3. As regras que elas cobriam já estão nos testes pgTAP (banco) e nos testes de domínio.

### Verificação manual
No navegador, com dois usuários (dois perfis de navegador): cadastro, login, recuperação de senha, criar casa, entrar por código, badges, registro e visualização compartilhada.

---

## 7. Implantação

Decisões de 2026-10-02:
- O projeto está em desenvolvimento, sem usuários reais.
- O trabalho vai direto na `main` (AGENTS.md §7).
- A hospedagem será a **Vercel**.
- Os dados atuais do mock **não são migrados**.

**Ordem:**
1. Desenvolver e testar a TSK-703 no Supabase local, com um commit por entrega na `main` e push ao final da tarefa.
2. **TSK-706, em paralelo:** o dono do produto cria o projeto Supabase na nuvem (região São Paulo) e aplica as migrações com `supabase login`, `supabase link` e `supabase db push`, rodados por ele, pois exigem a senha do banco.
3. **Vercel:** importar o repositório do GitHub (preset Vite) e configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A partir daí, cada push na `main` publica o app.
4. **Auth na nuvem:**
   - desligar a confirmação de e-mail;
   - definir a *Site URL* com o domínio da Vercel;
   - incluir o domínio nas *Redirect URLs*, para o link de recuperação de senha.

Enquanto as variáveis não estiverem configuradas na Vercel, o app publicado mostra a tela "Limpex indisponível" (Cenário 1) em vez de quebrar.

---

## 8. Fora de Escopo
- Login com Google (TSK-705).
- Telas novas de sair da casa, remover membro, novo código, editar ou excluir faxina (TSK-207/208/209/409): o banco já suporta, mas a interface vem depois.
- Histórico (Épico 5).

---

## 9. Notas da Implementação (2026-10-02)

- **Cadastro acima do teto:** o `supabase-js` devolve o erro como `AuthRetryableFetchError` com status 500, o mesmo tipo usado para falha de rede. O `toAppError` só trata como rede quando não há resposta do servidor ou ele está indisponível; o 500 vira `SIGNUP_FAILED`, e a tela confirma o teto pela capacidade.
- **Ordem das tarefas no card:** segue a ordem dos badges da casa (RN-10). O banco não garante a ordem dos vínculos.
- **Troca de usuário:** o app autenticado (`MainShell`) é montado com `key` igual ao id do usuário, então trocar de conta recomeça do estado inicial.
- **Única diferença de comportamento na E4:** mensagens e campos da aba Casas são limpos ao sair da aba.
- **Tamanho do pacote:** o `supabase-js` levou o bundle a ~458 kB (~130 kB gzip). Se pesar no celular, dá para trocar por `@supabase/auth-js` + `@supabase/postgrest-js`.
