# Dicionário de Dados - GeoClass

O **Dicionário de Dados** descreve a estrutura física do banco de dados relacional distribuído em borda (**Cloudflare D1** via `@prisma/adapter-d1`) do sistema **GeoClass**, construído via **Prisma ORM**. Este documento especifica o nome de cada tabela, atributo, tipos de dados, restrições de nulabilidade, chaves primárias (PK), chaves estrangeiras (FK), enums e regras de negócio/LGPD.

---

## 🗄️ Tabelas do Banco de Dados

### 1. Tabela: `User` (Usuários do Sistema)
Armazena todos os usuários cadastrados no sistema (Alunos, Professores e Coordenadores).

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único do usuário (`uuid()`). |
| `name` | `String` | Não | - | Nome completo do usuário. |
| `email` | `String` | Não | **Unique** | E-mail único utilizado para autenticação no aplicativo. |
| `password_hash` | `String` | Não | - | Senha criptografada com algoritmo `bcryptjs` (salt 10). |
| `role` | `String / Role` | Não | - | Papel do usuário: `ALUNO` (default), `PROFESSOR`, `COORDENADOR`. |
| `ra` | `String` | Sim | **Unique** | Registro Acadêmico único (obrigatório para perfis de `ALUNO`). |
| `courses` | `String` | Sim | - | Array serializado JSON com os cursos matriculados do aluno. |
| `student_semester` | `String` | Sim | - | Semestre letivo legado/padrão do aluno (ex: "6º Semestre"). |
| `active` | `Boolean` | Não | - | Flag indicando se a conta está ativa (`true`) ou trancada/inativa (`false`). |
| `privacy_terms_accepted_at` | `DateTime` | Sim | - | Data/hora do aceite dos termos de privacidade da LGPD. |
| `push_token` | `String` | Sim | - | Token de Push Notifications do dispositivo gerado pela Expo Notifications. |
| `created_at` | `DateTime` | Não | - | Timestamp de criação do registro (`now()`). |

---

### 1.1 Tabela: `UserCourse` (Vínculo de Cursos e Semestres por Aluno)
Armazena a relação N:M entre alunos e múltiplos cursos simultâneos com semestre independente e controle de conclusão.

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único do vínculo (`uuid()`). |
| `user_id` | `String (UUID)` | Não | **FK** | Referência ao aluno (`User.id`) com `onDelete: Cascade`. |
| `course_name` | `String` | Não | - | Nome oficial da graduação/curso. |
| `semester` | `String` | Sim | - | Semestre cursado especificamente nesta graduação (ex: "4º Semestre"). |
| `is_completed` | `Boolean` | Não | - | Flag indicando se o curso foi concluído (ativa o Modo Leitura). Default: `false`. |

> 📌 **Restrição de Integridade:** `@@unique([user_id, course_name])` impede duplicidade de matrícula no mesmo curso.

---

### 2. Tabela: `Class` (Disciplinas / Turmas)
Armazena o cadastro de turmas, matérias, horários, professores e centróide geográfico oficial.

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único da turma (`uuid()`). |
| `subject` | `String` | Não | - | Nome da disciplina (ex: "Algoritmos e Estrutura de Dados"). |
| `course_name` | `String` | Sim | - | Nome do curso ao qual a matéria pertence. |
| `schedule_time` | `String` | Não | - | Horário oficial de início da aula (ex: "08:00" ou "19:00, 19:50"). |
| `week_days` | `String` | Sim | - | Dias da semana das aulas (ex: "segunda", "terca,quarta"). |
| `latitude` | `Float` | Não | - | Latitude georreferenciada do centróide da sala padrão. |
| `longitude` | `Float` | Não | - | Longitude georreferenciada do centróide da sala padrão. |
| `radius_meters` | `Int` | Não | - | Raio de tolerância de Geofencing em metros (padrão: 50m). |
| `active` | `Boolean` | Não | - | Status da turma (`true` = ativa, `false` = encerrada/inativa). |
| `semester` | `String` | Não | - | Semestre letivo da turma (padrão: "2026.1"). |
| `room_name` | `String` | Não | - | Nome legível da sala padrão (ex: "Laboratório 3"). |
| `total_classes` | `Int` | Não | - | Quantidade total de aulas previstas no semestre (default: 40). |
| `professor_id` | `String (UUID)` | Não | **FK** | Referência ao id do professor (`User.id`). |
| `created_at` | `DateTime` | Não | - | Timestamp de criação da turma (`now()`). |

---

### 3. Tabela: `Enrollment` (Matrículas N:M)
Tabela associativa que vincula um Aluno (`User`) a uma Turma (`Class`).

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único da matrícula (`uuid()`). |
| `student_id` | `String (UUID)` | Não | **FK** | Referência ao id do aluno (`User.id`). |
| `class_id` | `String (UUID)` | Não | **FK** | Referência ao id da turma (`Class.id`). |
| `is_completed` | `Boolean` | Não | - | Flag indicando se a matéria foi concluída pelo aluno (`default false`). |

> 📌 **Restrição de Integridade:** `@@unique([student_id, class_id])` impede matrículas duplicadas na mesma matéria.

---

### 4. Tabela: `Attendance` (Histórico de Presenças / Auditoria)
Armazena as presenças registradas via GPS, chamadas manuais e dados de dispositivo para auditoria antifraude.

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único do registro de chamada (`uuid()`). |
| `student_id` | `String (UUID)` | Não | **FK** | Referência ao id do aluno (`User.id`). |
| `class_id` | `String (UUID)` | Não | **FK** | Referência ao id da turma (`Class.id`). |
| `date` | `DateTime` | Não | - | Data letiva canônica à meia-noite UTC alinhada com o Horário de Brasília. |
| `slot_time` | `String` | Sim | - | Horário do bloco de aula (ex: "19:00", "19:50", "20:50", "21:40"). |
| `check_in_time` | `DateTime` | Não | - | Data/hora exata do check-in efetuado pelo aluno ou professor. |
| `device_id` | `String` | Sim | - | ID físico de hardware (`Device Binding`). Expurgado após 6m pela LGPD. |
| `status` | `String / Status` | Não | - | Status da chamada: `PRESENTE` (default), `ATRASADO`, `FALTA`, `PRESENCA_PARCIAL`. |
| `student_latitude` | `Float` | Sim | - | Latitude capturada do aluno. Expurgada após 6m pela LGPD. |
| `student_longitude` | `Float` | Sim | - | Longitude capturada do aluno. Expurgada após 6m pela LGPD. |
| `is_remote` | `Boolean` | Não | - | Flag indicando se a chamada foi realizada em aula remota/EAD (`default false`). |
| `manual_attendance` | `Boolean` | Não | - | Flag indicando se a presença foi lançada manualmente pelo professor (`default false`). |
| `created_at` | `DateTime` | Não | - | Timestamp de registro (`now()`). |

> 📌 **Restrição de Integridade:** `@@unique([student_id, class_id, date, slot_time])` impede presenças duplicadas no mesmo bloco de horário do dia.

---

### 5. Tabela: `Room` (Infraestrutura de Salas)
Cadastro de salas físicas, auditórios e laboratórios do campus com coordenadas geográficas.

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único da sala (`uuid()`). |
| `name` | `String` | Não | **Unique** | Nome exclusivo da sala (ex: "Auditório Principal"). |
| `latitude` | `Float` | Não | - | Latitude georreferenciada de centróide. |
| `longitude` | `Float` | Não | - | Longitude georreferenciada de centróide. |

---

### 6. Tabela: `TemporaryClassLocation` (Trocas Temporárias de Sala)
Registro de realocações temporárias de sala efetuadas pelo professor para uma data específica.

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único da troca de sala (`uuid()`). |
| `class_id` | `String (UUID)` | Não | **FK** | Referência ao id da turma (`Class.id`). |
| `date` | `String` | Não | - | Data da troca de sala (formato YYYY-MM-DD). |
| `room_id` | `String` | Não | - | Referência ao id da nova sala (`Room.id`). |
| `room_name` | `String` | Não | - | Nome da nova sala temporária. |
| `latitude` | `Float` | Não | - | Nova latitude temporária para validação de Geofencing. |
| `longitude` | `Float` | Não | - | Nova longitude temporária para validação de Geofencing. |

> 📌 **Restrição de Integridade:** `@@unique([class_id, date])` garante no máximo um override temporário por turma/dia.

---

### 7. Tabela: `Notification` (Central de Notificações)
Armazena avisos de presença confirmada, trocas de sala e alertas acadêmicos.

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único da notificação (`uuid()`). |
| `user_id` | `String (UUID)` | Não | **FK** | Referência ao destinatário (`User.id`) com `onDelete: Cascade`. |
| `title` | `String` | Não | - | Título da notificação (ex: "Presença Confirmada"). |
| `body` | `String` | Não | - | Corpo descritivo da notificação. |
| `read` | `Boolean` | Não | - | Status de leitura (`true` = lida, `false` = pendente). Default: `false`. |
| `created_at` | `DateTime` | Não | - | Timestamp de envio (`now()`). |

---

### 8. Tabela: `AcademicCalendar` (Dias Não Letivos / Feriados)
Armazena os dias em que não haverá aula por motivo de feriado, emenda, recesso escolar, SPAP ou período de exames finais.

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único do evento (`uuid()`). |
| `date` | `DateTime` | Não | **Unique** | Data do dia não letivo canônica à meia-noite UTC. |
| `description` | `String` | Não | - | Descrição do evento (ex: "Feriado de Tiradentes", "Carnaval", "18ª SPAP"). |
| `type` | `String` | Não | - | Categoria do dia: `FERIADO`, `RECESSO`, `SPAP`, `EXAME`, `NAO_LETIVO`. Default: `NAO_LETIVO`. |
| `created_at` | `DateTime` | Não | - | Timestamp de registro no sistema (`now()`). |

---

### 9. Tabela: `AcademicSemester` (Períodos Oficiais dos Semestres)
Armazena as datas de início e término das aulas de cada semestre letivo para validação de dias letivos válidos.

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único do semestre (`uuid()`). |
| `name` | `String` | Não | **Unique** | Nome identificador do semestre (ex: "2026.1", "2026.2"). |
| `start_date` | `DateTime` | Não | - | Data de início oficial das aulas do semestre. |
| `end_date` | `DateTime` | Não | - | Data de término oficial das aulas do semestre. |
| `active` | `Boolean` | Não | - | Indica se o semestre está em vigência acadêmica (`true`/`false`). Default: `true`. |
| `created_at` | `DateTime` | Não | - | Timestamp de criação (`now()`). |

---

### 10. Tabela: `ClassCancellation` (Cancelamentos, Ausências e Reposições)
Armazena solicitações de falta de professores e suspensões institucionais de aula com suporte a atestado médico e vinculação de data de reposição.

| Atributo | Tipo Prisma / D1 | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `String (UUID)` | Não | **PK** | Identificador único do registro (`uuid()`). |
| `class_id` | `String (UUID)` | Sim | **FK** | Referência à turma (`Class.id`), nulo para suspensões gerais. |
| `course_name` | `String` | Sim | - | Nome do curso para suspensões filtradas por curso. |
| `professor_id` | `String (UUID)` | Sim | **FK** | Referência ao professor (`User.id`) solicitante ou responsável. |
| `date` | `DateTime` | Não | - | Data exata da ausência ou do cancelamento da aula. |
| `reason_type` | `String` | Não | - | Motivo: `SAUDE`, `PESSOAL`, `ACADEMICO`, `TRANSPORTE`, `MANUTENCAO`, `FERIADO_EXTRA`, `OUTROS`. |
| `description` | `String` | Sim | - | Detalhamento da justificativa ou comunicação institucional. |
| `certificate_url`| `String` | Sim | - | Caminho/URL do arquivo de atestado médico anexado. |
| `status` | `String` | Não | - | Status da solicitação: `PENDENTE`, `APROVADO`, `REJEITADO`. Default: `PENDENTE`. |
| `scope` | `String` | Não | - | Escopo da suspensão: `TURMA`, `CURSO`, `INSTITUICAO`. Default: `TURMA`. |
| `created_by_role`| `String / Role` | Não | - | Perfil de quem registrou: `PROFESSOR` ou `COORDENADOR`. |
| `replacement_date`| `DateTime` | Sim | - | Data agendada para reposição da aula. |
| `replacement_completed`| `Boolean` | Não | - | Flag indicando se a chamada de reposição foi concluída (default: `false`). |
| `created_at` | `DateTime` | Não | - | Data/hora do lançamento no sistema (`now()`). |

---

## 🔠 Tipos Enumerados (Enums)

### Enum: `Role`
- `ALUNO`: Permissão de acesso ao app mobile de chamadas e histórico.
- `PROFESSOR`: Permissão de acompanhamento de turmas, chamada manual, troca de sala, aviso de faltas e atestados.
- `COORDENADOR`: Permissão administrativa total, dashboards, relatórios, infraestrutura e cancelamentos institucionais.

### Enum: `Status`
- `PRESENTE`: Registro de presença confirmado via GPS ou chamada manual.
- `ATRASADO`: Registro com atraso (reservado para regras institucionais).
- `FALTA`: Ausência registrada manualmente ou falta computada.
- `PRESENCA_PARCIAL`: Presença temporária/provisória atribuída aos alunos matriculados quando há suspensão institucional ou falta aprovada do docente, resguardando o histórico até a realização da chamada de reposição.
