// api/proxy.js
// ✅ Versi FINAL — Vercel serverless proxy ke backend bot.js
// Pastikan file ini ada di folder root project Vercel, bukan di /public

export default async function handler(req, res) {
  // 🧠 Ganti URL ini ke alamat backend (yang menjalankan bot.js)
  const targetBase = "http://oktb.publik-panel.my.id:22271";

  // Hapus prefix "/api/proxy" dari path agar cocok dengan backend
  const path = req.url.replace(/^\/api\/proxy/, "") || "/";
  const targetUrl = `${targetBase}${path}`;

  console.log(`[Proxy] ${req.method} → ${targetUrl}`);

  try {
    // Forward request ke backend
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...req.headers,
      },
      body:
        ["GET", "HEAD"].includes(req.method) || !req.body
          ? undefined
          : JSON.stringify(req.body),
    });

    // Ambil response content-type untuk deteksi JSON
    const contentType = response.headers.get("content-type");
    const status = response.status;

    // Balikkan ke client (frontend)
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      res.status(status).json(data);
    } else {
      const text = await response.text();
      res.status(status).send(text);
    }
  } catch (err) {
    console.error("[Proxy Error]", err);
    res.status(500).json({
      success: false,
      error: "Proxy gagal menghubungi backend",
      detail: err.message,
    });
  }
}
