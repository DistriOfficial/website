export default async function handler(req, res) {
  // 🌐 URL backend panel (pastikan sesuai dengan milik lu)
  const targetBase = "http://oktb.publik-panel.my.id:22271";

  // 🧠 Hapus prefix "/api/proxy" dari URL request Vercel
  // Contoh: "/api/proxy/connect?name=wanz" → "/connect?name=wanz"
  const path = req.url.replace(/^\/api\/proxy/, "") || "/";
  const targetUrl = `${targetBase}${path}`;

  console.log(`[PROXY] ${req.method} → ${targetUrl}`);

  // Timeout manual biar proxy gak ngegantung
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15 detik

  try {
    // Opsi fetch tergantung method
    const fetchOptions = {
      method: req.method,
      headers: {
        ...req.headers,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    };

    // Kalau bukan GET/HEAD → kirim body
    if (!["GET", "HEAD"].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") || "";
    const status = response.status;

    // 🧠 Kalau backend balikin JSON → terusin sebagai JSON
    if (contentType.includes("application/json")) {
      const data = await response.json();
      res.status(status).json(data);
    } else {
      // Kalau bukan JSON → terusin text apa adanya
      const text = await response.text();
      res.status(status).send(text);
    }
  } catch (error) {
    clearTimeout(timeout);

    // 👇 Penanganan error spesifik
    if (error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        error: "Gateway Timeout",
        message: "Backend tidak merespons dalam waktu 15 detik",
      });
    }

    console.error("[Proxy Error]", error);
    res.status(500).json({
      success: false,
      error: "Proxy Error",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
  }
