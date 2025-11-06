import { Injectable } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

@Injectable({
  providedIn: 'root',
})
export class Toster {
  constructor(private message: NzMessageService) {}

  sucess(message: string): void {
    this.message.create('success', `${message}`);
  }

  error(message: string): void {
    this.message.create('error', `${message}`);
  }

  warning(message: string): void {
    this.message.create('warning', `${message}`);
  }
}
