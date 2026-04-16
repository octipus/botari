if (!customElements.get('localization-form')) {
    customElements.define('localization-form', class LocalizationForm extends HTMLElement {
        constructor() {
            super();

            this.elements = {
                input: this.querySelector('input[name="locale_code"], input[name="country_code"]'),
                button: this.querySelector('button.localization-form__select'),
                panel: this.querySelector('.disclosure__list-wrapper'),
                search: this.querySelector('input[name="country_filter"]'),
                closeButton: this.querySelector('.country-selector__close-button'),
                resetButton: this.querySelector('button[type="reset"]'),
                searchIcon: this.querySelector('.country-filter__search-icon'),
                liveRegion: this.querySelector('#sr-country-search-results'),
            }

            if (this.elements.search) {
                this.elements.search.addEventListener('keyup', this.filterCountries.bind(this))
                this.elements.search.addEventListener('keydown', this.onSearchKeyDown.bind(this))
            }


            if (this.elements.resetButton) {
                this.elements.resetButton.addEventListener('click', this.resetFilter.bind(this))
                this.elements.resetButton.addEventListener('mousedown', (event) => event.preventDefault())
            }

            this.querySelectorAll('a').forEach((item) => item.addEventListener('click', this.onItemClick.bind(this)))
        }

        onItemClick(event) {
            event.preventDefault()
            const form = this.querySelector('form')
            this.elements.input.value = event.currentTarget.dataset.value
            if (form) form.submit()
        }

        normalizeString(str) {
            return str
              .normalize('NFD')
              .replace(/\p{Diacritic}/gu, '')
              .toLowerCase();
        }

        filterCountries() {
            const searchValue = this.normalizeString(this.elements.search.value);
            const popularCountries = this.querySelector('.popular-countries')
            const allCountries = this.querySelectorAll('a')
            let visibleCountries = allCountries.length
            console.log('fires')

            this.elements.resetButton.classList.toggle('hidden', !searchValue)

            if (popularCountries) {
                popularCountries.classList.toggle('hidden', searchValue)
            }

            allCountries.forEach((item) => {
                const countryName = this.normalizeString(item.querySelector('.country').textContent)
                if (countryName.indexOf(searchValue) > -1) {
                    item.parentElement.classList.remove('hidden')
                    visibleCountries++
                } else {
                    item.parentElement.classList.add('hidden')
                    visibleCountries--
                }
            })
        }

        resetFilter(event) {
            event.stopPropagation()
            this.elements.search.value = ''
            this.filterCountries()
            this.elements.search.focus()
        }

        onSearchFocus() {
            this.elements.searchIcon.classList.add('country-filter__search-icon--hidden')
        }

        onSearchBlur() {
            if (!this.elements.search.value) this.elements.searchIcon.classList.remove('country-filter__search-icon--hidden')
        }

        onSearchKeyDown(event) {
            if (event.code.toUpperCase() === 'ENTER') event.preventDefault()
        }
    }
    )
}