/**
 * Reusable Variant Picker Component
 * Handles variant selection logic for products with multiple variants
 * Can be used in quick view, product pages, or any other context
 */
export default class CoretexVariantPicker extends HTMLElement {
    constructor() {
        super();
        
        // State management
        this.state = {
            form: null,
            productUrl: null,
            isUpdating: false,
            variantData: null,
            context: 'pdp'
        };
        
        // Bind methods
        this._handleVariantChange = this._handleVariantChange.bind(this);
    }

    connectedCallback() {
        this._initializePicker();
    }

    disconnectedCallback() {
        this._cleanup();
    }

    // Initialize the variant picker
    _initializePicker() {
        this._parseContext();
        this._findForm();
        this._parseVariantData();
        this._setupVariantHandling();
        this._updateFormState();
    }

    // Clean up event listeners
    _cleanup() {
        if (this.state.form) {
            const selectors = this.state.form.querySelectorAll('[data-option-value-selector]');
            selectors.forEach(selector => {
                selector.removeEventListener('change', this._handleVariantChange);
            });
        }
    }

    // Parse context from data attribute
    _parseContext() {
        this.state.context = this.getAttribute('data-context') || 'pdp';
        this.state.productUrl = this.getAttribute('data-product-url') || '';
    }

    // Find the associated form element
    _findForm() {
        // Try to find form by form attribute first
        const formId = this.getAttribute('data-form-id');
        if (formId) {
            this.state.form = document.getElementById(formId);
        }
        
        // Fallback: find closest form
        if (!this.state.form) {
            this.state.form = this.closest('form') || this.querySelector('form');
        }
        
        if (!this.state.form) {
            console.error('CoretexVariantPicker: No associated form found');
        }
    }

    // Parse variant data from JSON script
    _parseVariantData() {
        const dataScript = this.querySelector('[data-variant-picker-data]');
        if (dataScript) {
            try {
                this.state.variantData = JSON.parse(dataScript.textContent);
            } catch (error) {
                console.warn('CoretexVariantPicker: Failed to parse variant data:', error);
                this.state.variantData = null;
            }
        }
    }

    // Setup variant selection event handlers
    _setupVariantHandling() {
        if (!this.state.form) return;

        const selectors = this.querySelectorAll('[data-option-value-selector]');
        selectors.forEach(selector => {
            selector.removeEventListener('change', this._handleVariantChange);
            selector.addEventListener('change', this._handleVariantChange);
        });
    }

    // Handle variant selection changes
    async _handleVariantChange(event) {
        if (this.state.isUpdating) return;

        const changedInput = event.target;
        if (!changedInput.hasAttribute('data-option-value-selector')) return;

        // Skip processing for single-variant products
        if (!this.state.variantData?.hasVariants) return;

        this.state.isUpdating = true;

        try {
            const { optionValues, targetUrl } = this._collectSelectedOptions();
            
            // Dispatch custom event for external handling (like quick view)
            const changeEvent = new CustomEvent('variant:change', {
                detail: {
                    optionValues,
                    targetUrl,
                    productHandle: this._extractHandleFromUrl(targetUrl),
                    context: this.state.context
                },
                bubbles: true
            });
            this.dispatchEvent(changeEvent);
            
        } catch (error) {
            console.error('CoretexVariantPicker: Error handling variant change', error);
        } finally {
            setTimeout(() => {
                this.state.isUpdating = false;
            }, 100);
        }
    }

    // Collect selected option values and determine target URL
    _collectSelectedOptions() {
        const selectors = this.querySelectorAll('[data-option-value-selector]');
        const selectedOptionValueIds = [];
        let targetUrl = this.state.productUrl;

        selectors.forEach(selector => {
            const selectedOption = this._getSelectedOption(selector);
            
            if (selectedOption) {
                const optionValueId = selectedOption.dataset.optionValueId;
                if (optionValueId) {
                    selectedOptionValueIds.push(optionValueId);
                }

                const productUrl = selectedOption.dataset.productUrl;
                if (productUrl && productUrl !== this.state.productUrl) {
                    targetUrl = productUrl;
                }
            }
        });

        return {
            optionValues: selectedOptionValueIds.join(','),
            targetUrl
        };
    }

    // Get selected option from a selector element
    _getSelectedOption(selector) {
        if (selector.type === 'radio') {
            return selector.checked ? selector : null;
        } else if (selector.tagName === 'SELECT') {
            return selector.options[selector.selectedIndex] || null;
        }
        return null;
    }

    // Extract product handle from URL
    _extractHandleFromUrl(url) {
        return url.split('/products/')[1]?.split('?')[0];
    }

    // Update form state based on variant selection
    _updateFormState() {
        if (!this.state.form || !this.state.variantData) return;

        const submitButton = this.state.form.querySelector('button[type="submit"], [data-qv-atc]');
        const variantIdInput = this.state.form.querySelector('input[name="id"]');
        
        if (!submitButton) return;

        this._updateMultiVariantState(submitButton, variantIdInput);
        this._updateVariantImage();
    }

    // Update state for multi-variant products
    _updateMultiVariantState(submitButton, variantIdInput) {
        const { selectedVariantId, selectedVariantAvailable } = this.state.variantData;
        const hasValidVariant = selectedVariantId && selectedVariantId !== '';

        // Update variant ID for immediate feedback before Section Rendering API completes
        if (variantIdInput) {
            variantIdInput.value = selectedVariantId || '';
        }

        // Button state and text will be updated by Section Rendering API
        // Only handle disabled state for immediate feedback
        if (hasValidVariant && selectedVariantAvailable) {
            submitButton.disabled = false;
        } else {
            submitButton.disabled = true;
        }
    }

    // Update variant image when selection changes
    _updateVariantImage() {
        if (!this.state.variantData) return;

        const imageElement = this._findVariantImage();
        if (!imageElement) return;

        const newImageUrl = this.state.variantData.selectedVariantImage || 
                           this.state.variantData.productFeaturedImage;
        
        if (newImageUrl && imageElement.src !== newImageUrl) {
            this._preloadAndUpdateImage(imageElement, newImageUrl);
        }
    }

    // Find variant image element based on context
    _findVariantImage() {
        // Try context-specific selectors first
        if (this.state.context === 'quickview') {
            return document.querySelector('img[id^="QvImage-"]');
        }
        
        // Fallback to general selectors
        return this.state.form?.querySelector('img[data-variant-image]') ||
               this.closest('[data-product]')?.querySelector('.product-media img') ||
               null;
    }

    // Preload new image before updating
    _preloadAndUpdateImage(imageElement, newImageUrl) {
        const newImg = new Image();
        
        newImg.onload = () => {
            imageElement.src = newImageUrl;
            
            const widths = [300, 600];
            const srcsetParts = widths.map(width => {
                const url = newImageUrl.replace(/width=\d+/, `width=${width}`);
                return `${url} ${width}w`;
            });
            imageElement.srcset = srcsetParts.join(', ');
        };
        
        newImg.onerror = () => {
            console.warn('CoretexVariantPicker: Failed to load variant image:', newImageUrl);
        };
        
        newImg.src = newImageUrl;
    }

    // Public method to refresh picker state (useful after external updates)
    refresh() {
        this._parseVariantData();
        this._updateFormState();
    }

    // Public method to get current variant data
    getVariantData() {
        return this.state.variantData;
    }

    // Public method to get selected options
    getSelectedOptions() {
        return this._collectSelectedOptions();
    }
}

if (!customElements.get('coretex-variant-picker')) {
    customElements.define('coretex-variant-picker', CoretexVariantPicker);
}