class HeroScroll extends HTMLElement {
    constructor() {
        super();
        this._handleClick = this._handleClick.bind(this);
    }

    connectedCallback() {
        this.observer = new IntersectionObserver(
            (entries) => this._handleIntersection(entries),
            { threshold: 0.5 }
        );

        for (const cell of this.querySelectorAll('.media > [id^="hsi-"]')) {
            this.observer.observe(cell);
        }

        for (const link of this.querySelectorAll('.meta a[href^="#hsi-"]')) {
            link.addEventListener('click', this._handleClick);
        }
    }

    disconnectedCallback() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        for (const link of this.querySelectorAll('.meta a[href^="#hsi-"]')) {
            link.removeEventListener('click', this._handleClick);
        }
    }

    _handleClick(event) {
        event.preventDefault();
        const targetId = event.currentTarget.getAttribute('href').slice(1);
        const target = this.querySelector(`#${targetId}`);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    }

    _handleIntersection(entries) {
        for (const entry of entries) {
            const link = this.querySelector(`a[href="#${entry.target.id}"]`);
            if (!link) continue;

            link.classList.toggle('is-active', entry.isIntersecting);
            entry.target.classList.toggle('is-active', entry.isIntersecting);

            const video = entry.target.querySelector('video');
            if (!video) continue;

            if (entry.isIntersecting) {
                video.play();
            } else {
                video.pause();
            }
        }
    }
}

if (!customElements.get('hero-scroll')) {
    customElements.define('hero-scroll', HeroScroll);
}