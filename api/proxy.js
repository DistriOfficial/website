// api/proxy.js
export default async function handler(req, res) {
  // 🛠️ Ganti URL ini ke alamat server backend lu (yang jalanin bot.js)
  const targetBase = "http://oktb.publik-panel.my.id:22271";

  // Gabungkan path dan query dari request frontend
  const targetUrl = `${targetBase}${req.url}`;

  try {
    // Forward request ke backend
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...req.headers,
      },
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : JSON.stringify(req.body),
    });

    // Ambil konten dari response
    const contentType = response.headers.get("content-type");
    const status = response.status;

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
