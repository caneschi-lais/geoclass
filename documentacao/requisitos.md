# Especificação de Requisitos e Regras de Negócio - GeoClass

Em projetos e monografias de Engenharia de Software, a especificação de requisitos define formalmente as necessidades que o sistema atende. Este documento organiza o escopo do **GeoClass** em três categorias fundamentais:
1. **Requisitos Funcionais (RF)**: As funcionalidades e comportamentos que o sistema oferece aos atores.
2. **Requisitos Não Funcionais (RNF)**: Os critérios técnicos, arquiteturais, de qualidade, segurança e conformidade da solução.
3. **Regras de Negócio (RN)**: As políticas, diretrizes, restrições e lógicas mandatórias que regem o domínio da aplicação.

---

## 1. Requisitos Funcionais (RF)

*Funcionalidades oferecidas aos perfis de Aluno, Professor e Coordenador, além dos processos automatizados do sistema.*

| Código | Nome do Requisito | Descrição | Ator Principal |
| :--- | :--- | :--- | :--- |
| **RF01** | Autenticação e Controle de Acesso (RBAC) | O sistema deve permitir a autenticação segura de usuários via e-mail e senha, emitindo token JWT e segregando as permissões e navegações de acordo com os papéis (*Role-Based Access Control*): Aluno, Professor e Coordenador. | Todos |
| **RF02** | Aceite de Termos de Privacidade (LGPD) | O sistema deve apresentar termo de consentimento explícito no primeiro acesso do aluno, armazenando a data e hora do aceite (`privacy_terms_accepted_at`) para autorizar a coleta de localização e identificação do aparelho. | Aluno |
| **RF03** | Notificações Push Nativas | O sistema deve capturar e registrar o token de notificações push do dispositivo móvel do usuário (`push_token`) via Expo Notifications, enviando notificações em segundo plano para celulares cadastrados sobre lembretes de aula, fechamento de chamada e trocas de sala. | Todos |
| **RF04** | Consulta de Aulas do Dia | O aplicativo deve listar para o aluno exclusivamente as disciplinas agendadas para o dia corrente, indicando horários dos slots, salas padrão ou salas temporárias ativas. | Aluno |
| **RF05** | Registro de Presença por Geofencing (GPS) | O sistema deve capturar as coordenadas de alta precisão do dispositivo móvel do aluno e validar o raio de Geofencing contra o centróide cadastrado da sala de aula no servidor via Fórmula de Haversine. | Aluno |
| **RF06** | Janela Estrita de Horário por Slot de Aula | O sistema deve permitir o registro de presença somente durante a janela ativa de cada slot de aula (início do slot até 15 minutos de tolerância). Disciplinas com múltiplas aulas no dia dividem os horários em slots independentes (ex: 19:00 e 19:50 ou 20:50 e 21:40). | Aluno / API |
| **RF07** | Bloqueio Antifraude (Device Binding) | O sistema deve capturar o identificador físico de hardware do smartphone (`device_id`) e impedir que o mesmo aparelho seja utilizado para registrar presença para mais de um aluno (RA) na mesma data letiva. | Aluno / API |
| **RF08** | Registro de Presença Offline Criptografado | Na ausência temporária de conexão com a internet, o aplicativo deve validar o Geofencing localmente e enfileirar o registro com assinatura HMAC SHA-256 (`timestamp` + `deviceId` + `secret`), transmitindo-o automaticamente para a API assim que a conexão for restabelecida. | Aluno |
| **RF09** | Dashboard Acadêmico do Aluno | O aplicativo deve exibir para o aluno suas disciplinas matriculadas, total de faltas acumuladas, percentual de frequência e histórico detalhado das últimas presenças registradas. | Aluno |
| **RF10** | Consulta de Turmas e Chamadas do Professor | O professor deve poder visualizar todas as suas disciplinas do semestre, verificar o histórico de chamadas por data em calendário interativo e visualizar o detalhamento de cada aula (slots) por aluno. | Professor |
| **RF11** | Registro de Chamada Manual | O professor deve poder lançar ou editar manualmente a presença ou falta de alunos por slot de aula, permitindo atendimento a aulas remotas (EAD) ou contingências técnicas de estudantes. | Professor |
| **RF12** | Realocação Temporária de Sala | O professor deve poder alterar a sala física da sua disciplina para a data corrente, selecionando entre as salas livres do campus com validação de conflitos de agenda e notificação automática a todos os discentes da turma. | Professor |
| **RF13** | Redefinição de Vínculo de Dispositivo (Reset Device) | Professores e coordenadores devem ter permissão para liberar o vínculo de hardware (`device_id`) de um aluno no dia da aula, viabilizando o registro caso o estudante tenha trocado de celular justificadamente. | Professor / Coordenador |
| **RF14** | Comunicação de Ausência do Professor e Envio de Atestado | O professor deve poder comunicar ausência em uma disciplina acionando o botão intencional segurado por 1 segundo, informando o motivo (saúde, pessoal, acadêmico, transporte, manutenção, feriado extra ou outros) e anexando atestado comprobatório (PDF ou foto). | Professor |
| **RF15** | Agendamento e Conclusão de Reposição de Aula | O professor e o coordenador devem poder agendar a data de reposição de uma aula suspensa (destacada em âmbar no calendário). Na data da reposição, o professor realiza a chamada através de checkboxes pré-preenchidos, convertendo presenças parciais em definitivas. | Professor / Coordenador |
| **RF16** | Suspensão Institucional de Aulas | O coordenador deve poder suspender aulas diretamente (com escopo institucional, por curso ou por turma) por motivos operacionais, manutenção ou feriados regimentais, notificando automaticamente alunos e docentes. | Coordenador |
| **RF17** | Gestão do Calendário Acadêmico e Dias Não Letivos | O coordenador deve poder cadastrar, visualizar e excluir dias não letivos (feriados, recessos, emendas, SPAP e períodos de exames), suspendendo automaticamente o cômputo de faltas e validações de presença nessas datas. | Coordenador / API / Job |
| **RF18** | Segregação de Coordenação por Curso | O sistema deve restringir a visualização e gestão de turmas, semestres, matrículas e relatórios do coordenador exclusivamente aos cursos aos quais ele está vinculado (ex: Coordenador de ADS gerencia apenas turmas de ADS). | Coordenador |
| **RF19** | Monitoramento de Evasão e Alunos em Risco | O sistema deve calcular a frequência percentual dos estudantes e listar em destaque os alunos em risco de reprovação por faltas (presença `< 75%` ou faltas `> 25%`), filtrados pelo curso do coordenador. | Coordenador |
| **RF20** | Matrícula e Desmatrícula de Alunos | O coordenador deve poder matricular e desmatricular estudantes em turmas abertas no semestre vigente, respeitando a unicidade de vínculo entre aluno e disciplina. | Coordenador |
| **RF21** | Conclusão de Curso e Matéria (Modo Leitura) | O coordenador deve poder marcar cursos de alunos como concluídos (`is_completed`), ativando o modo somente leitura para histórico acadêmico, bem como marcar matérias individuais como concluídas. | Coordenador |
| **RF22** | Virada de Semestre em Lote | O coordenador deve poder avançar em lote o semestre curricular dos alunos matriculados ativos (ex: de 1º para 2º Semestre, até a conclusão no 6º Semestre), via ação protegida por confirmação de segurança. | Coordenador |
| **RF23** | Cadastro de Infraestrutura Física | O coordenador deve poder cadastrar salas de aula e laboratórios físicos informando o nome e as coordenadas geográficas de centróide (latitude e longitude). | Coordenador |
| **RF24** | Exportação de Relatórios Gerenciais | O sistema deve permitir ao coordenador a exportação de relatórios consolidados em planilha `.XLSX` (Excel) e documentos `.PDF` com detalhamento analítico e gráficos de presença. | Coordenador |
| **RF25** | Central de Notificações Unificada | O sistema deve disponibilizar uma central de notificações interativa para todos os usuários com histórico de alertas e controle de mensagens lidas e não lidas. | Todos |

---

## 2. Requisitos Não Funcionais (RNF)

*Atributos de qualidade, arquitetura técnica, segurança, desempenho e conformidade normativa.*

| Código | Nome do Requisito | Descrição | Categoria |
| :--- | :--- | :--- | :--- |
| **RNF01** | Algoritmo de Geofencing Server-Side | A distância entre as coordenadas do aluno e da sala de aula deve ser calculada no servidor utilizando a **Fórmula de Haversine**, aplicando ajuste dinâmico da margem de erro nativa do sensor GPS (`accuracy`). | Algoritmo / Segurança |
| **RNF02** | Fuso Horário Canônico de Brasília | Todo o cálculo de tolerância de horários, cron jobs, agrupamentos de slots de aula e datas canônicas de presença deve operar no fuso horário oficial de Brasília (`America/Sao_Paulo` / UTC-3), assegurando consistência em servidores na nuvem em outras regiões. | Consistência / Fuso Horário |
| **RNF03** | Criptografia de Senhas e Assinatura Offline | As senhas de acesso devem ser protegidas por hash unidirecional `bcryptjs` (salt 10). Pacotes da fila offline devem ser autenticados com assinatura HMAC SHA-256 combinando coordenadas, timestamp, hardware ID e segredo simétrico seguro (`OFFLINE_SECRET`). | Segurança / Criptografia |
| **RNF04** | Portabilidade Mobile Multiplataforma | A aplicação cliente deve ser construída em React Native utilizando Expo SDK e TypeScript, permitindo distribuição e execução nativa para Android e iOS a partir de código-fonte compartilhado. | Portabilidade / Arquitetura |
| **RNF05** | Persistência Relacional em Nuvem | Os dados devem ser armazenados em banco de dados relacional **PostgreSQL** hospedado na nuvem (**Supabase**) com suporte a transações ACID e integridade referencial estrita, mapeado via **Prisma ORM**. | Persistência / Nuvem |
| **RNF06** | Hospedagem e Disponibilidade da API | O backend Node.js com Express e TypeScript deve operar em nuvem como Web Service, integrado a monitoramento de disponibilidade (*Keep-Alive*) para prevenção de dormência (*cold-start*). | Infraestrutura / Disponibilidade |
| **RNF07** | Expurgo LGPD (*Privacy by Design*) | O sistema deve rodar rotina automatizada diária (`LgpdWiperJob`) às 03:00 AM para anonimizar permanentemente (`null`) dados sensíveis de geolocalização (`student_latitude`, `student_longitude`) e identificador de hardware (`device_id`) com mais de 6 meses de registro. | Conformidade Legal / LGPD |
| **RNF08** | Processamento em Segundo Plano por Minuto | O backend deve executar rotina automática agendada (`NotificationJob`) a cada minuto para disparo de lembretes aos alunos no início da aula, cômputo automático de faltas após 15 minutos e envio de resumo ao professor. | Desempenho / Automação |
| **RNF09** | Resiliência e Fallback Web | Ao executar a interface em navegadores web para fins de demonstração acadêmica e testes (onde não há sensores GPS nativos), o sistema deve aplicar fallbacks dinâmicos de localização, garantindo navegabilidade contínua. | Usabilidade / Resiliência |
| **RNF10** | Eficiência e Idempotência de Datas | As operações em banco de dados sobre campos de data pura (`@db.Date`) devem ser idempotentes em UTC, prevenindo recuos indesejados de dias ao transitar entre fusos horários locais e internacionais. | Confiabilidade / Integridade |

---

## 3. Regras de Negócio (RN)

*Políticas obrigatórias, condições e lógicas institucionais que governam as operações do GeoClass.*

| Código | Nome da Regra | Descrição e Lógica de Aplicação |
| :--- | :--- | :--- |
| **RN01** | Janela de Tolerância de 15 Minutos | A chamada fica aberta a partir do horário de início oficial de cada slot de aula. O aluno dispõe de exatamente **15 minutos** de tolerância para registrar presença. Caso a distância até a próxima aula seja menor que 15 minutos, a tolerância encerra imediatamente no início da aula subsequente. |
| **RN02** | Falta Automática por Expiração de Tolerância | Decorridos os 15 minutos de tolerância sem registro de presença (`PRESENTE` ou `ATRASADO`) por parte de um aluno regularmente matriculado, o sistema insere automaticamente um registro com status `FALTA` para o slot expirado e notifica o estudante. |
| **RN03** | Unicidade de Registro por Slot de Aula | Não é permitido mais de um registro de frequência para o mesmo aluno, disciplina, data e slot de horário (`@@unique([student_id, class_id, date, slot_time])`). |
| **RN04** | Regra Antifraude de Device Binding | Um identificador físico de aparelho celular (`device_id`) só pode ser utilizado para registrar presença para um único Registro Acadêmico (RA) por data letiva. Tentativas de bater presença para outro aluno com o mesmo celular no mesmo dia são rejeitadas com erro `403 Forbidden`. |
| **RN05** | Cálculo de Geofencing e Margem de Precisão | A presença via GPS só é homologada se a distância calculada pela Fórmula de Haversine for menor ou igual ao raio cadastrado da sala (`radius_meters`), com compensação da precisão do sensor: `distancia - gpsAccuracy <= raioLimite`. |
| **RN06** | Suspensão em Dias Não Letivos e Férias | Em datas cadastradas no Calendário Acadêmico como `FERIADO`, `RECESSO`, `SPAP`, `EXAME` ou fora do período de vigência oficial do semestre letivo, todas as chamadas e inserções automáticas de falta são totalmente suspensas. |
| **RN07** | Conflito de Horário na Troca de Sala | Um professor só pode realocar sua aula para outra sala se a sala de destino estiver completamente desocupada no mesmo dia e horário, considerando tanto as aulas padrão quanto outras eventuais trocas temporárias já confirmadas. |
| **RN08** | Presença Parcial em Cancelamento de Aulas | Quando uma aula é cancelada pelo coordenador ou tem ausência docente aprovada por atestado, os alunos matriculados recebem o status provisório `PRESENCA_PARCIAL` até que a aula de reposição seja realizada. |
| **RN09** | Homologação de Chamada de Reposição | Na data da reposição agendada (destacada em âmbar no calendário), o professor confirma a presença dos alunos via checkboxes. Alunos presentes têm o status atualizado para `PRESENTE`, e ausentes têm o status convertido em `FALTA`. |
| **RN10** | Critério Institucional de Aluno em Risco | Um aluno é classificado como "Em Risco" quando sua frequência geral acumulada no semestre for inferior a **75%** (limite regimental da LDB para reprovação por faltas). |
| **RN11** | Segregação de Visualização da Coordenação por Curso | Coordenadores possuem escopo restrito aos cursos vinculados ao seu cadastro em `UserCourse`. Turmas, semestres, matrículas, alunos e estatísticas de outros cursos não são visíveis nem modificáveis pelo coordenador. |
| **RN12** | Modo Somente Leitura em Cursos Concluídos | Quando um curso de um aluno é marcado como concluído (`is_completed = true`), ele entra em modo somente leitura no app mobile, preservando o histórico acadêmico sem permitir novos lançamentos de presença. |
| **RN13** | Confirmação Intencional para Ações Críticas (Hold Button) | Operações administrativas críticas e irreversíveis (como comunicação de ausência docente, virada de semestre e avanço curricular) exigem que o botão da interface seja pressionado continuamente por **1 segundo**, prevenindo toques acidentais. |
| **RN14** | Expurgo Obrigatório de Rastreabilidade (LGPD) | Coordenadas geográficas (`latitude`, `longitude`) e identificadores de aparelho (`device_id`) têm retenção máxima estrita de **6 meses** a contar da data da aula. O histórico de presença escolar (`status`) é mantido perenemente para fins de auditoria acadêmica. |
