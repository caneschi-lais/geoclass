# Diagrama de Banco de Dados (MER) - GeoClass

Para a sua monografia, o modelo "Pé de Galinha" (*Crow's Foot Notation*) é o padrão ouro na indústria hoje em dia, pois, diferentemente daquele formato antigo de bolinhas (Peter Chen), ele mostra as tabelas exatas que serão criadas no banco, o tipo dos dados e como as chaves estrangeiras se conectam.

Abaixo está o **Modelo Entidade-Relacionamento (MER)** do banco de dados oficial que construímos com o **Prisma (PostgreSQL)**. Você pode copiá-lo e jogá-lo no [Mermaid Live Editor](https://mermaid.live/) para exportar como imagem e anexar no seu trabalho.

## Código do Diagrama (Mermaid)

```mermaid
erDiagram
    %% Tabelas e Atributos

    User {
        string id PK "UUID"
        string name "Nome completo"
        string email "Único"
        string password_hash "Hash"
        string role "ALUNO, PROFESSOR ou COORDENADOR"
        string ra "Registro Acadêmico"
        datetime created_at "Data"
    }

    "Class" {
        string id PK "UUID"
        string subject "Ex: Algoritmos"
        string schedule_time "Ex: 08:00"
        float latitude "Coord Oficial"
        float longitude "Coord Oficial"
        int radius_meters "Margem de erro"
        string semester "Ex: 2026.1"
        string room_name "Nome da sala"
        int total_classes "Qtd total aulas"
        string professor_id FK "Chave estrangeira"
    }

    Enrollment {
        string id PK "UUID"
        string student_id FK "Aluno"
        string class_id FK "Aula"
    }

    Attendance {
        string id PK "UUID"
        string student_id FK "Aluno"
        string class_id FK "Aula"
        datetime date "Data da aula"
        datetime check_in_time "Hora exata"
        string device_id "Anti-Fraude"
        string status "PRESENTE ou FALTA"
        float student_latitude "Aonde aluno estava"
        float student_longitude "Aonde aluno estava"
        boolean is_remote "Flag remota"
        boolean manual_attendance "Bypass prof"
    }

    Room {
        string id PK "UUID"
        string name "Nome unico"
        float latitude "Latitude"
        float longitude "Longitude"
    }

    TemporaryClassLocation {
        string id PK "UUID"
        string class_id FK "Aula"
        string date "Data do Override"
        string room_id "Sala"
        string room_name "Nome sala"
        float latitude "Novas coords"
        float longitude "Novas coords"
    }

    %% Relacionamentos (Chaves Estrangeiras)
    User ||--o{ "Class" : "Leciona"
    User ||--o{ Enrollment : "Possui matricula"
    "Class" ||--o{ Enrollment : "Tem alunos"
    User ||--o{ Attendance : "Registra presenca"
    "Class" ||--o{ Attendance : "Gera lista"
    "Class" ||--o{ TemporaryClassLocation : "Sofre alteracao temporaria"
```

---

## O que explicar sobre esse diagrama na monografia:

Se a banca te perguntar como as coisas se conversam, os pontos mais importantes são:
1. **A tabela `User` é polimórfica:** Ela guarda todos os usuários do sistema, diferenciando-os pelo atributo `role` (enum).
2. **A tabela Pivot (`Enrollment`):** O aluno e a aula formam um relacionamento de *Muitos-para-Muitos*. Por isso, a tabela `Enrollment` (Matrícula) existe para ligar a chave primária de `User` com a de `Class`.
3. **Auditoria (`Attendance`):** Todo dia gera-se um novo registro aqui. Ela amarra três informações cruciais para a segurança: o `student_id`, a aula `class_id` e a data `date`.
4. **O Segredo das Salas Temporárias (`TemporaryClassLocation`):** Essa tabela fica solta no banco até o momento em que o professor aciona a troca de sala. Ela amarra a `class_id` a uma `date` específica. Na hora que o aluno tentar bater o ponto, o banco olha primeiro pra cá antes de olhar para as coordenadas oficiais da tabela `Class`.
