# Requisitos do Sistema - GeoClass

Em qualquer monografia ou TCC de Engenharia de Software, o capítulo de **Engenharia de Requisitos** estabelece as especificações formais do sistema. Os **Requisitos Funcionais (RF)** definem as capacidades operacionais oferecidas aos atores, enquanto os **Requisitos Não Funcionais (RNF)** determinam os atributos de qualidade, segurança, performance, resiliência e conformidade com a infraestrutura em nuvem.

---

## 1. Requisitos Funcionais (RF)

*São as funcionalidades do sistema que atendem diretamente aos casos de uso dos usuários.*

| Código | Nome do Requisito | Descrição | Ator Principal |
| :--- | :--- | :--- | :--- |
| **RF01** | Autenticação e RBAC | O sistema deve permitir o login seguro via e-mail e senha com geração de token de sessão JWT, segregando as interfaces por papel (*Role-Based Access Control*: Aluno, Professor, Coordenador). | Todos |
| **RF02** | Termos de Privacidade LGPD | O sistema deve coletar e registrar o consentimento explícito do aluno (`privacy_terms_accepted_at`) sobre o uso de dados de geolocalização e identificação de hardware no primeiro acesso. | Aluno |
| **RF03** | Consulta de Aulas do Dia | O aplicativo deve exibir para o aluno apenas as disciplinas agendadas para a data corrente, apresentando salas padrão ou trocas temporárias ativas. | Aluno |
| **RF04** | Validação de Ponto por GPS | O sistema deve capturar as coordenadas de alta precisão do dispositivo móvel do aluno e validar o raio de Geofencing contra o centróide cadastrado da sala de aula no servidor. | Aluno |
| **RF05** | Janela de Horário Estrita | O sistema deve permitir o registro de presença apenas a partir do horário de início da aula até o limite máximo de tolerância configurado (15 minutos). | Aluno / API |
| **RF06** | Bloqueio Antifraude (Device Binding) | O sistema deve capturar o identificador físico de hardware do smartphone (`Device ID`) e bloquear o registro se o mesmo aparelho já tiver sido utilizado por outro RA na mesma data. | Aluno / API |
| **RF07** | Fila e Chamada Offline Criptografada | Caso o aluno esteja sem internet, o app deve validar o raio localmente e enfileirar o ponto assinado com hash HMAC SHA-256 (`timestamp` + `deviceId` + `secret`), sincronizando automaticamente com a API ao reconectar. | Aluno |
| **RF08** | Realocação Temporária de Sala | O sistema deve permitir ao professor alterar a sala de aula no dia corrente, realizando dupla checagem de conflitos de agenda e notificando automaticamente todos os alunos da turma. | Professor |
| **RF09** | Chamada Manual / Lançamento EAD | O sistema deve permitir que o professor realize o lançamento manual da frequência (presença ou falta) para aulas remotas (EAD) ou problemas tecnológicos de alunos. | Professor |
| **RF10** | Reset de Vínculo de Dispositivo | O sistema deve permitir que professores ou coordenadores desvinculem o `Device ID` de um aluno em caso de troca de aparelho ou falha técnica no dia da aula. | Professor / Coordenador |
| **RF11** | Central de Notificações | O sistema deve gerar e exibir notificações ativas e em tempo real sobre confirmações de chamadas, trocas de salas e alertas acadêmicos, permitindo controle de leitura. | Todos |
| **RF12** | Dashboard de Evasão e Alunos em Risco | O sistema deve calcular o percentual acumulado de ausências por semestre letivo e exibir o ranking de alunos com alto índice de faltas (frequência `< 75%`). | Coordenador |
| **RF13** | Matrícula de Alunos em Disciplinas | O sistema deve permitir que o coordenador vincule alunos a disciplinas ativas no semestre, impondo a restrição de unicidade da matrícula. | Coordenador |
| **RF14** | Cadastro de Infraestrutura | O sistema deve permitir o cadastro de blocos, salas de aula e laboratórios, salvando o nome e as coordenadas de centróide georreferenciadas (Latitude/Longitude). | Coordenador |
| **RF15** | Exportação de Relatórios Gerenciais | O sistema deve permitir a geração e download de relatórios gerenciais em formatos consolidados `.XLSX` (Excel) e documentos analíticos em `.PDF` com gráficos integrados. | Coordenador |

---

## 2. Requisitos Não Funcionais (RNF)

*São as diretrizes técnicas, arquiteturais, de segurança e infraestrutura do sistema.*

| Código | Nome do Requisito | Descrição | Categoria |
| :--- | :--- | :--- | :--- |
| **RNF01** | Precisão Espacial e Margem GPS | O motor de Geofencing deve calcular a distância usando a **Fórmula de Haversine** server-side, ajustando o raio limite pela margem de precisão (`accuracy`) enviada pelo sensor GPS nativo. | Algoritmo / Segurança |
| **RNF02** | Criptografia HMAC SHA-256 | A fila offline no aplicativo móvel deve assinar os pacotes de presença com um hash SHA-256 combinado com segredo servidor (`OFFLINE_SECRET`), prevenindo adulterações de horário ou localização. | Segurança / Criptografia |
| **RNF03** | Portabilidade Multiplataforma | O aplicativo móvel deve ser desenvolvido em React Native com Expo SDK, garantindo execução nativa em dispositivos Android e iOS com código base único. | Arquitetura / Portabilidade |
| **RNF04** | Persistência Relacional em Nuvem | Os dados devem ser persistidos em banco PostgreSQL serverless na nuvem (**Neon.tech**) com suporte ACID, acessado via **Prisma ORM** através de conexões criptografadas SSL/TLS. | Persistência / Nuvem |
| **RNF05** | Hospedagem de API em Nuvem | O servidor backend Node.js/Express deve ser hospedado como Web Service em nuvem na plataforma **Render.com**, provendo rotas RESTful tipadas em TypeScript. | Infraestrutura / Deploy |
| **RNF06** | Prevenção de Cold-Start (Keep-Alive) | O sistema deve utilizar o serviço de monitoramento externo **UptimeRobot** disparando pings HTTP `GET /health` a cada 5 minutos para evitar que a API no Render hiberne no plano gratuito. | Disponibilidade / Performance |
| **RNF07** | Expurgo LGPD (*Privacy by Design*) | O servidor deve executar um job agendado via `node-cron` (`LgpdWiperJob`) diariamente às 03:00 AM para apagar de forma definitiva `student_latitude`, `student_longitude` e `device_id` de registros com mais de 6 meses. | Segurança / Compliance Legal |
| **RNF08** | Agendador de Tarefas em Segundo Plano | O backend deve possuir um processador de tarefas agendadas em segundo plano (`NotificationJob`) executado a cada minuto para varredura de aulas e geração automática de avisos. | Desempenho / Automação |
| **RNF09** | Resiliência e Fallback Web | Quando a interface for executada em navegadores web de demonstração (sem sensores GPS nativos), o sistema deve aplicar fallbacks dinâmicos de localização permitindo a utilização contínua. | Usabilidade / Resiliência |
