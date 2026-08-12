import { invokeLLM } from "./_core/llm";

/**
 * Strips markdown fences and leading prose, then parses the first JSON value found.
 * The built-in models sometimes wrap JSON in ```json fences even when told not to.
 */
export function parseLooseJson(raw: unknown): any {
  if (raw == null) throw new Error("LLM returned empty content");
  let text = typeof raw === "string" ? raw : JSON.stringify(raw);

  // unwrap fenced blocks
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1];
  text = text.trim();

  try {
    return JSON.parse(text);
  } catch {
    // fall back to the first balanced object/array in the text
    const start = text.search(/[[{]/);
    if (start === -1) throw new Error(`LLM response was not JSON: ${text.slice(0, 160)}`);
    const open = text[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return JSON.parse(text.slice(start, i + 1));
      }
    }
    throw new Error(`LLM response had unbalanced JSON: ${text.slice(0, 160)}`);
  }
}

/**
 * Some built-in models enable web search, which the upstream API refuses to combine
 * with JSON mode ("Web Search cannot be used with JSON mode"). Those failures come back
 * as an `error` field on a 200-shaped body rather than a thrown exception, so we must
 * inspect it explicitly instead of blindly reading choices[0].
 */
export async function invokeJson(prompt: string, opts?: { model?: string; maxTokens?: number }): Promise<any> {
  const model = opts?.model ?? "gpt-5-mini";
  const res: any = await invokeLLM({
    model,
    maxTokens: opts?.maxTokens,
    messages: [{
      role: "user",
      content: `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown code fences, no explanation, no prose before or after.`,
    }],
  });

  if (res?.error) {
    const msg = typeof res.error === "string" ? res.error : res.error.message || JSON.stringify(res.error);
    throw new Error(`LLM request failed: ${msg}`);
  }
  const content = res?.choices?.[0]?.message?.content;
  if (content == null) {
    throw new Error(`LLM returned no content (finish_reason: ${res?.choices?.[0]?.finish_reason ?? "unknown"})`);
  }
  return parseLooseJson(content);
}

/** Accepts either a bare array or a wrapper object and returns the first array found. */
export function coerceArray(parsed: any, ...keys: string[]): any[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    for (const k of keys) {
      if (Array.isArray(parsed[k])) return parsed[k];
    }
    for (const v of Object.values(parsed)) {
      if (Array.isArray(v)) return v as any[];
    }
  }
  return [];
}
