import httpx
import os
import time
import json
from typing import List, Dict, Optional, AsyncGenerator
from dotenv import load_dotenv
from sqlalchemy.orm import Session

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.2"))
LLM_MAX_OUTPUT_TOKENS = int(os.getenv("LLM_MAX_OUTPUT_TOKENS", "12000"))
LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", "180"))
DEEPSEEK_BASE_URL = "https://api.deepseek.com/chat/completions"


def log_llm_call(
    db: Session,
    model: str,
    request_payload: dict,
    response_payload: Optional[dict],
    duration_seconds: float,
    success: bool,
    error_message: Optional[str] = None,
):
    try:
        from models import LLMLog
        prompt_tokens = None
        completion_tokens = None
        total_tokens = None
        if response_payload and "usage" in response_payload:
            usage = response_payload["usage"]
            prompt_tokens = usage.get("prompt_tokens")
            completion_tokens = usage.get("completion_tokens")
            total_tokens = usage.get("total_tokens")

        log = LLMLog(
            provider="deepseek",
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            request_payload=request_payload,
            response_payload=response_payload,
            duration_seconds=duration_seconds,
            success=success,
            error_message=error_message,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Error logging LLM call: {e}")


async def call_llm(
    messages: List[Dict[str, str]],
    system_prompt: Optional[str] = None,
    db: Optional[Session] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
) -> str:
    if temperature is None:
        temperature = LLM_TEMPERATURE
    if max_tokens is None:
        max_tokens = LLM_MAX_OUTPUT_TOKENS

    all_messages = []
    if system_prompt:
        all_messages.append({"role": "system", "content": system_prompt})
    all_messages.extend(messages)

    payload = {
        "model": LLM_MODEL,
        "messages": all_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    start_time = time.time()
    response_data = None
    error_message = None
    success = False

    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=LLM_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    DEEPSEEK_BASE_URL,
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                response_data = response.json()
                success = True
                break
        except httpx.HTTPStatusError as e:
            error_message = f"HTTP error {e.response.status_code}: {e.response.text}"
            if attempt == max_retries - 1:
                break
            await asyncio.sleep(2 ** attempt)
        except httpx.RequestError as e:
            error_message = f"Request error: {str(e)}"
            if attempt == max_retries - 1:
                break
            import asyncio
            await asyncio.sleep(2 ** attempt)
        except Exception as e:
            error_message = str(e)
            break

    duration = time.time() - start_time

    if db:
        log_llm_call(
            db=db,
            model=LLM_MODEL,
            request_payload=payload,
            response_payload=response_data,
            duration_seconds=duration,
            success=success,
            error_message=error_message,
        )

    if not success:
        raise Exception(f"LLM call failed: {error_message}")

    return response_data["choices"][0]["message"]["content"]


async def call_llm_stream(
    messages: List[Dict[str, str]],
    system_prompt: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    all_messages = []
    if system_prompt:
        all_messages.append({"role": "system", "content": system_prompt})
    all_messages.extend(messages)

    payload = {
        "model": LLM_MODEL,
        "messages": all_messages,
        "temperature": LLM_TEMPERATURE,
        "max_tokens": LLM_MAX_OUTPUT_TOKENS,
        "stream": True,
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT_SECONDS) as client:
        async with client.stream("POST", DEEPSEEK_BASE_URL, json=payload, headers=headers) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
