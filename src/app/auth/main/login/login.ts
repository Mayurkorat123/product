import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { afterNextRender } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  standalone: false,
})
export class Login implements OnInit {
  formLogin!: FormGroup;
  constructor(private fb: FormBuilder, @Inject(PLATFORM_ID) private platformId: Object) {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        const input = document.querySelector('input[type="email"]') as HTMLInputElement;
        if (input) input.focus();
        console.log('📌 Browser hydrated: focused email input.');
      }
    });
  }

  ngOnInit(): void {
    console.log('✅ SSR + CSR safe initialization');
    this.formLogin = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  submit() {
    console.log('Form Submitted:', this.formLogin.value);
  }
}
