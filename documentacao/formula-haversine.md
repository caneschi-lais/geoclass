# 📐 Fórmula de Haversine no GeoClass

Este documento explica de forma simples, didática e técnica como funciona o cálculo de distância geodésica utilizado no **GeoClass** para validar a presença dos alunos nas salas de aula.

---

## 1. Por que precisamos da Fórmula de Haversine?

Quando calculamos distâncias em um plano (como em uma folha de papel ou no chão de uma sala), usamos o Teorema de Pitágoras:

$$\text{distância} = \sqrt{\Delta x^2 + \Delta y^2}$$

Porém, **a Terra não é plana, ela é uma esfera (ou mais precisamente, um esferoide)**. 
- As linhas de longitude vão se estreitando à medida que nos aproximamos dos polos.
- Um grau de longitude no Equador equivale a cerca de 111 km, enquanto próximo aos polos esse mesmo grau se reduz a quase zero.

Se usássemos Pitágoras simples para coordenadas de GPS (Latitude e Longitude), o cálculo de distância teria distorções significativas. A **Fórmula de Haversine** resolve isso calculando com alta precisão a **distância do grande círculo** (a menor distância sobre a superfície esférica da Terra) entre dois pontos geográficos.

---

## 2. A Fórmula Matemática

A fórmula relaciona as coordenadas de dois pontos:
- **Ponto 1 (Aluno):** $(\varphi_1, \lambda_1)$ onde $\varphi$ é latitude e $\lambda$ é longitude.
- **Ponto 2 (Sala de Aula):** $(\varphi_2, \lambda_2)$

### Passo a passo matemático:

1. **Diferença de coordenadas:**
   $$\Delta\varphi = \varphi_2 - \varphi_1 \quad (\text{diferença de latitude em radianos})$$
   $$\Delta\lambda = \lambda_2 - \lambda_1 \quad (\text{diferença de longitude em radianos})$$

2. **Cálculo da metade da corda ($a$):**
   $$a = \sin^2\left(\frac{\Delta\varphi}{2}\right) + \cos(\varphi_1) \cdot \cos(\varphi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$

3. **Cálculo da distância angular em radianos ($c$):**
   $$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$

4. **Distância final em metros ($d$):**
   $$d = R \cdot c$$
   *(onde $R = 6.371.000\text{ m}$ é o raio médio da Terra)*

---

## 3. Entendendo de Forma Simples (Passo a Passo)

Imagine a Terra como uma bola de futebol e que queremos esticar uma fita métrica sobre a superfície da bola entre o aluno e a sala de aula:

1. **Transformar Graus em Radianos (`deg2rad`):**
   O sensor GPS do smartphone nos dá posições em graus decimais (ex: `-23.0856664`). Os computadores realizam cálculos trigonométricos (seno, cosseno) usando **radianos**. Então, multiplicamos os graus por $\frac{\pi}{180}$.

2. **Calcular a diferença de posição:**
   Subtraímos a latitude e a longitude do aluno das coordenadas da sala.

3. **Compensar a curvatura da Terra (valor $a$):**
   O termo $\cos(\text{lat}_1) \cdot \cos(\text{lat}_2)$ ajusta a distância para compensar o afunilamento das longitudes conforme a proximidade dos polos.

4. **Converter a curvatura em ângulo (valor $c$):**
   A função `Math.atan2` calcula o ângulo central formado entre os dois pontos em relação ao centro da Terra. Utilizar $\operatorname{atan2}(\sqrt{a}, \sqrt{1-a})$ garante que o cálculo não sofra com erros de arredondamento em distâncias curtas (como 20 ou 50 metros).

5. **Multiplicar pelo Raio da Terra:**
   Multiplicamos o ângulo $c$ por $6.371.000$ metros (o raio da Terra), obtendo a distância exata em **metros**.

---

## 4. O Código no GeoClass

O GeoClass implementa a fórmula puramente em TypeScript nativo, **sem depender de nenhuma biblioteca de terceiros**.

### Arquivos no Projeto:
- **Backend (API):** [`geoclass-api/src/controllers/AttendanceController.ts`](file:///home/lais/projetos/geoclass/geoclass-api/src/controllers/AttendanceController.ts#L21-L34)
- **Mobile (App):** [`geoclass-mobile/src/hooks/useStudentHome.ts`](file:///home/lais/projetos/geoclass/geoclass-mobile/src/hooks/useStudentHome.ts#L13-L28)

### Implementação:

```typescript
// 1. Função de conversão de graus para radianos
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// 2. Função de Haversine para obter a distância em metros
function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Raio médio da Terra em metros (6.371 km)
  
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const d = R * c; // Distância final em metros
  return d;
}
```

---

## 5. Como o GeoClass Usa Essa Função na Prática?

Quando o aluno pressiona **"Registrar Presença"** no aplicativo:

1. O celular obtém a localização via GPS:
   - Exemplo: `Aluno = (-23.085670, -47.202350)`
2. O sistema busca as coordenadas cadastradas da sala de aula:
   - Exemplo: `Sala 14 = (-23.0856664, -47.2023632)`
   - Raio permitido da matéria: `radius_meters = 80` metros
3. A função `getDistanceFromLatLonInMeters` é executada:
   ```typescript
   const distance = getDistanceFromLatLonInMeters(
     alunoLat,
     alunoLon,
     salaLat,
     salaLon
   ); // Resultado: 1.42 metros
   ```
4. O sistema avalia:
   - Se `distance <= classData.radius_meters`: **Presença confirmada!** ✅
   - Se `distance > classData.radius_meters`: **Presença recusada (Fora da área permitida)** ❌

> **Compensação de Imprecisão do GPS:**  
> O aplicativo também lê a acurácia do sensor (`accuracy`). Caso o sinal de GPS esteja oscilando, a margem de erro do hardware é considerada para evitar que alunos dentro da sala sejam prejudicados.

---

## 6. Vantagens de Implementar a Fórmula sem Bibliotecas

| Vantagem | Benefício no GeoClass |
| :--- | :--- |
| **Zero Dependências** | Não infla o tamanho do APK do app nem adiciona pacotes externos na API Node.js. |
| **Alta Performance** | O cálculo executa em frações de microssegundo diretamente pelo motor V8 do JavaScript/Node.js. |
| **Paridade 100% Exata** | Tanto o aplicativo mobile (em modo offline) quanto a API (em modo online) utilizam rigorosamente o mesmo algoritmo, evitando divergências de validação. |
| **Segurança e Confiabilidade** | O código é transparente, auditável e imune a vulnerabilidades de dependências desatualizadas. |

