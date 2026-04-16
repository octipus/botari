/**
 * QuickBuy Controller Component
 * 
 * Orchestrates all quickbuy functionality including variant selection, content loading, and cart operations.
 * Acts as the main controller that coordinates between variant pickers, details menu, and cart operations.
 * 
 * @class QuickBuyController
 * @extends HTMLElement
 * 
 * @example
 * <coretex-quickbuy data-product-handle="my-product" data-base-url="/products/my-product">
 *   <details>
 *     <summary>Quick Buy</summary>
 *     <details-menu src="/products/my-product?section_id=x-quickbuy">
 *       <include-fragment>Loading...</include-fragment>
 *     </details-menu>
 *   </details>
 * </coretex-quickbuy>
 * 
 * @fires QuickBuyController#variant:change - When variant selection changes
 * @fires QuickBuyController#quickbuy:opened - When quickbuy is opened
 * @fires QuickBuyController#quickbuy:closed - When quickbuy is closed
 */
export default class QuickBuyController extends HTMLElement {
    /**
     * Creates a new QuickBuy controller instance
     * @constructor
     */
    constructor() {
        super();
        
        /**
         * Component state management
         * @private
         * @type {Object}
         * @property {Object|null} product - Current product data
         * @property {Object|null} selectedVariant - Currently selected variant
         * @property {boolean} isLoading - Whether content is currently loading
         * @property {boolean} isOpen - Whether quickbuy is currently open
         * @property {string|null} productHandle - Product handle/slug
         * @property {string|null} baseUrl - Base product URL
         * @property {Object|null} focusState - Stored focus state for restoration after content reload
         */
        this.state = {
            product: null,
            selectedVariant: null,
            isLoading: false,
            isOpen: false,
            productHandle: null,
            baseUrl: null,
            focusState: null
        };
        
        /**
         * Cached DOM references for performance
         * @private
         */
        this._detailsMenu = null;
        this._details = null;
        this._includeFragment = null;
        this._form = null;
        this._variantPicker = null;
        
        // Bind methods to maintain correct context
        this._handleVariantChange = this._handleVariantChange.bind(this);
        this._handleAddToCart = this._handleAddToCart.bind(this);
        this._handleDetailsToggle = this._handleDetailsToggle.bind(this);
        this._handleContentLoaded = this._handleContentLoaded.bind(this);
        this._handleContentError = this._handleContentError.bind(this);
    }

    /**
     * Called when component is connected to DOM
     * Initializes the component and sets up event listeners
     */
    connectedCallback() {
        this._initializeComponent();
        this._setupEventListeners();
    }

    /**
     * Called when component is disconnected from DOM
     * Cleans up event listeners and references
     */
    disconnectedCallback() {
        this._cleanup();
    }

    /**
     * Initialize component state and cache references
     * @private
     */
    _initializeComponent() {
        // Parse initial data from attributes
        this.state.productHandle = this.getAttribute('data-product-handle');
        this.state.baseUrl = this.getAttribute('data-base-url');
        
        // Cache component references
        this._cacheComponentReferences();
    }

    /**
     * Cache references to child components for performance
     * @private
     */
    _cacheComponentReferences() {
        // Details menu component (handles dropdown mechanics)
        this._detailsMenu = this.querySelector('details-menu');
        this._details = this.querySelector('details');
        this._includeFragment = this.querySelector('include-fragment');
        
        // Initial form reference (will be updated when content loads)
        this._form = null;
        this._variantPicker = null;
    }

    /**
     * Setup all event listeners for the component
     * @private
     */
    _setupEventListeners() {
        // Listen for details toggle (open/close)
        if (this._details) {
            this._details.addEventListener('toggle', this._handleDetailsToggle);
        }

        // Listen for content loaded events
        if (this._includeFragment) {
            this._includeFragment.addEventListener('loadend', this._handleContentLoaded);
            this._includeFragment.addEventListener('loaderror', this._handleContentError);
        }

        // Global variant change listener (bubbles up from variant picker)
        this.addEventListener('variant:change', this._handleVariantChange);
    }

    /**
     * Handle details dropdown toggle (open/close)
     * @private
     * @param {Event} _event - Toggle event (unused)
     */
    _handleDetailsToggle(_event) {
        const isOpen = this._details.hasAttribute('open');
        this.state.isOpen = isOpen;
        
        if (isOpen) {
            // Quickbuy opened - content will be loaded by details-menu
            this.state.isLoading = true;
            this.dispatchEvent(new CustomEvent('quickbuy:opened', { bubbles: true }));
        } else {
            // Quickbuy closed - cleanup
            this._cleanup();
            this.dispatchEvent(new CustomEvent('quickbuy:closed', { bubbles: true }));
        }
    }

    /**
     * Handle content loaded after fragment loads
     * @private
     * @param {Event} _event - Load end event (unused)
     */
    _handleContentLoaded(_event) {
        this.state.isLoading = false;
        
        // Re-cache references to newly loaded components
        this._cacheLoadedComponents();
        
        // Setup form handling
        this._setupFormHandling();
        
        // Restore focus state if it was stored
        this._restoreFocusState();
    }

    /**
     * Handle content loading errors (e.g., password-protected stores)
     * @private
     * @param {CustomEvent} event - Load error event
     * @param {Object} event.detail - Error details
     * @param {string} event.detail.src - The source URL that failed
     * @param {Error} event.detail.error - The error that occurred
     */
    _handleContentError(event) {
        this.state.isLoading = false;
        
        console.warn('QuickBuy: Content loading failed:', event.detail.error.message);
        
        // Close the quickbuy since we can't load the content
        if (this._details && this._details.hasAttribute('open')) {
            this._details.removeAttribute('open');
        }
        
        // Dispatch a quickbuy-specific error event for external handling
        this.dispatchEvent(new CustomEvent('quickbuy:error', {
            bubbles: true,
            detail: {
                error: event.detail.error,
                src: event.detail.src,
                context: 'content-loading'
            }
        }));
    }

    /**
     * Cache references to components that were just loaded dynamically
     * @private
     */
    _cacheLoadedComponents() {
        // Find the form and variant picker in loaded content
        this._form = this.querySelector('form[data-type="add-to-cart-form"]');
        this._variantPicker = this.querySelector('coretex-variant-picker');
    }

    /**
     * Setup form submission handling for add to cart
     * @private
     */
    _setupFormHandling() {
        if (!this._form) return;
        
        // Remove existing listeners to prevent duplicates
        this._form.removeEventListener('submit', this._handleAddToCart);
        
        // Add form submission listener
        this._form.addEventListener('submit', this._handleAddToCart);
    }

    /**
     * Handle variant selection changes from variant picker
     * @private
     * @param {CustomEvent} event - Variant change event
     * @param {Object} event.detail - Event details
     * @param {string} event.detail.context - Context ('quickview', 'pdp', etc.)
     * @param {string} event.detail.targetUrl - New product URL
     * @param {string} event.detail.optionValues - Selected option values
     * @param {string} event.detail.productHandle - Product handle
     */
    _handleVariantChange(event) {
        // Only handle quickview context
        if (event.detail.context !== 'quickview') return;
        
        const { targetUrl, optionValues, productHandle } = event.detail;
        
        // Store focus state before content reload
        this._storeFocusState();
        
        // Update state
        this.state.productHandle = productHandle;
        this.state.isLoading = true;
        
        // Build new URL for content reload
        const newUrl = this._buildSectionUrl(targetUrl, optionValues);
        
        // Reload content via include-fragment
        if (this._includeFragment) {
            this._includeFragment.setAttribute('src', newUrl);
        }
    }

    /**
     * Handle add to cart form submission
     * @private
     * @param {Event} _event - Form submit event (unused, handled by ajax-cart)
     */
    _handleAddToCart(_event) {
        // Let the ajax-cart-product-form handle the actual submission
        // Set up event listeners to handle the cart request lifecycle
        this._setupCartRequestHandlers();
    }

    /**
     * Build section URL with variant parameters for content loading
     * @private
     * @param {string} productUrl - Base product URL
     * @param {string} optionValues - Selected option values (comma-separated IDs)
     * @returns {string} Complete section URL for loading quickbuy content
     */
    _buildSectionUrl(productUrl, optionValues) {
        let url = productUrl;
        
        // Add section_id parameter
        url += (url.includes('?') ? '&' : '?') + 'section_id=x-quickbuy';
        
        // Add option values if provided
        if (optionValues) {
            url += '&option_values=' + encodeURIComponent(optionValues);
        }
        
        return url;
    }

    /**
     * Store the current focus state before content reload
     * @private
     */
    _storeFocusState() {
        const activeElement = document.activeElement;
        if (!activeElement || !this.contains(activeElement)) {
            this.state.focusState = null;
            return;
        }

        // Store focus information for restoration
        this.state.focusState = {
            tagName: activeElement.tagName,
            type: activeElement.type || null,
            name: activeElement.name || null,
            value: activeElement.value || null,
            selectedIndex: activeElement.selectedIndex || null,
            selector: this._generateUniqueSelector(activeElement)
        };
    }

    /**
     * Restore focus state after content reload
     * @private
     */
    _restoreFocusState() {
        if (!this.state.focusState) return;

        // Only restore focus if this quickbuy is currently open
        if (!this.state.isOpen || !this._details?.hasAttribute('open')) {
            this.state.focusState = null;
            return;
        }

        const { tagName, type, name, value, selectedIndex, selector } = this.state.focusState;

        try {
            // Temporarily disable autofocus to prevent conflicts
            const autofocusElements = this.querySelectorAll('[autofocus]');
            const originalAutofocus = new Map();
            
            autofocusElements.forEach(el => {
                originalAutofocus.set(el, true);
                el.removeAttribute('autofocus');
            });

            // Try to find the element using the stored selector first
            let targetElement = this.querySelector(selector);

            // Fallback: find by name attribute (most reliable for form elements)
            if (!targetElement && name) {
                targetElement = this.querySelector(`${tagName.toLowerCase()}[name="${name}"]`);
            }

            // Final fallback: find by tag name and attributes
            if (!targetElement) {
                const elements = this.querySelectorAll(tagName.toLowerCase());
                targetElement = Array.from(elements).find(el => {
                    if (name && el.name !== name) return false;
                    if (type && el.type !== type) return false;
                    return true;
                });
            }

            // Debug: Log if we couldn't find the target element or found wrong one
            if (!targetElement && name) {
                console.warn('QuickBuy: Could not restore focus - element not found:', { name, tagName, selector });
            }

            if (targetElement) {
                // For select elements, restore the selected index
                if (tagName === 'SELECT' && selectedIndex !== null) {
                    targetElement.selectedIndex = selectedIndex;
                }

                // Detect iOS devices (all iOS browsers have this issue due to WebKit)
                const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

                // Skip focus restoration for select elements on iOS to prevent reopening
                const shouldSkipFocus = tagName === 'SELECT' && isIOS;

                if (!shouldSkipFocus) {
                    // Restore focus without scrolling
                    targetElement.focus({ preventScroll: true });

                    // For text inputs, restore cursor position
                    if (value && (type === 'text' || type === 'email' || type === 'password')) {
                        targetElement.setSelectionRange(value.length, value.length);
                    }
                }
            }

            // Restore autofocus attributes after a brief delay to ensure our focus takes precedence
            setTimeout(() => {
                originalAutofocus.forEach((_, el) => {
                    if (el !== targetElement) { // Don't restore autofocus on the element we just focused
                        el.setAttribute('autofocus', '');
                    }
                });
            }, 50);

        } catch (error) {
            console.warn('QuickBuy: Failed to restore focus state:', error);
        } finally {
            // Clear focus state after restoration attempt
            this.state.focusState = null;
        }
    }

    /**
     * Generate a unique selector for an element within this component
     * @private
     * @param {HTMLElement} element - The element to generate a selector for
     * @returns {string} CSS selector string
     */
    _generateUniqueSelector(element) {
        const parts = [];
        let current = element;

        while (current && current !== this) {
            let selector = current.tagName.toLowerCase();
            
            // Add ID if available
            if (current.id) {
                selector += `#${current.id}`;
                parts.unshift(selector);
                break;
            }
            
            // Add class if available
            if (current.className) {
                const classes = current.className.trim().split(/\s+/).slice(0, 2); // Limit to first 2 classes
                if (classes.length > 0) {
                    selector += '.' + classes.join('.');
                }
            }
            
            // Add attribute selectors for form elements
            if (current.name) {
                selector += `[name="${current.name}"]`;
            } else if (current.hasAttribute('data-option-value-selector')) {
                selector += '[data-option-value-selector]';
            }
            
            parts.unshift(selector);
            current = current.parentElement;
        }

        return parts.join(' > ');
    }

    /**
     * Setup event listeners for cart request lifecycle
     * @private
     */
    _setupCartRequestHandlers() {
        // Listen for cart request completion to close quickbuy
        const handleRequestEnd = (event) => {
            const { requestState } = event.detail;
            
            // Check if this was an add to cart request from our form
            if (requestState.requestType === 'add' && 
                requestState.info?.initiator && 
                this.contains(requestState.info.initiator)) {
                
                // Check if the request was successful
                if (requestState.responseData?.ok) {
                    // Close quickbuy after successful add to cart
                    setTimeout(() => {
                        if (this._details && this._details.hasAttribute('open')) {
                            this._details.removeAttribute('open');
                        }
                    }, 500); // Brief delay for visual feedback
                }
                
                // Clean up this one-time event listener
                document.removeEventListener('liquid-ajax-cart:request-end', handleRequestEnd);
            }
        };
        
        // Add the event listener
        document.addEventListener('liquid-ajax-cart:request-end', handleRequestEnd);
    }

    /**
     * Cleanup event listeners and references
     * @private
     */
    _cleanup() {
        // Form cleanup
        if (this._form) {
            this._form.removeEventListener('submit', this._handleAddToCart);
        }
        
        // Include fragment cleanup
        if (this._includeFragment) {
            this._includeFragment.removeEventListener('loadend', this._handleContentLoaded);
            this._includeFragment.removeEventListener('loaderror', this._handleContentError);
        }
        
        // Clear component references
        this._form = null;
        this._variantPicker = null;
    }

    // Public API methods
    
    /**
     * Open the quickbuy programmatically
     * @public
     */
    open() {
        if (this._details && !this._details.hasAttribute('open')) {
            this._details.setAttribute('open', '');
        }
    }
    
    /**
     * Close the quickbuy programmatically
     * @public
     */
    close() {
        if (this._details && this._details.hasAttribute('open')) {
            this._details.removeAttribute('open');
        }
    }
    
    /**
     * Get current component state
     * @public
     * @returns {Object} Copy of current state object
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Update product information
     * @public
     * @param {string} productHandle - Product handle/slug
     * @param {string} baseUrl - Base product URL
     */
    setProduct(productHandle, baseUrl) {
        this.state.productHandle = productHandle;
        this.state.baseUrl = baseUrl;
        this.setAttribute('data-product-handle', productHandle);
        this.setAttribute('data-base-url', baseUrl);
    }
}

/**
 * Register the custom element if not already defined
 * This prevents errors if the component is loaded multiple times
 */
if (!customElements.get('coretex-quickbuy')) {
    customElements.define('coretex-quickbuy', QuickBuyController);
}