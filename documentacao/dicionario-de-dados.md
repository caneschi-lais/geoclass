# Dicionário de Dados - GeoClass

O **Dicionário de Dados** descreve formalmente a modelagem física do banco de dados relacional gerenciado na nuvem (**Supabase - PostgreSQL**) para o sistema **GeoClass**, construído e mantido através do **Prisma ORM**.

Este documento especifica todas as tabelas, atributos, tipos primitivos, restrições de nulabilidade, chaves primárias (PK), chaves estrangeiras (FK com integridade referencial), índices, tipos enumerados (Enums nativos) e regras de conformidade com a LGPD (*Lei Geral de Proteção de Dados*).

---

## 🗄️ Tabelas do Banco de Dados

### 1. Tabela: `User` (Usuários do Sistema)
Armazena as contas de acesso de todos os atores do sistema (Alunos, Professores e Coordenadores). Os vínculos com cursos e termos acadêmicos são normalizados na tabela associativa `UserCourse`.

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico auto-incremental do usuário. |
| `name` | `String` (Text / Varchar) | Não | - | Nome completo do usuário. |
| `email` | `String` (Text / Varchar) | Não | **Unique** | E-mail corporativo institucional único utilizado para login no sistema. |
| `password_hash` | `String` (Text / Varchar) | Não | - | Hash criptográfico da senha gerado com algoritmo `bcryptjs` (salt 10). |
| `role` | `Enum (Role)` | Não | - | Papel do usuário no sistema: `ALUNO` (default), `PROFESSOR` ou `COORDENADOR`. |
| `ra` | `String` (Text / Varchar) | Sim | **Unique** | Registro Acadêmico único (obrigatório para perfil `ALUNO`, nulo para docentes/coordenadores). |
| `active` | `Boolean` | Não | - | Flag que indica se a conta está ativa (`true`) ou inativa/trancada (`false`). Default: `true`. |
| `privacy_terms_accepted_at` | `DateTime` (Timestamp) | Sim | - | Data e hora em que o aluno concordou com os Termos de Privacidade e uso de dados pela LGPD. |
| `push_token` | `String` (Text / Varchar) | Sim | - | Token exclusivo do dispositivo gerado pela Expo Notifications para envio de notificações push. |
| `created_at` | `DateTime` (Timestamp) | Não | - | Data e hora de criação do cadastro no sistema (`now()`). |

---

### 2. Tabela: `Course` (Cursos / Graduações)
Catálogo oficial das graduações oferecidas pela faculdade, padronizando os cursos e permitindo a segregação por coordenação.

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico auto-incremental do curso. |
| `name` | `String` (Text / Varchar) | Não | **Unique** | Nome oficial completo do curso (ex: "Análise e Desenvolvimento de Sistemas"). |
| `code` | `String` (Text / Varchar) | Sim | **Unique** | Sigla ou código acadêmico identificador (ex: "ADS", "GE", "COMEX"). |
| `created_at` | `DateTime` (Timestamp) | Não | - | Data e hora de cadastro do curso (`now()`). |

---

### 3. Tabela: `UserCourse` (Vínculo de Usuários aos Cursos)
Tabela associativa que gerencia a relação entre usuários (Alunos, Professores e Coordenadores) e seus respectivos cursos cadastrados, incluindo controle de termo curricular, semestre letivo e status de conclusão.

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico sequencial do vínculo. |
| `user_id` | `Int` | Não | **FK** | Referência ao usuário (`User.id`) com exclusão em cascata (`onDelete: Cascade`). |
| `course_id` | `Int` | Não | **FK** | Referência à graduação oficial (`Course.id`) com exclusão em cascata (`onDelete: Cascade`). |
| `semester_id` | `Int` | Sim | **FK** | Referência ao período letivo oficial vigente (`AcademicSemester.id`). |
| `student_term` | `String` (Text / Varchar) | Sim | - | Termo curricular cursado pelo aluno (ex: "1º Semestre", "6º Semestre"). Nulo para docentes/coordenadores. |
| `is_completed` | `Boolean` | Não | - | Flag indicando se o curso foi concluído pelo estudante (ativa o Modo Somente Leitura). Default: `false`. |

> 📌 **Restrição de Integridade:** `@@unique([user_id, course_id])` impede a duplicação do vínculo de um usuário com o mesmo curso.

---

### 4. Tabela: `Room` (Salas Físicas e Laboratórios)
Cadastro físico dos espaços acadêmicos do campus contendo as coordenadas geográficas de centróide para o cálculo de Geofencing.

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico auto-incremental da sala. |
| `name` | `String` (Text / Varchar) | Não | **Unique** | Nome descritivo e identificador da sala (ex: "Sala 14", "Lab 5", "Mini 1"). |
| `latitude` | `Float` (Double Precision) | Não | - | Coordenada de latitude georreferenciada do centróide da sala. |
| `longitude` | `Float` (Double Precision) | Não | - | Coordenada de longitude georreferenciada do centróide da sala. |

---

### 5. Tabela: `AcademicSemester` (Períodos Oficiais dos Semestres)
Registra o cronograma letivo semestral oficial, delimitando a vigência das aulas e agregando disciplinas e calendários.

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico auto-incremental do semestre. |
| `name` | `String` (Text / Varchar) | Não | **Unique** | Nome identificador do semestre (ex: "2026.1", "2026.2"). |
| `start_date` | `DateTime` (`@db.Date`) | Não | - | Data de início oficial das aulas do período letivo. |
| `end_date` | `DateTime` (`@db.Date`) | Não | - | Data de término oficial das aulas do período letivo. |
| `active` | `Boolean` | Não | - | Flag que indica se o semestre está em vigência ativa (`true`). Default: `true`. |
| `created_at` | `DateTime` (Timestamp) | Não | - | Timestamp de criação do semestre (`now()`). |

---

### 6. Tabela: `AcademicCalendar` (Dias Não Letivos e Feriados)
Registra as datas em que não ocorrem aulas devido a feriados, emendas, recessos escolares, eventos institucionais (SPAP) ou semanas de exames finais.

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico do dia não letivo. |
| `date` | `DateTime` (`@db.Date`) | Não | **Unique** | Data canônica do dia não letivo (armazenada em formato de data pura). |
| `description` | `String` (Text / Varchar) | Não | - | Descrição do evento (ex: "Feriado Tiradentes", "Recesso Escolar", "18ª SPAP"). |
| `type` | `String` (Text / Varchar) | Não | - | Tipo de evento: `FERIADO`, `RECESSO`, `SPAP`, `EXAME` ou `NAO_LETIVO`. Default: `NAO_LETIVO`. |
| `semester_id` | `Int` | Sim | **FK** | Referência opcional ao semestre letivo associado (`AcademicSemester.id`). |
| `created_at` | `DateTime` (Timestamp) | Não | - | Timestamp de inserção do registro (`now()`). |

---

### 7. Tabela: `Class` (Disciplinas / Turmas)
Armazena a estrutura de cada disciplina ofertada no campus: professor responsável, sala padrão, curso de origem, horário, dias da semana e raio de geofencing.

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico da turma/disciplina. |
| `subject` | `String` (Text / Varchar) | Não | - | Nome da disciplina (ex: "Laboratório de Engenharia de Software I"). |
| `schedule_time` | `String` (Text / Varchar) | Não | - | Horários dos slots de início de aula (ex: "19:00, 19:50" ou "19:00, 19:50, 20:50, 21:40"). |
| `week_days` | `String` (Text / Varchar) | Sim | - | Dias da semana em que as aulas ocorrem (ex: "segunda", "terca,quarta", "quinta"). |
| `radius_meters` | `Int` | Não | - | Raio de tolerância circular de Geofencing em metros para a sala de aula (padrão: 40m). |
| `active` | `Boolean` | Não | - | Flag indicando se a turma está ativa (`true`) ou arquivada (`false`). Default: `true`. |
| `total_classes` | `Int` | Não | - | Quantidade total de aulas previstas no semestre letivo (default: 40). |
| `room_id` | `Int` | Não | **FK** | Referência à sala física padrão (`Room.id`), de onde derivam centróide e nome. |
| `course_id` | `Int` | Sim | **FK** | Referência ao curso da disciplina (`Course.id`). Permite a segregação por coordenador. |
| `semester_id` | `Int` | Não | **FK** | Referência ao período letivo oficial vigente (`AcademicSemester.id`). |
| `professor_id` | `Int` | Não | **FK** | Referência ao professor responsável pela matéria (`User.id`). |
| `created_at` | `DateTime` (Timestamp) | Não | - | Timestamp de cadastro da disciplina (`now()`). |

---

### 8. Tabela: `Enrollment` (Matrículas de Alunos)
Tabela associativa que vincula um Aluno (`User`) a uma Disciplina (`Class`).

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico da matrícula. |
| `student_id` | `Int` | Não | **FK** | Referência ao aluno matriculado (`User.id`) com exclusão em cascata (`onDelete: Cascade`). |
| `class_id` | `Int` | Não | **FK** | Referência à disciplina (`Class.id`) com exclusão em cascata (`onDelete: Cascade`). |
| `is_completed` | `Boolean` | Não | - | Flag indicando se a matéria individual foi concluída com aprovação. Default: `false`. |

> 📌 **Restrição de Integridade:** `@@unique([student_id, class_id])` impede duplicidade de matrícula do mesmo aluno na mesma disciplina.

---

### 9. Tabela: `Attendance` (Histórico de Frequência e Auditoria)
Armazena todos os registros diários de presença, atraso, falta e presenças parciais, além de dados telemétricos e de hardware para auditoria antifraude e conformidade com a LGPD.

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico do registro de frequência. |
| `student_id` | `Int` | Não | **FK** | Referência ao aluno avaliado (`User.id`). |
| `class_id` | `Int` | Não | **FK** | Referência à turma/disciplina (`Class.id`). |
| `date` | `DateTime` (`@db.Date`) | Não | - | Data civil da aula no Horário de Brasília (armazenada como DATE sem hora). |
| `slot_time` | `String` (Text / Varchar) | Sim | - | Horário do slot da aula registrada (ex: "19:00", "19:50", "20:50", "21:40"). |
| `check_in_time` | `DateTime` (Timestamp) | Não | - | Data e hora exata em que o check-in foi realizado pelo aluno ou professor. |
| `device_id` | `String` (Text / Varchar) | Sim | - | Identificador de hardware do smartphone (`Device Binding`). Anonimizado após 6 meses pela LGPD. |
| `status` | `Enum (Status)` | Não | - | Status da aula: `PRESENTE`, `ATRASADO`, `FALTA` ou `PRESENCA_PARCIAL`. Default: `PRESENTE`. |
| `student_latitude` | `Float` (Double Precision) | Sim | - | Latitude capturada do sensor GPS do aluno no momento da batida. Anonimizada após 6 meses pela LGPD. |
| `student_longitude`| `Float` (Double Precision) | Sim | - | Longitude capturada do sensor GPS do aluno no momento da batida. Anonimizada após 6 meses pela LGPD. |
| `is_remote` | `Boolean` | Não | - | Indica se a presença foi computada para uma aula em regime EAD/Remoto. Default: `false`. |
| `manual_attendance`| `Boolean` | Não | - | Indica se a frequência foi lançada ou modificada manualmente pelo professor. Default: `false`. |
| `created_at` | `DateTime` (Timestamp) | Não | - | Timestamp de registro no banco de dados (`now()`). |

> 📌 **Restrição de Integridade:** `@@unique([student_id, class_id, date, slot_time])` garante que cada aluno possui no máximo um registro por aula/slot do dia.

---

### 10. Tabela: `TemporaryClassLocation` (Trocas Temporárias de Sala)
Registra realocações de sala efetuadas dinamicamente pelo professor para uma data específica.

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico da troca de sala. |
| `class_id` | `Int` | Não | **FK** | Referência à disciplina realocada (`Class.id`) com exclusão em cascata (`onDelete: Cascade`). |
| `date` | `DateTime` (`@db.Date`) | Não | - | Data civil da alteração de sala. |
| `room_id` | `Int` | Não | **FK** | Referência à nova sala de destino (`Room.id`), de onde derivam novas coordenadas e nome. |

> 📌 **Restrição de Integridade:** `@@unique([class_id, date])` impede múltiplas realocações conflitantes para a mesma turma no mesmo dia.

---

### 11. Tabela: `Notification` (Central de Notificações)
Histórico de notificações enviadas aos usuários (avisos de início de aula, confirmação de chamada, trocas de sala e alertas de evasão).

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico da notificação. |
| `user_id` | `Int` | Não | **FK** | Referência ao usuário destinatário (`User.id`) com exclusão em cascata (`onDelete: Cascade`). |
| `title` | `String` (Text / Varchar) | Não | - | Título descritivo da notificação (ex: "Lembrete de Aula", "Troca de Sala"). |
| `body` | `String` (Text / Varchar) | Não | - | Conteúdo informativo detalhado da mensagem. |
| `read` | `Boolean` | Não | - | Flag indicando se a notificação já foi lida pelo usuário. Default: `false`. |
| `created_at` | `DateTime` (Timestamp) | Não | - | Data e hora de emissão da notificação (`now()`). |

---

### 12. Tabela: `ClassCancellation` (Ausências Docentes, Suspensões e Reposições)
Gerencia solicitações de ausência de professores, atestados médicos, suspensões institucionais pelo coordenador e agendamento de reposições de aula.

| Atributo | Tipo Prisma / PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Integer) | Não | **PK** | Identificador único numérico do cancelamento/ausência. |
| `class_id` | `Int` | Sim | **FK** | Referência à disciplina específica (`Class.id`) com exclusão em cascata (`onDelete: Cascade`). |
| `course_id` | `Int` | Sim | **FK** | Referência ao curso (`Course.id`) para suspensões no nível de graduação. |
| `professor_id` | `Int` | Sim | **FK** | Referência ao professor solicitante ou responsável (`User.id`). |
| `date` | `DateTime` (`@db.Date`) | Não | - | Data da aula suspensa ou ausência. |
| `reason_type` | `String` (Text / Varchar) | Não | - | Motivo: `SAUDE`, `PESSOAL`, `ACADEMICO`, `TRANSPORTE`, `MANUTENCAO`, `FERIADO_EXTRA` ou `OUTROS`. |
| `description` | `String` (Text / Varchar) | Sim | - | Detalhamento descritivo da justificativa da ausência ou aviso. |
| `certificate_url`| `String` (Text / Varchar) | Sim | - | Caminho ou identificador do arquivo de atestado médico/documento comprobatório anexado. |
| `status` | `String` (Text / Varchar) | Não | - | Situação da solicitação: `PENDENTE`, `APROVADO` ou `REJEITADO`. Default: `PENDENTE`. |
| `scope` | `String` (Text / Varchar) | Não | - | Escopo da suspensão: `TURMA`, `CURSO` ou `INSTITUICAO`. Default: `TURMA`. |
| `created_by_role`| `Enum (Role)` | Não | - | Papel do criador da solicitação (`PROFESSOR` ou `COORDENADOR`). Default: `PROFESSOR`. |
| `replacement_date`| `DateTime` (`@db.Date`)| Sim | - | Data agendada para realização da aula de reposição (destacada em cor âmbar no calendário). |
| `replacement_completed`| `Boolean` | Não | - | Indica se a chamada definitiva da aula de reposição foi realizada. Default: `false`. |
| `created_at` | `DateTime` (Timestamp) | Não | - | Data e hora do registro (`now()`). |

> 📌 **Índices de Otimização:** `@@index([date])` e `@@index([class_id, date])` para aceleração de consultas diárias de suspensão.

---

## 🔠 Tipos Enumerados (Enums Nativos)

### 1. Enum: `Role`
Define os perfis de acesso ao sistema com segregação de rotas e funcionalidades:
- **`ALUNO`**: Acesso à consulta de aulas do dia, batida de ponto por geofencing GPS, fila offline e histórico acadêmico.
- **`PROFESSOR`**: Acesso às turmas lecionadas, verificação de frequência por slot, chamada manual, realocação temporária de salas, aviso de falta e agendamento de reposição.
- **`COORDENADOR`**: Acesso à gestão de turmas, semestres, matrículas, calendário acadêmico, suspensão de aulas, infraestrutura de salas, alunos em risco e relatórios analíticos, restritos aos cursos sob sua coordenação.

### 2. Enum: `Status`
Define o estado de frequência do estudante para cada bloco/slot de aula:
- **`PRESENTE`**: Presença validada e homologada via Geofencing GPS nativo ou lançada manualmente pelo professor.
- **`ATRASADO`**: Presença com atraso (reservado para diretrizes institucionais).
- **`FALTA`**: Ausência confirmada manualmente pelo professor ou registrada de forma automática pelo sistema após a expiração dos 15 minutos de tolerância.
- **`PRESENCA_PARCIAL`**: Presença provisória atribuída aos alunos matriculados quando há aula cancelada ou falta aprovada do professor aguardando reposição. Na realização da reposição, é convertida em `PRESENTE` ou `FALTA`.
