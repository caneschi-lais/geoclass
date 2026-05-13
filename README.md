# 📍 GeoClass

**GeoClass** é um sistema inteligente de controle de frequência escolar baseado em geolocalização. Ele substitui a chamada tradicional garantindo, de forma automatizada e segura, que o aluno está fisicamente presente na sala de aula no momento do registro.

---

## 🏗 Arquitetura do Projeto

O projeto adota uma arquitetura dividida em dois componentes principais:

### 1. Backend (API REST)
Localizado na pasta `geoclass-api/`, atua como o servidor central de regras de negócio, cálculos e persistência de dados.
- **Linguagem:** TypeScript
- **Framework:** Express.js
- **Banco de Dados:** PostgreSQL
- **ORM:** Prisma
- **Autenticação:** JWT (JSON Web Tokens) e bcryptjs

### 2. Frontend (App Mobile)
Localizado na pasta `geoclass-mobile/`, é a interface onde os alunos e professores interagem.
- **Framework:** React Native usando Expo
- **Estilização:** TailwindCSS (via NativeWind)
- **Roteamento:** React Navigation
- **Integrações Nativas:** `expo-location` para captura de GPS e `expo-application` para leitura do Device ID.

---

## ✨ Principais Funcionalidades

- **Cálculo de Distância Seguro:** A validação de presença ocorre **no servidor**. O app envia a latitude/longitude do celular, e o backend usa a **Fórmula de Haversine** para calcular se o aluno está dentro do raio permitido da sala de aula.
- **Sistema Antifraude:** O aplicativo coleta o Device ID único do aparelho (identificador físico do hardware). O backend garante que um mesmo celular não possa ser usado para registrar presença de alunos diferentes no mesmo dia, impedindo fraudes comuns.
- **Conformidade com a LGPD:** O backend conta com um *Cron Job* (`LgpdWiperJob`) que roda diariamente e apaga automaticamente todos os dados de geolocalização (latitude, longitude) e IDs de dispositivo após 6 meses. O status da presença se mantém no banco para o histórico escolar, mas o rastro digital rastreável é expurgado de forma irreversível.

---

## 📂 Estrutura de Diretórios

```text
geoclass/
│
├── geoclass-api/               # Backend em Node.js
│   ├── prisma/                 # Schema do banco e script de Seed (povoamento)
│   └── src/
│       ├── controllers/        # Regras de negócio e endpoints
│       ├── jobs/               # Rotinas em background (Cron LGPD)
│       ├── middlewares/        # Proteção de rotas (JWT)
│       ├── routes/             # Definição das rotas REST
│       └── server.ts           # Inicialização do Express
│
└── geoclass-mobile/            # Aplicativo Frontend
    ├── src/
    │   ├── components/         # Componentes de UI reaproveitáveis
    │   ├── navigation/         # Rotas e stack do aplicativo
    │   ├── screens/            # Telas (Login, Dashboard, etc)
    │   ├── services/           # Comunicação com a API (Axios)
    │   └── types/              # Definições de tipos do TypeScript
    ├── App.tsx                 # Ponto de entrada do app
    └── tailwind.config.js      # Configuração de estilos e cores
```

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js instalado
- Banco de Dados PostgreSQL rodando (Docker ou Instalação Nativa)
- Aplicativo Expo Go instalado no seu celular (para testes mobile)

### 1. Subindo a API (Backend)
Abra um terminal na pasta do projeto e rode:

```bash
cd geoclass-api
npm install

# Crie o arquivo .env contendo DATABASE_URL e JWT_SECRET
# Exemplo de conteúdo do .env:
# DATABASE_URL="postgresql://usuario:senha@localhost:5432/geoclass?schema=public"
# JWT_SECRET="sua_chave_secreta"

# Sincronize o banco de dados e popule com usuários de teste
npx prisma db push
npx prisma db seed

# Inicie a API (ela vai rodar na porta 3000)
npm run dev
```

### 2. Subindo o App (Mobile)
Abra um **novo terminal** na pasta do projeto e rode:

```bash
cd geoclass-mobile
npm install

# IMPORTANTE: Atualize o IP na configuração da API antes de rodar!
# Edite o arquivo src/services/api.ts e altere o baseURL para o IP da sua rede Wi-Fi local.
# Ex: baseURL: 'http://192.168.0.15:3000/api'

# Inicie o servidor do Expo
npx expo start
```
Após o terminal exibir o QR Code, escaneie com o app do **Expo Go** e faça login com as credenciais geradas pelo *seed* (`aluno@teste.com`, `prof@teste.com`, `coord@teste.com` | Senha: `123456`).
