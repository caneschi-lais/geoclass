# Diagrama de Casos de Uso - GeoClass

O **Diagrama de Casos de Uso (UML)** é essencial na monografia/TCC pois ilustra de forma clara e estruturada quais interações cada Ator (Usuário/Sistema) executa no ecossistema do GeoClass.

O diagrama a seguir utiliza a notação **Mermaid**, categorizando os atores (Aluno, Professor, Coordenador e Sistema Autônomo) e os relacionamentos de `<<include>>` (inclusão obrigatória) e `<<extend>>` (extensão condicional).

---

## 1. Diagrama de Casos de Uso (Mermaid UML)

```mermaid
---
config:
  layout: fixed
---
flowchart LR
    Aluno["Aluno"] --- Login(["Autenticar no App"]) & AceitarLGPD(["Aceitar Termos de Privacidade LGPD"]) & ViewTurmas(["Consultar Aulas do Dia & Modo Leitura"]) & RegistrarPonto(["Marcar Presença via GPS / Multi-Slot"]) & ViewHistorico(["Consultar Histórico Acadêmico"]) & ViewNotif(["Visualizar Notificações & Alertas de Risco"])
    Prof["Professor"] --- Login & ViewTurmas & ViewAlunosTurma(["Consultar Alunos da Turma & Semestre"]) & RealocarSala(["Realocar Sala Temporariamente"]) & ChamadaManual(["Realizar Chamada Manual / EAD"]) & ResetDevice(["Resetar Device Binding de Aluno"])
    Coord["Coordenador"] --- Login & CadastrarSala(["Cadastrar Sala/Infraestrutura"]) & MatricularAluno(["Matricular Aluno em Disciplina"]) & ViewDashboardRisk(["Monitorar Evasão e Alunos em Risco (<75%)"]) & GerarRelatorio(["Exportar Relatórios PDF/XLSX"]) & ToggleStatus(["Alternar Status Ativo/Trancamento"]) & ToggleConclusao(["Gerenciar Conclusão de Curso"]) & ViradaSemestre(["Executar Virada de Semestre em Lote"])
    Sistema["Sistema (Job / Nuvem)"] --- Expurgo(["Expurgar Geodados e Device ID - LGPD"]) & KeepAlive(["Manter API Ativa via Keep-Alive"]) & NotifJob(["Processar Notificações Automáticas"]) & RiskNotification(["Disparar Alerta Auto de Risco (<75%)"]) & DetectSemestre(["Detectar Semestre Atual Automático YYYY.1/2"])
    RegistrarPonto -. &lt;&gt; .-> ValidarAntiFraude(["Validar Geofencing, Janela 15m, Device ID & Slot"])
    RegistrarOffline(["Registrar Presença Offline SHA-256"]) -. &lt;&gt; .-> RegistrarPonto
    RealocarSala -. &lt;&gt; .-> NotifJob
    ViradaSemestre -. &lt;&gt; .-> DetectSemestre

     Aluno:::actor
     Login:::usecase
     AceitarLGPD:::usecase
     ViewTurmas:::usecase
     RegistrarPonto:::usecase
     ViewHistorico:::usecase
     ViewNotif:::usecase
     Prof:::actor
     ViewAlunosTurma:::usecase
     RealocarSala:::usecase
     ChamadaManual:::usecase
     ResetDevice:::usecase
     Coord:::actor
     CadastrarSala:::usecase
     MatricularAluno:::usecase
     ViewDashboardRisk:::usecase
     GerarRelatorio:::usecase
     ToggleStatus:::usecase
     ToggleConclusao:::usecase
     ViradaSemestre:::usecase
     Sistema:::systemActor
     Expurgo:::usecase
     KeepAlive:::usecase
     NotifJob:::usecase
     RiskNotification:::usecase
     DetectSemestre:::usecase
     ValidarAntiFraude:::usecase
     RegistrarOffline:::usecase
    classDef actor fill:#f8fafc,stroke:#94a3b8,stroke-width:2px,font-weight:bold,color:#1e293b
    classDef systemActor fill:#fee2e2,stroke:#ef4444,stroke-width:2px,font-weight:bold,color:#991b1b
    classDef usecase fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0c4a6e
```

---

## 2. Especificação Detalhada dos Casos de Uso (Para TCC/Monografia)

### CDU-01: Autenticar no App
* **Atores:** Aluno, Professor, Coordenador
* **Descrição:** Autenticação de usuários via e-mail e senha com geração de token de sessão JWT segregando permissões por papel (*Role-Based Access Control*). Bloqueia o login caso a conta esteja desativada/trancada (`active: false`).

### CDU-02: Aceitar Termos de Privacidade (LGPD)
* **Ator Principal:** Aluno
* **Descrição:** Apresentação e coleta do consentimento expresso do aluno para o processamento de geolocalização e captura de identificadores de hardware.

### CDU-04: Marcar Presença via GPS / Multi-Slot
* **Ator Principal:** Aluno
* **Descrição:** Registro de presença para cada bloco de horário (`slot_time`) da aula atual do dia. Captura latitude, longitude e `Device ID`. Se o curso do aluno estiver marcado como concluído (`is_completed: true`), o sistema trava o check-in e ativa o **Modo Leitura**.
* **Pré-condições:** Estar logado, conta ativa, dentro da janela de horário de aula e permissão de GPS concedida.
* **Includes:** `CDU-06: Validar Geofencing, Janela 15m, Device ID & Slot`.

### CDU-05: Registrar Presença Offline (SHA-256)
* **Ator Principal:** Aluno
* **Descrição:** Caso não haja conexão com a internet, o app valida o Geofencing localmente e enfileira um pacote criptográfico assinado com SHA-256 (`timestamp` + `deviceId` + `secret`), enviando automaticamente à API ao reconectar.
* **Extends:** `CDU-04: Marcar Presença via GPS`.

### CDU-06: Validar Geofencing, Janela 15m, Device ID & Slot (Automático)
* **Ator Principal:** Sistema (Backend API)
* **Descrição:** Algoritmo server-side que calcula a distância pela Fórmula de Haversine ajustada por margem de GPS, bloqueia registros fora da tolerância de 15 minutos do slot e impede a reutilização do mesmo `Device ID` para matrículas distintas no mesmo dia.

### CDU-09: Realocar Sala Temporariamente
* **Ator Principal:** Professor
* **Descrição:** Permite ao professor mudar a sala de aula para o dia corrente. O sistema valida se a nova sala está disponível e dispara uma notificação aos alunos matriculados.
* **Includes:** `CDU-18: Processar Notificações Automáticas`.

### CDU-10: Realizar Chamada Manual / EAD
* **Ator Principal:** Professor
* **Descrição:** Permite o lançamento manual da lista de presenças/faltas para aulas remotas (EAD) ou em casos excepcionais de imprevisto tecnológico dos alunos, exibindo o semestre específico do aluno em cada curso.

### CDU-11: Resetar Device Binding de Aluno
* **Atores:** Professor, Coordenador
* **Descrição:** Permite desvincular o `Device ID` registrado no dia para determinado aluno que tenha trocado de aparelho ou sofrido falha de hardware.

### CDU-13: Cadastrar Infraestrutura / Salas
* **Ator Principal:** Coordenador
* **Descrição:** Cadastro de blocos, laboratórios e salas de aula informando o nome e as coordenadas geográficas de centróide (latitude e longitude).

### CDU-14: Matricular Aluno em Disciplina
* **Ator Principal:** Coordenador
* **Descrição:** Vincula um aluno cadastrado a uma turma/matéria ativa em determinado semestre letivo.

### CDU-15: Monitorar Evasão e Alunos em Risco (< 75%)
* **Ator Principal:** Coordenador
* **Descrição:** Dashboard analítico e aba dedicada "Alunos em Risco" que calcula a taxa global de faltas por semestre e lista os alunos com frequência inferior a 75%.

### CDU-16: Exportar Relatórios PDF / XLSX
* **Ator Principal:** Coordenador
* **Descrição:** Geração e download de relatórios consolidados em `.XLSX` (Excel) e documentos `.PDF` com gráficos interativos de acompanhamento de presenças.

### CDU-17: Expurgar Geodados e Device ID (LGPD)
* **Ator Principal:** Sistema (Job Agendado `LgpdWiperJob`)
* **Descrição:** Rotina automatizada `node-cron` que roda diariamente às 03:00 AM. Anonimiza as colunas de geolocalização e `device_id` em registros de presença com mais de 6 meses de antiguidade.

### CDU-19: Manter API Ativa via Keep-Alive
* **Ator Principal:** Sistema (Pinger `UptimeRobot`)
* **Descrição:** Serviço externo que dispara requisições HTTP `GET /health` a cada 5 minutos para a API no Render.com, impedindo que o container hiberne no plano gratuito.

### CDU-20: Alternar Status Ativo / Trancamento de Aluno
* **Ator Principal:** Coordenador
* **Descrição:** Permite desativar ou reativar a conta de um aluno. Quando desativado (trancamento temporário), o aluno não pode realizar login ou registrar presenças no app.

### CDU-21: Gerenciar Conclusão de Curso (Modo Leitura)
* **Ator Principal:** Coordenador
* **Descrição:** Permite marcar um curso específico de um aluno como concluído. Ao concluir, o aluno preserva o histórico de chamadas do curso, mas entra em **Modo Leitura** sem permissão para novos check-ins.

### CDU-22: Executar Virada de Semestre em Lote
* **Ator Principal:** Coordenador
* **Descrição:** Ação em lote que avança automaticamente o semestre letivo de todos os alunos ativos da instituição (ex: 3º para 4º Semestre) e atualiza para concluído alunos atingindo o término do curso.

### CDU-23: Disparar Alerta Automático de Risco de Reprovação (<75%)
* **Ator Principal:** Sistema (Backend API)
* **Descrição:** Monitora a frequência do aluno e envia automaticamente uma notificação push de alerta assim que a taxa de presença atinge a faixa crítica (entre 70% e 75%).

### CDU-24: Detectar Semestre Letivo Atual Automático (YYYY.1 / YYYY.2)
* **Ator Principal:** Sistema (Backend API)
* **Descrição:** Algoritmo que identifica automaticamente o semestre vigente com base no mês do calendário (Jan-Jun = `YYYY.1`, Jul-Dez = `YYYY.2`).

