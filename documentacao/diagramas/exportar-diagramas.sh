#!/usr/bin/env bash
# =====================================================================
#  Exporta todos os diagramas Mermaid do projeto para PNG.
#  Uso:  bash documentacao/diagramas/exportar-diagramas.sh
#  Requer: npx @mermaid-js/mermaid-cli (sem instalacao permanent)
# =====================================================================
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$DIR/png"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

# o Chromium do puppeteer exige --no-sandbox neste ambiente
cat > "$TMP/pptr.json" <<'JSON'
{"args":["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"]}
JSON

mmdc () {
  npx -y @mermaid-js/mermaid-cli@11 -p "$TMP/pptr.json" -i "$1" -o "$2" -w "$3" -b white >/dev/null 2>&1
}

echo ">> extraindo blocos mermaid"
python3 - "$DIR" "$TMP" <<'PY'
import re, sys, pathlib
d, tmp = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
for nome in ("fluxos.md", "arquitetura.md", "casos_de_uso.md", "mer.md"):
    s = (d / nome).read_text(encoding="utf-8")
    for i, b in enumerate(re.findall(r"```mermaid\n(.*?)```", s, re.S)):
        (tmp / f"{nome[:-3]}_{i}.mmd").write_text(b, encoding="utf-8")
PY

# --- arquitetura e casos de uso e MER (bloco unico) ---
mmdc "$TMP/arquitetura_0.mmd" "$OUT/Figura 03 - Arquitetura do sistema.png" 2000
mmdc "$TMP/casos_de_uso_0.mmd" "$OUT/Figura 04 - Diagrama de casos de uso.png" 1400
mmdc "$TMP/mer_0.mmd"          "$OUT/Figura 05 - Modelo Entidade-Relacionamento (MER).png" 2000
mmdc "$TMP/arquitetura_1.mmd"   "$OUT/Figura 03b - Arquitetura por camadas (slide de padroes).png" 1600

# --- fluxos: 24 diagramas de sequencia ---
declare -a NOMES=(
 "Figura 06 - Autenticacao, LGPD e consulta de aulas"
 "Figura 07 - Validacao de presenca com geofencing e antifraude"
 "Figura 08 - Fila offline e sincronizacao criptografica"
 "Figura 09 - Detalhes de assiduidade, historico e notificacoes"
 "Figura 10 - Acompanhamento de turmas e chamada em tempo real"
 "Figura 11 - Troca temporaria de sala e notificacao em tempo real"
 "Figura 12 - Chamada manual"
 "Figura 13 - Reset de vinculo de dispositivo"
 "Figura 14 - Solicitacao de falta e anexo de atestado medico"
 "Figura 15 - Agendamento de aula de reposicao e notificacao automatica"
 "Figura 16 - Chamada de aula de reposicao e conversao de presenca parcial"
 "Figura 17 - Cadastro de infraestrutura e vinculacao de turmas"
 "Figura 18 - Monitoramento de evasao e risco"
 "Figura 19 - Fluxo de matricula de discente em disciplina"
 "Figura 20 - Gestao do status da conta e conclusao da disciplina"
 "Figura 21 - Agregacao de dados e exportacao de relatorios (PDF e XLSX)"
 "Figura 22 - Execucao transacional da virada de semestre"
 "Figura 23 - Analise de solicitacoes de falta e cobranca de atestado"
 "Figura 24 - Processamento em lote de suspensao direta de aulas"
 "Figura 25 - Mecanismo anti-hibernacao"
 "Figura 26 - Rotina diaria de pseudoanonimizacao de dados"
 "Figura 27 - Rotina agendada de notificacoes (lembrete e fechamento)"
 "Figura 28 - Disparo automatico de alerta para limite critico de faltas"
 "Figura 29 - Rotina autonoma de encerramento de listas e autorremediacao"
)
# ordem do documento x ordem do fluxos.md (ver README dos diagramas)
ORDEM=(0 1 2 3 4 5 6 7 8 9 10 12 11 13 19 14 18 21 20 17 15 16 22 23)

for i in "${!NOMES[@]}"; do
  b="${ORDEM[$i]}"
  mmdc "$TMP/fluxos_${b}.mmd" "$OUT/${NOMES[$i]}.png" 2000
done

echo ">> PNGs gerados em: $OUT"
ls -1 "$OUT" | wc -l
