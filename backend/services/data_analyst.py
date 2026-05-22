import json
from typing import Dict, Any, Optional

DATA_ANALYST_SYSTEM = """Você é um agente especialista em análise de dados operacionais, KPIs de contact center, qualidade, monitoria, cobrança, produtividade e apresentações executivas.

Sua função é receber o perfil completo de uma base de dados — incluindo amostra real de linhas, estatísticas e metadados — e gerar um RELATÓRIO DE ANÁLISE PROFUNDA em português, pronto para ser usado pelo Prompt Architect na criação de slides executivos LiveDeck.

O relatório deve ser prático, analítico e orientado a decisão. Não invente dados. Use apenas o que está presente na amostra e nas estatísticas fornecidas.

SEU RELATÓRIO DEVE CONTER:

1. RESUMO GERAL DA BASE
- O que essa base representa (contexto inferido a partir das colunas e dados)
- Período coberto (se detectado)
- Volume total de registros
- Principais dimensões disponíveis (quem, quando, onde, o quê)

2. MÉTRICAS E KPIs IDENTIFICADOS
- Liste todos os indicadores numéricos encontrados
- Para cada um: nome, tipo (volume/taxa/percentual), valor mínimo, máximo, média observada na amostra
- Indique se o indicador é "maior melhor" ou "menor melhor" quando possível

3. DIMENSÕES E CATEGORIAS
- Liste as colunas categóricas (texto)
- Para cada uma: valores únicos identificados na amostra, cardinalidade estimada
- Quais dimensões permitem segmentação interessante (por operador, por motivo, por período, por site, etc.)

4. PADRÕES E INSIGHTS DETECTADOS
- Concentrações relevantes (ex: "70% dos registros são do motivo X")
- Outliers ou valores extremos visíveis na amostra
- Tendências temporais se houver coluna de data
- Distribuições importantes

5. ALERTAS E PROBLEMAS DE QUALIDADE
- Colunas com muitos nulos
- Dados inconsistentes ou suspeitos
- Colunas com poucos valores únicos que podem ser flags

6. SLIDES SUGERIDOS (mínimo 3, máximo 8)
Para cada slide sugerido, informe:
- Título sugerido
- Tipo do slide (analysis, dashboard, comparison, ranking, insight, conclusion)
- Seção recomendada
- KPIs principais a usar
- Mensagem executiva esperada
- Componentes visuais recomendados (big numbers, gráfico de barras, cards consultivos, etc.)

7. CONTEXTO PARA O PROMPT ARCHITECT
- Qual seria o público mais provável desse material
- Quais perguntas o analista deveria fazer ao usuário antes de gerar o prompt
- Quais colunas são mais relevantes para análise
- O que provavelmente não deve aparecer nos slides (colunas de controle, IDs, etc.)

REGRAS:
- Seja direto e objetivo.
- Use listas e bullets.
- Não use markdown de código.
- Escreva em português.
- Baseie tudo nos dados reais fornecidos.
- Se a amostra for pequena, sinalize que os padrões são preliminares."""


async def run_data_analyst(profile: Dict[str, Any], db=None) -> str:
    """Run deep AI analysis on a dataset profile. Returns rich analysis text."""
    from services.llm_gateway import call_llm

    summary = _build_rich_summary(profile)

    messages = [
        {
            "role": "user",
            "content": f"Analise profundamente esta base de dados e gere o relatório completo:\n\n{summary}"
        }
    ]

    try:
        analysis = await call_llm(
            messages=messages,
            system_prompt=DATA_ANALYST_SYSTEM,
            db=db,
            temperature=0.1,
            max_tokens=4000,
        )
        return analysis
    except Exception as e:
        return f"[Análise automática não disponível: {str(e)}]"


def _build_rich_summary(profile: Dict[str, Any]) -> str:
    """Build a rich text summary of the dataset for the analyst agent."""
    lines = []

    lines.append(f"ARQUIVO: {profile.get('file_name', 'N/A')}")
    lines.append(f"ABA: {profile.get('suggested_sheet', 'N/A')}")
    lines.append(f"TOTAL DE LINHAS: {profile.get('row_count', 'N/A')}")
    lines.append(f"TOTAL DE COLUNAS: {profile.get('column_count', 'N/A')}")

    if profile.get("detected_period"):
        lines.append(f"PERÍODO DETECTADO: {profile['detected_period']}")

    lines.append(f"\nCOLUNAS DISPONÍVEIS ({len(profile.get('columns', []))}):")
    for col in profile.get("columns", []):
        col_type = "numérica"
        if col in profile.get("percentage_cols", []):
            col_type = "percentual/taxa"
        elif col in profile.get("text_cols", []):
            col_type = "texto/categoria"
        nulls = profile.get("null_counts", {}).get(col, 0)
        null_info = f" | {nulls} nulos" if nulls > 0 else ""
        lines.append(f"  - {col} [{col_type}]{null_info}")

    stats = profile.get("statistics", {})
    if stats:
        lines.append("\nESTATÍSTICAS DAS COLUNAS NUMÉRICAS:")
        for col, s in stats.items():
            lines.append(
                f"  - {col}: min={s.get('min')}, max={s.get('max')}, "
                f"média={s.get('mean')}, mediana={s.get('median')}"
            )

    cat_stats = profile.get("categorical_stats", {})
    if cat_stats:
        lines.append("\nDISTRIBUIÇÃO DAS COLUNAS CATEGÓRICAS (top valores):")
        for col, info in cat_stats.items():
            unique = info.get("unique_count", "?")
            top = info.get("top_values", [])
            top_str = ", ".join([f"{v['value']}({v['count']})" for v in top[:5]])
            lines.append(f"  - {col}: {unique} valores únicos | Top: {top_str}")

    preview = profile.get("preview", [])
    if preview:
        lines.append(f"\nAMOSTRA REAL DOS DADOS ({len(preview)} linhas):")
        lines.append(json.dumps(preview, ensure_ascii=False, indent=2))

    return "\n".join(lines)


def get_full_context_for_chat(profile: Dict[str, Any]) -> str:
    """Return the full context (stats + AI analysis) for the Prompt Architect."""
    lines = []

    lines.append("=== PERFIL DA BASE DE DADOS ===")
    lines.append(f"Arquivo: {profile.get('file_name', 'N/A')}")
    lines.append(f"Aba: {profile.get('suggested_sheet', 'N/A')}")
    lines.append(f"Linhas: {profile.get('row_count', 'N/A')} | Colunas: {profile.get('column_count', 'N/A')}")

    if profile.get("detected_period"):
        lines.append(f"Período: {profile['detected_period']}")

    cols = profile.get("columns", [])
    if cols:
        lines.append(f"\nColunas: {', '.join(cols)}")

    stats = profile.get("statistics", {})
    if stats:
        lines.append("\nEstatísticas numéricas:")
        for col, s in stats.items():
            lines.append(f"  {col}: min={s.get('min')}, max={s.get('max')}, média={s.get('mean')}")

    cat_stats = profile.get("categorical_stats", {})
    if cat_stats:
        lines.append("\nCategorias:")
        for col, info in cat_stats.items():
            top = info.get("top_values", [])
            top_str = ", ".join([f"{v['value']}({v['count']})" for v in top[:5]])
            lines.append(f"  {col} ({info.get('unique_count')} únicos): {top_str}")

    ai_analysis = profile.get("ai_analysis")
    if ai_analysis and not ai_analysis.startswith("[Análise automática não disponível"):
        lines.append("\n=== ANÁLISE PROFUNDA DA BASE (gerada por IA) ===")
        lines.append(ai_analysis)
    else:
        preview = profile.get("preview", [])
        if preview:
            lines.append(f"\nAmostra dos dados ({len(preview)} linhas):")
            lines.append(json.dumps(preview[:20], ensure_ascii=False))

    return "\n".join(lines)
