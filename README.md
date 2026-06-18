# 📍 GeoClass

**GeoClass** é um sistema inteligente e moderno de controle de frequência escolar baseado em geolocalização em tempo real (Geofencing) e biometria de hardware (Device Binding). Desenvolvido para substituir a chamada de presença tradicional, o GeoClass automatiza o processo de forma segura, garantindo que o aluno esteja fisicamente em sala de aula no momento do registro e operando em estrita conformidade com a LGPD (Lei Geral de Proteção de Dados).

---

## 👥 Credenciais de Acesso (Teste Rápido)

Para testar as diferentes interfaces e permissões do sistema no aplicativo móvel e nas rotas administrativas, utilize as credenciais padrão geradas pelo script de povoamento (`seed`):

| Perfil | E-mail de Acesso | Senha | Detalhes / Papel |
| :--- | :--- | :--- | :--- |
| **Aluno** | `aluno@teste.com` | `123456` | RA: `123456789` (João Silva) |
| **Professor** | `prof@teste.com` | `123456` | Professor Carlos |
| **Professor** | `profa@teste.com` | `123456` | Professora Ana |
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
   Crie um arquivo chamado `.env` na raiz do diretório `geoclass-api/` seguindo a estrutura abaixo:
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/geoclass?schema=public"
   JWT_SECRET="sua_chave_secreta_jwt_para_seguranca"
   ```
   *Substitua `usuario` e `senha` pelas credenciais do seu banco PostgreSQL local.*

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
* **RF01 (Autenticação Segura):** Login com criptografia `bcryptjs` e token JWT, segregando as interfaces por papéis (Aluno, Professor, Coordenador).
* **RF02 (Consulta de Turmas do Dia):** Tela inicial do aluno que exibe apenas as aulas marcadas para a data e hora correntes.
* **RF03 (Validação de Ponto por GPS):** Captura da geolocalização do dispositivo móvel do aluno e validação automática do ponto contra o centroide e raio cadastrados da sala de aula.
* **RF04 (Bloqueio Antifraude / Device Binding):** Captura da assinatura do hardware (`Device ID`) do smartphone, impedindo que o mesmo aparelho seja usado para registrar presenças de RAs diferentes no mesmo dia.
* **RF05 (Realocação Temporária):** Permite que o professor edite localmente a localização geográfica da sala (latitude/longitude) no dia da aula, propagando a mudança instantaneamente.
* **RF06 (Chamada Manual):** Interface para o professor realizar o lançamento manual da presença de alunos que apresentem problemas no celular.
* **RF07 (Dashboard Administrativo):** Painel para o Coordenador visualizar semestres letivos ativos e acompanhar a taxa geral de evasão escolar.
* **RF08 (Relatórios Gerenciais):** Geração e exportação de planilhas consolidadas (`.XLSX`) e documentos analíticos em `.PDF` com gráficos interativos.
* **RF09 (Cadastro de Infraestrutura):** Cadastro de blocos, salas e laboratórios mapeando suas coordenadas geográficas de referência.

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
graph TD
    classDef client fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff,font-weight:bold
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff,font-weight:bold
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff,font-weight:bold
    classDef database fill:#6366f1,stroke:#4338ca,stroke-width:2px,color:#fff,font-weight:bold
    classDef job fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff,font-weight:bold

    subgraph Clients ["Dispositivos Clientes"]
        direction LR
        Mobile["📱 App Mobile Aluno/Prof"]:::client
        Web["💻 Navegador Web Admin"]:::client
    end

    subgraph Frontend ["Frontend Services - React Native/Expo"]
        direction TB
        UI["Interface de Telas"]:::frontend
        Device["Módulo de Hardware - Device ID"]:::frontend
        GPS["Módulo de Geolocalização"]:::frontend
        Export["Módulo de Relatórios"]:::frontend
    end

    subgraph Backend ["Backend Services - Node.js/Express"]
        direction TB
        Auth["Auth Service - JWT"]:::backend
        GeoEngine["Motor Geofencing - Haversine"]:::backend
        StudentAPI["API do Aluno"]:::backend
        ProfAPI["API do Professor"]:::backend
        CoordAPI["API do Coordenador"]:::backend
    end

    subgraph Background ["Rotinas Automatizadas"]
        Cron["LgpdWiperJob - node-cron"]:::job
    end

    subgraph Persistence ["Database Services"]
        direction TB
        ORM["Prisma ORM"]:::database
        DB[("PostgreSQL Relacional")]:::database
    end

    Mobile -->|Interação| UI
    Web -->|Interação| UI
    UI --> Device
    UI --> GPS
    UI --> Export
    UI -->|Login/Token| Auth
    GPS -->|Coordenadas + Device ID| StudentAPI
    Export -->|Consulta Dados| CoordAPI
    UI -->|Gestão de Salas| ProfAPI
    StudentAPI -->|Valida Distância| GeoEngine
    Auth --> ORM
    StudentAPI --> ORM
    ProfAPI --> ORM
    CoordAPI --> ORM
    ORM -->|Query / Mutate| DB
    Cron -.->|Expurgo Diário| DB
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
