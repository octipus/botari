class CartDiscount extends HTMLElement {
	constructor() {
		super();
		this._input = null;
		this._applyBtn = null;
		this._isProcessing = false;
		this._abortController = null;
	}

	static _globalEventsSetup = false;

	static _setupGlobalEvents() {
		if (CartDiscount._globalEventsSetup) return;

		// Use event delegation for remove buttons
		document.addEventListener("click", _handleGlobalRemoveClick);
		CartDiscount._globalEventsSetup = true;
	}

	connectedCallback() {
		CartDiscount._setupGlobalEvents();

		// Use requestAnimationFrame for better timing than setTimeout
		requestAnimationFrame(() => {
			if (!this._initElements()) return;
			this._bindEvents();
		});
	}

	disconnectedCallback() {
		// Cancel any pending requests
		this._abortCurrentRequest();
	}

	_initElements() {
		this._input = this.querySelector('input[type="text"]');
		this._applyBtn = this.querySelector('button[type="button"], button[type="submit"], button:not([type])');

		if (!this._input || !this._applyBtn) {
			console.warn("CartDiscount: Required elements not found");
			return false;
		}
		return true;
	}

	_bindEvents() {
		this._applyBtn.addEventListener("click", this._handleApplyClick.bind(this));
		this._input.addEventListener("keydown", this._handleInputKeydown.bind(this));
	}

	_handleApplyClick() {
		this.applyDiscount();
	}

	_handleInputKeydown(event) {
		if (event.key === "Enter") {
			event.preventDefault();
			this.applyDiscount();
		}
	}

	async applyDiscount() {
		if (this._isProcessing) return;
		if (!this._isCartSystemReady()) return;

		const discountCode = this._input.value.trim();
		if (!discountCode) return;

		this._setProcessing(true);
		this._abortCurrentRequest();
		this._abortController = new AbortController();

		try {
			const existingDiscounts = this._getExistingDiscounts();
			const allDiscounts = [...new Set([...existingDiscounts, discountCode])]; // Use Set to avoid duplicates

			await this._updateCartDiscounts(allDiscounts);

			// Success - clear input and dispatch custom event
			this._input.value = "";
			this._dispatchDiscountEvent("discount:applied", { code: discountCode });
		} catch (error) {
			if (error.name === "AbortError") return; // Request was cancelled
			console.error("Failed to apply discount:", error);
			this._dispatchDiscountEvent("discount:error", { error, action: "apply" });
		} finally {
			this._setProcessing(false);
		}
	}

	async removeDiscount(discountCode) {
		if (this._isProcessing) return;
		if (!this._isCartSystemReady()) return;
		if (!discountCode) return;

		this._setProcessing(true);
		this._abortCurrentRequest();
		this._abortController = new AbortController();

		try {
			const existingDiscounts = this._getExistingDiscounts();
			const remainingDiscounts = existingDiscounts.filter((code) => code !== discountCode);

			await this._updateCartDiscounts(remainingDiscounts);

			this._dispatchDiscountEvent("discount:removed", { code: discountCode });
		} catch (error) {
			if (error.name === "AbortError") return;
			console.error("Failed to remove discount:", error);
			this._dispatchDiscountEvent("discount:error", { error, action: "remove" });
		} finally {
			this._setProcessing(false);
		}
	}

	_updateCartDiscounts(discounts) {
		return new Promise((resolve, reject) => {
			window.liquidAjaxCart.update(
				{
					discount: discounts.join(","),
				},
				{
					lastCallback: (requestState) => {
						if (this._abortController?.signal.aborted) {
							reject(new DOMException("Request aborted", "AbortError"));
							return;
						}

						if (requestState?.responseData?.ok) {
							resolve(requestState);
						} else {
							reject(new Error("Cart update failed"));
						}
					},
					info: {
						initiator: this,
						discount: true,
					},
				}
			);
		});
	}

	_getExistingDiscounts() {
		const cart = window.liquidAjaxCart?.cart;
		if (!cart?.cart_level_discount_applications) return [];

		return cart.cart_level_discount_applications.map((discount) => discount.title);
	}

	_setProcessing(processing) {
		this._isProcessing = processing;

		// Use data attribute for CSS state management
		this.toggleAttribute("data-working", processing);

		// Update form controls
		if (this._applyBtn) this._applyBtn.disabled = processing;
		if (this._input) this._input.disabled = processing;

		// Update all remove buttons
		this._updateRemoveButtons(processing);
	}

	_updateRemoveButtons(disabled) {
		const removeButtons = document.querySelectorAll(".discount-remove-btn");
		for (const button of removeButtons) {
			button.disabled = disabled;
		}
	}

	_isCartSystemReady() {
		if (!window.liquidAjaxCart?.update) {
			console.warn("Cart system not ready");
			return false;
		}
		return true;
	}

	_abortCurrentRequest() {
		this._abortController?.abort();
		this._abortController = null;
	}

	_dispatchDiscountEvent(eventType, detail) {
		const event = new CustomEvent(eventType, {
			detail,
			bubbles: true,
			cancelable: true,
		});
		this.dispatchEvent(event);
	}
}

// Module-scoped utility function for global event handling
const _handleGlobalRemoveClick = (event) => {
	const removeBtn = event.target.closest(".discount-remove-btn");
	if (!removeBtn) return;

	event.preventDefault();

	const discountCode = removeBtn.getAttribute("data-discount-code");
	const component = document.querySelector("cart-discount");

	if (component && discountCode) {
		component.removeDiscount(discountCode);
	}
};

// Register custom element
if (!customElements.get("cart-discount")) {
	customElements.define("cart-discount", CartDiscount);
}
