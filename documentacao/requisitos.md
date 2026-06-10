# Requisitos do Sistema - GeoClass

Em qualquer monografia de Engenharia de Software, o capítulo de **Engenharia de Requisitos** é obrigatório. É nele que você define as "leis" do que o sistema precisa fazer (Requisitos Funcionais) e como ele deve se comportar (Requisitos Não Funcionais).

Copie as tabelas abaixo para o seu trabalho:

---

## 1. Requisitos Funcionais (RF)
*São as funcionalidades claras que o sistema entrega para o usuário.*

| Código | Nome do Requisito | Descrição | Ator |
| :--- | :--- | :--- | :--- |
| **RF01** | Autenticação de Usuários | O sistema deve permitir o login seguro separando as permissões (Aluno, Professor, Coordenador). | Todos |
| **RF02** | Consulta de Turmas do Dia | O aplicativo deve exibir para o aluno apenas as aulas disponíveis para a data atual. | Aluno |
| **RF03** | Validação de Ponto por GPS | O sistema deve capturar a geolocalização do dispositivo móvel e calcular a distância até o centroide da sala de aula. | Aluno |
| **RF04** | Bloqueio Antifraude (Device Binding) | O sistema deve capturar a assinatura de hardware do celular (Device ID) e impedir que outro RA registre presença no mesmo aparelho no mesmo dia. | Sistema |
| **RF05** | Realocação Temporária de Sala | O sistema deve permitir que o professor altere o local físico da aula do dia, propagando as novas coordenadas para validação do ponto dos alunos. | Professor |
| **RF06** | Chamada Manual | O sistema deve permitir que o professor lance a presença de forma manual para alunos com problemas técnicos no smartphone. | Professor |
| **RF07** | Dashboard de Gestão Acadêmica | O sistema deve exibir uma interface administrativa listando semestres ativos e a porcentagem global de evasão. | Coordenador |
| **RF08** | Exportação de Relatórios Gerenciais | O sistema deve permitir a exportação de dados analíticos em formatos `.XLSX` (Excel) e `.PDF` (com geração de gráficos integrados). | Coordenador |
| **RF09** | Cadastro de Infraestrutura | O sistema deve permitir o cadastro de novas salas, laboratórios e auditórios, incluindo suas coordenadas (Latitude/Longitude). | Coordenador |

---

## 2. Requisitos Não Funcionais (RNF)
*São os atributos de qualidade, segurança e infraestrutura do sistema.*

| Código | Nome do Requisito | Descrição | Categoria |
| :--- | :--- | :--- | :--- |
| **RNF01** | Precisão Espacial | O cálculo de Geofencing deve utilizar a Fórmula de Haversine para garantir a curvatura da terra em distâncias curtas (precisão em metros). | Algoritmo |
| **RNF02** | Multi-plataforma | O aplicativo móvel deve rodar com base de código única tanto no sistema operacional Android quanto iOS (React Native / Expo). | Portabilidade |
| **RNF03** | Tolerância a Fallback (Web) | Caso rodando em navegadores Web sem GPS nativo, o sistema deve aplicar um mock para permitir a utilização contínua da interface administrativa. | Resiliência |
| **RNF04** | Banco de Dados Relacional | Os dados devem ser persistidos mantendo Integridade Referencial (ACID) em um banco PostgreSQL, abstraído pela engine do Prisma ORM. | Persistência |
| **RNF05** | Retenção e Conformidade LGPD | O sistema deve executar uma rotina automatizada (`cron-job`) diária para expurgar de forma permanente as coordenadas e Device IDs de registros com mais de 6 meses, mitigando riscos de vazamento de dados sensíveis de rastreamento. | Segurança/Jurídico |
| **RNF06** | Renderização Offline de Relatórios | A geração de relatórios executivos deve processar o HTML e os gráficos CSS localmente na engine do dispositivo móvel para reduzir a carga de processamento na API em nuvem. | Performance |
