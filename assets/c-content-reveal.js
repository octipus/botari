export default class CoretexReveal extends HTMLElement {
	constructor() {
		super()

		// State
		this._activeKey = null
		this._hoverTimeout = null
		this._triggers = []
		this._panels = []
		this._triggerMap = new Map()
		this._panelMap = new Map()
		this._warnedKeys = new Set()

		// Bound handlers
		this._onTriggerEnter = this._handleTriggerEnter.bind(this)
		this._onTriggerLeave = this._handleTriggerLeave.bind(this)
		this._onTriggerClick = this._handleTriggerClick.bind(this)
		this._onTriggerKeydown = this._handleTriggerKeydown.bind(this)
		this._onTriggerFocus = this._handleTriggerFocus.bind(this)
		this._shopifyEventHandler = this._handleShopifyEvents.bind(this)
	}

	connectedCallback() {
		this._cacheDom()
		if (!this._triggers.length) return
		this._setupEventListeners()
		this._activateDefault()
		this._setupShopifyListeners()
	}

	disconnectedCallback() {
		this._teardownEventListeners()
		this._clearHoverTimeout()
		this._teardownShopifyListeners()

		// Clear references
		this._triggers = []
		this._panels = []
		this._triggerMap.clear()
		this._panelMap.clear()
		this._warnedKeys.clear()
	}

	// ── Public API ──────────────────────────────────────────

	get activeKey() {
		return this._activeKey
	}

	setActive(keyOrIndex) {
		let key
		if (typeof keyOrIndex === 'number') {
			const trigger = this._triggers[keyOrIndex]
			if (!trigger) return
			key = trigger.getAttribute('data-reveal-trigger')
		} else {
			key = String(keyOrIndex)
		}
		this._activate(key)
	}

	// ── DOM caching ─────────────────────────────────────────

	_cacheDom() {
		this._triggers = [...this.querySelectorAll('[data-reveal-trigger]')]
		this._panels = [...this.querySelectorAll('[data-reveal-panel]')]

		this._triggerMap.clear()
		this._panelMap.clear()

		for (const trigger of this._triggers) {
			const key = trigger.getAttribute('data-reveal-trigger')
			this._triggerMap.set(key, trigger)
		}

		for (const panel of this._panels) {
			const key = panel.getAttribute('data-reveal-panel')
			this._panelMap.set(key, panel)
		}
	}

	// ── Activation logic ────────────────────────────────────

	get _activationMode() {
		const attr = this.getAttribute('data-activation') || 'auto'
		if (attr === 'hover' || attr === 'click') return attr
		// auto: detect pointer type
		return matchMedia('(pointer: fine)').matches ? 'hover' : 'click'
	}

	get _hoverIntentDelay() {
		const val = parseInt(this.getAttribute('data-hover-intent'), 10)
		return Number.isFinite(val) ? val : 120
	}

	_activateDefault() {
		const defaultIdx = parseInt(this.getAttribute('data-default'), 10)
		const idx = Number.isFinite(defaultIdx) ? defaultIdx : 0
		const trigger = this._triggers[idx]
		if (trigger) {
			this._activate(trigger.getAttribute('data-reveal-trigger'), false)
		}
	}

	_activate(key, dispatch = true) {
		if (key === this._activeKey) return

		const panel = this._panelMap.get(key)
		if (!panel) {
			if (!this._warnedKeys.has(key)) {
				console.warn(`CoretexReveal: No panel found for trigger key "${key}"`)
				this._warnedKeys.add(key)
			}
			return
		}

		const prevKey = this._activeKey
		this._activeKey = key

		// Update triggers
		for (const trigger of this._triggers) {
			const triggerKey = trigger.getAttribute('data-reveal-trigger')
			const isActive = triggerKey === key
			trigger.setAttribute('aria-selected', String(isActive))
			trigger.classList.toggle('is-active', isActive)
		}

		// Update panels
		for (const p of this._panels) {
			const panelKey = p.getAttribute('data-reveal-panel')
			const isActive = panelKey === key
			p.setAttribute('aria-hidden', String(!isActive))
			p.classList.toggle('is-active', isActive)

			// Video handling: play active, pause others
			const video = p.querySelector('video')
			if (video) {
				if (isActive) {
					video.play().catch(() => {})
				} else {
					video.pause()
				}
			}
		}

		if (dispatch) {
			const idx = this._triggers.findIndex(t => t.getAttribute('data-reveal-trigger') === key)
			this.dispatchEvent(new CustomEvent('CoretexReveal:change', {
				bubbles: true,
				detail: {
					key,
					index: idx,
					trigger: this._triggerMap.get(key),
					panel,
					previousKey: prevKey
				}
			}))
		}
	}

	// ── Event setup / teardown ──────────────────────────────

	_setupEventListeners() {
		const mode = this._activationMode

		for (const trigger of this._triggers) {
			// Keyboard always works
			trigger.addEventListener('keydown', this._onTriggerKeydown)

			if (mode === 'hover') {
				trigger.addEventListener('mouseenter', this._onTriggerEnter)
				trigger.addEventListener('mouseleave', this._onTriggerLeave)
				trigger.addEventListener('focus', this._onTriggerFocus)
			} else {
				trigger.addEventListener('click', this._onTriggerClick)
			}

			// Ensure keyboard reachability
			if (!trigger.getAttribute('tabindex')) {
				trigger.setAttribute('tabindex', '0')
			}
			trigger.setAttribute('role', 'tab')
		}

		// Set up stage container role
		const stage = this.querySelector('.CoretexRevealStage')
		if (stage) stage.setAttribute('role', 'tabpanel')
	}

	_teardownEventListeners() {
		for (const trigger of this._triggers) {
			trigger.removeEventListener('keydown', this._onTriggerKeydown)
			trigger.removeEventListener('mouseenter', this._onTriggerEnter)
			trigger.removeEventListener('mouseleave', this._onTriggerLeave)
			trigger.removeEventListener('focus', this._onTriggerFocus)
			trigger.removeEventListener('click', this._onTriggerClick)
		}
	}

	// ── Event handlers ──────────────────────────────────────

	_handleTriggerEnter(event) {
		const trigger = event.currentTarget
		const key = trigger.getAttribute('data-reveal-trigger')
		this._clearHoverTimeout()
		this._hoverTimeout = setTimeout(() => this._activate(key), this._hoverIntentDelay)
	}

	_handleTriggerLeave() {
		this._clearHoverTimeout()
	}

	_handleTriggerClick(event) {
		if (event.target.closest('a[href]')) return
		const trigger = event.currentTarget
		const key = trigger.getAttribute('data-reveal-trigger')
		this._activate(key)
	}

	_handleTriggerFocus(event) {
		const trigger = event.currentTarget
		const key = trigger.getAttribute('data-reveal-trigger')
		this._activate(key)
	}

	_handleTriggerKeydown(event) {
		const { key } = event
		const idx = this._triggers.indexOf(event.currentTarget)
		let nextIdx = -1

		switch (key) {
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault()
				nextIdx = (idx + 1) % this._triggers.length
				break
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault()
				nextIdx = (idx - 1 + this._triggers.length) % this._triggers.length
				break
			case 'Home':
				event.preventDefault()
				nextIdx = 0
				break
			case 'End':
				event.preventDefault()
				nextIdx = this._triggers.length - 1
				break
			case 'Enter':
			case ' ':
				event.preventDefault()
				this._activate(event.currentTarget.getAttribute('data-reveal-trigger'))
				if (event.currentTarget.tagName === 'DETAILS') {
					event.currentTarget.open = !event.currentTarget.open
				}
				return
			default:
				return
		}

		if (nextIdx >= 0) {
			this._triggers[nextIdx].focus()
			this._activate(this._triggers[nextIdx].getAttribute('data-reveal-trigger'))
		}
	}

	// ── Utilities ───────────────────────────────────────────

	_clearHoverTimeout() {
		if (this._hoverTimeout) {
			clearTimeout(this._hoverTimeout)
			this._hoverTimeout = null
		}
	}

	// ── Shopify theme editor ────────────────────────────────

	_setupShopifyListeners() {
		if (!window.Shopify?.designMode || this.hasAttribute('data-nosdm')) return
		const events = [
			'shopify:section:load',
			'shopify:section:select',
			'shopify:block:select',
			'shopify:block:deselect'
		]
		for (const eventType of events) {
			document.addEventListener(eventType, this._shopifyEventHandler)
		}
	}

	_teardownShopifyListeners() {
		if (!window.Shopify?.designMode || this.hasAttribute('data-nosdm')) return
		const events = [
			'shopify:section:load',
			'shopify:section:select',
			'shopify:block:select',
			'shopify:block:deselect'
		]
		for (const eventType of events) {
			document.removeEventListener(eventType, this._shopifyEventHandler)
		}
	}

	_handleShopifyEvents(event) {
		if (typeof filterShopifyEvent !== 'function') return

		filterShopifyEvent(event, this, (e) => {
			if (e.type === 'shopify:section:load') {
				this._cacheDom()
				this._activateDefault()
			} else if (e.type === 'shopify:block:select') {
				const blockId = e.detail.blockId
				const key = `item-${blockId}`
				this._activate(key)
			} else if (e.type === 'shopify:block:deselect') {
				this._activateDefault()
			}
		})
	}
}

if (!customElements.get('coretex-reveal')) customElements.define('coretex-reveal', CoretexReveal)