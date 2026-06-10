# Documento de Arquitetura e Especificação do GeoClass

Este documento apresenta uma análise profunda, técnica e estrutural do projeto **GeoClass**, servindo como base sólida para a criação de monografias, TCCs, manuais de usuário ou documentações de engenharia de software.

---

## 1. Visão Geral do Sistema

O **GeoClass** é uma plataforma acadêmica inovadora de controle de frequência projetada para modernizar a chamada escolar. Utilizando tecnologias de **Geofencing** (cercas virtuais por GPS), o sistema garante de forma automatizada e antifraude que o aluno está fisicamente presente na sala de aula. 

A arquitetura é dividida em dois blocos principais:
- **Backend Central (geoclass-api)**: API RESTful construída em Node.js com TypeScript, responsável pelo processamento pesado, cálculos matemáticos espaciais (Fórmula de Haversine), validações de segurança e persistência no banco de dados relacional (PostgreSQL).
- **Aplicativo Multi-plataforma (geoclass-mobile)**: Cliente desenvolvido em React Native e Expo, projetado para operar tanto em dispositivos móveis nativos (Android/iOS) quanto em navegadores Web (com fallbacks e simulações para facilitar testes e uso administrativo).

---

## 2. Jornadas e Perfis de Usuário

O sistema implementa um Controle de Acesso Baseado em Papéis (RBAC) com três atores fundamentais:

### 2.1. Aluno (Student)
O foco principal do uso diário do aplicativo móvel.
- **Registro de Presença Georreferenciado**: O aplicativo identifica a aula atual, solicita o GPS de alta precisão do dispositivo, coleta o identificador único do hardware e envia as informações criptografadas ao servidor.
- **Histórico e Desempenho**: Visualização do histórico temporal de batidas de ponto e um painel analítico com a taxa de frequência por matéria.
- **Adaptação Dinâmica**: Se a aula for movida de sala pelo professor, o aluno não precisa fazer nada. O aplicativo automaticamente sincroniza com as novas coordenadas da sala temporária.

### 2.2. Professor (Professor)
Ator focado na flexibilidade e no controle da sala de aula.
- **Gestão de Turma e Chamada Manual**: Capacidade de visualizar alunos presentes/ausentes em tempo real e registrar presenças manualmente (bypass do sistema) caso um aluno esteja sem bateria, sem celular ou com problemas de GPS.
- **Realocação Ágil (Salas Temporárias)**: O professor pode dinamicamente transferir a aula do dia para outra sala do campus. Ao fazer isso, as coordenadas de geofencing daquela aula são substituídas *on-the-fly* para o dia corrente, redirecionando o cálculo de presença de todos os alunos instantaneamente para o novo local.

### 2.3. Coordenador Acadêmico (Coordinator)
Ator administrativo focado em inteligência de dados institucionais.
- **Cadastro de Infraestrutura**: Interface para registrar novas salas e auditórios, alimentando o banco de coordenadas da instituição.
- **Análise de Frequência em Cascata**: Dashboards que permitem analisar desde uma visão macro (Evasão por Semestre), descendo para a lista de alunos críticos (Top Faltas), até o detalhamento individual de cada matéria do aluno.
- **Geração de Relatórios Executivos**: Exportação do histórico e inteligência em dois formatos:
  - **Planilhas XLSX**: Para análises cruas em Excel.
  - **Relatórios PDF Premium**: Templates HTML estilizados contendo gráficos de barras *Pure CSS* autogerados, crachás de risco de evasão (cores dinâmicas) e identificação institucional, formatados especialmente para leitura em reuniões de diretoria.

---

## 3. Core Business e Mecanismos Antifraude

O GeoClass possui regras estritas validadas *Server-Side* para garantir a integridade da lista de presença:

1. **Validação Espacial (Haversine Formula)**
   - O servidor intercepta as coordenadas de latitude/longitude enviadas pelo aluno e calcula a distância exata em linha reta (curvatura terrestre) até o centroide da sala de aula (ou sala temporária). Se a distância for superior ao raio da sala (ex: 30 metros), o ponto é rejeitado com o erro `"Você está fora da área permitida"`.

2. **Prevenção de Falsidade Ideológica (Device Binding)**
   - Ao bater o ponto, o sistema captura a impressão digital do hardware (`AndroidId` ou `IosIdForVendor`). O backend cruza essa informação na tabela de frequências diárias e bloqueia qualquer tentativa de usar o mesmo aparelho para registrar a presença de um aluno diferente na mesma turma. Isso anula a fraude do *"leva o meu celular e bate o ponto pra mim"*.

3. **Fallback Web para Testes**
   - Sabendo das limitações de APIs nativas no navegador (onde o GPS é impreciso ou bloqueado por falta de HTTPS local), o sistema conta com um algoritmo inteligente de fallback: quando detecta que o cliente é um `web_browser`, ele cria um mock dinâmico ancorando a presença virtual exatamente no centro da sala de aula solicitada, permitindo a validação e demonstração da interface sem falhas.

---

## 4. Conformidade com a LGPD (Proteção de Dados)

Sendo o GeoClass um processador de dados altamente sensíveis (rastreamento geolocalizado do estudante), a arquitetura incorpora **Privacidade desde a Concepção** (*Privacy by Design*):

- **Rotina de Expurgo (LgpdWiperJob)**: Um serviço agendado via `node-cron` varre o banco de dados todas as madrugadas. 
- **Desvinculação Permanente**: Registros de presença mais antigos que 6 meses mantêm o seu status oficial (`PRESENTE`/`FALTA`) para garantir a integridade do boletim acadêmico, mas os campos de rastreamento (`student_latitude`, `student_longitude`, `device_id`) recebem um *hard null* irrevogável no banco de dados (PostgreSQL), desvinculando completamente as pegadas de localização do passado do usuário.

---

## 5. Estrutura do Banco de Dados (Prisma ORM)

A modelagem de dados relacional que sustenta o sistema:

- **`User`**: Armazena as credenciais, o RA e o papel de acesso (`Role`).
- **`Room`**: Cadastro centralizado de infraestruturas (nome, latitude, longitude).
- **`Class`**: O espelho da grade curricular. Relaciona uma matéria a um professor, a um semestre (`2026.1`), a uma sala padrão e define a margem de erro (`radius_meters`).
- **`Enrollment`**: Tabela pivot associando `User` (Aluno) às matérias (`Class`).
- **`Attendance`**: Tabela imutável diária onde são registrados os check-ins e a telemetria pontual de auditoria.
- **`TemporaryClassLocation`**: Um sistema de *override* temporal que sobrescreve a sala de uma `Class` apenas em uma `date` específica, acionado pelo painel do Professor.

---

## 6. Considerações Arquiteturais de Interface

A camada de visualização em React Native adota a filosofia de componentes funcionais puros aliada ao **TailwindCSS** (NativeWind) para consistência visual. 
O aplicativo conta com modais customizados, *Loaders* obstrutivos de atividade que impedem múltiplos cliques acidentais na API, tratamento refinado de exceções HTTP interceptando erros semânticos (status 400), e abstração de módulos nativos para a geração sofisticada de relatórios offline via `expo-print` e exportações em memória Base64 para o `expo-file-system`.
