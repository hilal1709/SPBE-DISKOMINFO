/**
 * Panggil Gemini (free tier) dengan keluaran JSON terstruktur. Server saja.
 * Alias "latest" mengikuti model Flash terbaru; Flash-Lite jadi cadangan saat server sibuk.
 */
export async function geminiJson(key: string, prompt: string, responseSchema: object): Promise<unknown> {
  const models = [...new Set([process.env.GEMINI_MODEL || "gemini-flash-latest", "gemini-flash-lite-latest"])];
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, responseMimeType: "application/json", responseSchema },
  });

  // Free tier kadang membalas 429/503 (sibuk): coba ulang sekali, lalu pindah ke model cadangan.
  let response: Response | null = null;
  const started = Date.now();
  attempts: for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
        signal: AbortSignal.timeout(Math.max(3_000, 25_000 - (Date.now() - started))),
      });
      if (response.ok || ![429, 500, 503].includes(response.status)) break attempts;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  if (!response?.ok) throw new Error(`Gemini ${response?.status}`);
  const data = await response.json();
  return JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text);
}
