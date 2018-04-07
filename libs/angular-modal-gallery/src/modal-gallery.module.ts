/*
 The MIT License (MIT)

 Copyright (c) 2017-2018 Stefano Cappa (Ks89)

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NON INFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DIRECTIVES } from './directives/directives';
import { COMPONENTS, ModalGalleryComponent } from './components/components';
import { KEYBOARD_CONFIGURATION, KeyboardService } from './services/keyboard.service';
import { KeyboardServiceConfig } from './model/keyboard-service-config.interface';
import { GalleryService } from './services/gallery.service';

/**
 * Module with `forRoot` method to import it in the root module of your application.
 */
@NgModule({
  imports: [CommonModule],
  declarations: [COMPONENTS, DIRECTIVES],
  exports: [ModalGalleryComponent]
})
export class ModalGalleryModule {
  static forRoot(config?: KeyboardServiceConfig): ModuleWithProviders {
    return {
      ngModule: ModalGalleryModule,
      providers: [
        {
          provide: KEYBOARD_CONFIGURATION,
          useValue: config ? config : {}
        },
        {
          provide: KeyboardService,
          useFactory: setupKeyboardService,
          deps: [KEYBOARD_CONFIGURATION]
        },
        {
          provide: GalleryService,
          useFactory: setupGalleryService
        }
      ]
    };
  }
}

/**
 * Function to setup the keyboard service inside the `forRoot` method.
 * @param {KeyboardServiceConfig} injector is an interface of type `KeyboardServiceConfig` to pass data to KeyboardService
 * @returns {KeyboardService} an instance of the `KeyboardService`
 */
export function setupKeyboardService(injector: KeyboardServiceConfig): KeyboardService {
  return new KeyboardService(injector);
}

export function setupGalleryService(): GalleryService {
  return new GalleryService();
}
