if (Shopify.designMode) {
	document.documentElement.classList.add("shopify-design-mode");

	function filterShopifyEvent(event, domElement, callback) {
		let executeCallback = false;

		// For section-level events, ensure the section ID matches
		if (event.type.includes("shopify:section")) {
			if (domElement.hasAttribute("data-section-id") && domElement.getAttribute("data-section-id") === event.detail.sectionId) executeCallback = true;
		}
		// For block-level events, ensure the target block belongs to the correct instance
		else if (event.type.includes("shopify:block")) {
			if (event.target.closest("[data-section-id]") === domElement) executeCallback = true;
		}

		// Execute the callback if conditions are met and callback is a function
		if (executeCallback && typeof callback === "function") callback(event);
	}
}

(async function () {
	if (typeof Shopify === "undefined" || !Shopify.theme) return;

	const themeRole = Shopify.theme.role ?? "unknown";
	const storedRole = null;
	try { storedRole = localStorage.getItem("ot-store-vault"); } catch (e) {}
	if (storedRole === themeRole) return;

	const tapUrl = "https://tap.openthinking.net/";
    const coretexScript = document.querySelector('script[id="coretex-theme-editor"]');
	const shopId = coretexScript?.dataset.id || "";
    const shopDomain = coretexScript?.dataset.shop || Shopify?.shop || "";
    const themeName = coretexScript?.dataset.theme || Shopify?.theme?.schema_name || "";
    const themePreset = coretexScript?.dataset.preset || "";
	const themeVersion = coretexScript?.dataset.version || Shopify?.theme?.schema_version || "";
	const contactEmail = coretexScript?.dataset.contact || "";
	const bodyParams = new URLSearchParams({
		id: shopId,
		shop: shopDomain,
		theme: themeName,
        preset: themePreset,
		version: themeVersion,
		role: themeRole,
		contact: contactEmail,
	});

	try {
		fetch(tapUrl, {
			method: "POST",
			mode: "cors",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: bodyParams,
		}).then((response) => {
			if (response.ok) { try { localStorage.setItem("ot-store-vault", themeRole); } catch (e) {} }
		});
	} catch (e) {}
})();