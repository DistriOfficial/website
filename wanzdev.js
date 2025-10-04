// public/wanzdev.js
// Wanzdev — konfigurasi & helper untuk frontend (index.html)
// Edit domain & port di objek WANZ_CONFIG di bawah ini.

(function (global) {
  const WANZ_CONFIG = {
    // Domain harus lengkap dengan protocol (http:// atau https://)
    domain: "http://oktb.publik-panel.my.id",
    // Atur port di sini. Jika kosong string -> port tidak dipakai.
    port: "22271",
    // timeout ms untuk setiap fetch
    timeout: 5000,
  };

  // --- helper: build base url ---
  function buildBase() {
    if (!WANZ_CONFIG.domain) return null;
    // hapus trailing slash
    const d = WANZ_CONFIG.domain.replace(/\/+$/, "");
    if (!WANZ_CONFIG.port) return d;
    // domain mungkin sudah punya port (rare) -> if includes ':' after protocol
    const afterProtocol = d.replace(/^https?:\/\//, "");
    if (afterProtocol.includes(":")) {
      // domain sudah punya port -> return as-is
      return d;
    }
    return `${d}:${WANZ_CONFIG.port}`;
  }

  const BASE = buildBase();

  // --- helper: safe fetch with timeout and JSON parsing ---
  async function safeFetch(path, opts = {}) {
    if (!BASE) {
      return {
        success: false,
        message: "WANZ_CONFIG.domain belum diset di wanzdev.js",
        code: "NO_DOMAIN",
      };
    }

    // normalize path
    const p = path ? (path.startsWith("/") ? path : `/${path}`) : "/";
    const url = `${BASE}${p}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WANZ_CONFIG.timeout);

    try {
      const method = (opts.method || "GET").toUpperCase();
      const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
      const fetchOpts = {
        method,
        headers,
        signal: controller.signal,
      };
      if (opts.body) fetchOpts.body = JSON.stringify(opts.body);

      // debug
      console.debug(`[Wanzdev] request → ${method} ${url}`);

      const res = await fetch(url, fetchOpts);
      clearTimeout(timeout);

      const text = await res.text();

      // coba parse json, kalau bukan json -> kembalikan raw text secara aman
      try {
        const json = JSON.parse(text);
        return Object.assign({ httpStatus: res.status }, json);
      } catch (e) {
        // bukan JSON
        console.warn("[Wanzdev] Response bukan JSON:", text.slice(0, 200));
        return {
          success: false,
          message: "Respon tidak valid JSON",
          raw: text.slice(0, 1000),
          httpStatus: res.status,
        };
      }
    } catch (err) {
      clearTimeout(timeout);
      // deteksi tipe error
      let reason = "UNKNOWN";
      if (err.name === "AbortError") reason = "TIMEOUT";
      else if (err.message && err.message.includes("Failed to fetch")) reason = "NETWORK_FAIL";
      else if (err.message && err.message.includes("SSL")) reason = "SSL_ERROR";

      console.error(`[Wanzdev] Fetch error (${reason}):`, err.message);
      return {
        success: false,
        message: `Gagal menghubungi server: ${err.message}`,
        reason,
      };
    }
  }

  // --- API wrappers yang dipakai index.html ---
  const Wanzdev = {
    async status() {
      return await safeFetch("/", { method: "GET" });
    },

    async connect(name, phone) {
      if (!name || !phone) {
        return { success: false, message: "name & phone required" };
      }
      return await safeFetch("/connect", { method: "POST", body: { name, phone } });
    },

    async disconnect(name) {
      if (!name) return { success: false, message: "name required" };
      return await safeFetch("/disconnect", { method: "POST", body: { name } });
    },

    async sendMessage(name, to, text) {
      if (!name || !to || !text) return { success: false, message: "name,to,text required" };
      return await safeFetch("/send", { method: "POST", body: { name, to, text } });
    },

    async listSessions() {
      return await safeFetch("/sessions", { method: "GET" });
    },

    // util: mengembalikan base yang digunakan (untuk debug)
    getBase() {
      return BASE;
    },

    // expose config (readonly copy)
    config() {
      return Object.assign({}, WANZ_CONFIG, { base: BASE });
    },
  };

  // debug cepat saat load
  console.info("%c[Wanzdev] loaded", "color: #00ff9c");
  console.info("[Wanzdev] BASE =", BASE || "(domain kosong)");

  // expose ke window
  if (typeof window !== "undefined") {
    window.WANZ_CONFIG = WANZ_CONFIG;
    window.Wanzdev = Wanzdev;
  }

  // return for module systems (if any)
  return Wanzdev;
})(typeof window !== "undefined" ? window : this);
