# Diagrama de Banco de Dados (MER / ERD) - GeoClass

Para a monografia/TCC, a notação **Crow's Foot (Pé de Galinha)** é o padrão utilizado na engenharia de software para mapear de forma precisa as tabelas do banco de dados relacional (PostgreSQL), os tipos de dados, chaves primárias (PK), chaves estrangeiras (FK) e a cardinalidade dos relacionamentos construídos com o **Prisma ORM**.

---

## 1. Código do Diagrama (Mermaid ERD)

```mermaid
erDiagram
    USER {
        string id PK
        string name
        string email
        string password_hash
        Role role
        string ra
        datetime privacy_terms_accepted_at
        datetime created_at
    }

    CLASS {
        string id PK
        string subject
        string schedule_time
        float latitude
        float longitude
        int radius_meters
        boolean active
        string semester
        string room_name
        int total_classes
        string professor_id FK
        datetime created_at
    }

    ENROLLMENT {
        string id PK
        string student_id FK
        string class_id FK
    }

    ATTENDANCE {
        string id PK
        string student_id FK
        string class_id FK
        date date
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
        string id PK
        string name
        float latitude
        float longitude
    }

    TEMPORARY_CLASS_LOCATION {
        string id PK
        string class_id FK
        string date
        string room_id
        string room_name
        float latitude
        float longitude
    }

    NOTIFICATION {
        string id PK
        string user_id FK
        string title
        string body
        boolean read
        datetime created_at
    }

    USER ||--o{ CLASS : leciona
    USER ||--o{ ENROLLMENT : possui
    CLASS ||--o{ ENROLLMENT : matricula
    USER ||--o{ ATTENDANCE : registra
    CLASS ||--o{ ATTENDANCE : possui
    CLASS ||--o{ TEMPORARY_CLASS_LOCATION : recebe
    USER ||--o{ NOTIFICATION : recebe
```

---

## 2. Explicação dos Componentes do Banco de Dados (Para a Monografia)

Se a banca examinadora questionar sobre a modelagem e integridade do banco de dados, destaque os seguintes pontos arquiteturais:

1. **Polimorfismo da Tabela `User`:**
   A entidade `User` gerencia todos os perfis do sistema (Alunos, Professores e Coordenadores). A diferenciação de acesso e permissões (*Role-Based Access Control*) é feita via tipo Enumerado `Role` (`ALUNO`, `PROFESSOR`, `COORDENADOR`).

2. **Garantia de Unicidade e Regras N:M (`Enrollment`):**
   A relação de muitos-para-muitos entre Alunos (`User`) e Turmas (`Class`) é decomposta através da entidade `Enrollment`. Para evitar matrículas duplicadas, o banco impõe a restrição composta `@@unique([student_id, class_id])`.

3. **Auditoria Antifraude e Prevenção de Chamada Dupla (`Attendance`):**
   A tabela de auditoria impõe a restrição tripla `@@unique([student_id, class_id, date])`. Isso garante a nível de banco de dados que um aluno não consiga registrar presença mais de uma vez na mesma aula no mesmo dia.

4. **Dynamic Location Override (`TemporaryClassLocation`):**
   A tabela possui a chave composta `@@unique([class_id, date])`. Quando o professor realiza a troca temporária de sala, a API efetua uma busca prioritária nesta tabela; se houver um registro ativo para a data, as coordenadas de Geofencing da sala temporária sobrepõem as coordenadas padrão da entidade `Class`.

5. **Entidade de Comunicação Ativa (`Notification`):**
   Gerencia os alertas e confirmações em tempo real. Possui exclusão em cascata (`onDelete: Cascade`) vinculada a `User`, garantindo integridade referencial.

6. **Privacy by Design & Compliance LGPD:**
   A entidade `User` registra o timestamp do consentimento expresso em `privacy_terms_accepted_at`. Além disso, os atributos sensíveis `student_latitude`, `student_longitude` e `device_id` na tabela `Attendance` são anuláveis (`nullable`), permitindo que a rotina automatizada `LgpdWiperJob` limpe esses geodados de presenças com mais de 6 meses sem deletar o registro histórico acadêmico do aluno.
