import { defineStore } from "pinia";

export interface User {
  id: string;
  name: string;
  color: string;
  lastSeen: Date;
  isOnline: boolean;
}

export interface UserPresence {
  userId: string;
  lastSeen: Date;
  isActive: boolean;
}

export const useUsersStore = defineStore("users", {
  state: () => ({
    currentUser: null as User | null,
    users: [] as User[],
    onlineUsers: new Set<string>(),
    userPresence: new Map<string, UserPresence>()
  }),

  getters: {
    onlineUsersList: (state) => 
      state.users.filter(user => state.onlineUsers.has(user.id)),
    
    currentUserColor: (state) => 
      state.currentUser?.color || '#3b82f6',
    
    isUserOnline: (state) => (userId: string) => 
      state.onlineUsers.has(userId)
  },

  actions: {
    setCurrentUser(user: User) {
      this.currentUser = user;
    },

    updateUsers(users: User[]) {
      this.users = users;
    },

    addUser(user: User) {
      const existingIndex = this.users.findIndex(u => u.id === user.id);
      if (existingIndex >= 0) {
        this.users[existingIndex] = user;
      } else {
        this.users.push(user);
      }
    },

    removeUser(userId: string) {
      this.users = this.users.filter(u => u.id !== userId);
      this.onlineUsers.delete(userId);
      this.userPresence.delete(userId);
    },

    setUserOnline(userId: string, isOnline: boolean) {
      if (isOnline) {
        this.onlineUsers.add(userId);
      } else {
        this.onlineUsers.delete(userId);
      }
    },

    updateUserPresence(userId: string, presence: UserPresence) {
      this.userPresence.set(userId, presence);
    },

    generateUserColor(): string {
      const colors = [
        '#ef4444', '#f97316', '#eab308', '#22c55e', 
        '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
        '#84cc16', '#f59e0b', '#10b981', '#06b6d4'
      ];
      
      // Find unused color
      const usedColors = this.users.map(u => u.color);
      const availableColors = colors.filter(c => !usedColors.includes(c));
      
      return availableColors.length > 0 
        ? availableColors[0] 
        : colors[Math.floor(Math.random() * colors.length)];
    },

    generateUserName(): string {
      const adjectives = ['Swift', 'Bright', 'Quick', 'Smart', 'Bold', 'Sharp'];
      const nouns = ['Developer', 'Designer', 'Manager', 'Analyst', 'Tester', 'Lead'];
      
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const num = Math.floor(Math.random() * 99) + 1;
      
      return `${adj} ${noun} ${num}`;
    },

    createAnonymousUser(): User {
      const id = 'user_' + Math.random().toString(36).substr(2, 9);
      return {
        id,
        name: this.generateUserName(),
        color: this.generateUserColor(),
        lastSeen: new Date(),
        isOnline: true
      };
    }
  },

  persist: {
    paths: ['currentUser']
  }
});
