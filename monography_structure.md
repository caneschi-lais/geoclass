# Estrutura para a Monografia (TCC) - GeoClass

A sua parte escrita precisa contar a história do problema que você está resolvendo e como a sua arquitetura foi inteligente para resolvê-lo. Abaixo, estruturei o sumário ideal de TCC de Engenharia de Software / Ciência da Computação, focado exatamente no que desenvolvemos.

---

## Capítulo 1: Introdução
- **Contextualização:** Fale sobre o processo arcaico da chamada em sala de aula (lista de papel ou ditar nomes). Gasta-se em média 10 a 15 minutos de uma aula apenas fazendo chamada.
- **Justificativa:** A alta penetração de smartphones entre alunos permite utilizar sensores de geolocalização como forma de validação física automatizada.
- **Objetivos Gerais:** Desenvolver a plataforma GeoClass para automatizar a frequência utilizando Geofencing.
- **Objetivos Específicos:** Eliminar o tempo de chamada, mitigar fraudes de frequência ("responder pelo amigo"), e fornecer inteligência de dados aos coordenadores.

## Capítulo 2: Fundamentação Teórica (O que você estudou para criar o app)
- **Geofencing e Sistemas de Posicionamento:** Explique o que é uma cerca virtual e como coordenadas GPS funcionam.
- **Matemática Computacional (A Fórmula de Haversine):** Explique como o seu backend calcula a distância exata em metros entre dois pontos esféricos (a Terra não é plana, então você usa a trigonometria esférica do Haversine para saber se o aluno está dentro dos "30 metros permitidos" da sala de aula).
- **Engenharia Mobile Multiplataforma:** Por que você escolheu React Native / Expo (produtividade, um código gerando Android, iOS e Web).
- **Legislação e Privacidade (LGPD):** Falar sobre a Lei Geral de Proteção de Dados e o cuidado com informações de geolocalização.

## Capítulo 3: Metodologia e Arquitetura do Sistema
*Aqui você cola o diagrama de Arquitetura que fizemos (`architecture_diagram.md`).*
- **Stack Tecnológica:** Fale sobre Node.js (alta concorrência para receber 50 alunos marcando presença ao mesmo tempo), Prisma (ORM seguro) e PostgreSQL.
- **Perfis e Atores (RBAC):** Defina claramente os perfis (Aluno, Professor, Coordenador) e suas permissões.
- **Casos de Uso e Diagramas de Sequência:** *Aqui você cola os três diagramas do arquivo (`user_journeys.md`).*

## Capítulo 4: Desenvolvimento e Soluções Técnicas (A Cereja do Bolo!)
*Esse é o capítulo onde a banca vai se impressionar. Dê ênfase a estas três implementações avançadas do projeto:*

1. **Arquitetura Antifraude (Device Binding):**
   - Explique que o GPS sozinho não impede fraudes (um aluno poderia levar 3 celulares na mochila). Destaque a sua implementação que coleta a assinatura do hardware (`Device ID`) e o cruzamento que o Backend faz para impedir que dois RAs diferentes batam ponto na mesma aula com o mesmo aparelho.

2. **Flexibilidade e Salas Temporárias:**
   - Softwares comuns são engessados. Explique como você projetou um sistema relacional onde uma matéria tem uma sala oficial, mas o professor tem autonomia para criar um *Override* (Sobreposição) temporal. Se ele mudar a aula para o laboratório naquele dia, o cálculo de Geofencing dos 50 celulares dos alunos aponta instantaneamente para o laboratório sem mexer no banco de dados fixo.

3. **Inteligência Institucional e Geração de Relatórios Nativos:**
   - Fale sobre a visão do Coordenador. Destaque como você contornou as limitações do processamento móvel desenhando relatórios gerenciais visualmente ricos usando gráficos baseados exclusivamente em `Pure CSS`, formatando os dados via HTML e os exportando para PDF nativo ou compartilhamento direto (Excel/PDF).

4. **Privacy by Design (O Expurgo da LGPD):**
   - Apresente o seu CronJob diário (`LgpdWiperJob`). Explique a inteligência dele: a instituição não precisa guardar onde o aluno estava há 6 meses. O sistema automaticamente varre o banco de dados durante a madrugada e realiza um *Hard Delete* nas colunas de `latitude` e `longitude` brutas antigas, mas preserva a flag "Presente/Ausente" para não quebrar o histórico escolar. Isso mostra maturidade absurda como desenvolvedor.

## Capítulo 5: Resultados e Considerações Finais
- **Apresentação da Interface:** Coloque *prints* bonitos do seu aplicativo (Dashboard, Listagem de Salas, Pílulas de Faltas Coloridas, O formulário Acordeão, Os PDFs exportados).
- **Conclusão:** Finalize afirmando que o GeoClass cumpriu o papel de devolver os 15 minutos perdidos da aula ao professor, com segurança.
- **Trabalhos Futuros:** Dê ideias para quem for continuar o sistema (Ex: Integrar com a catraca da faculdade, avisar os pais por notificação push quando o aluno entrar no campus, etc).
