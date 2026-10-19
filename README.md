# 📍 GeoClass

**GeoClass** é um sistema inteligente e moderno de controle de frequência escolar baseado em geolocalização em tempo real (Geofencing) e biometria de hardware (Device Binding). Desenvolvido para substituir a chamada de presença tradicional, o GeoClass automatiza o processo de forma segura, garantindo que o aluno esteja fisicamente em sala de aula no momento do registro e operando em estrita conformidade com a LGPD (Lei Geral de Proteção de Dados).

---

## 👥 Credenciais de Acesso (Teste Rápido)

Para testar as diferentes interfaces e permissões do sistema no aplicativo móvel e nas rotas administrativas, utilize as credenciais padrão geradas pelo script de povoamento (`seed`):

| Perfil          | E-mail de Acesso  | Senha    | Detalhes / Papel                        |
| :----------------| :------------------| :---------| :----------------------------------------|
| **Aluno**       | `aluno@teste.com` | `123456` | RA: `0` (aluno teste) ou `1050482413014` (`lais.aluno@fatec.com`) |
| **Professor**   | `prof@teste.com`  | `123456` | Professor Teste                         |
| **Coordenador** | `coord@teste.com` | `123456` | Acesso administrativo completo (Coord Teste) |

---

## 📱 Instalação & Download do Aplicativo Mobile (Android & iOS)

Para testar o aplicativo **GeoClass** diretamente em seu dispositivo móvel sem precisar compilar o código localmente, siga as instruções abaixo conforme o sistema operacional do seu celular:

### 🤖 Android (Instalação Direta via APK)

1. **Baixar o arquivo APK:**
   - Acesse o link oficial de build na nuvem do Expo para baixar o arquivo `.apk`:
   - 🔗 [Download APK Android (Build Expo)](https://expo.dev/accounts/caneschi-lais/projects/mobile/builds/87fa32a7-52df-4595-8e0c-d1d89231f61f)
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
     🔗 [Acessar e Escanear QR Code GeoClass no Expo Go](https://expo.dev/preview/update?message=Atualiza%C3%A7%C3%A3o+relat%C3%B3rios+GeoClass&updateRuntimeVersion=1.0.0&createdAt=2026-10-19T17%3A57%3A15.566Z&slug=exp&projectId=54378c0a-edbf-4031-b27c-707d9801df69&group=f23f3393-9d02-4b2a-b5b9-2d1fb0cfda37)
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

## ✨ Principais Funcionalidades

O GeoClass foi planejado a partir de uma modelagem de Engenharia de Requisitos sólida, englobando as seguintes funções:

### Requisitos Funcionais (RF)
* **RF01 (Autenticação Segura & RBAC):** Login com criptografia `bcryptjs` e token JWT, segregando as interfaces por papéis (Aluno, Professor, Coordenador).
* **RF02 (Termos de Privacidade LGPD):** Coleta e registro do consentimento expresso (`privacy_terms_accepted_at`) sobre uso de localização e hardware.
* **RF03 (Consulta de Aulas do Dia):** Exibição apenas das disciplinas agendadas para a data corrente com locais e horários.
* **RF04 (Validação de Ponto por GPS):** Captura de coordenadas GPS de alta precisão e validação do raio de Geofencing (Haversine) no servidor.
* **RF05 (Janela de Horário Estrita & Registro de Faltas):** Validação de horário permitindo check-in dentro do limite de 15 minutos; caso a tolerância expire sem presença, o sistema registra automaticamente a ausência (`status: FALTA`) no banco de dados.
* **RF06 (Bloqueio Antifraude / Device Binding):** Captura da assinatura de hardware (`Device ID`) para impedir registro de múltiplos RAs no mesmo aparelho no dia.
* **RF07 (Presença Offline Criptografada):** Validação de raio local sem internet e enfileiramento com assinatura digital SHA-256 enviada automaticamente ao reconectar.
* **RF08 (Realocação Temporária de Sala):** Permite ao professor editar a sala no dia da aula, realizando dupla checagem de conflitos e notificando os alunos.
* **RF09 (Chamada Manual / Lançamento EAD):** Interface para o professor realizar o lançamento manual da frequência para aulas remotas ou problemas técnicos.
* **RF10 (Reset de Device Binding):** Permite a liberação do `device_id` de um aluno por professores ou coordenadores em caso de troca de aparelho.
* **RF11 (Central de Notificações):** Disparo e acompanhamento em tempo real de avisos de chamadas, trocas de salas e alertas acadêmicos.
* **RF12 (Dashboard de Evasão e Alunos em Risco):** Painel do Coordenador calculando taxas de ausência por semestre e listando alunos em risco (`< 75%`).
* **RF13 (Matrícula de Alunos em Disciplinas):** Vinculação de alunos a disciplinas ativas garantindo integridade referencial.
* **RF14 (Cadastro de Infraestrutura):** Cadastro de salas e laboratórios mapeando suas coordenadas geográficas de centróide.
* **RF15 (Relatórios Gerenciais):** Exportação de planilhas consolidadas (`.XLSX`) e documentos analíticos em `.PDF` com gráficos interativos.
* **RF16 (Calendário Acadêmico & Dias Não Letivos):** Gestão e leitura dinâmica de feriados, recessos escolares, semanas pedagógicas e exames finais, suspendendo chamadas e geração de faltas automáticas em dias não letivos.

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

## 🏗️ Arquitetura do Projeto

O GeoClass utiliza uma arquitetura clássica em camadas com separação clara de responsabilidades, conforme ilustrado no diagrama a seguir:

```mermaid
flowchart TD
    %% Estilização Personalizada
    classDef external fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff,font-weight:bold
    classDef client fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff,font-weight:bold
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff,font-weight:bold
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff,font-weight:bold
    classDef database fill:#6366f1,stroke:#4338ca,stroke-width:2px,color:#fff,font-weight:bold
    classDef job fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff,font-weight:bold

    subgraph External ["Serviços Externos de Infraestrutura"]
        UptimeRobot["⏰ UptimeRobot - Keep-Alive Pinger (5 min)"]:::external
    end

    subgraph Clients ["Dispositivos Clientes"]
        direction LR
        Mobile["📱 App Mobile Aluno/Prof/Coord"]:::client
        Web["💻 Navegador Web Admin / Coord"]:::client
    end

    subgraph Frontend ["Frontend Services - React Native/Expo"]
        direction TB
        UI["Interface de Telas & Badges"]:::frontend
        Device["Módulo Device ID Binding"]:::frontend
        GPS["Módulo de Geolocalização"]:::frontend
        OfflineQ["Fila Offline & Assinatura SHA-256"]:::frontend
        ReadOnlyGuard["Guard Modo Leitura (Curso Concluído)"]:::frontend
    end

    subgraph Backend ["Cloud Web Service - Render.com (Node.js/Express)"]
        direction TB
        Auth["Auth Service - JWT & Account Status"]:::backend
        GeoEngine["Motor Geofencing - Haversine & Multi-Slot"]:::backend
        StudentAPI["API do Aluno & Status de Curso"]:::backend
        ProfAPI["API do Professor"]:::backend
        CoordAPI["API do Coordenador & Batch Virada"]:::backend
        NotifAPI["API de Notificações & Alerta de Risco (<75%)"]:::backend
        SemUtil["Utilitário de Semestre Automático (YYYY.1/2)"]:::backend
    end

    subgraph Background ["Jobs Agendados - node-cron"]
        CronLGPD["LgpdWiperJob - 03:00 AM"]:::job
        CronNotif["NotificationJob - Minutual"]:::job
        RiskJob["RiskCheckerJob - Notificação Auto <75%"]:::job
    end

    subgraph Persistence ["Cloud Database - Supabase"]
        direction TB
        ORM["Prisma ORM"]:::database
        DB[("PostgreSQL Gerenciado - Supabase")]:::database
    end

    %% Keep-Alive
    UptimeRobot -->|GET /health a cada 5 min| Backend

    %% Interações Usuário -> Frontend
    Mobile -->|Interação| UI
    Web -->|Interação| UI

    %% Fluxos Internos do Frontend
    UI --> Device
    UI --> GPS
    UI --> OfflineQ
    UI --> ReadOnlyGuard

    %% Comunicação Frontend -> Render API
    UI -->|Login/Token JWT| Auth
    GPS -->|Coordenadas + Device ID + Slot| StudentAPI
    OfflineQ -->|Sync Pacotes Assinados| StudentAPI
    UI -->|Gestão de Chamada & Salas| ProfAPI
    UI -->|Dashboard, Risco & Virada| CoordAPI
    UI -->|Avisos & Notificações| NotifAPI

    %% Fluxos Internos do Backend
    StudentAPI -->|Valida Distância, Horários Multi-Slot & IsCompleted| GeoEngine
    CoordAPI -->|Calcula YYYY.1/2 & Incrementa Semestres| SemUtil
    Auth --> ORM
    StudentAPI --> ORM
    ProfAPI --> ORM
    CoordAPI --> ORM
    NotifAPI --> ORM

    %% Camada de Persistência em Nuvem
    ORM -->|SSL/TLS Connection| DB

    %% Jobs Background
    CronLGPD -.->|Expurgo Diário >6 meses| DB
    CronNotif -.->|Varredura de Aulas| DB
    RiskJob -.->|Monitora Frequência <75%| DB
```

---

## 🛡️ Mecanismos de Segurança e Antifraude

O GeoClass implementa medidas server-side robustas para inibir tentativas de fraude no registro de frequência:

### 1. Motor Geofencing (Fórmula de Haversine)
A verificação geográfica **não ocorre no dispositivo móvel** (que pode ser facilmente fraudado por aplicativos de fake GPS). O app apenas coleta as coordenadas puras através de sensores nativos (`expo-location` em alta precisão) e as envia sob assinatura JWT para a API.
O backend então executa a **Fórmula de Haversine** para calcular a distância em metros sobre a curvatura do planeta Terra:

$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

Caso a distância exceda o raio configurado para a sala de aula (`radius_meters`), a chamada é imediatamente rejeitada pelo servidor.

### 2. Impressão Digital Física (Device Binding)
Para impedir que um aluno leve os celulares de colegas e bata ponto por todos na sala, o sistema coleta o identificador físico exclusivo de hardware (`Device ID` obtido com a biblioteca `expo-application`). O backend impede o registro de mais de um número de matrícula (RA) atrelado ao mesmo hardware do aparelho no mesmo dia letivo.

### 3. Registro Offline com Assinatura Criptográfica SHA-256
Para lidar com ausência de sinal de internet nas salas de aula:
* **Verificação Local:** O aplicativo móvel realiza o cálculo preliminar de Geofencing e só permite a batida se o aluno estiver fisicamente no raio permitido.
* **Assinatura Digital:** Se válido, o app gera uma assinatura SHA-256 combinando `{classId, lat, lon, timestamp, deviceId}` mais a chave secreta `OFFLINE_SECRET`.
* **Fila de Sincronização Local (`SecureStore`):** O registro criptografado e seguro fica armazenado no dispositivo.
* **Sincronização Segura:** Assim que o sinal de internet retorna, o aplicativo envia os dados assinados para a API. O backend verifica a assinatura digital recalculando a hash com base na chave secreta do servidor, processando a presença com data retroativa somente se a assinatura for válida e se a tentativa tiver ocorrido no horário da aula (dentro da tolerância de 15 minutos).

---

## ⚖️ Conformidade e LGPD (Privacy by Design)

Como o sistema captura dados altamente sensíveis dos estudantes (coordenadas geográficas exatas e identificação de hardware), o GeoClass foi planejado sob os princípios de *Privacy by Design* previstos na **Lei Geral de Proteção de Dados (LGPD)**:

- **Propósito Único:** Os dados de localização e device ID são armazenados no banco exclusivamente para o processo imediato de auditoria e validação de fraude da presença daquele dia específico.
- **Rotina Automatizada de Expurgo (`LgpdWiperJob`):** O backend possui uma rotina CRON agendada via `node-cron` que executa diariamente às **03:00 da manhã**. O script varre o banco de dados e limpa os campos `student_latitude`, `student_longitude` e `device_id` de todos os registros de presença (`Attendance`) criados há mais de **6 meses**.
- **Resultados:** O status final de presença do estudante (se obteve presença ou falta) é mantido para o histórico escolar acadêmico, mas os registros locacionais rastreáveis são apagados definitivamente, reduzindo riscos de vazamento de dados.

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
