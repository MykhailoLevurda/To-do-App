import { WebSocketServer } from 'ws';
import { createServer } from 'http';

interface User {
  id: string;
  name: string;
  color: string;
  socket: any;
  lastSeen: Date;
}

interface TaskUpdate {
  type: 'task_created' | 'task_updated' | 'task_moved' | 'task_deleted';
  taskId: string;
  data: any;
  userId: string;
  timestamp: Date;
}

class ScrumBoardServer {
  private wss: WebSocketServer;
  private users: Map<string, User> = new Map();
  private tasks: Map<string, any> = new Map();

  constructor(port: number = 3002) {
    const server = createServer();
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection');
      this.handleConnection(ws);
    });

    server.listen(port, () => {
      console.log(`WebSocket server running on ws://localhost:${port}`);
    });
  }

  private handleConnection(ws: any) {
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Invalid message format:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleMessage(ws: any, message: any) {
    switch (message.type) {
      case 'user_join':
        this.handleUserJoin(ws, message);
        break;
      case 'task_update':
        this.handleTaskUpdate(ws, message);
        break;
      case 'user_presence':
        this.handleUserPresence(ws, message);
        break;
      case 'get_tasks':
        this.sendTasks(ws);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleUserJoin(ws: any, message: any) {
    const userId = message.userId || this.generateUserId();
    const user: User = {
      id: userId,
      name: message.name || 'Anonymous',
      color: message.color || this.generateUserColor(),
      socket: ws,
      lastSeen: new Date()
    };

    this.users.set(userId, user);
    
    // Send user list to all clients
    this.broadcast({
      type: 'users_updated',
      users: Array.from(this.users.values()).map(u => ({
        id: u.id,
        name: u.name,
        color: u.color,
        lastSeen: u.lastSeen
      }))
    });

    // Send current tasks to new user
    this.sendTasks(ws);

    console.log(`User ${user.name} joined`);
  }

  private handleTaskUpdate(ws: any, message: any) {
    const userId = this.getUserIdBySocket(ws);
    if (!userId) return;

    const taskUpdate: TaskUpdate = {
      type: message.taskType,
      taskId: message.taskId,
      data: message.data,
      userId,
      timestamp: new Date()
    };

    // Update local task store
    if (message.taskType === 'task_created' || message.taskType === 'task_updated') {
      this.tasks.set(message.taskId, message.data);
    } else if (message.taskType === 'task_deleted') {
      this.tasks.delete(message.taskId);
    }

    // Broadcast to all other users
    this.broadcast({
      type: 'task_updated',
      ...taskUpdate
    }, ws); // Exclude sender

    console.log(`Task ${message.taskType} by user ${userId}`);
  }

  private handleUserPresence(ws: any, message: any) {
    const userId = this.getUserIdBySocket(ws);
    if (!userId) return;

    const user = this.users.get(userId);
    if (user) {
      user.lastSeen = new Date();
      
      // Broadcast presence update
      this.broadcast({
        type: 'user_presence_updated',
        userId,
        lastSeen: user.lastSeen
      });
    }
  }

  private sendTasks(ws: any) {
    ws.send(JSON.stringify({
      type: 'tasks_sync',
      tasks: Array.from(this.tasks.entries()).map(([id, task]) => ({
        id,
        ...task
      }))
    }));
  }

  private handleDisconnection(ws: any) {
    const userId = this.getUserIdBySocket(ws);
    if (userId) {
      this.users.delete(userId);
      
      this.broadcast({
        type: 'users_updated',
        users: Array.from(this.users.values()).map(u => ({
          id: u.id,
          name: u.name,
          color: u.color,
          lastSeen: u.lastSeen
        }))
      });

      console.log(`User ${userId} disconnected`);
    }
  }

  private broadcast(message: any, excludeSocket?: any) {
    const data = JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client !== excludeSocket && client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    });
  }

  private getUserIdBySocket(ws: any): string | null {
    for (const [userId, user] of this.users.entries()) {
      if (user.socket === ws) {
        return userId;
      }
    }
    return null;
  }

  private generateUserId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  private generateUserColor(): string {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Start server
new ScrumBoardServer(3002);
