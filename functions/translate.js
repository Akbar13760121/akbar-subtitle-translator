// این تابع، موتورخانه کوچک ماست که روی سرورهای Cloudflare اجرا می‌شود.
export async function onRequest(context) {
  // فقط به درخواست‌هایی که از نوع POST هستند پاسخ می‌دهیم.
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // اطلاعاتی که از برنامه اصلی (Frontend) فرستاده شده را می‌خوانیم.
    const { prompt, model, temperature } = await context.request.json();

    // کلید API محرمانه خود را از تنظیمات Cloudflare می‌خوانیم.
    const apiKey = context.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response('API key not configured on the server', { status: 500 });
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // درخواست واقعی را به سرور گوگل (Gemini) ارسال می‌کنیم.
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: temperature,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    });

    // پاسخ دریافتی از گوگل را به برنامه اصلی خودمان برمی‌گردانیم.
    return new Response(geminiResponse.body, {
      status: geminiResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Worker Error:', error);
    return new Response('Internal Server Error in Worker', { status: 500 });
  }
}