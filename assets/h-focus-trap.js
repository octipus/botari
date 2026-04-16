/**
 * Focus Trap Helper
 *
 * Provides focus management for modal dialogs, dropdowns, and other UI components
 * that need to contain keyboard navigation within a specific element.
 *
 * @class FocusTrap
 *
 * @example
 * // Basic usage
 * const modalElement = document.querySelector('.modal');
 * const focusTrap = new FocusTrap(modalElement);
 *
 * // When opening the modal
 * focusTrap.activate();
 *
 * // When closing the modal
 * focusTrap.deactivate();
 *
 * @example
 * // Usage inside a custom element
 * class MyDialog extends HTMLElement {
 *     constructor() {
 *         super();
 *         // With click trap disabled (allows interaction outside trap element)
 *         this.focusTrap = new FocusTrap(this);
 *         // With click trap enabled (prevents interaction outside trap element)
 *         // this.focusTrap = new FocusTrap(this, { enableClickTrap: true });
 *     }
 *
 *     open() {
 *         this.setAttribute('open', '');
 *         this.focusTrap.activate();
 *     }
 *
 *     close() {
 *         this.removeAttribute('open');
 *         this.focusTrap.deactivate();
 *     }
 * }
 */
export class FocusTrap {
    /**
     * Creates a new FocusTrap instance
     * @param {HTMLElement} element - The element to trap focus within
     * @param {Object} options - Configuration options
     * @param {boolean} options.enableClickTrap - Whether to prevent clicks outside the trap element (default: false)
     */
    constructor(element, options = {}) {
        if (!element || !(element instanceof HTMLElement)) {
            throw new Error('FocusTrap requires a valid HTMLElement');
        }

        this.trapElement = element;
        this.previousActiveElement = null;
        this.enableClickTrap = options.enableClickTrap || false;
        this._isActive = false;

        // Bind methods to maintain correct 'this' context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    /**
     * Get all focusable elements within the trap element
     * @returns {HTMLElement[]} Array of focusable elements
     * @private
     */
    getFocusableElements() {
        const selector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            'details',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');

        return Array.from(this.trapElement.querySelectorAll(selector)).filter(
            (el) => {
                // Check if element is visible
                if (el.offsetParent === null) return false;

                // Check if element is not disabled
                if (el.hasAttribute('disabled')) return false;

                // Check if element is not hidden
                if (el.hasAttribute('hidden')) return false;

                // Check aria-hidden
                if (el.getAttribute('aria-hidden') === 'true') return false;

                return true;
            }
        );
    }

    /**
     * Activate the focus trap
     * @public
     */
    activate() {
        if (this._isActive) return;
        this._isActive = true;

        // Store the currently focused element to restore later
        this.previousActiveElement = document.activeElement;

        // Add event listeners
        document.addEventListener('keydown', this.handleKeyDown, true);
        document.addEventListener('focus', this.handleFocus, true);

        // Only add click listener if explicitly enabled
        if (this.enableClickTrap) {
            document.addEventListener('click', this.handleClick, true);
        }

        // Focus the first focusable element
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
            // Small delay to ensure the element is ready
            requestAnimationFrame(() => {
                focusableElements[0].focus({ preventScroll: true });
            });
        }
    }

    /**
     * Deactivate the focus trap
     * @public
     */
    deactivate() {
        if (!this._isActive) return;
        this._isActive = false;

        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown, true);
        document.removeEventListener('focus', this.handleFocus, true);

        // Only remove click listener if it was added
        if (this.enableClickTrap) {
            document.removeEventListener('click', this.handleClick, true);
        }

        // Restore focus to the previously focused element
        if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
            // Check if the element is still in the document and visible
            if (document.contains(this.previousActiveElement)) {
                try {
                    this.previousActiveElement.focus({ preventScroll: true });
                } catch (error) {
                    console.warn('FocusTrap: Failed to restore focus:', error);
                }
            }
        }

        this.previousActiveElement = null;
    }

    /**
     * Toggle click trap on or off
     * @param {boolean} enabled - Whether to enable or disable click trapping
     * @public
     */
    setClickTrap(enabled) {
        if (enabled && !this.enableClickTrap) {
            this.enableClickTrap = true;
            if (this._isActive) {
                document.addEventListener('click', this.handleClick, true);
            }
        } else if (!enabled && this.enableClickTrap) {
            this.enableClickTrap = false;
            document.removeEventListener('click', this.handleClick, true);
        }
    }

    /**
     * Check if the focus trap is currently active
     * @returns {boolean} True if active
     * @public
     */
    isActive() {
        return this._isActive;
    }

    /**
     * Handle Tab key to cycle focus within trap element
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    handleKeyDown(event) {
        if (event.key !== 'Tab') return;

        const focusableElements = this.getFocusableElements();
        if (focusableElements.length === 0) {
            event.preventDefault();
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const { activeElement } = document;

        // Handle Shift+Tab (backwards)
        if (event.shiftKey) {
            if (activeElement === firstElement || !this.trapElement.contains(activeElement)) {
                lastElement.focus({ preventScroll: true });
                event.preventDefault();
            }
        }
        // Handle Tab (forwards)
        else {
            if (activeElement === lastElement || !this.trapElement.contains(activeElement)) {
                firstElement.focus({ preventScroll: true });
                event.preventDefault();
            }
        }
    }

    /**
     * Handle focus events to keep focus within trap element
     * @param {FocusEvent} event - Focus event
     * @private
     */
    handleFocus(event) {
        // If focus moves outside the trap element, bring it back
        if (!this.trapElement.contains(event.target)) {
            event.stopPropagation();

            const focusableElements = this.getFocusableElements();
            if (focusableElements.length > 0) {
                // Focus the first element
                focusableElements[0].focus({ preventScroll: true });
            }
        }
    }

    /**
     * Handle click events to prevent interaction outside trap element
     * @param {MouseEvent} event - Click event
     * @private
     */
    handleClick(event) {
        if (!this.trapElement.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
}

/**
 * Default export for convenience
 */
export default FocusTrap;
