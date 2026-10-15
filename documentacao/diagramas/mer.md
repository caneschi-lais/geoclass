# Diagrama de Banco de Dados (MER / ERD) - GeoClass

Para a monografia/TCC, a notação **Crow's Foot (Pé de Galinha)** é o padrão utilizado na engenharia de software para mapear de forma precisa as entidades e tabelas do banco de dados relacional gerenciado na nuvem (**Supabase - PostgreSQL**), os tipos de dados, chaves primárias numéricas (PK), chaves estrangeiras com integridade referencial (FK) e a cardinalidade dos relacionamentos construídos com o **Prisma ORM**.

---

## 1. Código do Diagrama (Mermaid ERD)

```mermaid
erDiagram
    USER {
        int id PK
        string name
        string email
        string password_hash
        Role role
        string ra
        string_array courses
        string student_semester
        boolean active
        datetime privacy_terms_accepted_at
        string push_token
        datetime created_at
    }

    USER_COURSE {
        int id PK
        int user_id FK
        string course_name
        string semester
        boolean is_completed
    }

    CLASS {
        int id PK
        string subject
        string course_name
        string schedule_time
        string week_days
        float latitude
        float longitude
        int radius_meters
        boolean active
        string semester
        string room_name
        int total_classes
        int professor_id FK
        datetime created_at
    }

    ENROLLMENT {
        int id PK
        int student_id FK
        int class_id FK
        boolean is_completed
    }

    ATTENDANCE {
        int id PK
        int student_id FK
        int class_id FK
        date date
        string slot_time
        datetime check_in_time
        string device_id
        Status status
        float student_latitude
        float student_longitude
        boolean is_remote
        boolean manual_attendance
        datetime created_at
    }

    ROOM {
        int id PK
        string name
        float latitude
        float longitude
    }

    TEMPORARY_CLASS_LOCATION {
        int id PK
        int class_id FK
        string date
        int room_id FK
        string room_name
        float latitude
        float longitude
    }

    NOTIFICATION {
        int id PK
        int user_id FK
        string title
        string body
        boolean read
        datetime created_at
    }

    CLASS_CANCELLATION {
        int id PK
        int class_id FK
        string course_name
        int professor_id FK
        date date
        string reason_type
        string description
        string certificate_url
        string status
        string scope
        Role created_by_role
        date replacement_date
        boolean replacement_completed
        datetime created_at
    }

    ACADEMIC_CALENDAR {
        int id PK
        date date
        string description
        string type
        datetime created_at
    }

    ACADEMIC_SEMESTER {
        int id PK
        string name
        date start_date
        date end_date
        boolean active
        datetime created_at
    }

    USER ||--o{ USER_COURSE : possui
    USER ||--o{ CLASS : leciona
    USER ||--o{ ENROLLMENT : cursa
    CLASS ||--o{ ENROLLMENT : matricula
    USER ||--o{ ATTENDANCE : registra
    CLASS ||--o{ ATTENDANCE : contabiliza
    CLASS ||--o{ TEMPORARY_CLASS_LOCATION : recebe
    ROOM ||--o{ TEMPORARY_CLASS_LOCATION : aloca
    USER ||--o{ NOTIFICATION : recebe
    USER ||--o{ CLASS_CANCELLATION : solicita
    CLASS ||--o{ CLASS_CANCELLATION : afeta
```

---

## 2. Explicação dos Componentes do Banco de Dados (Para a Monografia)

Se a banca examinadora questionar sobre a modelagem e integridade do banco de dados, destaque os seguintes pontos arquiteturais:

1. **Persistência Relacional em Nuvem com Supabase (PostgreSQL):**
   O banco de dados oficial do ecossistema é o **PostgreSQL** hospedado na infraestrutura gerenciada do **Supabase**. A modelagem adota chaves primárias inteiras sequenciais (`Int @id @default(autoincrement())`), garantindo indexação B-Tree de alta performance, menor consumo de memória em relação a UUIDs e suporte a chaves estrangeiras com regras estritas de integridade referencial (`ON DELETE CASCADE`).

2. **Polimorfismo, Notificações Push e Status da Entidade `User`:**
   A entidade `User` gerencia todos os perfis do sistema (Alunos, Professores e Coordenadores). A diferenciação de acesso e permissões (*Role-Based Access Control*) é feita via tipo Enumerado nativo `Role` (`ALUNO`, `PROFESSOR`, `COORDENADOR`). O atributo booleano `active` permite a desativação/trancamento temporário de contas com bloqueio de acesso ao app. O campo `push_token` armazena o identificador único fornecido pelo serviço Expo Push Notifications no smartphone do usuário, viabilizando lembretes automáticos instantâneos.

3. **Modelagem Multi-Curso & Semestre por Curso (`UserCourse`):**
   Alunos podem cursar múltiplas graduações simultaneamente na faculdade (ex: ADS e Gestão Empresarial) ou já ter concluído uma e continuar em outra. A tabela associativa `UserCourse` desacopla o semestre letivo e o status de conclusão (`is_completed`) por curso, impedindo que a conclusão de um curso afete indevidamente a matrícula em outro.

4. **Auditoria de Presença, Multi-Slot e Compliance LGPD (`Attendance`):**
   Cada aula ministrada possui sua chave única composta por `[student_id, class_id, date, slot_time]`, garantindo que turmas de 2 ou 4 aulas consecutivas por dia registrem a frequência de cada bloco (`slot_time`) de forma independente. As coordenadas de geolocalização (`student_latitude`, `student_longitude`) e o identificador do hardware (`device_id`) são retidos exclusivamente pelo período letivo e expurgados automaticamente após 6 meses via rotina programada (`LgpdWiperJob`).

5. **Gestão de Espaço Físico e Override Temporário (`Room` e `TemporaryClassLocation`):**
   O cadastro oficial de salas físicas (`Room`) armazena centróides geográficos auditados. Caso o professor precise levar a turma para um laboratório diferente em determinado dia, a tabela `TemporaryClassLocation` cria uma sobreposição válida exclusivamente para aquela data, sem alterar o cadastro padrão da disciplina.

6. **Regras de Ausência, Faltas e Reposição (`ClassCancellation` e `AcademicCalendar`):**
   - Dias não letivos oficiais (feriados nacionais, municipais e recessos escolares) são gerenciados na tabela `AcademicCalendar`. Nesses dias, nenhuma chamada ou falta é gerada.
   - Cancelamentos e suspensões institucionais são registrados em `ClassCancellation`. Feriados e emendas extras (`FERIADO_EXTRA`) dispensam o registro de presença sem gerar faltas. Suspensões acadêmicas e atestados médicos de docentes atribuem provisoriamente `PRESENCA_PARCIAL` aos alunos matriculados até que a reposição vinculada (`replacement_date`) seja concluída.
