export default class CoretexCountdown extends HTMLElement {
    constructor() {
        super();
    
        // Parse the initial current time and the countdown target date
        this.serverNow = this.parseDateTime(this.dataset.now, this.dataset.timezone);
        this.date = this.parseDateTime(this.dataset.date);
        this.message = this.dataset.message;
        this.showSeconds = this.dataset.seconds === 'true'; // Check if seconds should be displayed
        this.showWeeks = this.dataset.weeks === 'true'; // Check if weeks should be displayed
    
        // Get the time when the countdown should go off, default to "00:00:00" if not provided or empty
        const time = this.dataset.time || "00:00:00";
        const timeParts = time.split(':').map(Number);
        if (timeParts.length === 3) {
            const [hours, minutes, seconds] = timeParts;
            this.date += hours * 3600000 + minutes * 60000 + seconds * 1000; // Add hours, minutes, and seconds to the date timestamp
        }
    
        if (isNaN(this.date)) return; // Exit early if the date is invalid
    
        this.init();
    }    

    // Parses date and handles various formats and timezone considerations
    parseDateTime(dateString, timezone = null) {
        if (!dateString) return timezone ? new Date().toLocaleString('en-US', { timeZone: timezone }) : Date.now(); // Return the current time based on the specified timezone if given

        let parsedDate = new Date(Date.parse(dateString)).getTime();
        if (isNaN(parsedDate)) parsedDate = new Date(dateString.replace(/-/g, "/")).getTime(); // Handles Safari date format issue

        return parsedDate;
    }

    init() {
        this.timer = this.timer.bind(this); // Bind `this` once for performance
        this.intervalId = setInterval(this.timer, 1000); // Save interval ID to clear later if needed
    }

    timer() {
        // Update the server time to the current time
        this.serverNow = Date.now();
        const timeDiff = this.date - this.serverNow;

        if (timeDiff > 0) {
            const { weeks, days, hours, minutes, seconds } = this.calculateTimeUnits(timeDiff);
            this.updateCountdownDisplay(weeks, days, hours, minutes, seconds);
        } else {
            clearInterval(this.intervalId); // Stop the timer when countdown ends
            this.displayEndMessage();
        }
    }

    calculateTimeUnits(timeDiff) {
        const secsInDay = 86400000; // 24 * 60 * 60 * 1000
        const secsInHour = 3600000; // 60 * 60 * 1000
        const secsInMinute = 60000; // 60 * 1000
        const secsInWeek = 604800000; // 7 * 24 * 60 * 60 * 1000

        let weeks = 0;
        let days = Math.floor(timeDiff / secsInDay);

        // If weeks display is enabled, calculate weeks and adjust remaining days
        if (this.showWeeks) {
            weeks = Math.floor(days / 7);
            days = days % 7; // Adjust days to exclude the weeks
        }

        const hours = Math.floor((timeDiff % secsInDay) / secsInHour);
        const minutes = Math.floor((timeDiff % secsInHour) / secsInMinute);
        const seconds = Math.floor((timeDiff % secsInMinute) / 1000);

        return { weeks, days, hours, minutes, seconds };
    }

    updateCountdownDisplay(weeks, days, hours, minutes, seconds) {
        // Create countdown cells only if relevant
        const weekX = this.showWeeks && weeks > 0 ? `<x-cell class="weeks"><span class="date">${weeks}</span> <span class="label">${weeks === 1 ? dateStrings.week : dateStrings.weeks}</span></x-cell>` : '';
        const dayX = days > 0 ? `<x-cell class="days"><span class="date">${days}</span> <span class="label">${days === 1 ? dateStrings.day : dateStrings.days}</span></x-cell>` : '';
        const hourX = `<x-cell class="hours"><span class="date">${hours}</span> <span class="label">${hours === 1 ? dateStrings.hour : dateStrings.hours}</span></x-cell>`;
        const minX = `<x-cell class="mins"><span class="date">${minutes}</span> <span class="label">${minutes === 1 ? dateStrings.minute : dateStrings.minutes}</span></x-cell>`;
        const secX = this.showSeconds ? `<x-cell class="secs"><span class="date">${seconds}</span> <span class="label">${seconds === 1 ? dateStrings.second : dateStrings.seconds}</span></x-cell>` : '';

        this.querySelector('.timer').innerHTML = `${weekX}${dayX}${hourX}${minX}${secX}`;
    }

    displayEndMessage() {
        this.innerHTML = `<h3 class="h3 endMessage">${this.message}</h3>`;
        if (this.dataset.hideSiblings === 'true') {
            this.closest('.countdown')?.classList.add('ended');
        }
    }
}

if (!customElements.get('coretex-countdown')) customElements.define('coretex-countdown', CoretexCountdown);