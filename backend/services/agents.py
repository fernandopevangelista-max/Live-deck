"""
Agentes especializados do LiveDeck Studio.

Cada agente tem um papel específico no pipeline de criação de slides:
- DataSondaAgent: sonda e extrai tudo da base de dados
- AnalystAgent: analisa, resume e estrutura a narrativa
- DesignAgent: define estrutura visual, componentes e layout
- QAAgent: valida o HTML gerado antes de entregar ao usuário
"""

from typing import Dict, Any, Optional
from services.llm_gateway import call_llm


# ─────────────────────────────────────────────
# AGENTE 1: DATA SONDA — Captura e sonda a base
# ─────────────────────────────────────────────

DATA_SONDA_SYSTEM = """Você é o Data Sonda — agente especialista em capturar, explorar e extrair tudo que é relevante de uma base de dados para geração de slides executivos LiveDeck.

Sua função é receber os dados brutos (perfil, amostra, estatísticas) e responder com precisão:

1. O QUE ESTA BASE REPRESENTA
   - Qual operação, processo ou negócio está sendo monitorado
   - Qual contexto mais provável (contact center, cobrança, qualidade, monitoria, vendas, etc.)
   - Granularidade dos dados (por chamada, por operador, por dia, por mês, etc.)

2. INVENTÁRIO COMPLETO DE INDICADORES
   - Cada coluna numérica/percentual com: o que mede, unidade, escala esperada, "maior melhor" ou "menor melhor"
   - Identifique KPIs primários (os mais importantes) e KPIs de apoio

3. INVENTÁRIO DE DIMENSÕES
   - Cada coluna categórica com: o que representa, valores encontrados, potencial de segmentação
   - Quais dimensões permitem comparações interessantes

4. PERGUNTAS QUE PRECISAM SER FEITAS AO USUÁRIO
   - Liste de 3 a 6 perguntas essenciais para entender o objetivo do slide antes de gerar o prompt
   - Ordene da mais importante para a menos importante

5. ALERTAS DE QUALIDADE
   - Colunas problemáticas, nulos excessivos, dados suspeitos

Seja direto, analítico e específico. Use listas. Não invente dados. Baseie tudo no que foi fornecido."""


async def run_data_sonda(profile: Dict[str, Any], db=None) -> str:
    """Agent that deeply probes the dataset structure and content."""
    from services.data_analyst import _build_rich_summary
    summary = _build_rich_summary(profile)

    messages = [{"role": "user", "content": f"Sonde esta base de dados:\n\n{summary}"}]

    return await call_llm(
        messages=messages,
        system_prompt=DATA_SONDA_SYSTEM,
        db=db,
        temperature=0.1,
        max_tokens=3000,
    )


# ──────────────────────────────────────────────────────
# AGENTE 2: ANALYST — Analisa, resume e cria a narrativa
# ──────────────────────────────────────────────────────

ANALYST_SYSTEM = """Você é o Analyst — agente especialista em transformar dados brutos em narrativas executivas para slides LiveDeck.

Você recebe o resultado do Data Sonda + os objetivos do usuário e produz:

1. NARRATIVA EXECUTIVA DO SLIDE
   - Qual é a mensagem central (1 frase)
   - Qual é a evidência principal (número, ranking, comparação)
   - Qual é o insight de ação (o que o gestor deve fazer)

2. SELEÇÃO DE KPIs PARA O SLIDE
   - KPI principal (big number ou métrica central)
   - KPIs de apoio (até 3)
   - Filtros ou recortes recomendados

3. ESTRUTURA ANALÍTICA
   - Tipo de análise: diagnóstico, comparação, ranking, tendência, impacto, reincidência
   - Ponto de atenção principal
   - Oportunidade identificada

4. DADOS CHAVE PARA O SLIDE
   - Cálculos ou agregações que o slide deve mostrar
   - Período de referência
   - Grupos ou categorias em destaque

5. STORYTELLING
   - Título sugerido para o slide (impactante, curto)
   - Subtítulo executivo (mensagem em uma linha)
   - Conclusão ou chamada para ação

Seja preciso, objetivo e orientado a decisão. Não use dados que não existam na base."""


async def run_analyst(sonda_report: str, user_intent: str, db=None) -> str:
    """Agent that transforms data insights into executive narratives."""
    content = f"""Objetivo do usuário para o slide:
{user_intent}

Relatório do Data Sonda:
{sonda_report}

Gere a narrativa analítica completa para o slide."""

    messages = [{"role": "user", "content": content}]

    return await call_llm(
        messages=messages,
        system_prompt=ANALYST_SYSTEM,
        db=db,
        temperature=0.2,
        max_tokens=2000,
    )


# ──────────────────────────────────────────────────────
# AGENTE 3: DESIGN — Define estrutura visual e layout
# ──────────────────────────────────────────────────────

DESIGN_SYSTEM = """Você é o Design Architect — agente especialista em definir a estrutura visual ideal para slides executivos LiveDeck.

Você recebe a narrativa analítica e decide como o slide deve ser construído visualmente.

Sua resposta define:

1. TIPO DE SLIDE
   - cover, agenda, context, analysis, dashboard, comparison, simulation, insight, conclusion

2. ESTRUTURA DO LAYOUT (16:9, sem scroll)
   - Header: título, subtítulo, badges
   - Área principal: divisão em colunas/grid
   - Rodapé: informações técnicas

3. COMPONENTES VISUAIS (escolha apenas os necessários)
   - Big numbers: quais KPIs viram big number
   - Gráfico: tipo (barras verticais, barras horizontais, linha, pizza simples), dados, cores
   - Cards consultivos: quantos, modelo Driver→Evidência→Ação
   - Tabela executiva: colunas, máximo de linhas
   - Ranking visual: quantos itens, ordenação
   - Destaque ou alerta: cor e posição

4. PALETA E CORES PARA ESTE SLIDE
   - Cor principal (sempre #1E88E5 para série principal)
   - Cor secundária se necessário (#00BCD4)
   - Cor de alerta se houver risco (#FF4D8D) ou pico (#FFC107) ou ganho (#2ECC71)
   - Fundo: branco (#FFFFFF)

5. TIPOGRAFIA
   - Fonte: Bahnschrift (fallback: Segoe UI, Arial)
   - Tamanhos sugeridos para título, subtítulo, big numbers, labels

6. CHECKLIST ANTI-CARNAVAL
   - Confirme: máximo 2 cores por gráfico, sem scroll, sem tabelas enormes, sem poluição visual

7. INSTRUÇÃO FINAL PARA O SLIDE BUILDER
   - Um parágrafo claro dizendo exatamente o que o Slide Builder deve criar

Seja preciso e visual na sua resposta. Defina cada detalhe que evita ambiguidade."""


async def run_design(analyst_report: str, db=None) -> str:
    """Agent that defines the visual structure and layout for the slide."""
    messages = [
        {
            "role": "user",
            "content": f"Defina a estrutura visual para este slide:\n\n{analyst_report}"
        }
    ]

    return await call_llm(
        messages=messages,
        system_prompt=DESIGN_SYSTEM,
        db=db,
        temperature=0.2,
        max_tokens=2000,
    )


# ──────────────────────────────────────────────────────────
# AGENTE 4: QA — Valida o HTML antes de entregar ao usuário
# ──────────────────────────────────────────────────────────

QA_SYSTEM = """Você é o Visual QA — agente especialista em validar slides HTML LiveDeck antes de serem entregues ao usuário.

Você recebe um HTML de slide e valida:

CHECKLIST OBRIGATÓRIO:
1. ✅/❌ Começa com <!DOCTYPE html>
2. ✅/❌ Tem container .live-slide
3. ✅/❌ Tem data-slide-id, data-slide-title, data-slide-section, data-slide-type
4. ✅/❌ Emite LIVEDECK_SLIDE_READY via postMessage
5. ✅/❌ Não usa CDN, Chart.js, D3, ECharts ou bibliotecas externas
6. ✅/❌ Classes com prefixo ld-
7. ✅/❌ Não usa alert(), prompt() ou confirm()
8. ✅/❌ Tem overflow: hidden (sem scroll)
9. ✅/❌ Usa fonte Bahnschrift ou fallback correto
10. ✅/❌ Fundo branco (#FFFFFF)
11. ✅/❌ Máximo 2 cores principais por gráfico
12. ✅/❌ Gráficos têm rótulos visíveis
13. ✅/❌ Nenhum elemento aparentemente cortado ou sobreposto
14. ✅/❌ Tem rodapé técnico
15. ✅/❌ Visual executivo limpo (sem poluição)

RESULTADO:
- Status: APROVADO / PRECISA DE AJUSTE / REPROVADO
- Lista dos itens que falharam
- Sugestões de correção para cada falha
- Nota geral de qualidade visual (1-10)

Seja rigoroso. Um slide de qualidade inferior não deve ser entregue sem aviso."""


async def run_qa(html_content: str, db=None) -> Dict[str, Any]:
    """Agent that validates the generated HTML slide."""
    messages = [
        {
            "role": "user",
            "content": f"Valide este slide HTML LiveDeck:\n\n{html_content[:8000]}"
        }
    ]

    try:
        result = await call_llm(
            messages=messages,
            system_prompt=QA_SYSTEM,
            db=db,
            temperature=0.0,
            max_tokens=1500,
        )
        approved = "APROVADO" in result and "REPROVADO" not in result
        return {
            "status": "approved" if approved else "needs_review",
            "report": result,
        }
    except Exception as e:
        return {
            "status": "qa_skipped",
            "report": f"QA não executado: {str(e)}",
        }


# ──────────────────────────────────────────────────────────────
# PIPELINE COMPLETO: Gera prompt de alta qualidade via 3 agentes
# ──────────────────────────────────────────────────────────────

async def run_full_prompt_pipeline(
    user_intent: str,
    profile: Dict[str, Any],
    db=None,
) -> Dict[str, str]:
    """
    Runs the full 3-agent pipeline to generate a high-quality slide prompt.
    Returns: { sonda, analyst, design, final_prompt }
    """
    # Agent 1: Data Sonda
    sonda_report = await run_data_sonda(profile, db=db)

    # Agent 2: Analyst
    analyst_report = await run_analyst(sonda_report, user_intent, db=db)

    # Agent 3: Design
    design_report = await run_design(analyst_report, db=db)

    # Combine into final prompt
    final_prompt = _assemble_final_prompt(user_intent, sonda_report, analyst_report, design_report)

    return {
        "sonda": sonda_report,
        "analyst": analyst_report,
        "design": design_report,
        "final_prompt": final_prompt,
    }


def _assemble_final_prompt(intent: str, sonda: str, analyst: str, design: str) -> str:
    return f"""PROMPT GERADO PARA O SLIDE:

=== CONTEXTO ANALÍTICO ===
Objetivo do usuário: {intent}

=== DADOS E KPIs IDENTIFICADOS ===
{sonda}

=== NARRATIVA EXECUTIVA ===
{analyst}

=== ESTRUTURA VISUAL ===
{design}

=== INSTRUÇÕES PARA O SLIDE BUILDER ===
Com base em tudo acima, crie um slide HTML LiveDeck completo seguindo:
- Arquitetura LiveDeck obrigatória (live-slide, data attributes, postMessage)
- Tema Qualidade Executiva (Bahnschrift, fundo branco, paleta controlada)
- Formato 16:9, sem scroll, overflow hidden
- HTML puro, sem CDN, sem bibliotecas externas
- Classes com prefixo ld-
- Gráficos em SVG/CSS/JS puro com rótulos visíveis
- Layout executivo limpo, orientado a decisão"""
