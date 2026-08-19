# Arquitetura Visual do Sistema GeoClass

Para apresentar a arquitetura de forma visual e profissional, você pode utilizar o **Mermaid**, que é uma linguagem de diagramação baseada em texto que gera gráficos automaticamente. O Mermaid é suportado nativamente pelo GitHub, Notion, Obsidian e várias outras plataformas.

Abaixo está o código do diagrama da arquitetura completa do GeoClass.

## Diagrama da Arquitetura

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

## Como usar este diagrama:

1. **Uso Imediato (Markdown):** Se você for colocar isso no README do GitHub do seu projeto, basta colar o bloco de código acima. O GitHub vai renderizar a imagem visualmente!
2. **Para Exportar como Imagem no [Mermaid Live Editor](https://mermaid.live):** 
   - ⚠️ **ATENÇÃO AO COPIAR:** No editor do Mermaid Live, **NÃO cole a primeira linha ```` ```mermaid ```` nem a última linha ```` ``` ````**.
   - Cole **apenas o conteúdo interno**, começando na palavra `flowchart TD` e indo até a última linha `CronNotif -.->|Varredura de Aulas| DB`.
   - Clique em **"Save as PNG"** ou **"Save as SVG"** no canto inferior direito para baixar a imagem em alta qualidade e colocar no seu documento/apresentação.

## O que este diagrama demonstra (para explicar na sua apresentação):
- **Infraestrutura em Nuvem Integrada:** Exibe a API hospedada no **Render.com** conectada ao banco de dados PostgreSQL Serverless no **Neon.tech** via Prisma ORM.
- **Prevenção de Cold-Start (Keep-Alive):** O **UptimeRobot** realiza pings automáticos a cada 5 minutos na rota `/health` para evitar que a API no Render entre em hibernação no plano gratuito.
- **Resiliência Offline:** O módulo da **Fila Offline com Assinatura Criptográfica SHA-256** garante que chamadas registradas sem internet sejam enviadas com segurança assim que a conexão for estabelecida.
- **Segurança & Antifraude no Backend:** Mostra como o `Device ID` e o `Motor Geofencing` (Haversine + Janela de 15 minutos) são validados diretamente no servidor.
- **Privacidade & Compliance LGPD:** Demonstra as rotinas agendadas `LgpdWiperJob` (expurgo de geodados antigos) e `NotificationJob` operando em segundo plano.
