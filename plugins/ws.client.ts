type WS = WebSocket;

declare module "#app" {
  interface NuxtApp {
    $ws: WS | null;
    $wsSend: (message: any) => void;
  }
}
declare module "vue" {
  interface ComponentCustomProperties {
    $ws: WS | null;
    $wsSend: (message: any) => void;
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const { public: pub } = useRuntimeConfig();
  const usersStore = useUsersStore();
  const scrumBoardStore = useScrumBoardStore();
  
  let socket: WS | null = null;
  let reconnectTimer: number | undefined;
  let attempts = 0;
  const maxAttempts = 3;

  const shouldConnect = Boolean(pub.wsEnabled && pub.wsUrl);

  function connect() {
    if (!shouldConnect) return;
    // Validate URL
    try {
      const u = new URL(pub.wsUrl as string);
      if (u.protocol !== 'ws:' && u.protocol !== 'wss:') {
        console.warn('[ws] Invalid protocol in wsUrl; expected ws:// or wss://');
        return;
      }
    } catch (e) {
      console.warn('[ws] Invalid wsUrl; skipping connect');
      return;
    }
    try {
      socket = new WebSocket(pub.wsUrl);
    } catch (e) {
      scheduleReconnect();
      return;
    }
    
    socket.addEventListener("open", () => {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      attempts = 0;
      console.log('[ws] Connected to server');
      
      // Join as user
      const currentUser = usersStore.currentUser || usersStore.createAnonymousUser();
      usersStore.setCurrentUser(currentUser);
      
      sendMessage({
        type: 'user_join',
        userId: currentUser.id,
        name: currentUser.name,
        color: currentUser.color
      });
    });
    
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('[ws] Invalid message:', error);
      }
    });
    
    socket.addEventListener("close", scheduleReconnect);
    socket.addEventListener("error", scheduleReconnect);
  }

  function handleMessage(message: any) {
    switch (message.type) {
      case 'users_updated':
        usersStore.updateUsers(message.users);
        break;
        
      case 'task_updated':
        handleTaskUpdate(message);
        break;
        
      case 'tasks_sync':
        handleTasksSync(message.tasks);
        break;
        
      case 'user_presence_updated':
        usersStore.updateUserPresence(message.userId, {
          userId: message.userId,
          lastSeen: new Date(message.lastSeen),
          isActive: true
        });
        break;
        
      default:
        console.log('[ws] Unknown message type:', message.type);
    }
  }

  function handleTaskUpdate(message: any) {
    const { taskType, taskId, data, userId, timestamp } = message;
    
    // Don't process our own updates
    if (userId === usersStore.currentUser?.id) return;
    
    switch (taskType) {
      case 'task_created':
        scrumBoardStore.addTask(data);
        break;
      case 'task_updated':
        scrumBoardStore.updateTask(taskId, data);
        break;
      case 'task_moved':
        scrumBoardStore.updateTaskStatus(taskId, data.status);
        break;
      case 'task_deleted':
        scrumBoardStore.removeTask(taskId);
        break;
    }
  }

  function handleTasksSync(tasks: any[]) {
    // Sync all tasks from server
    scrumBoardStore.tasks = tasks;
  }

  function sendMessage(message: any) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  function scheduleReconnect() {
    if (!shouldConnect) return;
    if (reconnectTimer) return;
    attempts += 1;
    if (attempts > maxAttempts) {
      console.info('[ws] Max reconnect attempts reached; giving up until reload');
      return;
    }
    const delay = Math.min(2000 * Math.pow(2, attempts - 1), 30000);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  }

  if (process.client) connect();

  nuxtApp.provide("ws", socket);
  nuxtApp.provide("wsSend", sendMessage);
});



