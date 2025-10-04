// wanzdev.js
// Wanzdev — konfigurasi & helper untuk frontend
// EDIT: set WANZ_CONFIG.domain ke proxy Vercel-mu, ex:
// domain: "https://website-omega-ten-69.vercel.app/api/proxy"

(function (global) {
  const WANZ_CONFIG = {
    // full base URL to proxy endpoint (no trailing slash)
    domain: "https://website-omega-ten-69.vercel.app/api/proxy",
    // leave port empty when using proxy
    port: "",
    // timeout ms for fetch
    timeout: 7000,
  };

  function buildBase() {
    if (!WANZ_CONFIG.domain) return null;
    let d = String(WANZ_CONFIG.domain).replace(/\/+$/, "");
    if (WANZ_CONFIG.port) {
      const after = d.replace(/^https?:\/\//i, "");
      if (!after.includes(":")) d = `${d}:${WANZ_CONFIG.port}`;
    }
    return d;
  }

  const BASE = buildBase();

  async function safeFetch(path = "/", opts = {}) {
    if (!BASE) {
      return { success: false, message: "WANZ_CONFIG.domain belum diset", code: "NO_DOMAIN" };
    }

    let p = path || "/";
    if (!p.startsWith("/")) p = "/" + p;
    const url = `${BASE}${p}`.replace(/([^:]\/)\/+/g, "$1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WANZ_CONFIG.timeout || 7000);

    try {
      const method = (opts.method || "GET").toUpperCase();
      const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
      const fetchOpts = { method, headers, signal: controller.signal };
      if (opts.body && method !== "GET" && method !== "HEAD") {
        fetchOpts.body = (typeof opts.body === "string") ? opts.body : JSON.stringify(opts.body);
      }

      console.debug(`[Wanzdev] ${method} ${url}`);
      const res = await fetch(url, fetchOpts);
      clearTimeout(timeout);
      const text = await res.text();

      try {
        const json = JSON.parse(text);
        if (typeof json === 'object' && json !== null) json.httpStatus = res.status;
        return Object.assign({ httpStatus: res.status }, json);
      } catch (e) {
        return { success: false, message: "Respon tidak valid JSON", raw: text, httpStatus: res.status };
      }
    } catch (err) {
      clearTimeout(timeout);
      let reason = "UNKNOWN";
      if (err.name === "AbortError") reason = "TIMEOUT";
      else if (err.message && err.message.includes("Failed to fetch")) reason = "NETWORK_FAIL";
      else if (err.message && err.message.includes("SSL")) reason = "SSL_ERROR";
      console.error(`[Wanzdev] Fetch error (${reason}):`, err.message);
      return { success: false, message: `Gagal menghubungi server: ${err.message}`, reason };
    }
  }

  const Wanzdev = {
    getBase() { return BASE; },
    config() { return Object.assign({}, WANZ_CONFIG, { base: BASE }); },

    async status() { return await safeFetch("/", { method: "GET" }); },

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

    async listSessions() { return await safeFetch("/sessions", { method: "GET" }); }
  };

  console.info("%c[Wanzdev] loaded", "color: #ff2fa8");
  console.info("[Wanzdev] BASE =", BASE || "(domain kosong)");

  if (typeof window !== "undefined") {
    window.WANZ_CONFIG = WANZ_CONFIG;
    window.Wanzdev = Wanzdev;
  }

  return Wanzdev;
})(typeof window !== "undefined" ? window : this);
