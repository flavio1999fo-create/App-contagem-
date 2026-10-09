/* Service worker do App de Contagem — deixa o app abrir sem internet.
   Estratégia: entrega o que está guardado na hora (rápido e offline) e atualiza
   a cópia em segundo plano quando há internet. Dados do Firebase NÃO passam por aqui. */
var CACHE = "app-contagem-v1.9";
var ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (ev) {
  ev.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (ev) {
  var req = ev.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase e o resto passam direto
  ev.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (guardado) {
        var rede = fetch(req).then(function (resp) {
          if (resp && resp.ok) cache.put(req, resp.clone());
          return resp;
        }).catch(function () { return null; });
        if (guardado) { ev.waitUntil(rede); return guardado; }
        return rede.then(function (resp) {
          if (resp) return resp;
          if (req.mode === "navigate") return cache.match("./index.html");
          return new Response("", { status: 504 });
        });
      });
    })
  );
});
