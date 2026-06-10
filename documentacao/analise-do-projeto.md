# Análise Arquitetural e Funcional do Projeto GeoClass

## Visão Geral
O **GeoClass** é um sistema inteligente de controle de frequência escolar baseado em geolocalização. Ele substitui a chamada tradicional garantindo, de forma automatizada e antifraude, que o aluno está fisicamente presente na sala de aula no momento do registro.

A arquitetura do projeto é dividida em dois componentes principais:
1. **GeoClass API**: Backend em Node.js responsável por toda a regra de negócio, cálculo de distâncias, validação de usuários e proteção de dados.
2. **GeoClass Mobile**: Aplicativo React Native (Expo) utilizado pelos alunos e professores para interagir com o sistema.

---

## 1. Backend (geoclass-api)

### Stack Tecnológica
- **Linguagem:** TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Banco de Dados:** PostgreSQL
- **Agendamento de Tarefas:** node-cron

### Modelagem de Dados (Prisma Schema)
O banco relacional está estruturado com quatro entidades principais:
- **User**: Representa os usuários do sistema. Diferenciados pelo Enum `Role` (ALUNO, PROFESSOR, COORDENADOR).
- **Class**: Representa uma aula/turma. Contém informações vitais como a localização exata da sala (`latitude` e `longitude`) e a margem de erro permitida em metros (`radius_meters`).
- **Enrollment**: Tabela de relacionamento (N:N) que matricula alunos em turmas.
- **Attendance**: O registro do ponto/presença. Guarda a data, hora do check-in, dispositivo utilizado (`device_id`) e as coordenadas do aluno no momento da batida.

### Core Business: Como a Presença Funciona
O coração do sistema reside no `AttendanceController.ts`. O fluxo de registro de presença segue regras estritas de segurança e antifraude:
1. **Validação de Matrícula:** Verifica se o aluno tem permissão para bater ponto na aula solicitada.
2. **Cálculo de Distância (Haversine Formula):** O servidor calcula a distância real (em metros) entre as coordenadas do aluno e as coordenadas configuradas para a sala de aula. Se a distância for maior que o `radius_meters`, o registro é negado.
3. **Bloqueio de Fraude por Dispositivo:** O sistema verifica se o mesmo aparelho físico (identificado pelo `device_id`) tentou ser usado por outro aluno no mesmo dia. Isso impede a famosa fraude de "levar o celular do colega para bater o ponto por ele".

### Conformidade com a LGPD (Proteção de Dados)
Como o sistema coleta dados sensíveis (localização exata do aluno), ele implementa uma política de retenção rigorosa:
- **LgpdWiperJob:** Uma rotina CRON agendada para rodar diariamente às 03:00 da manhã.
- **Anonimização:** O script varre o banco de dados e limpa os campos `student_latitude`, `student_longitude` e `device_id` de registros de presença que possuem mais de 6 meses de idade. A presença (status) continua válida para o histórico acadêmico, mas os dados rastreáveis são destruídos permanentemente.

---

## 2. Frontend Mobile (geoclass-mobile)

### Stack Tecnológica
- **Framework:** React Native usando Expo
- **Estilização:** TailwindCSS adaptado via NativeWind (`global.css`, `tailwind.config.js`)
- **Roteamento:** React Navigation (Native Stack e Bottom Tabs)
- **Integração:** Axios para consumo da API

### Fluxo do Aplicativo (Aluno)
1. **Autenticação:** O usuário faz login e o Token JWT é armazenado via `expo-secure-store`.
2. **Dashboard (Aulas de Hoje):** A tela `HomeScreen` busca na API as aulas disponíveis para o dia.
3. **Coleta de Permissões e Identificadores:**
   - O App solicita permissão de localização em Primeiro Plano (`Location.requestForegroundPermissionsAsync`), com uma mensagem transparente explicando o porquê da coleta.
   - Através da biblioteca `expo-application`, ele extrai a impressão digital única do hardware (ID do Android ou Identifier For Vendor no iOS) e envia no payload.
4. **Captura GPS de Alta Precisão:** Ao clicar em confirmar presença, o Expo obtém a localização exata do sensor do celular (`Location.Accuracy.High`) e faz o POST para a API validar a distância.

---

## Conclusão da Análise

O GeoClass apresenta uma arquitetura robusta e moderna. O código está bem estruturado com responsabilidades separadas (Controllers, Middlewares, Jobs, Rotas no Backend; Screens, Components, Services no Frontend).

**Pontos Fortes do Projeto:**
1. **Segurança Avançada:** A validação é feita *Server-Side*. O celular apenas envia as coordenadas; o servidor que usa cálculos trigonométricos para confirmar a distância.
2. **Proteção Antifraude:** O uso do Device ID para proibir múltiplas pessoas de baterem ponto pelo mesmo celular é uma excelente prática.
3. **LGPD by Design:** O expurgo automatizado de dados locacionais mostra maturidade em governança e privacidade.
4. **Modernidade:** Uso de Tailwind no React Native facilita muito o desenvolvimento de UI iterativa e responsiva.
