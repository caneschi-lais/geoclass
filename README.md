# 📍 GeoClass

**GeoClass** é um sistema inteligente e moderno de controle de frequência escolar baseado em geolocalização em tempo real (Geofencing) e biometria de hardware (Device Binding). Desenvolvido para substituir a chamada de presença tradicional, o GeoClass automatiza o processo de forma segura, garantindo que o aluno esteja fisicamente em sala de aula no momento do registro e operando em estrita conformidade com a LGPD (Lei Geral de Proteção de Dados).

---

## 👥 Credenciais de Acesso (Teste Rápido)

Para testar as diferentes interfaces e permissões do sistema no aplicativo móvel e nas rotas administrativas, utilize as credenciais padrão geradas pelo script de povoamento (`seed`):

| Perfil          | E-mail de Acesso  | Senha    | Detalhes / Papel                        |
| :----------------| :------------------| :---------| :----------------------------------------|
| **Aluno**       | `aluno@teste.com` | `123456` | RA: `123456789` (João Silva)            |
| **Professor**   | `prof@teste.com`  | `123456` | Professor Carlos                        |
| **Professor**   | `profa@teste.com` | `123456` | Professora Ana                          |
| **Coordenador** | `coord@teste.com` | `123456` | Acesso administrativo completo (Márcia) |

---

## 🚀 Como Executar o Projeto

O projeto é dividido em dois componentes principais: o backend (**API REST**) e o frontend (**App Mobile**).

### 💻 Requisitos do Sistema

Antes de iniciar, garanta que seu ambiente possui as seguintes ferramentas instaladas:
- **Node.js** (v18.x ou superior recomendado)
- **npm** ou **yarn** (gerenciadores de pacotes)
- **Banco de Dados PostgreSQL** ativo (rodando localmente ou via container Docker)
- **Expo Go** instalado no seu dispositivo móvel (disponível na App Store / Google Play Store) para testar a interface mobile

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
   Crie um arquivo chamado `.env` na raiz do diretório `geoclass-api/` ou utilize o arquivo base `.env.example` na raiz do projeto/pasta da API como referência:
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/geoclass?schema=public"
   JWT_SECRET="sua_chave_secreta_jwt_para_seguranca"
   ```
   *Substitua `usuario` e `senha` pelas credenciais do seu banco PostgreSQL local (ou use um banco em nuvem como o Neon).*

4. **Sincronize o banco de dados e popule com dados de teste:**
   Execute os comandos do Prisma ORM para empurrar o schema ao PostgreSQL e rodar o script de seed:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Inicie o servidor em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A API estará ativa em `http://localhost:3000`.

---

### 2. Inicializando o Aplicativo Mobile

1. **Navegue até a pasta do aplicativo:**
   ```bash
   cd geoclass-mobile
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Ajuste a URL da API (Comunicação de Rede):**
   Abra o arquivo `src/services/api.ts` e altere a propriedade `baseURL` para utilizar o endereço de IP local da sua máquina na rede Wi-Fi (necessário para que seu dispositivo móvel consiga se comunicar com a API local).
   *Exemplo:*
   ```typescript
   baseURL: 'http://192.168.1.50:3000/api'
   ```

4. **Inicie o servidor do Expo:**
   ```bash
   npx expo start
   ```

5. **Execute no Celular:**
   Escaneie o código QR gerado no terminal usando o aplicativo do **Expo Go** (Android) ou a câmera padrão (iOS, redirecionando para o Expo Go).

---

## ✨ Principais Funcionalidades

O GeoClass foi planejado a partir de uma modelagem de Engenharia de Requisitos sólida, englobando as seguintes funções:

### Requisitos Funcionais (RF)
* **RF01 (Autenticação Segura & RBAC):** Login com criptografia `bcryptjs` e token JWT, segregando as interfaces por papéis (Aluno, Professor, Coordenador).
* **RF02 (Termos de Privacidade LGPD):** Coleta e registro do consentimento expresso (`privacy_terms_accepted_at`) sobre uso de localização e hardware.
* **RF03 (Consulta de Aulas do Dia):** Exibição apenas das disciplinas agendadas para a data corrente com locais e horários.
* **RF04 (Validação de Ponto por GPS):** Captura de coordenadas GPS de alta precisão e validação do raio de Geofencing (Haversine) no servidor.
* **RF05 (Janela de Horário Estrita):** Validação de horário de aula permitindo check-in dentro do limite máximo de tolerância de 15 minutos.
* **RF06 (Bloqueio Antifraude / Device Binding):** Captura da assinatura de hardware (`Device ID`) para impedir registro de múltiplos RAs no mesmo aparelho no dia.
* **RF07 (Presença Offline Criptografada):** Validação de raio local sem internet e enfileiramento com assinatura digital SHA-256 enviada automaticamente ao reconectar.
* **RF08 (Realocação Temporária de Sala):** Permite ao professor editar a sala no dia da aula, realizando dupla checagem de conflitos e notificando os alunos.
* **RF09 (Chamada Manual / Lançamento EAD):** Interface para o professor realizar o lançamento manual da frequência para aulas remotas ou problemas técnicos.
* **RF10 (Reset de Device Binding):** Permite a liberação do `device_id` de um aluno por professores ou coordenadores em caso de troca de aparelho.
* **RF11 (Central de Notificações):** Disparo e acompanhamento em tempo real de avisos de chamadas, trocas de salas e alertas acadêmicos.
* **RF12 (Dashboard de Evasão e Alunos em Risco):** Painel do Coordenador calculando taxas de ausência por semestre e listando alunos em risco (`< 75%`).
* **RF13 (Matrícula de Alunos em Disciplinas):** Vinculação de alunos a disciplinas ativas garantindo integridade referencial.
* **RF14 (Cadastro de Infraestrutura):** Cadastro de salas e laboratórios mapeando suas coordenadas geográficas de centróide.
* **RF15 (Relatórios Gerenciais):** Exportação de planilhas consolidadas (`.XLSX`) e documentos analíticos em `.PDF` com gráficos interativos.: reorganize documentation structure by moving markdown files into a dedicated diagrams directory and creating new documentation files.)

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
        Mobile["📱 App Mobile Aluno/Prof"]:::client
        Web["💻 Navegador Web Admin"]:::client
    end

    subgraph Frontend ["Frontend Services - React Native/Expo"]
        direction TB
        UI["Interface de Telas"]:::frontend
        Device["Módulo Device ID Binding"]:::frontend
        GPS["Módulo de Geolocalização"]:::frontend
        OfflineQ["Fila Offline & Assinatura SHA-256"]:::frontend
    end

    subgraph Backend ["Cloud Web Service - Render.com (Node.js/Express)"]
        direction TB
        Auth["Auth Service - JWT"]:::backend
        GeoEngine["Motor Geofencing - Haversine"]:::backend
        StudentAPI["API do Aluno"]:::backend
        ProfAPI["API do Professor"]:::backend
        CoordAPI["API do Coordenador"]:::backend
        NotifAPI["API de Notificações"]:::backend
    end

    subgraph Background ["Jobs Agendados - node-cron"]
        CronLGPD["LgpdWiperJob - 03:00 AM"]:::job
        CronNotif["NotificationJob - Minutual"]:::job
    end

    subgraph Persistence ["Cloud Database - Neon.tech"]
        direction TB
        ORM["Prisma ORM"]:::database
        DB[("PostgreSQL Serverless - Neon.tech")]:::database
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

    %% Comunicação Frontend -> Render API
    UI -->|Login/Token JWT| Auth
    GPS -->|Coordenadas + Device ID| StudentAPI
    OfflineQ -->|Sync Pacotes Assinados| StudentAPI
    UI -->|Gestão de Chamada & Salas| ProfAPI
    UI -->|Dashboard & Relatórios| CoordAPI
    UI -->|Avisos & Notificações| NotifAPI

    %% Fluxos Internos do Backend
    StudentAPI -->|Valida Distância & Janela 15m| GeoEngine
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
