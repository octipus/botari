// Cart
import '//botari.co/cdn/shop/t/2/assets/m-cart.js?v=107839224660067441501776263156';

// # Map storage for better performance
const cartDetailsState = new Map();

// # Single event delegation with capture phase
document.addEventListener("toggle", (event) => {
	const target = event.target;
	if (target.matches("[data-ajax-cart-section] [data-ajax-cart-details]")) {
		const key = target.getAttribute("data-ajax-cart-details");
		if (key) cartDetailsState.set(key, target.open);
	}
}, true);

// # init and section updates
function initCartDetails() {
	for (const $details of document.querySelectorAll("[data-ajax-cart-section] [data-ajax-cart-details]")) {
		const key = $details.getAttribute("data-ajax-cart-details");
		if (key) cartDetailsState.set(key, $details.hasAttribute("open"));
	}
}

document.addEventListener("liquid-ajax-cart:init", initCartDetails);

document.addEventListener("liquid-ajax-cart:request-end", (event) => {
	const { requestState, sections } = event.detail;

	// # Handle successful add to cart
	if (requestState.requestType === "add" && requestState.responseData?.ok) {
		const formElement = requestState.info.initiator?.closest('ajax-cart-product-form');
		const cartType = formElement?.getAttribute('cart-type') || 'drawer';
		
		if (cartType === 'redirect') {
			window.location.href = window.routes?.cart_url || '/cart';
		} else if (window.location.pathname === '/cart') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} else {
			const cartBox = document.getElementById("cartBox");
			if (cartBox) cartBox.open();
		}
		
		document.body.setAttribute("cart-state", "done");
		setTimeout(() => document.body.removeAttribute("cart-state"), 4000);
	}

	// # Restore details state only on actual section re-renders
	if (sections?.length && requestState.info.initiator !== "mutation") {
		for (const { elements } of sections) {
			for (const element of elements) {
				for (const $details of element.querySelectorAll("[data-ajax-cart-details]")) {
					const key = $details.getAttribute("data-ajax-cart-details");
					if (key && cartDetailsState.has(key)) {
						$details.open = cartDetailsState.get(key);
					}
				}
			}
		}
	}
});

// Remove in production
window.liquidAjaxCart.conf('updateOnWindowFocus', false);
