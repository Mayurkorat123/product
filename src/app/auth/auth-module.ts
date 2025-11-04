import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing-module';
import { ReactiveFormsModule } from '@angular/forms';
import { Login } from './main/login/login';

@NgModule({
  declarations: [Login],
  imports: [CommonModule, AuthRoutingModule, ReactiveFormsModule],
  exports: [Login],
})
export class AuthModule {}
