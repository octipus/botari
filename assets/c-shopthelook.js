class ShopTheLook extends HTMLElement {
    constructor() {
        super() // Always call super first in constructor
        this.toggleActive = this.toggleActive.bind(this)
    }

    connectedCallback() {
        this.querySelectorAll('hot-spot').forEach(hotSpot => {
            const targetId = hotSpot.getAttribute('data-target')
            const targetEl = document.getElementById(targetId)

            // Listen for mouse enter/leave on hot-spot
            hotSpot.addEventListener('mouseenter', () => this.toggleActive(targetEl, true))
            hotSpot.addEventListener('mouseleave', () => this.toggleActive(targetEl, false))

            // If the target exists, also listen for mouse enter/leave on it
            if (targetEl) {
                targetEl.addEventListener('mouseenter', () => this.toggleActive(hotSpot, true))
                targetEl.addEventListener('mouseleave', () => this.toggleActive(hotSpot, false))
            }
        })
    }

    disconnectedCallback() {
        this.querySelectorAll('hot-spot').forEach(hotSpot => {
            const targetId = hotSpot.getAttribute('data-target')
            const targetEl = document.getElementById(targetId)

            // Clean up listeners on hot-spot
            hotSpot.removeEventListener('mouseenter', () => this.toggleActive(targetEl, true))
            hotSpot.removeEventListener('mouseleave', () => this.toggleActive(targetEl, false))

            // Clean up listeners on target, if it exists
            if (targetEl) {
                targetEl.removeEventListener('mouseenter', () => this.toggleActive(hotSpot, true))
                targetEl.removeEventListener('mouseleave', () => this.toggleActive(hotSpot, false))
            }
        })
    }

    toggleActive(element, isActive) { if (element) element.classList.toggle('active', isActive) }
}

customElements.define('shop-the-look', ShopTheLook)