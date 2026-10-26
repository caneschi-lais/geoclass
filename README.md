# 📍 GeoClass

**GeoClass** é um sistema inteligente e moderno de controle de frequência escolar baseado em geolocalização em tempo real (Geofencing) e biometria de hardware (Device Binding). Desenvolvido para substituir a chamada de presença tradicional, o GeoClass automatiza o processo de forma segura, garantindo que o aluno esteja fisicamente em sala de aula no momento do registro e operando em estrita conformidade com a LGPD (Lei Geral de Proteção de Dados).

---

## 👥 Credenciais de Acesso (Teste Rápido)

Para testar as diferentes interfaces e permissões do sistema no aplicativo móvel e nas rotas administrativas, utilize as credenciais padrão geradas pelo script de povoamento (`seed`):

| Perfil          | E-mail de Acesso  | Senha    | Detalhes / Papel                        |
| :----------------| :------------------| :---------| :----------------------------------------|
| **Aluno**       | `aluno@teste.com` | `123456` | RA: `0` (aluno teste)|
| **Professor**   | `prof@teste.com`  | `123456` | Professor Teste                         |
| **Coordenador** | `coord@teste.com` | `123456` | Acesso administrativo completo (Coord Teste) |

---

## 📱 Instalação & Download do Aplicativo Mobile (Android & iOS)

Para testar o aplicativo **GeoClass** diretamente em seu dispositivo móvel sem precisar compilar o código localmente, siga as instruções abaixo conforme o sistema operacional do seu celular:

### 🤖 Android (Instalação Direta via APK)

1. **Baixar o arquivo APK:**
   - Acesse o link oficial de build na nuvem do Expo para baixar o arquivo `.apk`:
   - 🔗 [Download APK Android (Build Expo)](https://expo.dev/accounts/caneschi-lais/projects/mobile/builds/37cdc8ac-0f49-4a2a-9188-004b5cbf64bc)
2. **Instalar no Dispositivo:**
   - Abra o arquivo baixado no seu celular Android.
   - Caso a mensagem de segurança apareça, autorize a **instalação de fontes desconhecidas** no navegador ou gerenciador de arquivos.
   - Conclua a instalação e abra o aplicativo **GeoClass**.

---

### 🍎 iOS / iPhone (Acesso via Expo Go & Cloud Update)

No iOS, o acesso aos testes é disponibilizado instantaneamente via **Expo Go** e **EAS Update**:

1. **Baixar o Expo Go (Apenas na 1ª vez):**
   - Abra a **App Store** no seu iPhone e baixe o aplicativo gratuito **Expo Go**.
2. **Abrir o Projeto no Celular:**
   - **Pelo Link Direto com QR Code:** Acesse a página de preview oficial:
     🔗 [Acessar e Escanear QR Code GeoClass no Expo Go](https://expo.dev/preview/update/expo-go?message=Nova+atualizacao+GeoClass&updateRuntimeVersion=1.0.0&createdAt=2026-10-21T15%3A11%3A19.467Z&slug=exp&projectId=54378c0a-edbf-4031-b27c-707d9801df69&group=5965b0b7-3306-4801-99ed-3e8fa0916a56)
     *(Ao abrir a página acima, o QR Code já é exibido imediatamente para você escanear com a câmera padrão do iPhone ou abrir diretamente no Safari)*.
   - **Link Direto do Expo Go:** `exp://u.expo.dev/54378c0a-edbf-4031-b27c-707d9801df69/group/f23f3393-9d02-4b2a-b5b9-2d1fb0cfda37`

---

## 🚀 Como Executar o Projeto Localmente

O projeto é dividido em dois componentes principais: o backend (**API REST**) e o frontend (**App Mobile**).

### 💻 Requisitos do Sistema

Antes de iniciar, garanta que seu ambiente possui as seguintes ferramentas instaladas:
- **Node.js** (v18.x ou superior / v20+ recomendado)
- **npm** ou **yarn**
- **Instância de PostgreSQL** (hospedada no **Supabase** ou rodando localmente)
- **Expo Go** instalado no seu dispositivo móvel (Android ou iOS) para testar a interface mobile

---

### 1. Inicializando o Backend (API REST)

1. **Navegue até a pasta da API:**
   ```bash
   cd geoclass-api
   ```

2. **Instale as dependências do projeto:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Copie o arquivo [.env.example](file:///home/lais/projetos/geoclass/geoclass-api/.env.example) gerando o seu `.env`:
   ```bash
   cp .env.example .env
   ```
   Abra o arquivo `.env` gerado e informe as credenciais de conexão do seu banco PostgreSQL (por exemplo, Supabase):
   ```env
   # Connect to Postgres via the shared transaction-mode pooler (IPv4-only)
   DATABASE_URL="postgresql://postgres.[SEU-PROJECT-REF]:[SUA-SENHA]@aws-0-[SUA-REGIAO].pooler.supabase.com:6543/postgres?pgbouncer=true"

   # Connect to Postgres via the shared session-mode pooler (used for migrations)
   DIRECT_URL="postgresql://postgres.[SEU-PROJECT-REF]:[SUA-SENHA]@aws-0-[SUA-REGIAO].pooler.supabase.com:5432/postgres"
   ```
   > **Nota:** Parâmetros adicionais como `PORT` (3000), `JWT_SECRET` e `OFFLINE_SECRET` possuem valores padrão já embutidos no código da API para desenvolvimento local imediato.

4. **Sincronize o banco de dados e popule com dados de teste:**
   Execute os comandos do Prisma para gerar os tipos, aplicar as tabelas ao banco e povoar os dados de usuários e salas:
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Inicie o servidor em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A API estará ativa e ouvindo em `http://localhost:3000`.

---

### 2. Inicializando o Aplicativo Mobile

1. **Abra outro terminal e navegue até a pasta do aplicativo:**
   ```bash
   cd geoclass-mobile
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Comunicação com a API:**
   - **Automático no Expo Go:** O aplicativo detecta automaticamente o IP local do seu computador conectado na mesma rede Wi-Fi ao abrir pelo Expo Go.
   - **Configuração manual ou emuladores (opcional):** Caso precise fixar a URL manualmente, crie um arquivo `.env` dentro de `geoclass-mobile/` definindo a variável `EXPO_PUBLIC_API_URL`:
     ```env
     EXPO_PUBLIC_API_URL="http://SEU_IP_LOCAL:3000/api"
     ```
     *(Substitua `SEU_IP_LOCAL` pelo endereço IP da sua máquina na rede local, por exemplo `192.168.1.50`).*

4. **Inicie o servidor do Expo:**
   ```bash
   npx expo start
   ```

5. **Execute no Celular:**
   - No **Android**: Abra o aplicativo **Expo Go** e escaneie o código QR gerado no terminal.
   - No **iOS**: Abra a câmera padrão do iPhone e aponte para o código QR para abrir no **Expo Go**.

---

## 🛠️ Stack Tecnológica & Linguagens

O projeto faz uso de um ecossistema TypeScript de ponta a ponta para maior segurança de tipos e reuso de lógica:

* **Linguagens:** TypeScript, JavaScript, SQL (PostgreSQL), HTML5, CSS3.
* **Servidor Backend:** Node.js com Express.js.
* **Acesso a Dados (ORM):** Prisma ORM para mapeamento de objetos e migrações ágeis.
* **Banco de Dados:** PostgreSQL (Persistência relacional com integridade referencial ACID).
* **Segurança e Criptografia:** Autenticação via tokens JWT (JSON Web Tokens) e hashes `bcryptjs` para senhas.
* **Tarefas Agendadas (Jobs):** `node-cron` para controle de rotinas automáticas de segurança.
* **Interface Mobile:** React Native, Expo SDK e NativeWind (implementação de TailwindCSS).
* **Padrões de Projeto (Mobile):** Custom Hooks para separação clara entre a lógica e a camada de apresentação JSX (arquitetura limpa).

---

## 📂 Estrutura de Diretórios

A estrutura do projeto separa explicitamente o código e responsabilidades de cada ecossistema:

```text
geoclass/
│
├── geoclass-api/               # Backend do Sistema (Node.js/Express/TypeScript)
│   ├── prisma/                 # Schemas do banco de dados e script de povoamento (seed.ts)
│   └── src/
│       ├── controllers/        # Controladores com regras de negócio e validações
│       ├── jobs/               # Rotinas em segundo plano (Cron LGPD de limpeza de logs)
│       ├── middlewares/        # Interceptadores e filtros (Autenticação JWT)
│       ├── routes/             # Rotas REST agrupadas por domínio
│       └── server.ts           # Inicialização e escuta da API
│
├── geoclass-mobile/            # Aplicativo Mobile (React Native/Expo/TypeScript)
│   ├── src/
│   │   ├── components/         # Componentes visuais atômicos e modais reutilizáveis
│   │   ├── hooks/              # Custom Hooks contendo a lógica de estado e consumo de APIs
│   │   ├── navigation/         # Pilhas de rotas (Stack e Tabs)
│   │   ├── screens/            # Telas de visualização (Login, Dashboard, Chamadas)
│   │   ├── services/           # Cliente HTTP configurado para requisições (Axios)
│   │   └── types/              # Definições globais de tipos do TypeScript
│   ├── App.tsx                 # Ponto de partida do aplicativo
│   └── tailwind.config.js      # Configurações de layout responsivo e cores do NativeWind
│
└── documentacao/               # Especificações, casos de uso e diagramas extras
```
