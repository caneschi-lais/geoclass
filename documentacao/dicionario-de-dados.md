# Dicionário de Dados - GeoClass

O **Dicionário de Dados** descreve a estrutura física do banco de dados relacional gerenciado na nuvem (**Supabase - PostgreSQL**) do sistema **GeoClass**, construído via **Prisma ORM**. Este documento especifica o nome de cada tabela, atributo, tipos de dados, restrições de nulabilidade, chaves primárias (PK), chaves estrangeiras (FK com integridade referencial), enums nativos e regras de negócio/LGPD.

---

## 🗄️ Tabelas do Banco de Dados

### 1. Tabela: `User` (Usuários do Sistema)
Armazena todos os usuários cadastrados no sistema (Alunos, Professores e Coordenadores).

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico sequencial do usuário. |
| `name` | `String` (Text / Varchar) | Não | - | Nome completo do usuário. |
| `email` | `String` (Text / Varchar) | Não | **Unique** | E-mail único utilizado para autenticação no aplicativo. |
| `password_hash` | `String` (Text / Varchar) | Não | - | Senha criptografada com algoritmo `bcryptjs` (salt 10). |
| `role` | `Enum (Role)` | Não | - | Papel do usuário: `ALUNO` (default), `PROFESSOR`, `COORDENADOR`. |
| `ra` | `String` (Text / Varchar) | Sim | **Unique** | Registro Acadêmico único (obrigatório para perfis de `ALUNO`). |
| `courses` | `String[]` (Text Array) | Não | - | Lista de cursos aos quais o usuário está vinculado (padrão: `[]`). |
| `student_semester` | `String` (Text / Varchar) | Sim | - | Semestre letivo legado/padrão do aluno (ex: "6º Semestre"). |
| `active` | `Boolean` | Não | - | Flag indicando se a conta está ativa (`true`) ou trancada/inativa (`false`). |
| `privacy_terms_accepted_at` | `DateTime` (Timestamp) | Sim | - | Data/hora do aceite dos termos de privacidade da LGPD. |
| `push_token` | `String` (Text / Varchar) | Sim | - | Token de Push Notifications do dispositivo gerado pela Expo Notifications. |
| `created_at` | `DateTime` (Timestamp) | Não | - | Timestamp de criação do registro (`now()`). |

---

### 1.1 Tabela: `UserCourse` (Vínculo de Cursos e Semestres por Aluno)
Armazena a relação N:M entre alunos e múltiplos cursos simultâneos com semestre independente e controle de conclusão.

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico sequencial do vínculo. |
| `user_id` | `Int` | Não | **FK** | Referência ao aluno (`User.id`) com integridade `onDelete: Cascade`. |
| `course_name` | `String` (Text / Varchar) | Não | - | Nome oficial da graduação/curso. |
| `semester` | `String` (Text / Varchar) | Sim | - | Semestre cursado especificamente nesta graduação (ex: "4º Semestre"). |
| `is_completed` | `Boolean` | Não | - | Flag indicando se o curso foi concluído (ativa o Modo Leitura). Default: `false`. |

> 📌 **Restrição de Integridade:** `@@unique([user_id, course_name])` impede duplicidade de matrícula no mesmo curso.

---

### 2. Tabela: `Class` (Disciplinas / Turmas)
Armazena o cadastro de turmas, matérias, horários, professores e centróide geográfico oficial.

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico da turma. |
| `subject` | `String` (Text / Varchar) | Não | - | Nome da disciplina (ex: "Algoritmos e Estrutura de Dados"). |
| `course_name` | `String` (Text / Varchar) | Sim | - | Nome do curso ao qual a matéria pertence (padrão: "Análise e Desenvolvimento de Sistemas"). |
| `schedule_time` | `String` (Text / Varchar) | Não | - | Horário oficial de início da aula (ex: "08:00" ou "19:00, 19:50"). |
| `week_days` | `String` (Text / Varchar) | Sim | - | Dias da semana das aulas (ex: "segunda", "terca,quarta"). |
| `latitude` | `Float` (Double Precision) | Não | - | Latitude georreferenciada do centróide da sala padrão. |
| `longitude` | `Float` (Double Precision) | Não | - | Longitude georreferenciada do centróide da sala padrão. |
| `radius_meters` | `Int` | Não | - | Raio de tolerância de Geofencing em metros (padrão: 50m). |
| `active` | `Boolean` | Não | - | Status da turma (`true` = ativa, `false` = encerrada/inativa). |
| `semester` | `String` (Text / Varchar) | Não | - | Semestre letivo da turma (padrão: "2026.1"). |
| `room_name` | `String` (Text / Varchar) | Não | - | Nome legível da sala padrão (ex: "Laboratório 3"). |
| `total_classes` | `Int` | Não | - | Quantidade total de aulas previstas no semestre (default: 40). |
| `professor_id` | `Int` | Não | **FK** | Referência ao professor responsável (`User.id`). |
| `created_at` | `DateTime` (Timestamp) | Não | - | Timestamp de criação da turma (`now()`). |

---

### 3. Tabela: `Enrollment` (Matrículas N:M)
Tabela associativa que vincula um Aluno (`User`) a uma Turma (`Class`).

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico da matrícula. |
| `student_id` | `Int` | Não | **FK** | Referência ao id do aluno (`User.id`) com `onDelete: Cascade`. |
| `class_id` | `Int` | Não | **FK** | Referência ao id da turma (`Class.id`) com `onDelete: Cascade`. |
| `is_completed` | `Boolean` | Não | - | Flag indicando se a matéria foi concluída pelo aluno (`default false`). |

> 📌 **Restrição de Integridade:** `@@unique([student_id, class_id])` impede matrículas duplicadas na mesma matéria.

---

### 4. Tabela: `Attendance` (Histórico de Presenças / Auditoria)
Armazena as presenças registradas via GPS, chamadas manuais e dados de dispositivo para auditoria antifraude.

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico do registro de chamada. |
| `student_id` | `Int` | Não | **FK** | Referência ao id do aluno (`User.id`). |
| `class_id` | `Int` | Não | **FK** | Referência ao id da turma (`Class.id`). |
| `date` | `DateTime` (`@db.Date`) | Não | - | Data letiva canônica alinhada com o Horário de Brasília. |
| `slot_time` | `String` (Text / Varchar) | Sim | - | Horário do bloco de aula (ex: "19:00", "19:50", "20:50", "21:40"). |
| `check_in_time` | `DateTime` (Timestamp) | Não | - | Data/hora exata do check-in efetuado pelo aluno ou professor. |
| `device_id` | `String` (Text / Varchar) | Sim | - | ID físico de hardware (`Device Binding`). Expurgado após 6m pela LGPD. |
| `status` | `Enum (Status)` | Não | - | Status da chamada: `PRESENTE` (default), `ATRASADO`, `FALTA`, `PRESENCA_PARCIAL`. |
| `student_latitude` | `Float` (Double Precision) | Sim | - | Latitude capturada do aluno. Expurgada após 6m pela LGPD. |
| `student_longitude` | `Float` (Double Precision) | Sim | - | Longitude capturada do aluno. Expurgada após 6m pela LGPD. |
| `is_remote` | `Boolean` | Não | - | Flag indicando se a chamada foi realizada em aula remota/EAD (`default false`). |
| `manual_attendance` | `Boolean` | Não | - | Flag indicando se a presença foi lançada manualmente pelo professor (`default false`). |
| `created_at` | `DateTime` (Timestamp) | Não | - | Timestamp de registro (`now()`). |

> 📌 **Restrição de Integridade:** `@@unique([student_id, class_id, date, slot_time])` impede presenças duplicadas no mesmo bloco de horário do dia.

---

### 5. Tabela: `Room` (Infraestrutura de Salas)
Cadastro de salas físicas, auditórios e laboratórios do campus com coordenadas geográficas.

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico da sala. |
| `name` | `String` (Text / Varchar) | Não | **Unique** | Nome exclusivo da sala (ex: "Auditório Principal"). |
| `latitude` | `Float` (Double Precision) | Não | - | Latitude georreferenciada de centróide. |
| `longitude` | `Float` (Double Precision) | Não | - | Longitude georreferenciada de centróide. |

---

### 6. Tabela: `TemporaryClassLocation` (Trocas Temporárias de Sala)
Registro de realocações temporárias de sala efetuadas pelo professor para uma data específica.

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico da troca de sala. |
| `class_id` | `Int` | Não | **FK** | Referência ao id da turma (`Class.id`). |
| `date` | `String` (Text / Varchar) | Não | - | Data da troca de sala (formato YYYY-MM-DD). |
| `room_id` | `Int` | Sim | **FK** | Referência ao id da nova sala (`Room.id`). |
| `room_name` | `String` (Text / Varchar) | Não | - | Nome da nova sala temporária. |
| `latitude` | `Float` (Double Precision) | Não | - | Nova latitude temporária para validação de Geofencing. |
| `longitude` | `Float` (Double Precision) | Não | - | Nova longitude temporária para validação de Geofencing. |

> 📌 **Restrição de Integridade:** `@@unique([class_id, date])` garante no máximo um override temporário por turma/dia.

---

### 7. Tabela: `Notification` (Central de Notificações)
Armazena avisos de presença confirmada, trocas de sala e alertas acadêmicos.

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico da notificação. |
| `user_id` | `Int` | Não | **FK** | Referência ao destinatário (`User.id`) com `onDelete: Cascade`. |
| `title` | `String` (Text / Varchar) | Não | - | Título da notificação (ex: "Presença Confirmada"). |
| `body` | `String` (Text / Varchar) | Não | - | Corpo descritivo da notificação. |
| `read` | `Boolean` | Não | - | Status de leitura (`true` = lida, `false` = pendente). Default: `false`. |
| `created_at` | `DateTime` (Timestamp) | Não | - | Timestamp de envio (`now()`). |

---

### 8. Tabela: `AcademicCalendar` (Dias Não Letivos / Feriados)
Armazena os dias em que não haverá aula por motivo de feriado, emenda, recesso escolar, SPAP ou período de exames finais.

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico do evento. |
| `date` | `DateTime` (`@db.Date`) | Não | **Unique** | Data do dia não letivo canônica. |
| `description` | `String` (Text / Varchar) | Não | - | Descrição do evento (ex: "Feriado de Tiradentes", "Carnaval", "18ª SPAP"). |
| `type` | `String` (Text / Varchar) | Não | - | Categoria do dia: `FERIADO`, `RECESSO`, `SPAP`, `EXAME`, `NAO_LETIVO`. Default: `NAO_LETIVO`. |
| `created_at` | `DateTime` (Timestamp) | Não | - | Timestamp de registro no sistema (`now()`). |

---

### 9. Tabela: `AcademicSemester` (Períodos Oficiais dos Semestres)
Armazena as datas de início e término das aulas de cada semestre letivo para validação de dias letivos válidos.

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico do semestre. |
| `name` | `String` (Text / Varchar) | Não | **Unique** | Nome identificador do semestre (ex: "2026.1", "2026.2"). |
| `start_date` | `DateTime` (`@db.Date`) | Não | - | Data de início oficial das aulas do semestre. |
| `end_date` | `DateTime` (`@db.Date`) | Não | - | Data de término oficial das aulas do semestre. |
| `active` | `Boolean` | Não | - | Indica se o semestre está em vigência acadêmica (`true`/`false`). Default: `true`. |
| `created_at` | `DateTime` (Timestamp) | Não | - | Timestamp de criação (`now()`). |

---

### 10. Tabela: `ClassCancellation` (Cancelamentos, Ausências e Reposições)
Armazena solicitações de falta de professores e suspensões de aula com suporte a atestado médico e vinculação de reposição.

| Atributo | Tipo Prisma / PostgreSQL (Supabase) | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (Serial / Autoincrement) | Não | **PK** | Identificador único numérico do cancelamento. |
| `class_id` | `Int` | Sim | **FK** | Referência à turma (`Class.id`), nulo para suspensões gerais. Integridade `onDelete: Cascade`. |
| `course_name` | `String` (Text / Varchar) | Sim | - | Nome do curso para suspensões filtradas por curso. |
| `professor_id` | `Int` | Sim | **FK** | Referência ao professor (`User.id`) solicitante ou responsável. |
| `date` | `DateTime` (`@db.Date`) | Não | - | Data exata da ausência ou do cancelamento da aula. |
| `reason_type` | `String` (Text / Varchar) | Não | - | Motivo: `SAUDE`, `PESSOAL`, `ACADEMICO`, `TRANSPORTE`, `MANUTENCAO`, `FERIADO_EXTRA`, `OUTROS`. |
| `description` | `String` (Text / Varchar) | Sim | - | Detalhamento da justificativa ou comunicação institucional. |
| `certificate_url`| `String` (Text / Varchar) | Sim | - | Caminho/URL do arquivo de atestado médico anexado. |
| `status` | `String` (Text / Varchar) | Não | - | Status da solicitação: `PENDENTE`, `APROVADO`, `REJEITADO`. Default: `PENDENTE`. |
| `scope` | `String` (Text / Varchar) | Não | - | Escopo da suspensão: `TURMA`, `CURSO`, `INSTITUICAO`. Default: `TURMA`. |
| `created_by_role`| `Enum (Role)` | Não | - | Perfil de quem registrou: `PROFESSOR` ou `COORDENADOR`. |
| `replacement_date`| `DateTime` (`@db.Date`) | Sim | - | Data agendada para reposição da aula. |
| `replacement_completed`| `Boolean` | Não | - | Flag indicando se a chamada de reposição foi concluída (default: `false`). |
| `created_at` | `DateTime` (Timestamp) | Não | - | Data/hora do lançamento no sistema (`now()`). |

---

## 🔠 Tipos Enumerados (Enums Nativos PostgreSQL)

### Enum: `Role`
- `ALUNO`: Permissão de acesso ao app mobile de chamadas, dashboard de frequência e histórico.
- `PROFESSOR`: Permissão de acompanhamento de turmas, chamada manual, troca de sala, aviso de faltas e atestados.
- `COORDENADOR`: Permissão administrativa total, dashboards, relatórios, infraestrutura e cancelamentos institucionais.

### Enum: `Status`
- `PRESENTE`: Registro de presença confirmado via GPS ou chamada manual.
- `ATRASADO`: Registro com atraso (reservado para regras institucionais).
- `FALTA`: Ausência registrada manualmente ou falta computada por expiração de tolerância.
- `PRESENCA_PARCIAL`: Presença temporária/provisória atribuída aos alunos matriculados quando há falta aprovada do docente com reposição pendente. Feriados e emendas extras (dias não letivos) não geram presença nem falta, dispensando registro de chamada.
