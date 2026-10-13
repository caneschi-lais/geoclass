# Fluxos de Utilização (User Journeys) - GeoClass

Este documento mapeia detalhadamente o passo a passo de todas as interações de cada perfil de usuário (**Aluno**, **Professor**, **Coordenador**) e das rotinas autônomas de **Infraestrutura** no ecossistema **GeoClass**.

Para ilustrar o caminho de ponta a ponta (desde a ação da interface móvel/web até a resposta e persistência no banco de dados), utilizam-se **Diagramas de Sequência (UML)** na notação **Mermaid**.

---

## 1. Fluxos do Aluno

O perfil de Aluno engloba o ciclo completo desde a autenticação com aceite dos termos da LGPD, passando pelo registro de presença via GPS (online/offline), até a consulta de histórico acadêmico e alertas.

### 1.1 Autenticação, Consentimento LGPD & Consulta de Aulas do Dia
O aluno realiza a autenticação por e-mail/senha, valida o aceite dos termos de privacidade e visualiza a grade de aulas marcadas para o dia corrente.

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant App as Aplicativo Mobile (Expo)
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Aluno->>App: Digita E-mail e Senha e clica em "Entrar"
    App->>API: POST /api/login {email, password}
    API->>DB: Autentica credenciais via bcryptjs
    DB-->>API: Retorna dados do usuário e Role=ALUNO
    API-->>App: Retorna Token JWT e dados do perfil

    alt Primeiro Acesso / Termos Pendentes
        API-->>App: privacy_terms_accepted_at == null
        App-->>Aluno: Exibe Tela Obrigatória de Termos LGPD
        Aluno->>App: Clica em "Li e Aceito os Termos"
        App->>API: POST /api/accept-privacy-terms
        API->>DB: Salva timestamp de consentimento
        DB-->>API: Confirmado
    end

    App->>API: GET /api/aluno/aulas/hoje (Header Authorization: Bearer JWT)
    API->>DB: Consulta matrículas (Enrollment) e salas ativas (padrão ou override temporário)
    DB-->>API: Retorna disciplinas, horários, professores e centróides GPS
    API-->>App: Retorna lista de aulas do dia
    App-->>Aluno: Renderiza os Cards de Aulas na Home
```

---

### 1.2 Registro de Presença com Geofencing & Antifraude (Online)
Fluxo principal de check-in onde a API valida a localização por Haversine, a janela estrita de 15 minutos e a colisão de ID do hardware.

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant App as Aplicativo Mobile
    participant Hardware as Sensores (GPS/Device ID)
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Aluno->>App: Clica no botão "Confirmar Presença" no Card da Aula
    App->>Hardware: Solicita Permissão e Coordenadas GPS (Alta Precisão)
    Hardware-->>App: Retorna Latitude, Longitude e Margem de Accuracy
    App->>Hardware: Solicita Identificador Único de Hardware (Android ID / iOS Vendor)
    Hardware-->>App: Retorna Device ID

    App->>API: POST /api/aluno/presenca {classId, lat, lon, deviceId, accuracy}

    rect rgb(241, 245, 249)
        note right of API: Processamento e Antifraude Server-Side
        API->>API: 1. Valida Janela de Horário (Hora da Aula + 15 min de tolerância)
        API->>API: 2. Verifica se a chamada já foi controlada manualmente (EAD)
        API->>API: 3. Calcula Distância pela Fórmula de Haversine ajustada por precisão GPS
        API->>API: 4. Checa se o Device ID já registrou presença para outro RA no dia
    end

    alt Fora do Horário Permite / Expirado
        API-->>App: Erro 403: "Tolerância de 15 minutos expirou"
        App-->>Aluno: Exibe mensagem de alerta
    else Fora do Raio do Geofencing
        API-->>App: Erro 400: "Você está fora da área permitida da sala"
        App-->>Aluno: Exibe distância calculada e raio limite
    else Fraude de Aparelho Detectada
        API-->>App: Erro 403: "Dispositivo já utilizado por outro aluno hoje"
        App-->>Aluno: Exibe alerta vermelho de fraude
    else Check-in Válido
        API->>DB: Insere registro na tabela Attendance (status=PRESENTE)
        API->>DB: Insere notificação em Notification ("Presença Confirmada")
        DB-->>API: Registro criado
        API-->>App: Status 201: Presença confirmada!
        App-->>Aluno: Exibe feedback visual de sucesso (Card Atualizado)
    end
```

---

### 1.3 Fila Offline Criptografada (SHA-256) & Sincronização Automática
Garante a resiliência do registro quando o aluno estiver sem conexão de internet no momento da chamada.

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant App as Aplicativo Mobile (Expo)
    participant Queue as Fila Offline (AsyncStorage)
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Aluno->>App: Clica em "Confirmar Presença" (Sem Internet)
    App->>App: Captura GPS e Device ID do hardware local
    App->>App: Executa Geofencing local contra o centróide armazenado

    alt Fora do Raio Local
        App-->>Aluno: Rejeita chamada offline ("Fora da área permitida")
    else Dentro do Raio Local
        App->>App: Gera Assinatura Criptográfica SHA-256 (payloadString + OFFLINE_SECRET)
        App->>Queue: Salva pacote assinado {classId, lat, lon, deviceId, timestamp, signature}
        App-->>Aluno: Exibe aviso: "Presença salva offline! Será enviada ao reconectar."
        App->>App: Atualiza estado da tela local como "Presença Gravada"
    end

    note over App,API: Quando a Conexão de Rede é Restabelecida (Network Recovery)
    App->>Queue: Lê registros enfileirados pendentes (syncQueue)
    loop Para cada registro offline
        App->>API: POST /api/aluno/presenca (com Payload + Assinatura SHA-256)
        rect rgb(241, 245, 249)
            note right of API: Validação Server-Side da Assinatura
            API->>API: Recalcula expectedSignature = SHA256(payloadString + OFFLINE_SECRET)
            API->>API: Compara signature enviada com expectedSignature
        end
        alt Assinatura Válida
            API->>DB: Persiste presenças no banco de dados
            DB-->>API: Salvo com sucesso
            API-->>App: Status 201 OK
            App->>Queue: Remove item da fila local
        else Assinatura Inválida / Dados Adulterados
            API-->>App: Erro 403: "Assinatura digital inválida"
            App->>Queue: Descarta pacote adulterado
        end
    end
```

---

### 1.4 Dashboard de Frequência, Histórico Acadêmico & Notificações
Permite ao aluno acompanhar seu percentual de frequência por matéria, consultar seu histórico de chamadas e visualizar notificações.

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant App as Aplicativo Mobile
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    %% Dashboard de Frequência
    Aluno->>App: Acessa aba "Dashboard"
    App->>API: GET /api/aluno/dashboard
    API->>DB: Busca matrículas e conta presenças por disciplina
    DB-->>API: Retorna estatísticas de frequência
    API->>API: Classifica status (Aprovado >= 75%, Em Risco 60-74%, Reprovado < 60%)
    API-->>App: Retorna estatísticas calculadas por matéria
    App-->>Aluno: Exibe gráfico de barras e Badges de status

    %% Histórico Acadêmico
    Aluno->>App: Acessa aba "Histórico"
    App->>API: GET /api/aluno/historico
    API->>DB: Busca os últimos 50 registros na tabela Attendance
    DB-->>API: Retorna registros com data, hora e matéria
    API-->>App: Retorna lista formatada (DD/MM/YYYY)
    App-->>Aluno: Exibe timeline de presenças passadas

    %% Notificações
    Aluno->>App: Toca no ícone de Notificações (Sino)
    App->>API: GET /api/notificacoes
    API->>DB: Busca avisos do usuário ordenados por data
    DB-->>API: Retorna notificações
    API-->>App: Exibe lista de avisos
    Aluno->>App: Clica em "Marcar como Lidas"
    App->>API: PUT /api/notificacoes/ler
    API->>DB: Atualiza atributo read = true
    DB-->>API: Ok
```

---

## 2. Fluxos do Professor

O perfil de Professor possui autonomia operacional para gerenciar suas turmas no dia a dia acadêmico através de 4 fluxos principais:

### 2.1 Acompanhamento de Turmas & Chamada em Tempo Real
O professor visualiza as turmas do dia e monitora os alunos que efetuam check-in via GPS em tempo real.

```mermaid
sequenceDiagram
    autonumber
    actor Professor
    participant App as Aplicativo Mobile (Expo)
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Professor->>App: Acessa aba "Minhas Turmas"
    App->>API: GET /api/professor/turmas
    API->>DB: Busca turmas vinculadas ao Professor e locais ativos (padrão/temporário)
    DB-->>API: Retorna turmas e quantidade de alunos matriculados
    API-->>App: Exibe lista de turmas

    Professor->>App: Seleciona uma turma específica
    App->>API: GET /api/professor/turma/:id/presencas
    App->>API: GET /api/professor/turma/:id/alunos
    API->>DB: Consulta presenças confirmadas no dia e alunos matriculados
    DB-->>API: Retorna dados dos alunos e horários de check-in
    API-->>App: Exibe lista de chamadas em tempo real (Presentes / Ausentes)
```

---

### 2.2 Troca Temporária de Sala & Notificação em Tempo Real
Permite ao professor alterar a sala de aula dinamicamente (ex: ida a um laboratório). O sistema realiza dupla verificação de conflitos de agenda e notifica todos os alunos matriculados.

```mermaid
sequenceDiagram
    autonumber
    actor Professor
    participant App as Aplicativo Mobile
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Professor->>App: Seleciona turma e clica em "Trocar Sala"
    App->>API: GET /api/professor/salas-disponiveis
    API->>DB: Busca infraestrutura de salas cadastradas
    DB-->>API: Retorna lista de salas
    API-->>App: Exibe opções de salas

    Professor->>App: Seleciona nova sala e confirma
    App->>API: POST /api/professor/turma/:id/trocar-sala {roomId, date}

    rect rgb(241, 245, 249)
        note right of API: Checagem Dupla de Conflito de Agendas
        API->>DB: Verifica se a sala está ocupada por aula padrão no mesmo horário
        API->>DB: Verifica se a sala está ocupada por outra troca temporária no mesmo horário
    end

    alt Sala Ocupada por Outra Turma
        API-->>App: Erro 400: "Esta sala acabou de ser ocupada por outra turma."
        App-->>Professor: Exibe alerta de conflito de agenda
    else Sala Livre
        API->>DB: Upsert em TemporaryClassLocation com as coordenadas do novo ambiente
        API->>DB: Insere Notificações em lote para todos os alunos da turma
        DB-->>API: Atualizado com sucesso
        API-->>App: Sucesso 200: "Sala alterada com sucesso!"
        App-->>Professor: Atualiza visualização da turma
        note right of DB: Alunos recebem notificação no App<br/>e Geofencing passa a validar na nova sala
    end
```

---

### 2.3 Chamada Manual & Lançamento de Aula Remota (EAD)
Permite o lançamento de presença/falta para aulas ministradas à distância ou em situações onde a chamada por GPS é dispensada pelo docente.

```mermaid
sequenceDiagram
    autonumber
    actor Professor
    participant App as Aplicativo Mobile
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Professor->>App: Seleciona a turma e clica em "Chamada Manual / EAD"
    App->>API: GET /api/professor/turma/:id/alunos
    API->>DB: Busca alunos matriculados na turma
    DB-->>API: Retorna lista de alunos (Nome, RA)
    API-->>App: Exibe lista com seletores (Presente / Ausente)

    Professor->>App: Marca a frequência dos alunos e confirma
    App->>API: POST /api/professor/turma/:id/chamada-manual {attendances}

    rect rgb(241, 245, 249)
        note right of API: Processamento em Lote
        API->>DB: Executa Upsert na tabela Attendance (is_remote=true, manual_attendance=true)
        API->>DB: Dispara notificações individuais para os alunos confirmados
    end

    DB-->>API: Registros salvos
    API-->>App: Sucesso 200: "Chamada manual registrada com sucesso!"
    App-->>Professor: Exibe confirmação na tela
```

---

### 2.4 Reset de Vínculo de Dispositivo (Device Binding Reset)
Permite ao professor desvincular o `Device ID` de um aluno em caso de troca de aparelho ou imprevisto tecnológico durante a aula.

```mermaid
sequenceDiagram
    autonumber
    actor Professor
    participant App as Aplicativo Mobile
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Professor->>App: Seleciona aluno na lista de chamada e clica em "Resetar Aparelho"
    App->>API: POST /api/professor/presenca/reset-device {studentId, classId}

    API->>DB: Busca registro de presença de hoje para o aluno
    alt Registro Não Encontrado
        API-->>App: Erro 404: "Registro de presença não encontrado."
        App-->>Professor: Exibe mensagem de erro
    else Registro Encontrado
        API->>DB: UPDATE Attendance SET device_id = null
        DB-->>API: Retorna registro atualizado
        API-->>App: Sucesso 200: "Vínculo de dispositivo liberado com sucesso!"
        App-->>Professor: Exibe confirmação e atualiza o status do aluno
    end
```

---

### 2.5 Solicitação de Falta & Anexo de Atestado Médico pelo Professor
O professor comunica ausência antecipada ou imprevista pelo botão "Avisar Falta", seleciona o motivo e pode anexar atestado imediatamente ou posteriormente pela aba "Atestados / Minhas Faltas".

```mermaid
sequenceDiagram
    autonumber
    actor Professor
    participant App as Aplicativo Mobile (Expo)
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)
    actor Coordenador

    Professor->>App: Clica em "Avisar Falta" na tela da turma
    App->>Professor: Exibe formulário (Data, Motivo, Justificativa, Data Reposição, Atestado)
    Professor->>App: Preenche os dados e anexa foto/PDF do atestado (opcional)
    Professor->>App: Clica em "Enviar Solicitação de Falta"
    App->>API: POST /api/professor/aviso-falta {classId, date, reason_type, description, certificate_base64}
    API->>DB: Salva arquivo em disco/uploads (se enviado)
    API->>DB: Insere registro em ClassCancellation (status=PENDENTE)
    API->>DB: Cria notificações em lote para todos os Coordenadores ativos
    DB-->>API: Registro criado
    API-->>App: Sucesso 201: "Solicitação de ausência enviada!"
    App-->>Professor: Exibe confirmação

    opt Envio Posterior de Atestado Médico
        Professor->>App: Acessa "Atestados / Minhas Faltas" na tela Minhas Turmas
        App->>API: GET /api/professor/minhas-ausencias
        API->>DB: Busca histórico de ausências do docente
        DB-->>API: Retorna solicitações
        App-->>Professor: Exibe lista com status de atestado
        Professor->>App: Clica em "Anexar Atestado (PDF ou Foto)"
        App->>API: POST /api/professor/cancelamento/:id/atestado {certificate_base64}
        API->>DB: Atualiza certificate_url em ClassCancellation
        API->>DB: Cria notificação para Coordenadores ("Atestado Enviado: Prof...")
        DB-->>API: Concluído
        API-->>App: Sucesso 200: "Atestado médico anexado!"
        App-->>Professor: Atualiza card com botão "Visualizar Atestado"
    end
```

---

### 2.6 Agendamento de Aula de Reposição & Notificação Automática
Permite ao professor (ou coordenador) definir ou alterar a data de reposição para qualquer ausência aprovada, vinculando-a à aula sem aula e notificando automaticamente todos os alunos e docentes.

```mermaid
sequenceDiagram
    autonumber
    actor Professor
    participant App as Aplicativo Mobile
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)
    actor Alunos as Alunos Matriculados

    Professor->>App: Acessa "Atestados" ou "Reposições" e clica em "Agendar / Alterar Data"
    App-->>Professor: Abre Modal de Agendamento com atalhos (+1d, +7d, +14d) e data
    Professor->>App: Define nova data (AAAA-MM-DD) e clica em "Confirmar & Notificar"
    App->>API: PUT /api/professor/reposicao/:id/agendar {replacement_date}
    API->>DB: Busca cancelamento e alunos matriculados na turma
    API->>DB: UPDATE ClassCancellation SET replacement_date = repDate
    loop Para cada aluno matriculado na turma
        API->>DB: INSERT INTO Notification (user_id, title="Reposição Agendada: [Matéria]", body="Referente ao dia...")
    end
    DB-->>API: Atualizado com sucesso
    API-->>App: Sucesso 200: "Data de reposição agendada!"
    App-->>Professor: Atualiza card e exibe feedback de sucesso
    note right of Alunos: Alunos recebem notificação push<br/>no aplicativo instantaneamente!
```

---

### 2.7 Chamada de Aula de Reposição & Conversão de Presença Parcial
Na data da reposição, o docente realiza a chamada das reposições pendentes. Conforme a regra de negócio, todos os alunos vêm marcados como presentes por padrão.

```mermaid
sequenceDiagram
    autonumber
    actor Professor
    participant App as Aplicativo Mobile
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Professor->>App: Clica no botão "Reposições / Chamadas" na tela Minhas Turmas
    App->>API: GET /api/professor/reposicoes-pendentes
    API->>DB: Busca registros com status=APROVADO e replacement_completed=false
    DB-->>API: Retorna turmas e alunos matriculados
    API-->>App: Renderiza lista (Todos os alunos vêm pré-marcados como presentes)

    Professor->>App: Desmarca eventuais alunos que faltaram à reposição
    Professor->>App: Clica em "Concluir Chamada de Reposição"
    App->>API: POST /api/professor/reposicao/:id/finalizar {attended_student_ids}
    API->>DB: Converte presenças parciais dos presentes para confirmadas
    API->>DB: Lança falta para quem não compareceu à reposição
    API->>DB: UPDATE ClassCancellation SET replacement_completed = true
    DB-->>API: Transação finalizada
    API-->>App: Sucesso 200: "Chamada de reposição concluída!"
    App-->>Professor: Exibe modal de confirmação e atualiza pendências
```

---

## 3. Fluxos do Coordenador

Mapeia a gestão administrativa da instituição: análise de semestres letivos, identificação de alunos em risco de evasão, cadastro de infraestrutura de salas, matriculação de alunos e exportação de relatórios.

### 3.1 Dashboard de Semestres & Análise de Alunos em Risco de Evasão
Permite ao coordenador visualizar a taxa geral de ausências por semestre e identificar alunos com alto índice de faltas (`< 75%` de presença).

```mermaid
sequenceDiagram
    autonumber
    actor Coordenador
    participant Web as Painel Coordenador / App
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Coordenador->>Web: Acessa "Gestão de Semestres"
    Web->>API: GET /api/coordenador/semestres
    API->>DB: Busca semestres ativos e calcula (Aulas Esperadas - Presenças Confirmadas)
    DB-->>API: Retorna percentual médio de ausência por semestre
    API-->>Web: Exibe Cards de Semestres (ex: 2026.1 com % de falta)

    Coordenador->>Web: Clica sobre um semestre (ex: 2026.1)
    Web->>API: GET /api/coordenador/semestre/2026.1/alunos
    API->>DB: Busca alunos do semestre com total de faltas acumuladas
    DB-->>API: Retorna alunos
    API->>API: Ordena alunos em ordem decrescente de faltas (Maior Risco Primeiro)
    API-->>Web: Retorna ranking de alunos em risco
    Web-->>Coordenador: Exibe tabela com Badges de Risco

    Coordenador->>Web: Clica em um aluno específico para ver detalhamento
    Web->>API: GET /api/coordenador/aluno/:id/materias?semester=2026.1
    API->>DB: Busca matérias matriculadas e faltas por disciplina
    DB-->>API: Retorna detalhamento
    API-->>Web: Exibe modal com detalhamento por matéria
```

---

### 3.2 Cadastro de Infraestrutura de Salas e Turmas
Permite cadastrar novas salas físicas no campus (centróides GPS) e opcionalmente criar disciplinas vinculando-as a um professor responsável.

```mermaid
sequenceDiagram
    autonumber
    actor Coordenador
    participant Web as Painel Coordenador / App
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Coordenador->>Web: Preenche formulário "Cadastrar Sala" (Nome, Latitude, Longitude)
    opt Vincular Nova Turma/Matéria
        Coordenador->>Web: Marca "Vincular a uma Turma" e preenche Disciplina, Horário e Seleciona Professor
    end

    Web->>API: POST /api/coordenador/sala {name, latitude, longitude, assignClass, subject, schedule_time, professor_id}

    API->>DB: Verifica se já existe uma sala com esse nome (Room.findUnique)
    alt Nome de Sala Já Existe
        API-->>Web: Erro 400: "Já existe uma sala com esse nome"
        Web-->>Coordenador: Exibe alerta na tela
    else Nome Livre
        API->>DB: Insere registro na tabela Room
        opt assignClass == true
            API->>DB: Insere registro na tabela Class (com raio 50m e total_classes 40)
        end
        DB-->>API: Registros criados com sucesso
        API-->>Web: Status 201: "Sala cadastrada com sucesso!"
        Web-->>Coordenador: Limpa formulário e atualiza lista de infraestrutura
    end
```

---

### 3.3 Matrícula de Alunos em Disciplinas
Permite ao coordenador vincular um aluno cadastrado no sistema a uma disciplina/turma ativa no semestre.

```mermaid
sequenceDiagram
    autonumber
    actor Coordenador
    participant Web as Painel Coordenador / App
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    Coordenador->>Web: Acessa tela "Matricular Aluno"
    Web->>API: GET /api/coordenador/alunos
    Web->>API: GET /api/coordenador/semestre/2026.1/turmas
    API->>DB: Busca alunos com Role=ALUNO e turmas ativas do semestre
    DB-->>API: Retorna listas
    API-->>Web: Popula os seletores de Alunos e Disciplinas

    Coordenador->>Web: Seleciona o Aluno "João Silva" e a Disciplina "Algoritmos"
    Web->>API: POST /api/coordenador/matricular {student_id, class_id}

    API->>DB: Verifica se a matrícula já existe (Enrollment.findUnique)
    alt Matrícula Já Existente
        API-->>Web: Erro 400: "Aluno já matriculado nesta matéria"
        Web-->>Coordenador: Exibe mensagem de aviso
    else Matrícula Nova
        API->>DB: Insere registro na tabela Enrollment (student_id, class_id)
        DB-->>API: Confirma inserção
        API-->>Web: Status 201: "Aluno matriculado com sucesso!"
        Web-->>Coordenador: Exibe modal de confirmação
    end
```

---

### 3.4 Geração e Exportação de Relatórios Gerenciais (PDF & XLSX)
Permite a extração de relatórios analíticos em formatos consolidados com suporte a gráficos e detalhamento acadêmico.

```mermaid
sequenceDiagram
    autonumber
    actor Coordenador
    participant Web as Painel Coordenador / App
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)
    participant Export as Motor de Exportação (PDF / XLSX)

    Coordenador->>Web: Clica em "Exportar Relatório Geral"
    Web->>API: GET /api/coordenador/relatorio?level=students&includeDetails=true

    rect rgb(241, 245, 249)
        note right of API: Agregação Completa de Dados
        API->>DB: Busca alunos, matrículas, turmas e frequências acumuladas
        DB-->>API: Retorna estrutura completa de dados
        API->>API: Monta estrutura JSON com estatísticas e detalhes por aluno
    end

    API-->>Web: Retorna JSON estruturado do relatório

    Web->>Export: Envia JSON para compilação visual do documento
    rect rgb(241, 245, 249)
        note right of Export: Geração do Arquivo
        Export->>Export: Desenha tabelas HTML, estatísticas e Badges de Risco
        Export->>Export: Compila PDF nativo (expo-print / window.print) ou planilha .XLSX
    end
    Export-->>Web: Retorna arquivo pronto para impressão/download
    Web-->>Coordenador: Dispara janela nativa de salvamento / impressão
```

---

## 4. Fluxos de Infraestrutura & Jobs Autônomos

Mapeia as tarefas agendadas em segundo plano que garantem o funcionamento ininterrupto, a segurança e a conformidade legal do **GeoClass**.

### 4.1 Cron Job LGPD (Expurgo Diário de Geodados às 03:00 AM)
Garante a conformidade com a LGPD (*Privacy by Design*) através da anonimização de coordenadas e identificadores físicos de chamadas com mais de 6 meses.

```mermaid
sequenceDiagram
    autonumber
    participant Cron as node-cron (Express Server)
    participant Job as lgpdWiperJob()
    participant DB as Banco PostgreSQL (Neon.tech)

    note over Cron: Disparo agendado diariamente às 03:00 AM (Cron '0 3 * * *')
    Cron->>Job: Executa rotina de expurgo LGPD
    Job->>Job: Calcula data de corte (6 meses atrás da data atual)

    Job->>DB: UPDATE Attendance SET student_latitude = null, student_longitude = null, device_id = null WHERE date < 6_meses_atras AND (latitude != null OR longitude != null OR device_id != null)
    DB-->>Job: Retorna total de registros afetados ({ count: N })

    Job->>Job: Imprime Log: "[LGPD WIPER] Limpeza concluída. N registros anonimizados."
    note right of DB: O histórico acadêmico do aluno (PRESENTE/FALTA)<br/>é mantido, mas a rastreabilidade locacional é apagada!
```

---

### 4.2 Cron Job de Notificações Automáticas (Processamento Minutual)
Varre continuamente as aulas agendadas e cria notificações proativas para os alunos.

```mermaid
sequenceDiagram
    autonumber
    participant Cron as node-cron (Express Server)
    participant Job as notificationJob()
    participant DB as Banco PostgreSQL (Neon.tech)

    note over Cron: Disparo agendado a cada minuto (Cron '* * * * *')
    Cron->>Job: Executa rotina de varredura de notificações
    Job->>DB: Busca aulas ativas com início nos próximos minutos
    DB-->>Job: Retorna turmas encontradas

    loop Para cada turma encontrada
        Job->>DB: Busca alunos matriculados que ainda não receberam alerta
        DB-->>Job: Retorna alunos
        loop Para cada aluno
            Job->>DB: INSERT INTO Notification (user_id, title, body)
        end
    end
    Job->>Job: Imprime Log: "[CRON] Processamento de notificações concluído."
```

---

### 4.3 Keep-Alive Anti-Hibernação (Pinger UptimeRobot)
Impede o *spin-down* do container no plano gratuito do Render.com através de requisições HTTP periódicas.

```mermaid
sequenceDiagram
    autonumber
    participant Uptime as UptimeRobot (Pinger Externo em Nuvem)
    participant Server as Express Server (Render.com)

    loop A cada 5 minutos
        Uptime->>Server: HTTP GET https://geoclass-backend.onrender.com/health
        Server-->>Uptime: HTTP 200 OK {"status": "API Online", "timestamp": "2026-08-19T..."}
        note over Server: O contador de 15 minutos de inatividade do Render é zerado,<br/>mantendo a API permanentemente aquecida e ativa!
    end
```

---

### 3.5 Virada de Semestre em Lote (Batch Increment) & Identificação Automática (YYYY.1/YYYY.2)
Permite ao coordenador avançar em lote o semestre letivo de todos os alunos ativos da instituição e consultar o semestre corrente detectado por calendário.

```mermaid
sequenceDiagram
    autonumber
    actor Coordenador
    participant Web as Painel Coordenador / App
    participant API as Backend API (Render.com)
    participant Util as Utilitário AcademicSemester
    participant DB as Banco PostgreSQL (Neon.tech)

    Coordenador->>Web: Carrega tela de Gestão Acadêmica
    Web->>API: GET /api/coordenador/semestre-atual
    API->>Util: getCurrentAcademicSemester()
    Util-->>API: Retorna "2026.2" (Mês >= 7)
    API-->>Web: Exibe Badge "Semestre Vigente: 2026.2"

    Coordenador->>Web: Clica no botão "Executar Virada de Semestre (Batch)"
    Web->>Coordenador: Exibe modal de confirmação de segurança
    Coordenador->>Web: Confirma a virada de semestre

    Web->>API: POST /api/coordenador/virada-semestre
    API->>DB: Busca todos os alunos ativos (User.findMany role=ALUNO active=true)
    DB-->>API: Retorna lista de alunos e seus UserCourses

    loop Para cada aluno ativo
        loop Para cada curso não concluído (is_completed=false)
            API->>Util: incrementStudentSemester(currentSemester)
            Util-->>API: Retorna { newSemester: "4º Semestre", isCompleted: false }
            API->>DB: UPDATE UserCourse SET semester="4º Semestre", is_completed=false
        end
        API->>DB: UPDATE User SET student_semester=lastNewSemester
    end

    DB-->>API: Transação de lote concluída
    API-->>Web: Retorna Sucesso 200 { message, updatedStudentsCount, completedStudentsCount }
    Web-->>Coordenador: Exibe modal de sucesso com total de alunos promovidos e formados
```

---

### 3.6 Gestão de Status Ativo (Trancamento) e Conclusão de Curso (Modo Leitura)
Permite ao coordenador desativar a conta de um aluno (trancamento) ou marcar a conclusão de um curso específico.

```mermaid
sequenceDiagram
    autonumber
    actor Coordenador
    participant Web as Painel Coordenador / App
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    %% Alternar Status Ativo / Inativo
    Coordenador->>Web: Alterna Switch "Ativo" de um Aluno
    Web->>API: PUT /api/coordenador/aluno/status {userId, active: false}
    API->>DB: UPDATE User SET active = false WHERE id = userId
    DB-->>API: Registro atualizado
    API-->>Web: Retorna status atualizado ("Conta desativada/trancada")
    Web-->>Coordenador: Atualiza badge para "Inativo" na lista

    %% Alternar Conclusão de Curso
    Coordenador->>Web: Clica na Tag de Curso do Aluno ("Concluir Curso")
    Web->>API: PUT /api/coordenador/aluno/curso-status {userId, course_name, is_completed: true}
    API->>DB: UPSERT UserCourse SET is_completed = true
    DB-->>API: Registro atualizado
    API-->>Web: Retorna status ("Curso Concluído - Modo Leitura")
    Web-->>Coordenador: Exibe tag com ícone de cadeado e status Concluído
```

---

### 3.7 Suspensão Direta de Aulas pela Coordenação (Institucional, Curso ou Turma)
O coordenador suspende aulas administrativamente (por manutenção, recesso ou imprevisto institucional), atribuindo presença parcial automática e notificando todos os alunos e professores afetados.

```mermaid
sequenceDiagram
    autonumber
    actor Coordenador
    participant Web as Painel Coordenador / App
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)
    actor Alunos as Alunos Matriculados
    actor Professores as Professores

    Coordenador->>Web: Acessa "Solicitações & Cancelamentos" -> Aba "Suspender Aula"
    Web-->>Coordenador: Exibe formulário com Escopo (Toda Instituição / Por Curso / Por Turma)
    Coordenador->>Web: Seleciona o escopo, matéria/curso, data sem aula e motivo
    Coordenador->>Web: Clica em "Confirmar Suspensão & Notificar"
    Web->>API: POST /api/coordenador/cancelar-aulas {scope, date, reason_type, class_id, course_name, replacement_date}

    rect rgb(241, 245, 249)
        note right of API: Processamento em Lote Institucional
        API->>DB: Identifica turmas afetadas pelo escopo e dia da semana
        API->>DB: Cria registro(s) em ClassCancellation (status=APROVADO)
        loop Para cada turma afetada
            loop Para cada aluno matriculado
                API->>DB: UPSERT Attendance (status='PRESENCA_PARCIAL')
                API->>DB: INSERT INTO Notification (user_id=aluno, title="Aula Suspensa: [Matéria]")
            end
            API->>DB: INSERT INTO Notification (user_id=professor, title="Aula Suspensa: [Matéria]")
        end
    end

    DB-->>API: Transação concluída
    API-->>Web: Sucesso 200: "Suspensão registrada e alunos/professores notificados!"
    Web-->>Coordenador: Exibe confirmação com contador de turmas suspensas
    note over Alunos, Professores: Notificação push imediata avisando da suspensão<br/>e resguardando presença parcial até reposição
```

---

### 3.8 Análise de Solicitações de Falta & Solicitação de Atestado Médico
Painel de aprovação das ausências docentes com cobrança formal de atestado médico.

```mermaid
sequenceDiagram
    autonumber
    actor Coordenador
    participant Web as Painel Coordenador / App
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)
    actor Professor

    Coordenador->>Web: Acessa aba "Solicitações de Falta"
    Web->>API: GET /api/coordenador/solicitacoes-falta
    API->>DB: Busca pedidos pendentes (ClassCancellation status=PENDENTE)
    DB-->>API: Retorna lista com justificativas e links de atestado
    API-->>Web: Exibe cards de solicitações

    alt Falta por Motivo de Saúde sem Atestado
        Coordenador->>Web: Clica em "Solicitar Atestado ao Professor"
        Web->>API: PUT /api/coordenador/solicitacoes-falta/:id/pedir-atestado
        API->>DB: INSERT INTO Notification (user_id=professor, title="Solicitação de Atestado Médico")
        DB-->>API: Notificação criada
        API-->>Web: Sucesso 200: "Notificação enviada ao professor!"
        note right of Professor: Professor recebe aviso com instrução para anexar o arquivo
    else Solicitação com Atestado Válido
        Coordenador->>Web: Clica em "Aprovar Falta"
        Web->>API: PUT /api/coordenador/solicitacoes-falta/:id/aprovar
        API->>DB: UPDATE ClassCancellation SET status = 'APROVADO'
        API->>DB: Gera presença parcial (PRESENCA_PARCIAL) para todos os alunos da matéria
        API->>DB: Dispara notificações para todos os alunos da turma
        DB-->>API: Solicitação aprovada
        API-->>Web: Sucesso 200: "Falta aprovada e alunos notificados!"
        Web-->>Coordenador: Remove pedido da lista de pendências
    end
```

---

### 4.4 Disparo Automático de Alerta por Risco de Reprovação (<75% Presença)
Varre a frequência dos estudantes a cada check-in e envia notificação push automática ao atingir a faixa crítica de faltas.

```mermaid
sequenceDiagram
    autonumber
    actor Aluno
    participant API as Backend API (Render.com)
    participant DB as Banco PostgreSQL (Neon.tech)

    note over API: Processado durante o registro de presença ou job
    API->>DB: Calcula porcentagem de presença acumulada da disciplina
    DB-->>API: Retorna presenças = 28 / total_classes = 40 (70% Presença)

    alt Presença entre 70% e 74% (Faixa Crítica)
        API->>DB: INSERT INTO Notification (user_id, title, body) VALUES ("Atenção: Limite Crítico de Faltas (70% de presença em ADS)")
        DB-->>API: Notificação gravada
        note right of DB: Notificação enviada instantaneamente ao celular do aluno
    end
```

