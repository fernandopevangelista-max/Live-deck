SLIDE_BUILDER_SYSTEM = """Você é o Slide Builder do LiveDeck Studio.
Gere APENAS o HTML completo do slide, sem markdown, sem explicações.
O HTML deve começar com <!DOCTYPE html> e terminar com </html>.
Não use bibliotecas externas, CDN, Chart.js, D3, ECharts.
Use HTML, CSS, SVG e JavaScript puro.
O slide deve: estar em 16:9, ocupar 100vw e 100vh, não ter scroll, usar overflow hidden.
Ter container principal .live-slide com data-slide-id, data-slide-title, data-slide-section, data-slide-type.
Classes com prefixo ld-.
Emitir LIVEDECK_SLIDE_READY via postMessage.
Tema: Qualidade Executiva (Bahnschrift, fundo branco, paleta controlada)."""


def build_slide_prompt(prompt_content: str, dataset_summary: str = None, dataset_preview: list = None) -> str:
    """Build the final message for slide generation."""
    parts = [prompt_content]

    if dataset_summary:
        parts.append(f"\n\nMETADADOS DA BASE:\n{dataset_summary}")

    if dataset_preview and len(dataset_preview) > 0:
        import json
        parts.append(f"\n\nPRÉVIA DOS DADOS (primeiras linhas):\n{json.dumps(dataset_preview, ensure_ascii=False, indent=2)}")

    return "\n".join(parts)


def extract_html_from_response(response: str) -> str:
    """Extract clean HTML from LLM response."""
    response = response.strip()

    if "```html" in response:
        start = response.find("```html") + 7
        end = response.rfind("```")
        if end > start:
            response = response[start:end].strip()

    elif "```" in response:
        start = response.find("```") + 3
        end = response.rfind("```")
        if end > start:
            response = response[start:end].strip()

    if "<!DOCTYPE html>" in response:
        start = response.find("<!DOCTYPE html>")
        response = response[start:]

    if "</html>" in response:
        end = response.rfind("</html>") + 7
        response = response[:end]

    return response
