# Dicionário de Dados - GeoClass

O **Dicionário de Dados** descreve a estrutura física do banco de dados relacional (PostgreSQL) do sistema **GeoClass**, construído via **Prisma ORM**. Este documento especifica o nome de cada tabela, atributo, tipo de dados, restrições de nulabilidade, chaves primárias (PK), chaves estrangeiras (FK), enums e regras de negócio/LGPD.

---

## 🗄️ Tabelas do Banco de Dados

### 1. Tabela: `User` (Usuários do Sistema)
Armazena todos os usuários cadastrados no sistema (Alunos, Professores e Coordenadores).

| Atributo | Tipo PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | Não | **PK** | Identificador único do usuário (`uuid()`). |
| `name` | `VARCHAR` | Não | - | Nome completo do usuário. |
| `email` | `VARCHAR` | Não | **Unique** | E-mail único utilizado para autenticação no aplicativo. |
| `password_hash` | `VARCHAR` | Não | - | Senha criptografada com algoritmo `bcryptjs` (salt 10). |
| `role` | `Role` (Enum) | Não | - | Papel do usuário: `ALUNO` (default), `PROFESSOR`, `COORDENADOR`. |
| `ra` | `VARCHAR` | Sim | **Unique** | Registro Acadêmico único (obrigatório para perfis de `ALUNO`). |
| `privacy_terms_accepted_at` | `TIMESTAMP` | Sim | - | Data/hora do aceite dos termos de privacidade da LGPD. |
| `created_at` | `TIMESTAMP` | Não | - | Timestamp de criação do registro (`now()`). |

---

### 2. Tabela: `Class` (Disciplinas / Turmas)
Armazena o cadastro de turmas, matérias, horários, professores e centróide geográfico oficial.

| Atributo | Tipo PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | Não | **PK** | Identificador único da turma (`uuid()`). |
| `subject` | `VARCHAR` | Não | - | Nome da disciplina (ex: "Algoritmos e Estrutura de Dados"). |
| `schedule_time` | `VARCHAR` | Não | - | Horário oficial de início da aula (ex: "08:00"). |
| `latitude` | `DOUBLE PRECISION` | Não | - | Latitude georreferenciada do centróide da sala padrão. |
| `longitude` | `DOUBLE PRECISION` | Não | - | Longitude georreferenciada do centróide da sala padrão. |
| `radius_meters` | `INTEGER` | Não | - | Raio de tolerância de Geofencing em metros (padrão: 50m). |
| `active` | `BOOLEAN` | Não | - | Status da turma (`true` = ativa, `false` = encerrada/inativa). |
| `semester` | `VARCHAR` | Não | - | Semestre letivo da turma (padrão: "2026.1"). |
| `room_name` | `VARCHAR` | Não | - | Nome legível da sala padrão (ex: "Laboratório 3"). |
| `total_classes` | `INTEGER` | Não | - | Quantidade total de aulas previstas no semestre (default: 40). |
| `professor_id` | `UUID` | Não | **FK** | Referência ao id do professor (`User.id`). |
| `created_at` | `TIMESTAMP` | Não | - | Timestamp de criação da turma (`now()`). |

---

### 3. Tabela: `Enrollment` (Matrículas N:M)
Tabela associativa que vincula um Aluno (`User`) a uma Turma (`Class`).

| Atributo | Tipo PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | Não | **PK** | Identificador único da matrícula (`uuid()`). |
| `student_id` | `UUID` | Não | **FK** | Referência ao id do aluno (`User.id`). |
| `class_id` | `UUID` | Não | **FK** | Referência ao id da turma (`Class.id`). |

> 📌 **Restrição de Integridade:** `@@unique([student_id, class_id])` impede matrículas duplicadas na mesma matéria.

---

### 4. Tabela: `Attendance` (Histórico de Presenças / Auditoria)
Armazena as presenças registradas via GPS, chamadas manuais e dados de dispositivo para auditoria antifraude.

| Atributo | Tipo PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | Não | **PK** | Identificador único do registro de chamada (`uuid()`). |
| `student_id` | `UUID` | Não | **FK** | Referência ao id do aluno (`User.id`). |
| `class_id` | `UUID` | Não | **FK** | Referência ao id da turma (`Class.id`). |
| `date` | `DATE` | Não | - | Data letiva do registro (formato YYYY-MM-DD). |
| `check_in_time` | `TIMESTAMP` | Não | - | Data/hora exata do check-in efetuado pelo aluno ou professor. |
| `device_id` | `VARCHAR` | Sim | - | ID físico de hardware (`Device Binding`). Expurgado após 6m pela LGPD. |
| `status` | `Status` (Enum) | Não | - | Status da chamada: `PRESENTE` (default), `ATRASADO`, `FALTA`. |
| `student_latitude` | `DOUBLE PRECISION` | Sim | - | Latitude capturada do aluno. Expurgada após 6m pela LGPD. |
| `student_longitude` | `DOUBLE PRECISION` | Sim | - | Longitude capturada do aluno. Expurgada após 6m pela LGPD. |
| `is_remote` | `BOOLEAN` | Não | - | Flag indicando se a chamada foi realizada em aula remota/EAD (`default false`). |
| `manual_attendance` | `BOOLEAN` | Não | - | Flag indicando se a presença foi lançada manualmente pelo professor (`default false`). |
| `created_at` | `TIMESTAMP` | Não | - | Timestamp de registro (`now()`). |

> 📌 **Restrição de Integridade:** `@@unique([student_id, class_id, date])` impede presenças duplicadas no mesmo dia.

---

### 5. Tabela: `Room` (Infraestrutura de Salas)
Cadastro de salas físicas, auditórios e laboratórios do campus com coordenadas geográficas.

| Atributo | Tipo PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | Não | **PK** | Identificador único da sala (`uuid()`). |
| `name` | `VARCHAR` | Não | **Unique** | Nome exclusivo da sala (ex: "Auditório Principal"). |
| `latitude` | `DOUBLE PRECISION` | Não | - | Latitude georreferenciada de centróide. |
| `longitude` | `DOUBLE PRECISION` | Não | - | Longitude georreferenciada de centróide. |

---

### 6. Tabela: `TemporaryClassLocation` (Trocas Temporárias de Sala)
Registro de realocações temporárias de sala efetuadas pelo professor para uma data específica.

| Atributo | Tipo PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | Não | **PK** | Identificador único da troca de sala (`uuid()`). |
| `class_id` | `UUID` | Não | **FK** | Referência ao id da turma (`Class.id`). |
| `date` | `VARCHAR` | Não | - | Data da troca de sala (formato YYYY-MM-DD). |
| `room_id` | `VARCHAR` | Não | - | Referência ao id da nova sala (`Room.id`). |
| `room_name` | `VARCHAR` | Não | - | Nome da nova sala temporária. |
| `latitude` | `DOUBLE PRECISION` | Não | - | Nova latitude temporária para validação de Geofencing. |
| `longitude` | `DOUBLE PRECISION` | Não | - | Nova longitude temporária para validação de Geofencing. |

> 📌 **Restrição de Integridade:** `@@unique([class_id, date])` garante no máximo um override temporário por turma/dia.

---

### 7. Tabela: `Notification` (Central de Notificações)
Armazena avisos de presença confirmada, trocas de sala e alertas acadêmicos.

| Atributo | Tipo PostgreSQL | Nulo? | Chave | Descrição / Regra de Negócio |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | Não | **PK** | Identificador único da notificação (`uuid()`). |
| `user_id` | `UUID` | Não | **FK** | Referência ao destinatário (`User.id`) com `onDelete: Cascade`. |
| `title` | `VARCHAR` | Não | - | Título da notificação (ex: "Presença Confirmada"). |
| `body` | `VARCHAR` | Não | - | Corpo descritivo da notificação. |
| `read` | `BOOLEAN` | Não | - | Status de leitura (`true` = lida, `false` = pendente). Default: `false`. |
| `created_at` | `TIMESTAMP` | Não | - | Timestamp de envio (`now()`). |

---

## 🔠 Tipos Enumerados (Enums)

### Enum: `Role`
- `ALUNO`: Permissão de acesso ao app mobile de chamadas e histórico.
- `PROFESSOR`: Permissão de acompanhamento de turmas, chamada manual e troca de sala.
- `COORDENADOR`: Permissão administrativa total, dashboards, relatórios e infraestrutura.

### Enum: `Status`
- `PRESENTE`: Registro de presença confirmado.
- `ATRASADO`: Registro com atraso (reservado para regras institucionais).
- `FALTA`: Ausência registrada manualmente ou falta computada.
