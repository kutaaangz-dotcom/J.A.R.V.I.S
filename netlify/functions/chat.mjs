export default async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method Not Allowed" },
        { status: 405 }
      );
    }

    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return Response.json(
        { error: "GEMINI_API_KEY belum dipasang di Netlify." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const message = String(body.message || "").trim();

    if (!message) {
      return Response.json(
        { error: "Pesan kosong." },
        { status: 400 }
      );
    }

    const history = Array.isArray(body.history)
      ? body.history.slice(-12)
      : [];

    const contents = [];

    for (const item of history) {
      if (!item || !item.content) continue;

      contents.push({
        role: item.role === "assistant" ? "model" : "user",
        parts: [
          {
            text: String(item.content).slice(0, 3000)
          }
        ]
      });
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: message.slice(0, 3000)
        }
      ]
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key
        },

        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  "Kamu adalah JARVIS, asisten AI pribadi futuristik. " +
                  "Jawab selalu dalam Bahasa Indonesia kecuali pengguna meminta bahasa lain. " +
                  "Gunakan gaya natural, tenang, cerdas, sopan, ringkas, dan elegan seperti AI butler futuristik. " +
                  "Pertahankan konteks percakapan. " +
                  "Jangan mengulang pertanyaan pengguna. " +
                  "Jawaban harus terdengar natural ketika dibacakan dengan suara. " +
                  "Jangan mengaku sebagai karakter film dan jangan meniru identitas atau suara aktor tertentu."
              }
            ]
          },

          contents,

          generationConfig: {
            maxOutputTokens: 500
          }
        })
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      return Response.json(
        {
          error: raw || "Gemini API error."
        },
        {
          status: response.status
        }
      );
    }

    const result = JSON.parse(raw);

    const answer =
      result?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
      return Response.json(
        {
          error: "Gemini tidak mengirim jawaban."
        },
        {
          status: 502
        }
      );
    }

    return Response.json({
      answer
    });

  } catch (error) {
    return Response.json(
      {
        error:
          error?.message ||
          "Terjadi kesalahan pada JARVIS."
      },
      {
        status: 500
      }
    );
  }
};
