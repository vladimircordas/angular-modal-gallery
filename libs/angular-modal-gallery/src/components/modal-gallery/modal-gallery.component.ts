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

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChange,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

import { ButtonEvent, ButtonsConfig } from '../../model/buttons-config.interface';
import { Image, ImageModalEvent } from '../../model/image.class';
import { Action } from '../../model/action.enum';
import { Description } from '../../model/description.interface';
import { KeyboardConfig } from '../../model/keyboard-config.interface';
import { LoadingConfig } from '../../model/loading-config.interface';
import { PreviewConfig } from '../../model/preview-config.interface';
import { SlideConfig } from '../../model/slide-config.interface';
import { AccessibilityConfig } from '../../model/accessibility.interface';
import { KeyboardService } from '../../services/keyboard.service';
import { GalleryService } from '../../services/gallery.service';
import { DotsConfig } from '../../model/dots-config.interface';
import { CurrentImageComponent, ImageLoadEvent } from '../current-image/current-image.component';
import { InternalLibImage } from '../../model/image-internal.class';
import { AdvancedLayout, PlainGalleryConfig } from '../../model/plain-gallery-config.interface';
import { KS_DEFAULT_ACCESSIBILITY_CONFIG } from '../accessibility-default';
import { Subscription } from 'rxjs/Subscription';

/**
 * Main Component of this library with both the plain and modal galleries.
 */
@Component({
  selector: 'ks-modal-gallery',
  exportAs: 'ksModalGallery',
  styleUrls: ['modal-gallery.scss'],
  templateUrl: 'modal-gallery.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalGalleryComponent implements OnInit, OnDestroy, OnChanges {
  /**
   * Array of `Image` that represent the model of this library with all images, thumbs and so on.
   */
  @Input() modalImages: Image[];

  /**
   * Boolean required to enable image download with both ctrl+s/cmd+s and download button.
   * If you want to show enable button, this is not enough. You have to use also `buttonsConfig`.
   */
  @Input() downloadable = false;
  /**
   * Object of type `ButtonsConfig` to show/hide buttons.
   */
  @Input() buttonsConfig: ButtonsConfig;
  /**
   * Boolean to enable modal-gallery close behaviour when clicking
   * on the semi-transparent background. Enabled by default.
   */
  @Input() enableCloseOutside = true;
  /**
   * Object of type `DotsConfig` to init DotsComponent's features.
   * For instance, it contains a param to show/hide dots.
   */
  @Input() dotsConfig: DotsConfig;
  /**
   * Object of type `PreviewConfig` to init PreviewsComponent's features.
   * For instance, it contains a param to show/hide previews.
   */
  @Input() previewConfig: PreviewConfig;
  /**
   * Object of type `LoadingConfig` that contains fields like enable/disable
   * and a way to choose a loading spinner.
   */
  @Input() loadingConfig: LoadingConfig;
  /**
   * Object of type `SlideConfig` to init side previews and `infinite sliding`.
   */
  @Input()
  slideConfig: SlideConfig = {
    infinite: false,
    sidePreviews: { show: true, size: { width: '100px', height: 'auto' } }
  };
  /**
   * Object of type `AccessibilityConfig` to init custom accessibility features.
   * For instance, it contains titles, alt texts, aria-labels and so on.
   */
  @Input() accessibilityConfig: AccessibilityConfig = KS_DEFAULT_ACCESSIBILITY_CONFIG;
  /**
   * Object of type `Description` to configure and show image descriptions.
   */
  @Input() description: Description;
  /**
   * Object of type `KeyboardConfig` to assign custom keys to ESC, RIGHT and LEFT keyboard's actions.
   */
  @Input() keyboardConfig: KeyboardConfig;
  /**
   * Object of type `PlainGalleryConfig` to configure the plain gallery.
   */
  @Input() plainGalleryConfig: PlainGalleryConfig;

  /**
   * Output to emit an event when the modal gallery is closed.
   */
  @Output() close: EventEmitter<ImageModalEvent> = new EventEmitter<ImageModalEvent>();
  /**
   * Output to emit an event when an image is changed.
   */
  @Output() show: EventEmitter<ImageModalEvent> = new EventEmitter<ImageModalEvent>();
  /**
   * Output to emit an event when the current image is the first one.
   */
  @Output() firstImage: EventEmitter<ImageModalEvent> = new EventEmitter<ImageModalEvent>();
  /**
   * Output to emit an event when the current image is the last one.
   */
  @Output() lastImage: EventEmitter<ImageModalEvent> = new EventEmitter<ImageModalEvent>();
  /**
   * Output to emit an event when the modal gallery is closed.
   */
  @Output() hasData: EventEmitter<ImageModalEvent> = new EventEmitter<ImageModalEvent>();
  /**
   * Output to emit an event when a button is clicked, but before that the action is triggered.
   */
  @Output() buttonBeforeHook: EventEmitter<ButtonEvent> = new EventEmitter<ButtonEvent>();
  /**
   * Output to emit an event when a button is clicked, but after that the action is triggered.
   */
  @Output() buttonAfterHook: EventEmitter<ButtonEvent> = new EventEmitter<ButtonEvent>();

  /**
   * Reference to the CurrentImageComponent to invoke methods on it.
   */
  @ViewChild(CurrentImageComponent) currentImageComponent;

  /**
   * Boolean that it is true if the modal gallery is visible. False by default.
   */
  opened = false;
  /**
   * Boolean to open the modal gallery. False by default.
   */
  showGallery = false;
  /**
   * Array of `InternalLibImage` representing the model of this library with all images, thumbs and so on.
   */
  images: InternalLibImage[];
  /**
   * `Image` that is visible right now.
   */
  currentImage: InternalLibImage;

  private galleryServiceSubscription: Subscription;

  /**
   * Constructor with the injection of ´KeyboardService´ and an object to support Server-Side Rendering.
   */
  constructor(private keyboardService: KeyboardService, private galleryService: GalleryService, @Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Method ´ngOnInit´ to init images calling `initImages()`.
   * This is an Angular's lifecycle hook, so its called automatically by Angular itself.
   * In particular, it's called only one time!!!
   */
  ngOnInit() {
    // call initImages to init images and to emit `hasData` event
    this.initImages();

    this.galleryServiceSubscription = this.galleryService.navigate.subscribe((index: number) => {
      this.currentImage = this.images[index];
      // emit a new ImageModalEvent with the index of the current image
      this.show.emit(new ImageModalEvent(Action.LOAD, index + 1));
    });
  }

  /**
   * Method ´ngOnChanges´ to re-init images if input is changed.
   * This is an Angular's lifecycle hook, so its called automatically by Angular itself.
   * In particular, it's called before `ngOnInit()` and whenever one or more data-bound input properties change.
   * @param changes `SimpleChanges` object of current and previous property values provided by Angular.
   */
  ngOnChanges(changes: SimpleChanges) {
    const imagesChange: SimpleChange = changes.modalImages;
    const plainGalleryConfigChange: SimpleChange = changes.plainGalleryConfig;

    if (imagesChange && !imagesChange.firstChange && imagesChange.previousValue !== imagesChange.currentValue) {
      this.initImages();
    }

    if (plainGalleryConfigChange) {
      // const prevPlainGalleryConfigChange: any = plainGalleryConfigChange.previousValue;
      const currPlainGalleryConfigChange: PlainGalleryConfig = plainGalleryConfigChange.currentValue;
      if (
        currPlainGalleryConfigChange.layout &&
        currPlainGalleryConfigChange.layout instanceof AdvancedLayout &&
        currPlainGalleryConfigChange.layout.modalOpenerByIndex !== -1
      ) {
        // console.log('opening modal gallery from custom plain gallery, index: ', currPlainGalleryConfigChange);
        this.showModalGallery(currPlainGalleryConfigChange.layout.modalOpenerByIndex);
      }
    }
  }

  /**
   * Method called by custom upper buttons.
   * @param {ButtonEvent} event payload
   */
  onCustomEmit(event: ButtonEvent) {
    const eventToEmit: ButtonEvent = this.getButtonEventToEmit(event);
    this.buttonBeforeHook.emit(eventToEmit);
    // console.log('on onCustomEmit', eventToEmit);
    this.buttonAfterHook.emit(eventToEmit);
  }

  // TODO implement on refresh
  // /**
  //  * Method called by the refresh upper button.
  //  * STILL NOT IMPLEMENTED, SO DON'T USE IT
  //  * @param {ButtonEvent} event payload
  //  */
  // onRefresh(event: ButtonEvent) {
  //   const eventToEmit: ButtonEvent = this.getButtonEventToEmit(event);
  //
  //   this.buttonBeforeHook.emit(eventToEmit);
  //   // console.log('TODO implement on refresh inside the library', eventToEmit);
  //
  //   this.currentImage = Object.assign({}, this.currentImage, { previouslyLoaded: false });
  //
  //   // TODO add logic to hide and show the current image
  //
  //   // console.log('onRefresh', this.currentImage);
  //
  //   // const indexNum: number = this.currentImageComponent.getIndex();
  //
  //   // this.images = this.images.map((val: InternalLibImage, index: number) => {
  //   //   if (index !== 2) {
  //   //     return val;
  //   //   } else {
  //   //     const img: InternalLibImage = Object.assign({}, val, {previouslyLoaded: false});
  //   //     return img;
  //   //   }
  //   // });
  //   //
  //   // this.closeGallery();
  //   // this.showModalGallery(2);
  //
  //   this.buttonAfterHook.emit(eventToEmit);
  // }

  /**
   * Method called by the delete upper button.
   * @param {ButtonEvent} event payload
   */
  onDelete(event: ButtonEvent) {
    const eventToEmit: ButtonEvent = this.getButtonEventToEmit(event);
    this.buttonBeforeHook.emit(eventToEmit);

    if (this.images.length === 1) {
      this.closeGallery();
    }

    const imageIndexToDelete: number = this.currentImageComponent.getIndexToDelete(event.image);
    if (imageIndexToDelete === this.images.length - 1) {
      // last image
      this.currentImageComponent.prevImage();
    } else {
      this.currentImageComponent.nextImage();
    }

    this.buttonAfterHook.emit(eventToEmit);
  }

  /**
   * Method called by the navigate upper button.
   * @param {ButtonEvent} event payload
   */
  onNavigate(event: ButtonEvent) {
    const eventToEmit: ButtonEvent = this.getButtonEventToEmit(event);
    this.buttonBeforeHook.emit(eventToEmit);
    // To support SSR
    if (isPlatformBrowser(this.platformId)) {
      if (eventToEmit.image && eventToEmit.image.modal.extUrl) {
        // where I should open this link? The current tab or another one?
        if (eventToEmit.button && eventToEmit.button.extUrlInNewTab) {
          window.open(eventToEmit.image.modal.extUrl, '_blank');
        } else {
          window.location.href = eventToEmit.image.modal.extUrl;
        }
      }
    }
    this.buttonAfterHook.emit(eventToEmit);
  }

  /**
   * Method called by the download upper button.
   * @param {ButtonEvent} event payload
   */
  onDownload(event: ButtonEvent) {
    const eventToEmit: ButtonEvent = this.getButtonEventToEmit(event);
    this.buttonBeforeHook.emit(eventToEmit);
    this.downloadImage();
    this.buttonAfterHook.emit(eventToEmit);
  }

  /**
   * Method called by the close upper button.
   * @param {ButtonEvent} event payload
   * @param {Action} action that triggered the close method. `Action.NORMAL` by default
   */
  onCloseGallery(event: ButtonEvent, action: Action = Action.NORMAL) {
    const eventToEmit: ButtonEvent = this.getButtonEventToEmit(event);
    this.buttonBeforeHook.emit(eventToEmit);
    this.closeGallery(action);
    this.buttonAfterHook.emit(eventToEmit);
  }

  /**
   * Method to close the modal gallery specifying the action.
   * It also reset the `keyboardService` to prevent multiple listeners.
   * @param {Action} action type. `Action.NORMAL` by default
   */
  closeGallery(action: Action = Action.NORMAL) {
    this.close.emit(new ImageModalEvent(action, true));
    this.opened = false;
    this.keyboardService.reset();

    // shows scrollbar
    document.body.style.overflow = 'visible';
  }

  /**
   * Method called when you click on an image of your plain (or inline) gallery.
   * @param {number} index of the clicked image
   */
  onShowModalGallery(index: number) {
    this.showModalGallery(index);
  }

  /**
   * Method to show the modal gallery displaying the image with
   * the index specified as input parameter.
   * It will also register a new `keyboardService` to catch keyboard's events to download the current
   * image with keyboard's shortcuts. This service, will be removed either when modal gallery component
   * will be destroyed or when the gallery is closed invoking the `closeGallery` method.
   * @param {number} index of the image to show
   */
  showModalGallery(index: number) {
    // hides scrollbar
    document.body.style.overflow = 'hidden';

    this.keyboardService.add((event: KeyboardEvent, combo: string) => {
      if (event.preventDefault) {
        event.preventDefault();
      } else {
        // internet explorer
        event.returnValue = false;
      }
      this.downloadImage();
    });

    this.opened = true;
    this.currentImage = this.images[index];

    // emit a new ImageModalEvent with the index of the current image
    this.show.emit(new ImageModalEvent(Action.LOAD, index + 1));
  }

  /**
   * Method called when the image changes and used to update the `currentImage` object.
   * @param {ImageModalEvent} event payload
   */
  onChangeCurrentImage(event: ImageModalEvent) {
    const newIndex: number = <number>event.result;

    // TODO add validation
    this.currentImage = this.images[newIndex];

    // emit first/last event based on newIndex value
    this.emitBoundaryEvent(event.action, newIndex);

    // emit current visible image index
    this.show.emit(new ImageModalEvent(event.action, newIndex + 1));
  }

  isPlainGalleryVisible(): boolean {
    if (this.plainGalleryConfig && this.plainGalleryConfig.layout && this.plainGalleryConfig.layout instanceof AdvancedLayout) {
      return !this.plainGalleryConfig.layout.hideDefaultPlainGallery;
    }
    return true;
  }

  /**
   * Method called when you click 'outside' (i.e. on the semi-transparent background)
   * to close the modal gallery if `enableCloseOutside` is true.
   * @param {boolean} event payload. True to close the modal gallery, false otherwise
   */
  onClickOutside(event: boolean) {
    if (event && this.enableCloseOutside) {
      this.closeGallery(Action.CLICK);
    }
  }

  /**
   * Method called when an image is loaded and the loading spinner has gone.
   * It sets the previouslyLoaded flag inside the Image to hide loading spinner when displayed again.
   * @param {ImageLoadEvent} event payload
   */
  onImageLoad(event: ImageLoadEvent) {
    // console.log('modal-image onImageLoad', event);
    // console.log('modal-image onImageLoad images before', this.images);

    // sets as previously loaded the image with index specified by `event.status`
    this.images = this.images.map((img: InternalLibImage) => {
      if (img && img.id === event.id) {
        return Object.assign({}, img, { previouslyLoaded: event.status });
      }
      return img;
    });

    // console.log('modal-image onImageLoad images after', this.images);
  }

  /**
   * Method called when a dot is clicked and used to update the current image.
   * @param {number} index of the clicked dot
   */
  onClickDot(index: number) {
    this.currentImage = this.images[index];
  }

  /**
   * Method called when an image preview is clicked and used to update the current image.
   * @param {Image} preview image
   */
  onClickPreview(preview: Image) {
    const imageFound: InternalLibImage | undefined = this.images.find((img: InternalLibImage) => img.id === preview.id);
    if (!!imageFound) {
      this.currentImage = <InternalLibImage>imageFound;
    }
  }

  /**
   * Method to download the current image, only if `downloadable` is true.
   * It contains also a logic to enable downloading features also for IE11.
   */
  downloadImage() {
    if (!this.downloadable) {
      return;
    }
    // If IE11 or Microsoft Edge use msSaveBlob(...)
    if (this.isIEorEdge()) {
      // I cannot use fetch API because IE11 doesn't support it,
      // so I have to switch to XMLHttpRequest
      this.downloadImageOnlyIEorEdge();
    } else {
      // for all other browsers
      this.downloadImageAllBrowsers();
    }
  }

  /**
   * Method to cleanup resources. In fact, this will reset keyboard's service.
   * This is an Angular's lifecycle hook that is called when this component is destroyed.
   */
  ngOnDestroy() {
    this.keyboardService.reset();

    if (this.galleryServiceSubscription) {
      this.galleryServiceSubscription.unsubscribe();
    }
  }

  /**
   * Private method to download the current image for all browsers except for IE11.
   */
  private downloadImageAllBrowsers() {
    const link = document.createElement('a');
    link.href = this.currentImage.modal.img;
    link.setAttribute('download', this.getFileName(this.currentImage.modal.img));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Private method to download the current image only for IE11 using
   * custom javascript's methods available only on IE.
   */
  private downloadImageOnlyIEorEdge() {
    if (isPlatformBrowser(this.platformId)) {
      const req = new XMLHttpRequest();
      req.open('GET', this.currentImage.modal.img, true);
      req.responseType = 'arraybuffer';
      req.onload = event => {
        const blob = new Blob([req.response], { type: 'image/png' });
        window.navigator.msSaveBlob(blob, this.getFileName(this.currentImage.modal.img));
      };
      req.send();
    }
  }

  /**
   * Private method to get the `ButtonEvent` to emit, merging the input `ButtonEvent`
   * with the current image.
   * @param {ButtonEvent} event payload to return
   * @returns {ButtonEvent} event payload with the current image included
   */
  private getButtonEventToEmit(event: ButtonEvent): ButtonEvent {
    return Object.assign(event, { image: this.currentImage });
  }

  /**
   * Private method to get the filename from an input path.
   * This is used to get the image's name from its path.
   * @param {string} path that represents the path of the image
   * @returns {string} string filename from the input path
   */
  private getFileName(path: string): string {
    return path.replace(/^.*[\\\/]/, '');
  }

  /**
   * Private method to initialize `images` as array of `Image`s.
   * Also, it will emit ImageowmodaModalEvent to say that images are loaded.
   */
  private initImages() {
    this.images = <InternalLibImage[]>this.modalImages;
    this.hasData.emit(new ImageModalEvent(Action.LOAD, true));
    this.showGallery = this.images.length > 0;
  }

  /**
   * Private method to emit events when either the last or the first image are visible.
   * @param action Enum of type Action that represents the source of the event that changed the
   *  current image to the first one or the last one.
   * @param indexToCheck is the index number of the image (the first or the last one).
   */
  private emitBoundaryEvent(action: Action, indexToCheck: number) {
    // to emit first/last event
    switch (indexToCheck) {
      case 0:
        this.firstImage.emit(new ImageModalEvent(action, true));
        break;
      case this.images.length - 1:
        this.lastImage.emit(new ImageModalEvent(action, true));
        break;
    }
  }

  /**
   * Private method to check if this library is running on
   * Microsoft browsers or not (i.e. it detects both IE11 and Edge)
   * supporting also Server-Side Rendering.
   * Inspired by https://msdn.microsoft.com/it-it/library/hh779016(v=vs.85).aspx
   * @returns {any} the result
   */
  private isIEorEdge(): any {
    if (isPlatformBrowser(this.platformId)) {
      // if both Blob constructor and msSaveOrOpenBlob are supported by the current browser
      return window.Blob && window.navigator.msSaveOrOpenBlob;
    }
    if (isPlatformServer(this.platformId)) {
      // server only
      return true;
    }
  }
}
