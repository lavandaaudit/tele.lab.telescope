document.addEventListener('DOMContentLoaded', () => {
    const kpValEl = document.getElementById('kp-val');
    const windValEl = document.getElementById('wind-val');
    const flareValEl = document.getElementById('flare-val');

    // NOAA SWPC JSON endpoints
    const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
    const WIND_URL = 'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json';
    const XRAY_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json';

    async function fetchSolarData() {
        try {
            // Fetch Kp Index
            const kpRes = await fetch(KP_URL);
            const kpData = await kpRes.json();
            // Data format is an array of objects.
            if (kpData && kpData.length > 0) {
                const latestKpRecord = kpData[kpData.length - 1];
                const kpIndex = parseFloat(latestKpRecord.Kp).toFixed(1);
                kpValEl.textContent = kpIndex;
                
                // Color coding based on Kp index
                if (kpIndex >= 5) {
                    kpValEl.style.color = "var(--neon-red)";
                } else if (kpIndex >= 4) {
                    kpValEl.style.color = "var(--neon-orange)";
                } else {
                    kpValEl.style.color = "var(--neon-blue)";
                }
            }

        } catch (e) {
            console.error('Error fetching Kp Index:', e);
            kpValEl.textContent = 'ERR';
        }

        try {
            // Fetch Solar Wind
            // This is a summary JSON. Alternative: use solar wind plasma API
            // Let's use the standard summary JSON if it works, or we can fallback to a generic placeholder.
            // A more reliable endpoint for solar wind speed: https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json
            const PLASMA_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json';
            const plasmaRes = await fetch(PLASMA_URL);
            const plasmaData = await plasmaRes.json();
            // Same array of arrays format: [time_tag, density, speed, temperature]
            if (plasmaData && plasmaData.length > 1) {
                // Find latest valid speed
                let latestSpeed = null;
                for (let i = plasmaData.length - 1; i >= 1; i--) {
                    if (plasmaData[i][2] !== null) {
                        latestSpeed = parseFloat(plasmaData[i][2]).toFixed(0);
                        break;
                    }
                }
                
                if (latestSpeed) {
                    windValEl.textContent = `${latestSpeed} km/s`;
                }
            }
        } catch (e) {
            console.error('Error fetching Solar Wind:', e);
            windValEl.textContent = 'ERR';
        }

        try {
            // Fetch X-Ray Flares (GOES)
            const xrayRes = await fetch(XRAY_URL);
            const xrayData = await xrayRes.json();
            
            if (xrayData && xrayData.length > 0) {
                // Determine current flare class based on latest flux
                // Class A: < 10^-7, B: 10^-7 to 10^-6, C: 10^-6 to 10^-5, M: 10^-5 to 10^-4, X: > 10^-4
                const latest = xrayData[xrayData.length - 1];
                const flux = latest.flux;
                let flareClass = "A/B";
                
                if (flux >= 1e-4) flareClass = "X-CLASS";
                else if (flux >= 1e-5) flareClass = "M-CLASS";
                else if (flux >= 1e-6) flareClass = "C-CLASS";
                
                flareValEl.textContent = flareClass;
                
                if (flareClass === "X-CLASS" || flareClass === "M-CLASS") {
                    flareValEl.style.color = "var(--neon-red)";
                    flareValEl.style.animation = "blink 1s infinite";
                } else if (flareClass === "C-CLASS") {
                    flareValEl.style.color = "var(--neon-orange)";
                } else {
                    flareValEl.style.color = "var(--neon-blue)";
                }
            }
        } catch (e) {
            console.error('Error fetching X-Ray data:', e);
            flareValEl.textContent = 'ERR';
        }
    }

    // Initialize
    fetchSolarData();
    
    // Refresh every 5 minutes
    setInterval(fetchSolarData, 300000);
});
