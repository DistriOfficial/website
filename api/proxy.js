export default async function handler(req, res) {
  const targetBase = "http://oktb.publik-panel.my.id:22271";

  // ✨ Hapus prefix "/api/proxy" dari path asli
  const path = req.url.replace(/^\/api\/proxy/, "") || "/";
  const targetUrl = `${targetBase}${path}`;

  console.log(`[Proxy] ${req.method} → ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...req.headers,
      },
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : JSON.stringify(req.body || {}),
    });

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
