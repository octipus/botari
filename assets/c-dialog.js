export default class CoretexDialog extends HTMLElement {
	constructor() {
		super();

		// Cache DOM elements and state for performance
		this.dialog = null;
		this.closeButton = null;
		this._isOpen = false;
		this._isClosing = false;
		this._cachedDuration = undefined;

		// Track trigger elements for targeted event binding
		this.triggerElements = new Set();
		this.closeTimeoutId = null;

		// Bind methods once in constructor for better memory management
		this.openDialog = this._handleTriggerClick.bind(this);
		this.closeDialogOnEscape = this._handleKeydown.bind(this);
		this.closeDialogOnButtonClick = this._handleCloseButtonClick.bind(this);
		this.closeDialogOnBackdropClick = this._handleBackdropClick.bind(this);
		this.toggleDetails = this._handleDetailsToggle.bind(this);
		this._shopifyEventHandler = this._handleShopifyEvents.bind(this);
	}

	connectedCallback() {
		this._setupInitialState();
		this._setupEventListeners();
		this._bindTriggerElements();
	}

	disconnectedCallback() {
		this._teardownEventListeners();
		this._unbindTriggerElements();
		this._clearTimeouts();
	}

	_setupInitialState() {
		// Set a11y attributes
		this.setAttribute("role", "dialog");
		this.setAttribute("aria-modal", "false");
		this.setAttribute("aria-hidden", "true");

		// Cache DOM elements to avoid repeated queries
		this.dialog = this.querySelector("dialog");
		this.closeButton = this.querySelector('[formmethod="dialog"]');

		// Early validation with helpful warnings
		if (!this.dialog) {
			console.warn(`CoretexDialog: No dialog element found in ${this.id || "unnamed dialog"}`);
			return;
		}
		if (!this.id) console.warn("CoretexDialog: Dialog should have an ID for proper trigger binding");
	}

	_setupEventListeners() {
		// Only bind to this specific dialog instance
		this.addEventListener("keydown", this.closeDialogOnEscape);

		// Close button handling with validation
		if (this.closeButton) {
			this.closeButton.addEventListener("click", this.closeDialogOnButtonClick);
		}

		// Conditional backdrop click handling
		if (!this.hasAttribute("data-nobdc") && this.dialog) {
			this.dialog.addEventListener("click", this.closeDialogOnBackdropClick);
		}

		// Details/summary toggle handling
		const detailsSummaries = this.querySelectorAll('dialog [id^="Details-"] summary');
		detailsSummaries.forEach((summary) => {
			summary.addEventListener("click", this.toggleDetails);
		});

		// Shopify editor integration
		this._setupShopifyListeners();
	}

	_setupShopifyListeners() {
		if (!window.Shopify?.designMode || this.hasAttribute("data-nosdm")) return;

		const events = ["shopify:section:load", "shopify:section:select", "shopify:section:deselect"];
		events.forEach((eventType) => {
			document.addEventListener(eventType, this._shopifyEventHandler);
		});
	}

	_teardownEventListeners() {
		this.removeEventListener("keydown", this.closeDialogOnEscape);
		this.closeButton?.removeEventListener("click", this.closeDialogOnButtonClick);

		if (!this.hasAttribute("data-nobdc") && this.dialog) {
			this.dialog.removeEventListener("click", this.closeDialogOnBackdropClick);
		}

		const detailsSummaries = this.querySelectorAll('dialog [id^="Details-"] summary');
		detailsSummaries.forEach((summary) => {
			summary.removeEventListener("click", this.toggleDetails);
		});

		// Cleanup Shopify listeners
		if (window.Shopify?.designMode && !this.hasAttribute("data-nosdm")) {
			const events = ["shopify:section:load", "shopify:section:select", "shopify:section:deselect"];
			events.forEach((eventType) => {
				document.removeEventListener(eventType, this._shopifyEventHandler);
			});
		}
	}

	// Performance optimization - only bind to elements that target this dialog
	_bindTriggerElements() {
		if (!this.id) return;

		const triggers = document.querySelectorAll(`[data-open="#${this.id}"]`);
		triggers.forEach((trigger) => {
			if (!this.triggerElements.has(trigger)) {
				trigger.addEventListener("click", this.openDialog);
				this.triggerElements.add(trigger);
			}
		});
	}

	_unbindTriggerElements() {
		this.triggerElements.forEach((trigger) => {
			trigger.removeEventListener("click", this.openDialog);
		});
		this.triggerElements.clear();
	}

	_clearTimeouts() {
		if (this.closeTimeoutId) {
			clearTimeout(this.closeTimeoutId);
			this.closeTimeoutId = null;
		}
	}

	_handleTriggerClick(event) {
		event.preventDefault();
		this.open();
	}

	_handleCloseButtonClick(event) {
		event.preventDefault();
		this.close();
	}

	_handleKeydown(event) {
		if (event.key === "Escape" && this._isOpen) {
			event.preventDefault();
			this.close();
		}
	}

	_handleBackdropClick(event) {
		if (!this.dialog) return;

		// Where is the dialog on screen?
		const rect = this.dialog.getBoundingClientRect();

		// Did we click inside the dialog’s box (including padding & borders)?
		const clickedInside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;

		// Only close when the click is truly outside (i.e., on the backdrop)
		if (!clickedInside) {
			this.close();
		}
	}

	_handleDetailsToggle(event) {
		const details = event.currentTarget.closest("details");
		if (!details) return;

		const isOpen = details.hasAttribute("open");
		isOpen ? details.removeAttribute("open") : details.setAttribute("open", "");
	}

	_handleShopifyEvents(event) {
		// Use the existing filterShopifyEvent function if available
		if (typeof filterShopifyEvent === "function") {
			// filterShopifyEvent doesn't return a value, it executes the callback if conditions match
			filterShopifyEvent(event, this, () => {
				switch (event.type) {
					case "shopify:section:load":
					case "shopify:section:select":
						this.open();
						break;
					case "shopify:section:deselect":
						this.close();
						break;
				}
			});
		} else {
			// Fallback if filterShopifyEvent is not available
			switch (event.type) {
				case "shopify:section:load":
				case "shopify:section:select":
					this.open();
					break;
				case "shopify:section:deselect":
					this.close();
					break;
			}
		}
	}

	_getAnimationDuration() {
		// Cache the duration calculation for performance
		if (this._cachedDuration !== undefined) return this._cachedDuration;

		const computedStyle = getComputedStyle(this);
		const animationDuration = computedStyle.animationDuration;
		const transitionDuration = computedStyle.transitionDuration;

		const parseTime = (timeStr) => {
			if (timeStr === "none" || timeStr === "0s" || !timeStr) return 0;

			const times = timeStr.split(",").map((t) => {
				const value = parseFloat(t.trim());
				return t.includes("ms") ? value : value * 1000;
			});
			return Math.max(...times);
		};

		const animDuration = parseTime(animationDuration);
		const transDuration = parseTime(transitionDuration);

		this._cachedDuration = Math.max(animDuration, transDuration);
		return this._cachedDuration;
	}

	_attemptAnimatedClose() {
		const duration = this._getAnimationDuration();
		const fallbackDelay = duration || 300; // Default fallback

		// Set up fallback timeout
		this.closeTimeoutId = setTimeout(() => {
			this._finalizeClose();
		}, fallbackDelay + 50);

		// Listen for animation/transition events
		const cleanup = () => {
			this._clearTimeouts();
			this.removeEventListener("animationend", handleEnd);
			this.removeEventListener("transitionend", handleEnd);
			this._finalizeClose();
		};

		const handleEnd = (event) => {
			if (event.target === this || this.contains(event.target)) cleanup();
		};

		this.addEventListener("animationend", handleEnd, { once: true });
		this.addEventListener("transitionend", handleEnd, { once: true });
	}

	_finalizeClose() {
		// Prevent multiple calls
		if (!this._isClosing) return;

		// Batch DOM operations
		document.body.classList.remove(`o-${this.id}`);
		this.removeAttribute("closing");
		this.dialog.close();
		this.setAttribute("aria-hidden", "true");
		this.setAttribute("aria-modal", "false");

		// Handle close-details functionality
		if (this.hasAttribute("close-details")) {
			const openDetails = this.querySelectorAll("details[open]");
			openDetails.forEach((details) => details.removeAttribute("open"));
		}

		// Reset state
		this._isOpen = false;
		this._isClosing = false;
		this._cachedDuration = undefined; // Clear cache for next use
		this._clearTimeouts();

		// Dispatch custom event
		this.dispatchEvent(new CustomEvent("dialog:closed", { bubbles: true }));
	}

	open() {
		// Early returns for performance and state safety
		if (this._isOpen || this._isClosing || !this.dialog) return;

		// Check if dialog is already open (prevents browser error)
		if (this.dialog.open) return;

		// Batch DOM operations for better performance
		const bodyClass = `o-${this.id}`;
		document.body.classList.add(bodyClass);

		this.dialog.showModal();
		this.setAttribute("aria-hidden", "false");
		this.setAttribute("aria-modal", "true");

		this._isOpen = true;

		// Dispatch custom event
		this.dispatchEvent(new CustomEvent("dialog:opened", { bubbles: true }));
	}

	close() {
		// Early returns for performance and state safety
		if (!this._isOpen || this._isClosing) return;

		this._isClosing = true;
		this.setAttribute("closing", "");

		// Attempt animated close
		this._attemptAnimatedClose();
	}

	// Public method to rebind trigger elements
	// Useful when DOM is updated and new trigger elements are added
	rebindTriggers() {
		this._unbindTriggerElements();
		this._bindTriggerElements();
	}

	// Public getter for external state checking
	get isOpen() { return this._isOpen }
	get isClosing() { return this._isClosing }
}

if (!customElements.get("coretex-dialog")) customElements.define("coretex-dialog", CoretexDialog);