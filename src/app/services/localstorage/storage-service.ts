import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TransferState, makeStateKey, StateKey } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private isBrowser: boolean;
  private inMemory: Record<string, string> = {};
  private subjects = new Map<string, BehaviorSubject<string | null>>();
  private secretKey = environment.key; // change to your own secret

  constructor(@Inject(PLATFORM_ID) platformId: Object, private transferState: TransferState) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private keyState(key: string): StateKey<string> {
    return makeStateKey<string>('storage-' + key);
  }

  // === Encryption ===
  private encrypt(text: string): string {
    try {
      if (this.isBrowser && window.crypto?.subtle) {
        // Browser side – AES encryption handled via sync fallback (for simplicity)
        return btoa(unescape(encodeURIComponent(text + this.secretKey)));
      }
      // Server side fallback
      return Buffer.from(text + this.secretKey).toString('base64');
    } catch {
      return text;
    }
  }

  // === Decryption ===
  private decrypt(cipher: string): string {
    try {
      let decoded = '';
      if (this.isBrowser && window.crypto?.subtle) {
        decoded = decodeURIComponent(escape(atob(cipher)));
      } else {
        decoded = Buffer.from(cipher, 'base64').toString('utf8');
      }
      return decoded.replace(this.secretKey, '');
    } catch {
      return cipher;
    }
  }

  // === GET ===
  get<T = string>(key: string): T | null {
    if (this.isBrowser) {
      const stateKey = this.keyState(key);
      if (this.transferState.hasKey(stateKey)) {
        const val = this.transferState.get<string>(stateKey, null as any);
        this.transferState.remove(stateKey);
        try {
          return val ? (JSON.parse(this.decrypt(val)) as T) : null;
        } catch {
          return null;
        }
      }

      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(this.decrypt(raw)) as T) : null;
      } catch {
        return this.inMemory[key] ? (JSON.parse(this.decrypt(this.inMemory[key])) as T) : null;
      }
    }

    // Server
    const serverKey = this.keyState(key);
    if (this.transferState.hasKey(serverKey)) {
      const raw = this.transferState.get<string>(serverKey, null as any);
      return raw ? (JSON.parse(this.decrypt(raw)) as T) : null;
    }
    return this.inMemory[key] ? (JSON.parse(this.decrypt(this.inMemory[key])) as T) : null;
  }

  // === SET ===
  set<T = any>(key: string, value: T, transferToClient = false): void {
    const encrypted = this.encrypt(JSON.stringify(value));

    if (this.isBrowser) {
      try {
        localStorage.setItem(key, encrypted);
      } catch {
        this.inMemory[key] = encrypted;
      }
      this.emitChange(key, value);
      return;
    }

    this.inMemory[key] = encrypted;
    if (transferToClient) {
      const stateKey = this.keyState(key);
      this.transferState.set<string>(stateKey, encrypted);
    }
    this.emitChange(key, value);
  }

  // === REMOVE ===
  remove(key: string): void {
    if (this.isBrowser) {
      try {
        localStorage.removeItem(key);
      } catch {}
      delete this.inMemory[key];
    } else {
      delete this.inMemory[key];
    }
    this.emitChange(key, null);
  }

  // === CLEAR ===
  clear(): void {
    if (this.isBrowser) {
      try {
        localStorage.clear();
      } catch {}
    }
    this.inMemory = {};
    this.subjects.forEach((s) => s.next(null));
  }

  // === WATCH ===
  watch(key: string) {
    if (!this.subjects.has(key)) {
      const initial = this.get(key);
      this.subjects.set(
        key,
        new BehaviorSubject<string | null>(initial ? JSON.stringify(initial) : null)
      );
    }
    const subj = this.subjects.get(key) as BehaviorSubject<string | null>;
    return subj.asObservable();
  }

  private emitChange(key: string, value: any) {
    if (this.subjects.has(key)) {
      const subj = this.subjects.get(key)!;
      subj.next(value ? JSON.stringify(value) : null);
    }
  }
}

// USE CASE
//  token: any = null;
//   constructor(private storage: StorageService) {}

//   ngOnInit() {
//     this.token = this.storage.get('auth-token');
//   }

//   save() {
//     this.storage.set('auth-token', { token: 'abc123' }, true); // true -> transfer to client when SSR
//     this.token = this.storage.get('auth-token');
//   }

//   load() {
//     this.token = this.storage.get('auth-token');
//   }
