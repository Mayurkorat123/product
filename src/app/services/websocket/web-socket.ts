import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { BehaviorSubject, Subject } from 'rxjs';

// For SSR (Node.js)
import type { WebSocket as NodeWebSocket } from 'ws';

interface SocketConnection {
  socket: globalThis.WebSocket | NodeWebSocket;
  messages$: Subject<any>;
  status$: BehaviorSubject<'disconnected' | 'connected'>;
}

@Injectable({ providedIn: 'root' })
export default class WebSocket {
  private connections = new Map<string, SocketConnection>();
  private readonly isBrowser: boolean;
  private readonly isServer: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.isServer = isPlatformServer(platformId);
  }

  /** 🔗 Connect to any WebSocket endpoint (multi-API support) */
  connect(name: string, url: string) {
    if (this.connections.has(name)) return; // already connected

    const messages$ = new Subject<any>();
    const status$ = new BehaviorSubject<'disconnected' | 'connected'>('disconnected');

    let socket: globalThis.WebSocket | NodeWebSocket | null = null;

    if (this.isBrowser) {
      socket = new globalThis.WebSocket(url);

      socket.onopen = () => status$.next('connected');
      socket.onmessage = (ev) => {
        try {
          messages$.next(JSON.parse(ev.data));
        } catch {
          messages$.next(ev.data);
        }
      };
      socket.onclose = () => status$.next('disconnected');
    } else if (this.isServer) {
      const { WebSocket: NodeWS } = require('ws') as typeof import('ws');
      socket = new NodeWS(url);

      socket.on('open', () => status$.next('connected'));
      socket.on('message', (data: any) => {
        try {
          messages$.next(JSON.parse(data.toString()));
        } catch {
          messages$.next(data.toString());
        }
      });
      socket.on('close', () => status$.next('disconnected'));
    }

    if (socket) {
      this.connections.set(name, { socket, messages$, status$ });
    }
  }

  /** 📤 Send message to a specific WebSocket */
  send(name: string, data: any) {
    const conn = this.connections.get(name);
    if (!conn) return;

    const msg = JSON.stringify(data);

    if (
      this.isBrowser &&
      conn.socket instanceof globalThis.WebSocket &&
      conn.socket.readyState === globalThis.WebSocket.OPEN
    ) {
      conn.socket.send(msg);
    }

    if (this.isServer && (conn.socket as any).readyState === 1) {
      (conn.socket as any).send(msg);
    }
  }

  /** 📡 Observe messages */
  messages(name: string) {
    return this.connections.get(name)?.messages$.asObservable();
  }

  /** 🔍 Observe status */
  status(name: string) {
    return this.connections.get(name)?.status$.asObservable();
  }

  /** ❌ Disconnect one or all sockets */
  disconnect(name?: string) {
    if (name) {
      const conn = this.connections.get(name);
      if (!conn) return;

      if (this.isBrowser && conn.socket instanceof globalThis.WebSocket) {
        conn.socket.close();
      }
      if (this.isServer && (conn.socket as any).close) {
        (conn.socket as any).close();
      }

      this.connections.delete(name);
      return;
    }

    // Disconnect all
    this.connections.forEach((conn) => {
      if (this.isBrowser && conn.socket instanceof globalThis.WebSocket) {
        conn.socket.close();
      }
      if (this.isServer && (conn.socket as any).close) {
        (conn.socket as any).close();
      }
    });
    this.connections.clear();
  }
}


// use socket
// ngOnInit() {
//   this.ws.connect('chat', 'wss://echo.websocket.events');
//   this.ws.messages('chat')?.subscribe(msg => console.log('Chat:', msg));
//   this.ws.send('chat', { user: 'Mayur', text: 'Hello!' });
// }
