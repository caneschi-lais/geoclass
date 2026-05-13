# Fluxos de Utilização (User Journeys) - GeoClass

Este documento mapeia o passo a passo da interação de cada perfil de usuário com o sistema. Para ilustrar o caminho de ponta a ponta (desde o clique do usuário até a resposta do banco de dados), criamos **Diagramas de Sequência**.

Copie os códigos `mermaid` abaixo no [Mermaid Live Editor](https://mermaid.live/) para exportar as imagens para os seus documentos.

---

## 1. Fluxo do Aluno (Registro de Presença com Geofencing)

A jornada principal do aplicativo. Envolve a coleta de sensores do hardware e a validação estrita no servidor.

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant App as Aplicativo Mobile
    participant Hardware as Sensores (GPS/Device)
    participant API as Backend (GeoClass API)
    
    Aluno->>App: Faz Login no sistema
    App->>API: Autentica credenciais
    API-->>App: Retorna Token JWT
    Aluno->>App: Acessa aba "Aulas de Hoje"
    App->>API: Busca turmas do dia letivo
    API-->>App: Retorna Turma e Local (Padrão ou Temporário)
    
    Aluno->>App: Clica em "Marcar Presença"
    App->>Hardware: Solicita Permissão de Localização
    Hardware-->>App: Retorna Lat/Lon em Alta Precisão
    App->>Hardware: Coleta Impressão Digital do Hardware
    Hardware-->>App: Retorna Device ID Único
    
    App->>API: Envia {Latitude, Longitude, DeviceID, ClassID}
    
    rect rgb(241, 245, 249)
        note right of API: Processamento Server-Side
        API->>API: Calcula distância (Fórmula de Haversine)
        API->>API: Verifica colisão de Device ID no dia
    end

    alt Distância > Raio Permitido da Sala
        API-->>App: Erro 400: "Fora da área permitida"
        App-->>Aluno: Exibe Alerta de Falha (Vermelho)
    else Device ID já usado por outro aluno
        API-->>App: Erro 403: "Dispositivo já utilizado"
        App-->>Aluno: Exibe Alerta de Fraude
    else Check-in Válido
        API->>API: Registra Presença no Banco de Dados
        API-->>App: Status 200: Sucesso
        App-->>Aluno: Feedback Positivo (Presença Confirmada)
    end
```

---

## 2. Fluxo do Professor (Realocação de Sala)

O professor tem autonomia. Se o projetor da sala oficial quebrar, ele pode levar a turma para o laboratório e "puxar" o ponto geográfico para lá, sem depender do TI.

```mermaid
sequenceDiagram
    autonumber
    actor Professor
    participant App as Aplicativo Mobile
    participant API as Backend (GeoClass API)
    participant DB as Banco de Dados
    
    Professor->>App: Faz Login e acessa "Minhas Turmas"
    App->>API: Busca turmas vinculadas ao Professor
    API-->>App: Retorna lista de turmas
    
    Professor->>App: Seleciona a turma de "Algoritmos"
    Professor->>App: Clica no botão "Trocar Sala"
    App->>API: Solicita lista de Infraestrutura (Campus)
    API-->>App: Retorna todas as salas cadastradas
    
    Professor->>App: Escolhe "Laboratório de Informática 3"
    App->>API: POST /professor/sala-temporaria
    
    rect rgb(241, 245, 249)
        note right of API: Persistência Temporária
        API->>DB: Salva registro de Override (TemporaryClassLocation)
        DB-->>API: Confirma inserção
    end
    
    API-->>App: Sucesso (Status 200)
    App-->>Professor: Exibe Modal "Sala alterada com sucesso!"
    
    Note right of Professor: Todos os alunos desta turma<br/>agora terão sua presença validada<br/>nas coordenadas do Laboratório!
```

---

## 3. Fluxo do Coordenador (Exportação Analítica)

A jornada da administração escolar é focada na gestão de infraestrutura e na extração de relatórios (Geração de PDFs dinâmicos com Gráficos CSS).

```mermaid
sequenceDiagram
    autonumber
    actor Coordenador
    participant Web as Painel Administrativo
    participant API as Backend (GeoClass API)
    participant PDF as Motor de Exportação
    
    Coordenador->>Web: Faz Login (Perfil: Coordenador)
    
    %% Cadastro de Sala
    opt Cadastro de Infraestrutura
        Coordenador->>Web: Abre Acordeão "Cadastrar Sala"
        Coordenador->>Web: Digita Nome, Latitude e Longitude
        Web->>API: POST /coordenador/sala
        API-->>Web: Sala salva com sucesso
    end
    
    %% Relatórios
    Coordenador->>Web: Acessa "Gestão Acadêmica"
    Coordenador->>Web: Clica em "Exportar" na lista de Semestres
    Web->>API: GET /coordenador/relatorio?level=semesters
    API-->>Web: Retorna JSON com taxas de evasão
    
    Web->>PDF: Envia JSON para compilação HTML
    
    rect rgb(241, 245, 249)
        note right of PDF: Renderização Local
        PDF->>PDF: Desenha Tabela HTML
        PDF->>PDF: Calcula Top Faltas e desenha Gráficos CSS
        PDF->>PDF: Aplica formatação de Crachás (Vermelho/Verde)
    end
    
    alt Ambiente Web
        PDF-->>Web: Abre Nova Janela Invisível (iframe/window)
        Web->>Coordenador: Aciona Janela Nativa de Impressão (window.print)
    else Ambiente Mobile
        PDF->>PDF: expo-print gera arquivo binário .pdf
        PDF-->>Web: Salva arquivo em Base64
        Web->>Coordenador: Aciona Janela de Compartilhamento (Share)
    end
```
