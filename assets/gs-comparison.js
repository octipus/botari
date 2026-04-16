export default class ImageComparison extends HTMLElement {
    constructor() {
        super();
        this.handleInput = this.handleInput.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }
    
    get isVertical() {
        return this.getAttribute('data-orient') === 'vertical';
    }
    
    connectedCallback() {
        this.range = this.querySelector('input[type="range"]');
        if (!this.range) return;

        // Update range orientation based on component orientation
        this.range.setAttribute('orient', this.isVertical ? 'vertical' : 'horizontal');

        // Set initial position
        this.updatePosition(this.range.value);
        
        // Add range input event listener
        this.range.addEventListener('input', this.handleInput);
        
        // Add touch event listeners to the component itself
        this.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.addEventListener('touchend', this.handleTouchEnd);
        this.addEventListener('touchcancel', this.handleTouchEnd);
        
        // Add mouse event listeners
        this.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }
    
    calculatePositionFromEvent(e, isTouch = false) {
        const rect = this.getBoundingClientRect();
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        if (this.isVertical) {
            const y = clientY - rect.top;
            return Math.round((y / rect.height) * 100);
        } else {
            const x = clientX - rect.left;
            return Math.round((x / rect.width) * 100);
        }
    }
    
    handleMouseDown(e) {
        e.preventDefault();
        this.isMouseDown = true;
        const newValue = this.calculatePositionFromEvent(e);
        this.range.value = Math.min(Math.max(newValue, 1), 99);
        this.updatePosition(this.range.value);
        this.classList.add('sliding');
    }
    
    handleMouseMove(e) {
        if (!this.isMouseDown) return;
        e.preventDefault();
        const newValue = this.calculatePositionFromEvent(e);
        this.range.value = Math.min(Math.max(newValue, 1), 99);
        this.updatePosition(this.range.value);
    }
    
    handleMouseUp() {
        if (!this.isMouseDown) return;
        this.isMouseDown = false;
        this.classList.remove('sliding');
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const newValue = this.calculatePositionFromEvent(e, true);
        this.range.value = Math.min(Math.max(newValue, 1), 99);
        this.updatePosition(this.range.value);
        this.classList.add('sliding');
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const newValue = this.calculatePositionFromEvent(e, true);
        this.range.value = Math.min(Math.max(newValue, 1), 99);
        this.updatePosition(this.range.value);
    }
    
    handleTouchEnd() {
        this.classList.remove('sliding');
    }
    
    handleInput() {
        this.updatePosition(this.range.value);
    }
    
    updatePosition(value) {
        requestAnimationFrame(() => {
            // Round the value to avoid decimal places
            const roundedValue = Math.round(value);
            this.style.setProperty('--percent', `${roundedValue}%`);
        });
    }
    
    disconnectedCallback() {
        if (this.range) {
            this.range.removeEventListener('input', this.handleInput);
        }
        this.removeEventListener('touchstart', this.handleTouchStart);
        this.removeEventListener('touchmove', this.handleTouchMove);
        this.removeEventListener('touchend', this.handleTouchEnd);
        this.removeEventListener('touchcancel', this.handleTouchEnd);
        this.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }
}

if (!customElements.get('image-comparison')) {
    customElements.define('image-comparison', ImageComparison);
}