// wanzdev.js
// Wanzdev — konfigurasi & helper untuk frontend (index.html)
// EDIT: set WANZ_CONFIG.domain ke proxy Vercel, ex: "https://website-omega-ten-69.vercel.app/api/proxy"

(function (global) {
  const WANZ_CONFIG = {
    // Domain harus lengkap dengan protocol (http:// atau https://)
    // Jika pakai Vercel proxy → gunakan full proxy URL tanpa trailing slash
    // contoh: "https://website-omega-ten-69.vercel.app/api/proxy"
    domain: "https://website-omega-ten-69.vercel.app/api/proxy",
    // kosongkan port kalau pakai proxy
    port: "",
    // timeout ms untuk setiap fetch
    timeout: 6000,
  };

  // --- helper: build base url (normalized) ---
  function buildBase() {
    if (!WANZ_CONFIG.domain) return null;
    // remove trailing slashes
    let d = String(WANZ_CONFIG.domain).replace(/\/+$/, "");
    // if port provided and domain doesn't already contain a port, attach it
    if (WANZ_CONFIG.port) {
      const afterProto = d.replace(/^https?:\/\//i, "");
      if (!afterProto.includes(":")) {
        d = `${d}:${WANZ_CONFIG.port}`;
      }
    }
    return d;
  }

  const BASE = buildBase();

  // --- safe fetch with timeout & robust parsing ---
  async function safeFetch(path = "/", opts = {}) {
    if (!BASE) {
      return {
        success: false,
        message: "WANZ_CONFIG.domain belum diset di wanzdev.js",
        code: "NO_DOMAIN",
      };
    }

    // build path correctly
    let p = path || "/";
    if (!p.startsWith("/")) p = "/" + p;
    // avoid double slashes in base+path
    const url = `${BASE}${p}`.replace(/([^:]\/)\/+/g, "$1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WANZ_CONFIG.timeout || 6000);

    try {
      const method = (opts.method || "GET").toUpperCase();
      const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
      const fetchOpts = {
        method,
        headers,
        signal: controller.signal,
      };
      if (opts.body && (method !== "GET" && method !== "HEAD")) {
        // if body already string, use it; else stringify object
        fetchOpts.body = (typeof opts.body === 'string') ? opts.body : JSON.stringify(opts.body);
      }

      console.debug(`[Wanzdev] request → ${method} ${url}`);

      const res = await fetch(url, fetchOpts);
      clearTimeout(timeout);

      const text = await res.text();

      // normalize common non-json responses into error object so frontend can display raw
      try {
        const json = JSON.parse(text);
        // attach httpStatus for debugging
        if (typeof json === 'object' && json !== null) json.httpStatus = res.status;
        return Object.assign({ httpStatus: res.status }, json);
      } catch (e) {
        // bukan JSON -> kembalikan raw text dan status
        return {
          success: false,
          message: "Respon tidak valid JSON",
          raw: text,
          httpStatus: res.status,
        };
      }
    } catch (err) {
      clearTimeout(timeout);
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

  // --- API wrappers ---
  const Wanzdev = {
    getBase() { return BASE; },

    config() { return Object.assign({}, WANZ_CONFIG, { base: BASE }); },

    async status() {
      return await safeFetch("/", { method: "GET" });
    },

    async connect(name, phone) {
      if (!name || !phone) return { success: false, message: "name & phone required" };
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
    }
  };

  console.info("%c[Wanzdev] loaded", "color: #00ff9c");
  console.info("[Wanzdev] BASE =", BASE || "(domain kosong)");

  if (typeof window !== "undefined") {
    window.WANZ_CONFIG = WANZ_CONFIG;
    window.Wanzdev = Wanzdev;
  }

  return Wanzdev;
})(typeof window !== "undefined" ? window : this);
