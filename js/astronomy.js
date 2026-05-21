document.addEventListener('DOMContentLoaded', () => {
    // 1. Moon Phase Calculator
    function getMoonPhase() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        
        // Simple algorithm to calculate moon phase
        let c = 0;
        let e = 0;
        let jd = 0;
        let b = 0;

        if (month < 3) {
            year--;
            month += 12;
        }

        ++month;

        c = 365.25 * year;
        e = 30.6 * month;
        jd = c + e + day - 694039.09; // jd is total days elapsed
        jd /= 29.5305882; // divide by the moon cycle
        b = parseInt(jd); // int(jd) -> b, take integer part of jd
        jd -= b; // subtract integer part to leave fractional part of original jd
        b = Math.round(jd * 8); // scale fraction from 0-8 and round

        if (b >= 8) b = 0; // 0 and 8 are the same so turn 8 into 0

        const phases = [
            { name: 'НОВИЙ МІСЯЦЬ', icon: '🌑' },
            { name: 'МОЛОДИЙ МІСЯЦЬ', icon: '🌒' },
            { name: 'ПЕРША ЧВЕРТЬ', icon: '🌓' },
            { name: 'ПРИБУВАЮЧИЙ МІСЯЦЬ', icon: '🌔' },
            { name: 'ПОВНИЙ МІСЯЦЬ', icon: '🌕' },
            { name: 'СПАДАЮЧИЙ МІСЯЦЬ', icon: '🌖' },
            { name: 'ОСТАННЯ ЧВЕРТЬ', icon: '🌗' },
            { name: 'СТАРИЙ МІСЯЦЬ', icon: '🌘' }
        ];

        // Illumination percentage
        let illumination = 0;
        if (jd <= 0.5) {
            illumination = (jd / 0.5) * 100;
        } else {
            illumination = ((1.0 - jd) / 0.5) * 100;
        }

        return {
            phase: phases[b],
            illumination: illumination.toFixed(1)
        };
    }

    const moonData = getMoonPhase();
    document.getElementById('moon-icon').textContent = moonData.phase.icon;
    document.getElementById('moon-phase-name').textContent = moonData.phase.name;
    document.getElementById('moon-illumination').textContent = `ОСВІТЛЕНІСТЬ: ${moonData.illumination}%`;

    // 2. Terminator Map
    // Initialize Leaflet map
    const map = L.map('terminator-map', {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        dragging: false
    }).setView([0, 0], 0);

    // Add CartoDB Dark Matter tile layer for a high-tech dark look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Add terminator
    let terminator = L.terminator({
        color: '#ff5500',
        fillColor: '#000000',
        fillOpacity: 0.6,
        weight: 1
    }).addTo(map);

    // Update terminator every minute
    setInterval(() => {
        terminator.setTime();
    }, 60000);
});
