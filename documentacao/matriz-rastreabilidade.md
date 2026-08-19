# Matriz de Rastreabilidade de Requisitos - GeoClass

A **Matriz de Rastreabilidade de Requisitos (RTM - *Requirements Traceability Matrix*)** é uma ferramenta de Engenharia de Software que garante o alinhamento de ponta a ponta no ciclo de vida do desenvolvimento. Ela relaciona cada **Requisito Funcional (RF)** aos seus respectivos **Casos de Uso (CDU)**, **Endpoints da API REST**, **Telas/Hooks do aplicativo móvel** e **Tabelas do Banco de Dados**.

---

## 📊 Tabela de Rastreabilidade de Requisitos

| Requisito | Nome do Requisito | Caso de Uso (CDU) | Rota / Endpoint da API | Componente / Tela Mobile | Tabela (PostgreSQL) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF01** | Autenticação Segura & RBAC | CDU01: Autenticar no App | `POST /api/login` | `LoginScreen.tsx` | `User` |
| **RF02** | Termos de Privacidade LGPD | CDU02: Aceitar Termos LGPD | `POST /api/accept-privacy-terms` | `PrivacyScreen.tsx` | `User` |
| **RF03** | Consulta de Aulas do Dia | CDU03: Consultar Aulas do Dia | `GET /api/aluno/aulas/hoje` | `HomeScreen.tsx`<br/>`useStudentHome.ts` | `Class`, `Enrollment`, `TemporaryClassLocation` |
| **RF04** | Validação de Ponto por GPS | CDU04: Marcar Presença via GPS | `POST /api/aluno/presenca` | `HomeScreen.tsx`<br/>`ClassCard.tsx` | `Attendance`, `Class` |
| **RF05** | Janela de Horário Estrita | CDU06: Validar Geofencing | `POST /api/aluno/presenca` | `useStudentHome.ts` | `Class`, `Attendance` |
| **RF06** | Bloqueio Antifraude (Device Binding) | CDU06: Validar Geofencing e Device ID | `POST /api/aluno/presenca` | `useStudentHome.ts` | `Attendance` |
| **RF07** | Chamada Offline SHA-256 | CDU05: Registrar Presença Offline | `POST /api/aluno/presenca` | `useOfflineQueue.ts` | `Attendance` |
| **RF08** | Realocação Temporária de Sala | CDU09: Realocar Sala Temporariamente | `GET /api/professor/salas-disponiveis`<br/>`POST /api/professor/turma/:id/trocar-sala` | `ProfessorClassesScreen.tsx`<br/>`ChangeRoomModal.tsx` | `TemporaryClassLocation`, `Room`, `Notification` |
| **RF09** | Chamada Manual / EAD | CDU10: Realizar Chamada Manual | `GET /api/professor/turma/:id/alunos`<br/>`POST /api/professor/turma/:id/chamada-manual` | `ManualAttendanceScreen.tsx` | `Attendance`, `Notification` |
| **RF10** | Reset de Device Binding | CDU11: Resetar Device Binding | `POST /api/professor/presenca/reset-device` | `ClassAttendanceScreen.tsx` | `Attendance` |
| **RF11** | Central de Notificações | CDU08: Visualizar Notificações<br/>CDU18: Processar Notificações | `GET /api/notificacoes`<br/>`PUT /api/notificacoes/ler` | `NotificationsModal.tsx`<br/>`useNotifications.ts` | `Notification` |
| **RF12** | Dashboard de Evasão & Risco | CDU15: Monitorar Evasão e Risco | `GET /api/coordenador/semestres`<br/>`GET /api/coordenador/semestre/:id/alunos`<br/>`GET /api/coordenador/aluno/:id/materias` | `SemestersScreen.tsx`<br/>`StudentsListScreen.tsx`<br/>`StudentSubjectsScreen.tsx` | `Class`, `Enrollment`, `Attendance`, `User` |
| **RF13** | Matrícula de Alunos | CDU14: Matricular Aluno | `GET /api/coordenador/alunos`<br/>`GET /api/coordenador/semestre/:id/turmas`<br/>`POST /api/coordenador/matricular` | `EnrollStudentForm.tsx` | `Enrollment`, `User`, `Class` |
| **RF14** | Cadastro de Infraestrutura | CDU13: Cadastrar Sala | `POST /api/coordenador/sala` | `CreateRoomForm.tsx` | `Room`, `Class` |
| **RF15** | Exportação de Relatórios | CDU16: Exportar Relatórios PDF/XLSX | `GET /api/coordenador/relatorio` | `ExportModal.tsx` | `Class`, `Attendance`, `User` |

---

## 🔍 Resumo de Rastreabilidade

- **Cobertura de Requisitos:** 100% dos Requisitos Funcionais (RF01 a RF15) estão cobertos por Casos de Uso, Endpoints REST e Interfaces de Usuário.
- **Rastreabilidade de Persistência:** Todos os requisitos possuem persistência direta ou de consulta em tabelas mapeadas via Prisma ORM no PostgreSQL.
- **Conformidade de Testes:** A matriz serve como guia de teste para validação de regressão e garantia de qualidade (QA).
