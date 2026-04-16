class HScrollSlider extends HTMLElement {
    constructor() {
      super();
      this.dragThreshold = 5;
      this.attributesData = {
        areaSelector: 'area-selector',
        slideSelector: 'slide-selector',
        prevButtonSelector: 'prev-btn-selector',
        nextButtonSelector: 'next-btn-selector',
        scrollable: 'scrollable',
        scrollableLeft: 'scrollable-left',
        scrollableRight: 'scrollable-right',
        scrolling: 'scrolling'
      };
      this.cssVars = {
        thumbWidth: 'hscroll-thumb-width',
        thumbShift: 'hscroll-thumb-shift',
        scrollProgress: 'hscroll-scroll-progress'
      };
      this.defaultSelectors = {
        area: '[hscroll-area]',
        slide: '[hscroll-slide]',
        prevButton: '[hscroll-button-prev]',
        nextButton: '[hscroll-button-next]'
      };
      this._props = {
        scrollTimer: undefined,
        isMouseDown: false,
        isDragged: false,
        startX: undefined,
        scrollLeft: undefined,
        $scrollableArea: null,
        $slides: [],
        $buttons: []
      };
    }
  
    connectedCallback() {
      this.init();
      window.addEventListener('resize', this.render.bind(this));
      this.render();
    }
  
    init() {
      this.initScrollableArea();
      this.initSlides();
      this.initButtons();
    }
  
    initScrollableArea() {
      let $scrollableArea = null;
      const scrollableAreaSelector = this.getAttribute(this.attributesData.areaSelector) || this.defaultSelectors.area;
      if (scrollableAreaSelector) {
        $scrollableArea = this.querySelector(scrollableAreaSelector);
      }
      if ($scrollableArea === this._props.$scrollableArea) return;
  
      if ($scrollableArea) {
        $scrollableArea.addEventListener('mousedown', event => {
          this._props.isMouseDown = true;
          this._props.startX = event.pageX - $scrollableArea.offsetLeft;
          this._props.scrollLeft = $scrollableArea.scrollLeft;
        });
  
        $scrollableArea.addEventListener('mouseleave', () => {
          this._props.isMouseDown = false;
        });
  
        $scrollableArea.addEventListener('mouseup', () => {
          this._props.isMouseDown = false;
        });
  
        $scrollableArea.addEventListener('mousemove', event => {
          if (!this._props.isMouseDown) return;
          event.preventDefault();
          const currentX = event.pageX - $scrollableArea.offsetLeft;
          const dragValue = (currentX - this._props.startX);
          if (Math.abs(dragValue) > this.dragThreshold) {
            this._props.isDragged = true;
          }
          $scrollableArea.scrollLeft = this._props.scrollLeft - dragValue;
        });
  
        $scrollableArea.addEventListener('click', event => {
          if (this._props.isDragged) {
            event.preventDefault();
          }
          this._props.isDragged = false;
        });
  
        $scrollableArea.addEventListener('scroll', () => {
          this.render();
          this.setAttribute(this.attributesData.scrolling, '');
          if (this._props.scrollTimer !== undefined) {
            clearTimeout(this._props.scrollTimer);
          }
          this._props.scrollTimer = setTimeout(() => {
            this.removeAttribute(this.attributesData.scrolling, '');
          }, 150);
        });
      }
  
      this._props = {
        ...this._props,
        $scrollableArea,
      };
    }
  
    initSlides() {
      let $slides = [];
      const slideSelector = this.getAttribute(this.attributesData.slideSelector) || this.defaultSelectors.slide;
      if (slideSelector && this._props.$scrollableArea) {
        $slides = [...this._props.$scrollableArea.querySelectorAll(slideSelector)];
      }
      this._props.$slides = $slides;
    }
  
    initButtons() {
      if (!('$buttons' in this._props)) {
        this._props.$buttons = [];
      }
  
      const prevButtonSelector = this.getAttribute(this.attributesData.prevButtonSelector) || this.defaultSelectors.prevButton;
      if (prevButtonSelector) {
        this.querySelectorAll(prevButtonSelector).forEach($button => {
          if (this._props.$buttons.includes($button)) return;
          $button.addEventListener('click', () => {
            this.goToPrevSlide();
          });
          this._props.$buttons.push($button);
        })
      }
  
      const nextButtonSelector = this.getAttribute(this.attributesData.nextButtonSelector) || this.defaultSelectors.nextButton;
      if (nextButtonSelector) {
        this.querySelectorAll(nextButtonSelector).forEach($button => {
          if (this._props.$buttons.includes($button)) return;
          $button.addEventListener('click', () => {
            this.goToNextSlide();
          });
          this._props.$buttons.push($button);
        })
      }
    }
  
    goToPrevSlide() {
      if (this._props.$slides.length > 0) {
        let newScrollLeft = 0;
        const originPoint = this._props.$slides[0].offsetLeft;
        const scrollLeft = this._props.$scrollableArea.scrollLeft;
        const minScrollThreshold = 50;
  
        const $prevSlide = [...this._props.$slides].reverse().find($element => 
          $element.offsetLeft + $element.clientWidth - minScrollThreshold < scrollLeft + originPoint
        );
  
        if ($prevSlide) {
          newScrollLeft = $prevSlide.offsetLeft - originPoint;
        }
        if (newScrollLeft < 0) {
          newScrollLeft = 0;
        }
  
        this._props.$scrollableArea.scrollTo({
          top: 0,
          left: newScrollLeft,
          behavior: 'smooth'
        });
      }
    }      
  
    goToNextSlide() {
      if (this._props.$slides.length > 0) {
        const maxScroll = this._props.$scrollableArea.scrollWidth - this._props.$scrollableArea.clientWidth;
        let newScrollLeft = maxScroll;
        const originPoint = this._props.$slides[0].offsetLeft;
        const scrollLeft = this._props.$scrollableArea.scrollLeft;
  
        const $nextSlide = this._props.$slides.find($element => $element.offsetLeft > scrollLeft + originPoint + 1);
        if ($nextSlide) {
          newScrollLeft = $nextSlide.offsetLeft - originPoint;
        }
        if (newScrollLeft > maxScroll) {
          newScrollLeft = maxScroll
        }
  
        this._props.$scrollableArea.scrollTo({
          top: 0,
          left: newScrollLeft,
          behavior: 'smooth'
        });
      }
    }
  
    render() {
      this.renderCssVars();
      this.renderAttributes();
    }
  
    renderCssVars() {
      if (!this._props.$scrollableArea) return;
      let thumbWidth = 100;
      let thumbShift = 0;
      let scrollProgress = 0;
  
      const clientWidth = this._props.$scrollableArea.clientWidth;
      const scrollWidth = this._props.$scrollableArea.scrollWidth;
      const scrollLeft = this._props.$scrollableArea.scrollLeft;
      const maxScroll = scrollWidth - clientWidth;
  
      if (scrollWidth > clientWidth) {
        thumbWidth = clientWidth * 100.0 / scrollWidth;
        thumbShift = scrollLeft * 100.0 / scrollWidth;
        scrollProgress = scrollLeft * 100.0 / maxScroll;
      }
  
      this.style.setProperty(`--${this.cssVars.thumbWidth}`, `${thumbWidth}%`);
      this.style.setProperty(`--${this.cssVars.thumbShift}`, `${thumbShift}%`);
      this.style.setProperty(`--${this.cssVars.scrollProgress}`, `${scrollProgress}%`);
    }
  
    renderAttributes() {
      const $scrollableArea = this._props.$scrollableArea;
      if (!$scrollableArea) return;
  
      const isScrollable = $scrollableArea.scrollWidth > $scrollableArea.clientWidth;
      if (isScrollable) {
        this.setAttribute(this.attributesData.scrollable, '');
  
        if ($scrollableArea.scrollLeft > 0) {
          this.setAttribute(this.attributesData.scrollableLeft, '');
        } else {
          this.removeAttribute(this.attributesData.scrollableLeft);  
        }
  
        if ($scrollableArea.scrollLeft < $scrollableArea.scrollWidth - $scrollableArea.clientWidth) {
          this.setAttribute(this.attributesData.scrollableRight, '');
        } else {
          this.removeAttribute(this.attributesData.scrollableRight);
        } 
  
      } else {
        this.removeAttribute(this.attributesData.scrollable);
        this.removeAttribute(this.attributesData.scrollableLeft);
        this.removeAttribute(this.attributesData.scrollableRight);
      }
    }
}
  
if (!customElements.get('hscroll-slider')) customElements.define('hscroll-slider', HScrollSlider)
  