# Arquitetura Visual do Sistema GeoClass

Para apresentar a arquitetura de forma visual e profissional, você pode utilizar o **Mermaid**, que é uma linguagem de diagramação baseada em texto que gera gráficos automaticamente. O Mermaid é suportado nativamente pelo GitHub, Notion, Obsidian e várias outras plataformas.

Abaixo está o código do diagrama da arquitetura completa do GeoClass.

## Diagrama da Arquitetura

```mermaid
graph TD
    %% Estilização Personalizada
    classDef client fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff,font-weight:bold
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff,font-weight:bold
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff,font-weight:bold
    classDef database fill:#6366f1,stroke:#4338ca,stroke-width:2px,color:#fff,font-weight:bold
    classDef job fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff,font-weight:bold

    subgraph Clients [Dispositivos Clientes]
        direction LR
        Mobile[📱 App Mobile Aluno/Prof]:::client
        Web[💻 Navegador Web Admin]:::client
    end

    subgraph Frontend [Frontend Services - React Native/Expo]
        direction TB
        UI[Interface de Telas]:::frontend
        Device[Módulo de Hardware - Device ID]:::frontend
        GPS[Módulo de Geolocalização]:::frontend
        Export[Módulo de Relatórios]:::frontend
    end

    subgraph Backend [Backend Services - Node.js/Express]
        direction TB
        Auth[Auth Service - JWT]:::backend
        GeoEngine[Motor Geofencing - Haversine]:::backend
        StudentAPI[API do Aluno]:::backend
        ProfAPI[API do Professor]:::backend
        CoordAPI[API do Coordenador]:::backend
    end

    subgraph Background [Rotinas Automatizadas]
        Cron[LgpdWiperJob - node-cron]:::job
    end

    subgraph Persistence [Database Services]
        direction TB
        ORM[Prisma ORM]:::database
        DB[(PostgreSQL<br/>Relacional)]:::database
    end

    %% Interações Usuário -> Frontend
    Mobile -->|Interação| UI
    Web -->|Interação| UI

    %% Fluxos Internos do Frontend
    UI --> Device
    UI --> GPS
    UI --> Export

    %% Comunicação Frontend -> Backend REST API
    UI -->|Login/Token| Auth
    GPS -->|Coordenadas + Device ID| StudentAPI
    Export -->|Consulta Dados| CoordAPI
    UI -->|Gestão de Salas| ProfAPI

    %% Fluxos Internos do Backend
    StudentAPI -->|Valida Distância| GeoEngine
    Auth --> ORM
    StudentAPI --> ORM
    ProfAPI --> ORM
    CoordAPI --> ORM

    %% Camada de Persistência
    ORM -->|Query / Mutate| DB

    %% Jobs Background
    Cron -.->|Expurgo Diário| DB
```

---

## Como usar este diagrama:

1. **Uso Imediato (Markdown):** Se você for colocar isso no README do GitHub do seu projeto, basta colar o bloco de código acima. O GitHub vai renderizar a imagem visualmente!
2. **Para Exportar como Imagem (PNG/SVG):** 
   - Copie o código que está dentro do bloco ````mermaid ... ````.
   - Acesse o site oficial: [Mermaid Live Editor](https://mermaid.live).
   - Cole o código na área de texto. Ele vai gerar a imagem instantaneamente na tela.
   - Clique em **"Save as PNG"** ou **"Save as SVG"** no canto inferior direito para baixar a imagem em alta qualidade e colocar no seu documento/apresentação (Word, PowerPoint, Canva, etc).

## O que este diagrama demonstra (para explicar na sua apresentação):
- Ele separa o projeto em "Camadas" de responsabilidade (Clients, Frontend, Backend, Database, Background).
- Mostra exatamente como o `Módulo de Geolocalização` e o `Device ID` fluem do celular para a API.
- Mostra o `Motor Geofencing` rodando exclusivamente no Backend (garantindo a segurança antifraude).
- Demonstra a rotina independente `LgpdWiperJob` operando direto no banco para limpeza de dados sensíveis.
