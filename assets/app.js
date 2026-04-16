var Theme = Theme || {};

// is in viewport
function inViewport(elem, callback, options = {}) {
    return new IntersectionObserver(entries => {
        entries.forEach(entry => callback(entry))
    }, options).observe(document.querySelector(elem));
}

/* How to inViewport
document.addEventListener("DOMContentLoaded", () => {
    inViewport('[data-inviewport]', element => {
        if (!element.isIntersecting) { document.querySelector('#add2cart-cta').classList.add('active') } 
        else { document.querySelector('#add2cart-cta').classList.remove('active') }
    });
});
*/

// Toggle Body Class
let toggleBodyClass = function(arg) { 
    document.body.classList.toggle(arg);
}
// Get Element Height
function getElementHeight(targetElement,appendTo,cssVar) {
    let element = document.querySelector(targetElement);

    if (element) {
        let elementHeight = element.offsetHeight;
        document.querySelector(appendTo).style.setProperty(cssVar, `${elementHeight}px`);
    }
}

// Browser check
// Browser and device detection
function getNavigator() {
    const html = document.documentElement;
    
    // Feature-based detection
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isEdge = /Edge|Edg/.test(navigator.userAgent);
    
    // Touch support detection
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Apply classes
    if (isiOS) html.classList.add('ios');
    if (hasTouch) html.classList.add('touch');
    
    // Browser classes and events
    const browsers = [
        { test: isSafari, name: 'safari' },
        { test: isChrome, name: 'chrome' },
        { test: isFirefox, name: 'firefox' },
        { test: isEdge, name: 'edge' }
    ];
    
    browsers.forEach(({ test, name }) => {
        if (test) {
            html.classList.add(name);
            window.dispatchEvent(new CustomEvent('user-agent', { detail: { browser: name } }));
        }
    });
}

// Toggle
    let toggleClass = function(qSelectors, bodyClass) {   
        document.querySelectorAll(qSelectors).forEach(e => e.addEventListener('click', () => toggleBodyClass(bodyClass)))
    }
// Menu
    let toggleMenu = function() { 
        toggleClass('.fire-menu, .shrink-menu', 'open-menu')
    }



    function a11yDetails() {
        document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
            summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));
            
            if(summary.nextElementSibling.getAttribute('id')) {
                summary.setAttribute('aria-controls', summary.nextElementSibling.id);
            }
            
            summary.addEventListener('click', (event) => {
                event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
            });
        });
    }

// Bullet marquee
if (!customElements.get('bullet-marquee')) customElements.define('bullet-marquee', class bulletMarquee extends HTMLElement {
    constructor() { super(); if (window.ResizeObserver) new ResizeObserver(this.duration.bind(this)).observe(this); }

    duration(entries) {
        const scrollingSpeed = parseInt(this.getAttribute('bullet-speed') || 5);
        const contentWidth = entries[0].contentRect.width;
      
        // Calculate the slowFactor based on content width
        let slowFactor = contentWidth <= 375 ? 1 : contentWidth >= 1280 ? 3 : 1 + (contentWidth - 375) / (1280 - 375);

        // Calculate the scrolling speed with the adjusted slowFactor
        const scrollingDuration = (scrollingSpeed * slowFactor * entries[0].target.querySelector('span').clientWidth / contentWidth).toFixed(3);

        this.style.setProperty('--bullet-speed', `${scrollingDuration}s`);
    }
});

/*** init app */
(() => {
    function initApp() {
        getNavigator(); // get the browser + OS
        toggleMenu(); // toggle Menu
        a11yDetails(); // initialize accessibility for details elements
    }

    /*** on DOM ready **/
    document.addEventListener("DOMContentLoaded", () => { initApp() })
})();