# Guia de Hospedagem: Banco de Dados no Neon.tech e API no Render.com

Este guia detalha passo a passo como realizar o deploy (hospedagem) do banco de dados PostgreSQL no **Neon.tech** e da API Node.js (TypeScript + Prisma) no **Render.com**.

---

## 🏗️ Visão Geral da Arquitetura

```mermaid
graph TD
    Client[Aplicativo Mobile / Web] -->|Requisições HTTP| Render[API no Render.com]
    Render -->|Conexão PostgreSQL| Neon[Banco de Dados no Neon.tech]
```

*   **Neon.tech**: Banco de dados PostgreSQL serverless gratuito, ideal para desenvolvimento e produção escalável.
*   **Render.com**: Plataforma de hospedagem na nuvem rápida e simples, com suporte nativo a Node.js e integração automática com o GitHub.

---

## 🗄️ Parte 1: Configuração do Banco de Dados no Neon.tech

### Passo 1.1: Criar Conta e Projeto
1. Acesse [neon.tech](https://neon.tech/) e crie uma conta (recomendado usar a mesma conta do GitHub).
2. No painel inicial, clique em **Create a project**.
3. Configure os detalhes do projeto:
   *   **Project Name**: `geoclass-db` (ou o nome de sua preferência).
   *   **Postgres Version**: Selecione a versão recomendada (geralmente v15 ou v16).
   *   **Region**: Selecione a região mais próxima de você ou do servidor da API (ex: `AWS US East (N. Virginia)` é o padrão e funciona muito bem com o Render).
4. Clique em **Create Project**.

### Passo 1.2: Obter a URL de Conexão (`DATABASE_URL`)
1. Assim que o projeto for criado, uma tela com a string de conexão aparecerá.
2. Certifique-se de que a opção **Prisma** ou **Node.js** está selecionada para obter o formato correto da URL.
3. A URL terá um formato semelhante a este:
   ```env
   DATABASE_URL="postgresql://neondb_owner:xxxxxxxx@ep-xxxxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```
4. **Copie esta URL**. Você precisará dela tanto para rodar as migrações locais quanto para configurar o ambiente de produção no Render.

> [!IMPORTANT]
> A URL fornecida pelo Neon por padrão usa o Pooler de conexões (`-pooler` no subdomínio). Isso é excelente para aplicações serverless ou com conexões frequentes, como APIs em produção.

---

## 🛠️ Parte 2: Preparação Local e Carga Inicial do Banco

Antes de colocar a API no ar no Render, precisamos preparar o banco de dados no Neon criando as tabelas e inserindo os dados iniciais (seeding).

### Passo 2.1: Atualizar o arquivo `.env` local da API
1. No seu ambiente de desenvolvimento, abra o arquivo `geoclass-api/.env` (ou crie um se não existir).
2. Substitua a variável `DATABASE_URL` local pela URL obtida no Neon.tech:
   ```env
   DATABASE_URL="sua_string_de_conexao_do_neon_aqui"
   JWT_SECRET="sua_chave_secreta_super_segura"
   ```

### Passo 2.2: Sincronizar o Schema do Prisma com o Neon
Abra o terminal na pasta `geoclass-api` e execute o comando abaixo para gerar as tabelas no Neon de acordo com seu arquivo `schema.prisma`:

```bash
npx prisma db push
```
*Este comando analisa seu arquivo `schema.prisma` e cria todas as tabelas, índices e relacionamentos diretamente no banco hospedado no Neon.*

### Passo 2.3: Alimentar o Banco de Dados (Seed)
Para que o banco não fique vazio, execute o script de semente (seed) para cadastrar os registros iniciais (professores, alunos padrão, salas, etc.):

```bash
npx prisma db seed
```

---

## 🚀 Parte 3: Hospedagem da API no Render.com

Como nosso projeto é um monorepo (contendo as pastas `geoclass-api` e `geoclass-mobile` na raiz), precisamos de configurações específicas no Render para apontar para a subpasta correta.

### Passo 3.1: Criar Conta e Conectar ao GitHub
1. Acesse [render.com](https://render.com/) e crie uma conta utilizando o seu **GitHub**.
2. Isso facilitará a importação direta dos seus repositórios.

### Passo 3.2: Criar um Novo Web Service
1. No painel do Render, clique no botão **New +** e selecione **Web Service**.
2. Escolha a opção **Build and deploy from a Git repository**.
3. Na lista de repositórios do seu GitHub, localize o repositório do seu projeto (ex: `geoclass`) e clique em **Connect**.

### Passo 3.3: Configurações Gerais do Serviço
Preencha os campos exatamente como detalhado abaixo para garantir que o monorepo funcione corretamente:

| Campo | Configuração / Valor | Explicação |
| :--- | :--- | :--- |
| **Name** | `geoclass-api` | Nome de identificação da sua API no Render. |
| **Region** | `Oregon (US West)` ou `Ohio (US East)` | Escolha a mais próxima da região escolhida no Neon para menor latência. |
| **Branch** | `main` (ou sua branch de produção) | Branch que o Render monitorará para deploys automáticos. |
| **Root Directory** | `geoclass-api` | **CRÍTICO:** Define que a API está nesta subpasta. Evita erros de dependências não encontradas. |
| **Runtime** | `Node` | Tecnologia do servidor. |
| **Build Command** | `npm install && npx prisma generate && npm run build` | Instala dependências, gera o cliente Prisma e compila o TypeScript. |
| **Start Command** | `npm start` | Executa o servidor compilado (`node dist/server.js`). |
| **Instance Type** | `Free` | Plano gratuito (suficiente para testes e portfólio). |

> [!TIP]
> A inclusão de `npx prisma generate` no **Build Command** garante que o Prisma Client seja gerado dentro do ambiente de execução do Render durante cada deploy.

### Passo 3.4: Configurar Variáveis de Ambiente (Environment Variables)
No menu lateral esquerdo ou na seção **Environment**, adicione as seguintes variáveis de ambiente:

1. Clique em **Add Environment Variable**.
2. Insira as variáveis abaixo:

   *   **Key**: `DATABASE_URL`
       *   **Value**: *Sua string de conexão do Neon.tech* (ex: `postgresql://...`)
   *   **Key**: `JWT_SECRET`
       *   **Value**: *Uma string longa e segura utilizada para assinar os tokens JWT*
   *   **Key**: `NODE_ENV`
       *   **Value**: `production`

3. Clique em **Save Changes**.

### Passo 3.5: Realizar o Deploy
1. Assim que salvar as variáveis, o Render iniciará automaticamente o primeiro deploy.
2. Você pode acompanhar o progresso através do console de **Logs** na página do seu serviço.
3. O build levará de 2 a 5 minutos (devido à instalação de pacotes e compilação do TypeScript).
4. Ao final, você deverá ver a mensagem de sucesso definida no `server.ts`:
   ```text
   🚀 Servidor rodando na porta 3000
   ⏰ Cron Job LGPD agendado para as 03:00 AM diariamente.
   ⏰ Cron Job de Notificações agendado para rodar a cada minuto.
   ```

---

## 🔍 Parte 4: Verificação e Testes

### Passo 4.1: Testando o Endereço Público
Na parte superior esquerda da página do seu serviço no Render, você encontrará a URL pública gerada para a sua API (algo como `https://geoclass-api.onrender.com`).

Para testar se ela está ativa:
1. Abra o navegador ou uma ferramenta como Insomnia/Postman.
2. Acesse a rota de healthcheck:
   ```text
   https://geoclass-api.onrender.com/health
   ```
3. A resposta esperada deve ser um JSON semelhante a:
   ```json
   {
     "status": "API Online",
     "timestamp": "2026-07-22T17:00:00.000Z"
   }
   ```

### Passo 4.2: Apontando o App Mobile para a API de Produção
No aplicativo mobile (`geoclass-mobile`), localize a configuração de URL base da API (normalmente em arquivos como `services/api.ts`, `constants/config.ts` ou `.env` do mobile) e substitua a URL local pela nova URL do Render:

```typescript
// Exemplo de configuração no mobile
const API_URL = "https://geoclass-api.onrender.com/api";
```

> [!WARNING]
> No plano gratuito do Render, a API entra em estado de hibernação ("spin down") se ficar mais de 15 minutos sem receber requisições. Ao receber uma nova chamada, ela pode demorar de 30 a 50 segundos para "acordar". Esse comportamento é normal da modalidade gratuita da plataforma.
