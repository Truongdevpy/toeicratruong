// -*- coding: utf-8 -*-
import { getAuthToken } from './api';

export interface CommunityMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  reply_to?: { sender_name: string; content: string } | null;
  content: string;
  created_at: string;
  created_at_raw?: string;
  is_mine?: boolean;
}

export interface ChatUser {
  id: number;
  full_name: string;
  avatar_url: string;
  target_score: number;
  current_score?: number;
  role?: string;
  is_online: boolean;
  last_active?: string;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name?: string;
  sender_avatar?: string;
  recipient_id: number;
  content: string;
  is_mine: boolean;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  created_at_raw?: string;
}

export interface ConversationThread {
  user_id: number;
  full_name: string;
  avatar_url: string;
  target_score: number;
  is_online: boolean;
  last_message: string;
  last_message_at: string;
  last_message_raw: string;
  is_mine: boolean;
  unread_count: number;
}

export interface FriendItem {
  id: number;
  full_name: string;
  avatar_url: string;
  target_score: number;
  current_score?: number;
  is_online: boolean;
  status: 'accepted' | 'pending';
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export interface FriendRequestItem {
  request_id: number;
  user_id: number;
  full_name: string;
  avatar_url: string;
  target_score: number;
  created_at: string;
}

export interface FriendsResponse {
  friends: FriendItem[];
  incoming_requests: FriendRequestItem[];
  outgoing_requests: FriendRequestItem[];
}

type MessageCallback = (msg: ChatMessage) => void;
type TypingCallback = (data: { sender_id: number; sender_name?: string; is_typing: boolean }) => void;
type ReadCallback = (data: { reader_id: number }) => void;
type OnlineCountCallback = (count: number) => void;

class ChatService {
  private socket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private messageListeners: Set<MessageCallback> = new Set();
  private typingListeners: Set<TypingCallback> = new Set();
  private readListeners: Set<ReadCallback> = new Set();
  private onlineCountListeners: Set<OnlineCountCallback> = new Set();
  private communityListeners: Set<(msg: CommunityMessage) => void> = new Set();
  private token: string | null = null;

  init(token?: string | null) {
    this.token = token || getAuthToken();
    this.connectWebSocket();
  }

  setToken(token: string | null) {
    this.token = token || getAuthToken();
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.token) {
      this.socket.send(JSON.stringify({ type: 'authenticate', token: this.token }));
    }
  }

  private getToken(): string | null {
    return this.token || getAuthToken();
  }

  private getAuthHeaders(): Record<string, string> {
    const t = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json'
    };
    if (t) {
      headers['Authorization'] = `Bearer ${t}`;
    }
    return headers;
  }

  private connectWebSocket() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const host = window.location.host;
      const t = this.getToken();
      const wsUrl = `${wsProtocol}//${host}/api/chat/ws${t ? `?token=${encodeURIComponent(t)}` : ''}`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'community_message' && data.message) {
            this.communityListeners.forEach((cb) => cb(data.message));
          } else if (data.type === 'new_message' && data.message) {
            this.messageListeners.forEach((cb) => cb(data.message));
          } else if (data.type === 'typing') {
            this.typingListeners.forEach((cb) => cb(data));
          } else if (data.type === 'messages_read') {
            this.readListeners.forEach((cb) => cb(data));
          } else if (data.type === 'online_count' && typeof data.total_online === 'number') {
            this.onlineCountListeners.forEach((cb) => cb(data.total_online));
          }
        } catch {
          // ignore malformed frame
        }
      };

      this.socket.onclose = () => {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectWebSocket();
          }, 4000);
        }
      };

      this.socket.onerror = () => {
        if (this.socket) this.socket.close();
      };
    } catch {
      // WS fallback
    }
  }

  onNewMessage(cb: MessageCallback) {
    this.connectWebSocket();
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  onTyping(cb: TypingCallback) {
    this.connectWebSocket();
    this.typingListeners.add(cb);
    return () => this.typingListeners.delete(cb);
  }

  onRead(cb: ReadCallback) {
    this.connectWebSocket();
    this.readListeners.add(cb);
    return () => this.readListeners.delete(cb);
  }

  onCommunityMessage(cb: (msg: CommunityMessage) => void) {
    this.connectWebSocket();
    this.communityListeners.add(cb);
    return () => this.communityListeners.delete(cb);
  }

  onOnlineCount(cb: OnlineCountCallback) {
    this.connectWebSocket();
    this.onlineCountListeners.add(cb);
    return () => this.onlineCountListeners.delete(cb);
  }

  onOnlineCountChange(cb: OnlineCountCallback) {
    return this.onOnlineCount(cb);
  }

  // -----------------------------------------------------------------
  // Community Public Chat
  // -----------------------------------------------------------------
  async getCommunityMessages(): Promise<{ total: number; messages: CommunityMessage[] }> {
    const res = await fetch('/api/chat/community/messages', {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Không thể tải tin nhắn cộng đồng');
    return res.json();
  }

  async sendCommunityMessage(
    content: string,
    replyTo?: { sender_name: string; content: string } | null,
    senderName?: string,
    senderAvatar?: string
  ): Promise<CommunityMessage> {
    const res = await fetch('/api/chat/community/messages', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        content,
        reply_to: replyTo,
        sender_name: senderName,
        sender_avatar: senderAvatar
      })
    });
    if (!res.ok) throw new Error('Không thể gửi tin nhắn');
    return res.json();
  }

  // -----------------------------------------------------------------
  // Friendship & Friend Requests
  // -----------------------------------------------------------------
  async getFriends(): Promise<FriendsResponse> {
    const res = await fetch('/api/chat/friends', {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Không thể tải danh sách bạn bè');
    return res.json();
  }

  async sendFriendRequest(friendId: number): Promise<{ status: string; message: string }> {
    const res = await fetch('/api/chat/friends/request', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ friend_id: friendId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể gửi lời mời kết bạn');
    }
    return res.json();
  }

  async respondFriendRequest(requestId: number, action: 'accept' | 'reject'): Promise<{ status: string; message: string }> {
    const res = await fetch('/api/chat/friends/respond', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ request_id: requestId, action })
    });
    if (!res.ok) throw new Error('Không thể phản hồi lời mời kết bạn');
    return res.json();
  }

  async getFriendshipStatus(targetId: number): Promise<{ status: 'none' | 'pending_sent' | 'pending_received' | 'friends'; request_id?: number }> {
    const res = await fetch(`/api/chat/friends/status/${targetId}`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) return { status: 'none' };
    return res.json();
  }

  async removeFriend(friendId: number): Promise<{ status: string; message: string }> {
    const res = await fetch('/api/chat/friends/remove', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ friend_id: friendId })
    });
    if (!res.ok) throw new Error('Không thể hủy kết bạn');
    return res.json();
  }

  // -----------------------------------------------------------------
  // 1-on-1 Direct Conversations
  // -----------------------------------------------------------------
  async getOnlineUsers(): Promise<{ total_online: number; display_text: string; users: ChatUser[] }> {
    const res = await fetch('/api/chat/online-users', {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Không thể tải danh sách người dùng online');
    return res.json();
  }

  async getConversations(): Promise<{ conversations: ConversationThread[]; total_unread: number }> {
    const res = await fetch('/api/chat/conversations', {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Không thể tải tin nhắn');
    return res.json();
  }

  async getMessages(otherUserId: number): Promise<{ other_user: ChatUser; messages: ChatMessage[] }> {
    const res = await fetch(`/api/chat/conversations/${otherUserId}/messages`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Không thể tải nội dung tin nhắn');
    return res.json();
  }

  async sendMessage(otherUserId: number, content: string): Promise<ChatMessage> {
    const res = await fetch(`/api/chat/conversations/${otherUserId}/send`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Không thể gửi tin nhắn');
    return res.json();
  }

  async markAsRead(senderId: number): Promise<void> {
    await fetch('/api/chat/read', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ sender_id: senderId })
    });
  }

  sendTyping(recipientId: number, isTyping: boolean) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'typing',
          recipient_id: recipientId,
          is_typing: isTyping
        })
      );
    }
  }
}

export const chatService = new ChatService();
