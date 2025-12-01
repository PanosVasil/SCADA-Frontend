// src/services/websocket.ts
import type { WebSocketMessage } from "@/types/api";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000/ws";
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;

type MessageHandler = (message: WebSocketMessage) => void;
type StatusHandler = (connected: boolean) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private token: string | null = null;
  private shouldReconnect = true;

  /** Connect using the latest token from storage (or a provided one) */
  connect(token?: string) {
    this.token = token || localStorage.getItem("access_token");
    if (!this.token) {
      console.warn("🔒 No access token available for WebSocket connection");
      return;
    }
    this.shouldReconnect = true;
    this.createConnection();
  }

  private createConnection() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (!this.token) {
      console.error("❌ Cannot open WS: missing token");
      return;
    }

    const urlWithToken = `${WS_BASE}?token=${encodeURIComponent(this.token)}`;

    try {
      this.ws = new WebSocket(urlWithToken);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected");
        this.reconnectAttempts = 0;
        this.notifyStatusHandlers(true);
      };

      this.ws.onmessage = (event) => {
        try {
          if (event.data === "ping" || event.data === "pong") return;

          const message: WebSocketMessage = JSON.parse(event.data);
          // Forward the raw backend payload:
          // { type: "telemetry_update", data: { plc_clients: [...] } }
          this.notifyMessageHandlers(message);
        } catch (error) {
          console.error("⚠️ Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("⚠️ WebSocket error:", error);
      };

      this.ws.onclose = (event) => {
        console.warn(`⚠️ WebSocket disconnected (code: ${event.code})`);
        this.notifyStatusHandlers(false);
        this.ws = null;

        // If server closed due to policy/authorization, don't hammer reconnects.
        if (event.code === 1008) {
          console.warn(
            "🔒 WS closed due to auth/policy. Not reconnecting until new login."
          );
          this.shouldReconnect = false;
          return;
        }

        if (
          this.shouldReconnect &&
          this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
        ) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error("❌ Failed to create WebSocket connection:", error);
      this.scheduleReconnect();
    }
  }

  /** Reconnect with progressive backoff (cap 30s) */
  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectAttempts++;
    const delay = Math.min(
      RECONNECT_DELAY * this.reconnectAttempts,
      30000
    ); // cap at 30s
    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );
    this.reconnectTimeout = setTimeout(() => this.createConnection(), delay);
  }

  /** Graceful manual disconnect */
  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }
    this.notifyStatusHandlers(false);
  }

  /** Send data safely */
  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("⚠️ WebSocket is not connected");
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private notifyMessageHandlers(message: WebSocketMessage) {
    this.messageHandlers.forEach((handler) => handler(message));
  }

  private notifyStatusHandlers(connected: boolean) {
    this.statusHandlers.forEach((handler) => handler(connected));
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
