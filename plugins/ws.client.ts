type WS = WebSocket;

declare module "#app" {
  interface NuxtApp {
    $ws: WS | null;
  }
}
declare module "vue" {
  interface ComponentCustomProperties {
    $ws: WS | null;
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const { public: pub } = useRuntimeConfig();
  let socket: WS | null = null;
  let reconnectTimer: number | undefined;

  function connect() {
    try {
      socket = new WebSocket(pub.wsUrl);
    } catch (e) {
      scheduleReconnect();
      return;
    }
    socket.addEventListener("open", () => {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
    });
    socket.addEventListener("close", scheduleReconnect);
    socket.addEventListener("error", scheduleReconnect);
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, 2000);
  }

  if (process.client) connect();

  nuxtApp.provide("ws", socket);
});



