# Matriz de Rastreabilidade de Requisitos - GeoClass

---

## 📌 O que é a Matriz de Rastreabilidade de Requisitos (RTM)?

A **Matriz de Rastreabilidade de Requisitos** (*Requirements Traceability Matrix* - **RTM**) é um dos artefatos mais importantes da **Engenharia de Software** e da governança de projetos de tecnologia (adotada em normas como CMMI, ISO/IEC/IEEE 29148 e SWEBOK).

### Por que ela existe?
Em sistemas complexos, é comum que requisitos definidos no início do projeto se percam durante o desenvolvimento, ou que códigos sejam criados sem que haja um requisito que os justifique (*gold plating*). A matriz resolve esse problema estabelecendo uma **rastreabilidade bidirecional**:
1. **Rastreabilidade Direta (*Forward Traceability*):** Garante que **todo requisito** especificado pelo cliente ou pelas normas institucionais foi efetivamente projetado em um Caso de Uso (CDU), implementado em rotas de API, construído em componentes de tela e persistido no Banco de Dados.
2. **Rastreabilidade Reversa (*Backward Traceability*):** Garante que **todo código, tabela e tela** existente no sistema possui uma razão de ser documentada e fundamentada em um requisito de negócio formal.

---

## 📊 1. Matriz de Rastreabilidade dos Requisitos Funcionais (RF)

A tabela a seguir correlaciona cada um dos **25 Requisitos Funcionais (RF01 a RF25)** aos seus respectivos **Casos de Uso (CDU)**, **Endpoints REST da API**, **Telas e Hooks do Cliente Mobile** e **Tabelas do Banco de Dados PostgreSQL**.

| Código | Nome do Requisito | Caso de Uso (CDU) | Rota / Endpoint (API REST) | Componente / Tela (Mobile) | Tabela do Banco (PostgreSQL) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF01** | Autenticação Segura & RBAC | `CDU-01: Autenticar no App` | `POST /api/login`<br/>`GET /api/me` | `LoginScreen.tsx`<br/>`useAuth.ts` | `User`, `UserCourse` |
| **RF02** | Aceite de Termos LGPD | `CDU-02: Aceitar Termos de Privacidade (LGPD)` | `POST /api/accept-privacy-terms` | `PrivacyScreen.tsx`<br/>`useAuth.ts` | `User` |
| **RF03** | Notificações Push Nativas | `CDU-32: Disparar Push Notifications Proativas` | `POST /api/save-push-token` | `NotificationService.ts`<br/>`App.tsx` | `User`, `Notification` |
| **RF04** | Consulta de Aulas do Dia | `CDU-03: Consultar Aulas do Dia & Modo Leitura` | `GET /api/aluno/aulas/hoje` | `HomeScreen.tsx`<br/>`useStudentHome.ts` | `Class`, `Enrollment`, `TemporaryClassLocation`, `AcademicCalendar` |
| **RF05** | Presença por Geofencing (GPS) | `CDU-04: Marcar Presença via GPS / Multi-Slot` | `POST /api/aluno/presenca` | `HomeScreen.tsx`<br/>`ClassCard.tsx` | `Attendance`, `Class`, `Room` |
| **RF06** | Janela Estrita por Slot de Horário | `CDU-06: Validar Geofencing, Janela 15m, Device ID & Slot` | `POST /api/aluno/presenca` | `useStudentHome.ts`<br/>`ClassCard.tsx` | `Class`, `Attendance` |
| **RF07** | Bloqueio Antifraude (Device Binding) | `CDU-06: Validar Geofencing, Janela 15m, Device ID & Slot` | `POST /api/aluno/presenca` | `useStudentHome.ts` | `Attendance` |
| **RF08** | Chamada Offline Criptografada (HMAC) | `CDU-05: Registrar Presença Offline (SHA-256)` | `POST /api/aluno/presenca` | `useOfflineQueue.ts` | `Attendance` |
| **RF09** | Dashboard Acadêmico do Aluno | `CDU-03: Consultar Aulas do Dia & Modo Leitura` | `GET /api/aluno/historico`<br/>`GET /api/aluno/estatisticas` | `HistoryScreen.tsx`<br/>`StudentDashboardScreen.tsx` | `Attendance`, `Enrollment`, `Class` |
| **RF10** | Consulta de Turmas do Professor | `CDU-10: Realizar Chamada Manual / EAD` | `GET /api/professor/turmas`<br/>`GET /api/professor/turma/:id/chamadas` | `ProfessorClassesScreen.tsx`<br/>`ClassAttendanceScreen.tsx` | `Class`, `Attendance`, `Enrollment` |
| **RF11** | Registro de Chamada Manual | `CDU-10: Realizar Chamada Manual / EAD` | `GET /api/professor/turma/:id/alunos`<br/>`POST /api/professor/turma/:id/chamada-manual` | `ManualAttendanceScreen.tsx` | `Attendance`, `Notification` |
| **RF12** | Realocação Temporária de Sala | `CDU-09: Realocar Sala Temporariamente` | `GET /api/professor/salas-disponiveis`<br/>`POST /api/professor/turma/:id/trocar-sala` | `ProfessorClassesScreen.tsx`<br/>`ChangeRoomModal.tsx` | `TemporaryClassLocation`, `Room`, `Notification` |
| **RF13** | Reset de Device Binding | `CDU-11: Resetar Device Binding de Aluno` | `POST /api/professor/presenca/reset-device` | `ClassAttendanceScreen.tsx` | `Attendance` |
| **RF14** | Ausência Docente e Envio de Atestado | `CDU-25: Avisar Falta e Solicitar Ausência`<br/>`CDU-26: Anexar e Gerenciar Atestados Médicos` | `POST /api/professor/solicitar-falta`<br/>`POST /api/professor/cancelamentos/:id/atestado` | `ProfessorAbsencesScreen.tsx`<br/>`HoldButton.tsx` | `ClassCancellation`, `Notification` |
| **RF15** | Agendamento e Conclusão de Reposição | `CDU-29: Agendar Aula de Reposição`<br/>`CDU-30: Realizar Chamada de Reposição` | `POST /api/professor/cancelamentos/:id/reposicao`<br/>`POST /api/professor/cancelamentos/:id/concluir-reposicao` | `ProfessorAbsencesScreen.tsx`<br/>`ReplacementModal.tsx` | `ClassCancellation`, `Attendance`, `Notification` |
| **RF16** | Suspensão Institucional de Aulas | `CDU-27: Suspender Aula Direta por Escopo` | `POST /api/coordenador/suspender-aula`<br/>`GET /api/coordenador/cancelamentos` | `DirectCancellationModal.tsx`<br/>`CoordinatorDashboardScreen.tsx` | `ClassCancellation`, `Attendance`, `Notification` |
| **RF17** | Gestão de Calendário e Dias Não Letivos | `CDU-31: Processar Fechamento Automático de Faltas` | `GET /api/coordenador/calendario`<br/>`POST /api/coordenador/calendario`<br/>`DELETE /api/coordenador/calendario/:id` | `AcademicCalendarScreen.tsx` | `AcademicCalendar` |
| **RF18** | Segregação de Coordenação por Curso | `CDU-15: Monitorar Evasão e Risco`<br/>`CDU-14: Matricular Aluno em Disciplina` | `GET /api/coordenador/semestres`<br/>`GET /api/coordenador/turmas/ativas` | `CoordinatorNavigation.tsx`<br/>`SemestersScreen.tsx` | `UserCourse`, `Course`, `Class` |
| **RF19** | Monitoramento de Evasão e Alunos em Risco | `CDU-15: Monitorar Evasão e Risco`<br/>`CDU-23: Disparar Alerta Automático de Risco` | `GET /api/coordenador/semestre/:id/alunos-em-risco`<br/>`GET /api/coordenador/alunos-em-risco` | `StudentsAtRiskScreen.tsx`<br/>`RiskStudentsTab.tsx` | `Attendance`, `Enrollment`, `Class`, `User` |
| **RF20** | Matrícula e Desmatrícula de Alunos | `CDU-14: Matricular Aluno em Disciplina` | `GET /api/coordenador/alunos`<br/>`POST /api/coordenador/matricular`<br/>`DELETE /api/coordenador/desmatricular` | `EnrollStudentForm.tsx`<br/>`StudentSubjectsScreen.tsx` | `Enrollment`, `User`, `Class` |
| **RF21** | Conclusão de Curso/Matéria (Modo Leitura) | `CDU-21: Gerenciar Conclusão de Curso` | `PATCH /api/coordenador/aluno-curso/:id/concluir`<br/>`PATCH /api/coordenador/matricula/:id/concluir` | `StudentCourseCard.tsx`<br/>`StudentSubjectsScreen.tsx` | `UserCourse`, `Enrollment` |
| **RF22** | Virada de Semestre Curricular em Lote | `CDU-22: Executar Virada de Semestre em Lote` | `POST /api/coordenador/virada-semestre` | `SemesterRollModal.tsx`<br/>`HoldButton.tsx` | `UserCourse`, `AcademicSemester`, `Enrollment` |
| **RF23** | Cadastro de Infraestrutura Física | `CDU-13: Cadastrar Infraestrutura / Salas` | `GET /api/coordenador/salas`<br/>`POST /api/coordenador/sala` | `CreateRoomForm.tsx`<br/>`RoomsManagementScreen.tsx` | `Room` |
| **RF24** | Exportação de Relatórios Gerenciais | `CDU-16: Exportar Relatórios PDF / XLSX` | `GET /api/coordenador/relatorio` | `ExportModal.tsx` | `Class`, `Attendance`, `User`, `Course` |
| **RF25** | Central de Notificações Unificada | `CDU-32: Disparar Push Notifications Proativas` | `GET /api/notificacoes`<br/>`PUT /api/notificacoes/ler`<br/>`PUT /api/notificacoes/ler-todas` | `NotificationsModal.tsx`<br/>`useNotifications.ts` | `Notification` |

---

## ⚙️ 2. Rastreabilidade dos Requisitos Não Funcionais (RNF)

| Código | Requisito Não Funcional | Módulo / Componente Técnico de Implementação |
| :--- | :--- | :--- |
| **RNF01** | Geofencing Server-Side com Haversine | `AttendanceController.ts` / Módulo trigonométrico de cálculo com compensação de `accuracy`. |
| **RNF02** | Fuso Horário Canônico de Brasília | `dateUtils.ts` (`America/Sao_Paulo` / UTC-3) e função canônica `isMidnightUtcDate`. |
| **RNF03** | Criptografia de Senhas e Assinatura Offline | `bcryptjs` no `AuthController.ts` e HMAC SHA-256 no `useOfflineQueue.ts` / `AttendanceController.ts`. |
| **RNF04** | Portabilidade Mobile Multiplataforma | Expo SDK 52, React Native e TypeScript gerando pacotes nativos Android e iOS. |
| **RNF05** | Persistência Relacional em Nuvem | PostgreSQL gerenciado via Supabase com pooling na porta 6543 e mapeamento via Prisma ORM. |
| **RNF06** | Alta Disponibilidade do Backend | Express.js containerizado no Render.com com rotas monitoradas via Keep-Alive (`GET /health`). |
| **RNF07** | Expurgo LGPD (*Privacy by Design*) | `LgpdWiperJob.ts` disparado diariamente via `node-cron` às 03:00 AM (fuso de Brasília). |
| **RNF08** | Automação em Segundo Plano Minutual | `NotificationJob.ts` e `AbsenceProcessor.ts` rodando a cada minuto para notificações e cômputo de faltas. |
| **RNF09** | Resiliência e Fallback Web | Tratamento condicional `Platform.OS === 'web'` para Mock de GPS e LocalStorage. |
| **RNF10** | Eficiência e Idempotência de Datas | Tratamento estrito de datas `@db.Date` sem recuo de fuso horário via `isMidnightUtcDate`. |

---

## ⚖️ 3. Rastreabilidade das Regras de Negócio (RN)

| Código | Regra de Negócio | Módulo de Execução / Validação |
| :--- | :--- | :--- |
| **RN01** | Janela de Tolerância de 15 Minutos | `scheduleHelper.ts` e `AttendanceController.ts` |
| **RN02** | Falta Automática por Expiração | `AbsenceProcessor.ts` acionado pelo `NotificationJob.ts` |
| **RN03** | Unicidade por Aluno, Aula e Slot | `schema.prisma` (`@@unique([student_id, class_id, date, slot_time])`) |
| **RN04** | Regra Antifraude de Device Binding | `AttendanceController.ts` (validação de `device_id` no dia) |
| **RN05** | Compensação da Precisão do GPS | `AttendanceController.ts` (`distance - accuracy <= radius`) |
| **RN06** | Suspensão em Dias Não Letivos | `dateUtils.ts` e consultas na tabela `AcademicCalendar` |
| **RN07** | Conflito de Horário na Troca de Sala | `ProfessorController.ts` (`POST /turma/:id/trocar-sala`) |
| **RN08** | Presença Parcial em Cancelamento | `ClassCancellationController.ts` (`status: PRESENCA_PARCIAL`) |
| **RN09** | Homologação de Reposição em Lote | `ClassCancellationController.ts` (`POST /concluir-reposicao`) |
| **RN10** | Aluno em Risco (< 75% de Frequência) | `CoordinatorController.ts` e `StudentController.ts` |
| **RN11** | Segregação de Coordenação por Curso | `CoordinatorController.ts` (`getCoordinatorCourseIds`) |
| **RN12** | Modo Somente Leitura em Concluídos | `useStudentHome.ts` e `StudentCourseCard.tsx` |
| **RN13** | Botão com Confirmação de 1 Segundo | `HoldButton.tsx` (ausências docentes e virada de semestre) |
| **RN14** | Expurgo Obrigatório de Rastreabilidade | `LgpdWiperJob.ts` (anonimização com mais de 6 meses) |

---

## 🎯 4. Métricas de Cobertura e Conclusão

- **Cobertura de Requisitos Funcionais:** **100%** (25 de 25 requisitos implementados e rastreados).
- **Cobertura de Casos de Uso:** Todos os 32 Casos de Uso descritos possuem vínculo direto com requisitos e código.
- **Rastreabilidade de Dados:** Todas as 12 tabelas do banco de dados estão mapeadas e em conformidade com o dicionário de dados.
- **Validação de Testes:** A matriz serve de base para testes unitários, testes de integração e testes de aceitação do usuário (UAT).
