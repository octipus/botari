import FocusTrap from './h-focus-trap.js';

export default class DetailsMenu extends HTMLElement {
    get preload() {
        return this.hasAttribute('preload');
    }
    set preload(value) {
        if (value) {
            this.setAttribute('preload', '');
        }
        else {
            this.removeAttribute('preload');
        }
    }
    get src() {
        return this.getAttribute('src') || '';
    }
    set src(value) {
        this.setAttribute('src', value);
    }
    connectedCallback() {
        const details = this.parentElement;
        if (!details)
            return;
        const summary = details.querySelector('summary');
        if (summary) {
            // Initialize aria-expanded based on current open state
            summary.setAttribute('aria-expanded', details.hasAttribute('open') ? 'true' : 'false');
        }

        // Initialize focus trap for this details-menu
        // Only enable click trap if explicitly requested via data attribute
        const enableClickTrap = this.hasAttribute('data-focus-trap-clicks');
        const focusTrap = new FocusTrap(this, { enableClickTrap });

        const subscriptions = [
            fromEvent(details, 'compositionstart', e => trackComposition(this, e)),
            fromEvent(details, 'compositionend', e => trackComposition(this, e)),
            fromEvent(details, 'click', e => shouldCommit(details, e)),
            fromEvent(details, 'change', e => shouldCommit(details, e)),
            fromEvent(details, 'keydown', e => keydown(details, this, e)),
            fromEvent(details, 'toggle', () => loadFragment(details, this), { once: true }),
            fromEvent(details, 'toggle', () => closeCurrentMenu(details)),
            fromEvent(details, 'toggle', () => handleFocusTrap(details, focusTrap)),
            fromEvent(details, 'toggle', () => updateAriaExpanded(details)),
            this.preload
                ? fromEvent(details, 'mouseover', () => loadFragment(details, this), { once: true })
                : NullSubscription,
            ...focusOnOpen(details)
        ];
        states.set(this, { subscriptions, loaded: false, isComposing: false, focusTrap });
    }
    disconnectedCallback() {
        const state = states.get(this);
        if (!state)
            return;

        // Deactivate focus trap if active
        if (state.focusTrap && state.focusTrap.isActive()) {
            state.focusTrap.deactivate();
        }

        states.delete(this);
        for (const sub of state.subscriptions) {
            sub.unsubscribe();
        }
    }
}
const states = new WeakMap();
const NullSubscription = {
    unsubscribe() {
    }
};
function fromEvent(target, eventName, onNext, options = false) {
    target.addEventListener(eventName, onNext, options);
    return {
        unsubscribe: () => {
            target.removeEventListener(eventName, onNext, options);
        }
    };
}
function loadFragment(details, menu) {
    const src = menu.getAttribute('src');
    if (!src)
        return;
    const state = states.get(menu);
    if (!state)
        return;
    if (state.loaded)
        return;
    state.loaded = true;
    const loader = menu.querySelector('include-fragment');
    if (loader && !loader.hasAttribute('src')) {
        loader.addEventListener('loadend', () => autofocus(details));
        loader.setAttribute('src', src);
    }
}
function focusOnOpen(details) {
    let isMouse = false;
    const onmousedown = () => (isMouse = true);
    const onkeydown = () => (isMouse = false);
    const ontoggle = () => {
        if (!details.hasAttribute('open'))
            return;
        if (autofocus(details))
            return;
        if (!isMouse)
            focusFirstItem(details);
    };
    return [
        fromEvent(details, 'mousedown', onmousedown),
        fromEvent(details, 'keydown', onkeydown),
        fromEvent(details, 'toggle', ontoggle)
    ];
}
function handleFocusTrap(details, focusTrap) {
    if (details.hasAttribute('open')) {
        // Activate focus trap when details opens
        focusTrap.activate();
    } else {
        // Deactivate focus trap when details closes
        if (focusTrap.isActive()) {
            focusTrap.deactivate();
        }
    }
}

function updateAriaExpanded(details) {
    const summary = details.querySelector('summary');
    if (summary) {
        summary.setAttribute('aria-expanded', details.hasAttribute('open') ? 'true' : 'false');
    }
}

function closeCurrentMenu(details) {
    if (!details.hasAttribute('open'))
        return;

    const detailsName = details.getAttribute('name');

    // If this details has no name, don't close others (no grouping behavior)
    if (!detailsName) return;

    // Only close other details with the same name attribute
    for (const menu of document.querySelectorAll(`details[open][name="${detailsName}"] > details-menu`)) {
        const opened = menu.closest('details');
        if (opened && opened !== details && !opened.contains(details)) {
            opened.removeAttribute('open');
        }
    }
}
function autofocus(details) {
    if (!details.hasAttribute('open'))
        return false;
    const input = details.querySelector('details-menu [autofocus]');
    if (input) {
        input.focus({ preventScroll: true });
        return true;
    }
    else {
        return false;
    }
}
function focusFirstItem(details) {
    const selected = document.activeElement;
    if (selected && isMenuItem(selected) && details.contains(selected))
        return;
    const target = sibling(details, true);
    if (target)
        target.focus({ preventScroll: true });
}
function sibling(details, next) {
    const options = Array.from(details.querySelectorAll('[role^="menuitem"]:not([hidden]):not([disabled])'));
    const selected = document.activeElement;
    const index = selected instanceof HTMLElement ? options.indexOf(selected) : -1;
    const found = next ? options[index + 1] : options[index - 1];
    const def = next ? options[0] : options[options.length - 1];
    return found || def;
}
const ctrlBindings = navigator.userAgent.match(/Macintosh/);
function shouldCommit(details, event) {
    const target = event.target;
    if (!(target instanceof Element))
        return;
    if (target.closest('details') !== details)
        return;
    if (event.type === 'click') {
        const menuitem = target.closest('[role="menuitem"], [role="menuitemradio"]');
        if (!menuitem)
            return;
        const input = menuitem.querySelector('input');
        if (menuitem.tagName === 'LABEL' && target === input)
            return;
        const onlyCommitOnChangeEvent = menuitem.tagName === 'LABEL' && input && !input.checked;
        if (!onlyCommitOnChangeEvent) {
            commit(menuitem, details);
        }
    }
    else if (event.type === 'change') {
        const menuitem = target.closest('[role="menuitemradio"], [role="menuitemcheckbox"]');
        if (menuitem)
            commit(menuitem, details);
    }
}
function updateChecked(selected, details) {
    for (const el of details.querySelectorAll('[role="menuitemradio"], [role="menuitemcheckbox"]')) {
        const input = el.querySelector('input[type="radio"], input[type="checkbox"]');
        let checkState = (el === selected).toString();
        if (input instanceof HTMLInputElement) {
            checkState = input.indeterminate ? 'mixed' : input.checked.toString();
        }
        el.setAttribute('aria-checked', checkState);
    }
}
function commit(selected, details) {
    if (selected.hasAttribute('disabled') || selected.getAttribute('aria-disabled') === 'true')
        return;
    const menu = selected.closest('details-menu');
    if (!menu)
        return;
    const dispatched = menu.dispatchEvent(new CustomEvent('details-menu-select', {
        cancelable: true,
        detail: { relatedTarget: selected }
    }));
    if (!dispatched)
        return;
    updateLabel(selected, details);
    updateChecked(selected, details);
    if (selected.getAttribute('role') !== 'menuitemcheckbox')
        close(details);
    menu.dispatchEvent(new CustomEvent('details-menu-selected', {
        detail: { relatedTarget: selected }
    }));
}
function keydown(details, menu, event) {
    if (!(event instanceof KeyboardEvent))
        return;
    if (details.querySelector('details[open]'))
        return;
    const state = states.get(menu);
    if (!state || state.isComposing)
        return;
    const isSummaryFocused = event.target instanceof Element && event.target.tagName === 'SUMMARY';
    switch (event.key) {
        case 'Escape':
            // Let the global Escape handler take care of closing details
            // This ensures consistent behavior regardless of focus location
            return;
        case 'ArrowDown':
            {
                if (isSummaryFocused && !details.hasAttribute('open')) {
                    details.setAttribute('open', '');
                }
                const target = sibling(details, true);
                if (target)
                    target.focus({ preventScroll: true });
                event.preventDefault();
            }
            break;
        case 'ArrowUp':
            {
                if (isSummaryFocused && !details.hasAttribute('open')) {
                    details.setAttribute('open', '');
                }
                const target = sibling(details, false);
                if (target)
                    target.focus({ preventScroll: true });
                event.preventDefault();
            }
            break;
        case 'n':
            {
                if (ctrlBindings && event.ctrlKey) {
                    const target = sibling(details, true);
                    if (target)
                        target.focus({ preventScroll: true });
                    event.preventDefault();
                }
            }
            break;
        case 'p':
            {
                if (ctrlBindings && event.ctrlKey) {
                    const target = sibling(details, false);
                    if (target)
                        target.focus({ preventScroll: true });
                    event.preventDefault();
                }
            }
            break;
        case ' ':
        case 'Enter':
            {
                const selected = document.activeElement;
                if (selected instanceof HTMLElement && isMenuItem(selected) && selected.closest('details') === details) {
                    event.preventDefault();
                    event.stopPropagation();
                    selected.click();
                }
            }
            break;
    }
}
function isMenuItem(el) {
    const role = el.getAttribute('role');
    return role === 'menuitem' || role === 'menuitemcheckbox' || role === 'menuitemradio';
}
function close(details) {
    const wasOpen = details.hasAttribute('open');
    if (!wasOpen)
        return;
    details.removeAttribute('open');
    const summary = details.querySelector('summary');
    if (summary)
        summary.focus({ preventScroll: true });
}
function updateLabel(item, details) {
    const button = details.querySelector('[data-menu-button]');
    if (!button)
        return;
    
    // Find the specific element within the button that should be updated
    const buttonTextEl = button.querySelector('[data-button-text]') || button;
    
    const text = labelText(item);
    if (text) {
        buttonTextEl.textContent = text;
    }
    else {
        const html = labelHTML(item);
        if (html)
            buttonTextEl.innerHTML = html;
    }
}
function labelText(el) {
    if (!el)
        return null;
    const textEl = el.hasAttribute('data-menu-button-text') ? el : el.querySelector('[data-menu-button-text]');
    if (!textEl)
        return null;
    return textEl.getAttribute('data-menu-button-text') || textEl.textContent;
}
function labelHTML(el) {
    if (!el)
        return null;
    const contentsEl = el.hasAttribute('data-menu-button-contents') ? el : el.querySelector('[data-menu-button-contents]');
    return contentsEl ? contentsEl.innerHTML : null;
}
function trackComposition(menu, event) {
    const state = states.get(menu);
    if (!state)
        return;
    state.isComposing = event.type === 'compositionstart';
}

if (!customElements.get("details-menu")) customElements.define("details-menu", DetailsMenu);

class IncludeFragment extends HTMLElement {
  get src() {
    return this.getAttribute('src') || '';
  }

  set src(value) {
    this.setAttribute('src', value);
  }

  static get observedAttributes() {
    return ['src'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'src' && newValue && newValue !== oldValue) {
      this._load();
    }
  }

  async _load() {
    const src = this.src;
    if (!src) return;

    try {
      // Show loading state
      this.setAttribute('loading', '');
      
      const response = await fetch(src, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Validate that the response is a valid fragment, not a full HTML page
      if (this._isFullHtmlDocument(html)) {
        throw new Error('Section Rendering API returned a full HTML document instead of a fragment. This may indicate the store is password-protected or there was a server-side error.');
      }
      
      // Strip the shopify-section wrapper div added by the Section Rendering API
      const temp = new DOMParser().parseFromString(html, 'text/html');
      const sectionWrapper = temp.querySelector('.shopify-section');
      this.innerHTML = sectionWrapper ? sectionWrapper.innerHTML : html;

      // Dispatch loadend event that your details-menu is listening for
      this.dispatchEvent(new CustomEvent('loadend', {
        bubbles: true,
        detail: { src }
      }));

    } catch (error) {
      console.error('Failed to load fragment:', error);
      this.innerHTML = `<div class="error">Failed to load content</div>`;
      
      // Dispatch error event for better error handling
      this.dispatchEvent(new CustomEvent('loaderror', {
        bubbles: true,
        detail: { src, error }
      }));
    } finally {
      this.removeAttribute('loading');
    }
  }

  /**
   * Check if the response is a full HTML document rather than a fragment
   * @private
   * @param {string} html - The HTML response text
   * @returns {boolean} True if this appears to be a full HTML document
   */
  _isFullHtmlDocument(html) {
    // Trim whitespace and convert to lowercase for checking
    const trimmed = html.trim().toLowerCase();
    
    // Check for DOCTYPE declaration
    if (trimmed.startsWith('<!doctype html')) {
      return true;
    }
    
    // Check for opening html tag at the beginning
    if (trimmed.startsWith('<html')) {
      return true;
    }
    
    // Check for presence of both html and head tags (more comprehensive check)
    const hasHtmlTag = /<html[^>]*>/i.test(html);
    const hasHeadTag = /<head[^>]*>/i.test(html);
    
    if (hasHtmlTag && hasHeadTag) {
      return true;
    }
    
    return false;
  }
}

if (!customElements.get('include-fragment')) {
  customElements.define('include-fragment', IncludeFragment);
}

// Global event handlers for closing details elements
let globalHandlersInitialized = false;

function initializeGlobalHandlers() {
    if (globalHandlersInitialized) return;
    globalHandlersInitialized = true;
    
    // Handle clicks outside of open details elements
    document.addEventListener('click', (event) => {
        const openDetails = document.querySelectorAll('details[open] > details-menu');
        if (openDetails.length === 0) return;

        for (const menu of openDetails) {
            const details = menu.closest('details');
            if (details && !details.contains(event.target) && details.hasAttribute('data-close-outside')) {
                close(details);
            }
        }
    });
    
    // Handle global Escape key to close any open details
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const openDetails = document.querySelectorAll('details[open] > details-menu');
            for (const menu of openDetails) {
                const details = menu.closest('details');
                if (details) {
                    close(details);
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }
    });
}

// Initialize global handlers when the first details-menu is connected
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGlobalHandlers);
} else {
    initializeGlobalHandlers();
}