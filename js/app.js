document.addEventListener('DOMContentLoaded', () => {
    const locationsGrid = document.getElementById('locations-grid');
    const videoContainer = document.getElementById('video-container');
    const currentLocationEl = document.getElementById('current-location');
    const currentTempEl = document.getElementById('current-temp');
    const sunsetCountdownEl = document.getElementById('sunset-countdown');
    const fsBtn = document.getElementById('fs-btn');
    const glassFrame = document.querySelector('.glass-frame');

    let locationsData = [];
    let currentInterval = null;

    if (fsBtn && glassFrame) {
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (glassFrame.requestFullscreen) glassFrame.requestFullscreen();
                else if (glassFrame.webkitRequestFullscreen) glassFrame.webkitRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
    }

    async function fetchLocations() {
        try {
            const targetUrl = 'https://www.livesunset.io/api/get-locations.php';
            const response = await fetch(targetUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const parsedData = await response.json();
            handleData(parsedData);
        } catch (error) {
            console.error('Error fetching locations:', error);
            fetchViaProxy();
        }
    }

    async function fetchViaProxy() {
        try {
            const targetUrl = encodeURIComponent('https://www.livesunset.io/api/get-locations.php');
            const proxyUrl = `https://api.allorigins.win/raw?url=${targetUrl}`;
            const response = await fetch(proxyUrl);
            const parsedData = await response.json();
            handleData(parsedData);
        } catch (err) {
            console.error('Proxy fetch failed:', err);
            handleData({ locations: [] }); // Use fallbacks
        }
    }

    function handleData(data) {
        locationsData = data && data.locations ? data.locations : [];
        
        if (locationsData.length === 0) {
            // Add multiple fallbacks if sources are empty
            locationsData.push({
                id: 'fallback_iss',
                city: 'ORBITAL', country: 'SPACE', country_code: 'ISS',
                embed_link: 'https://www.youtube.com/watch?v=vytmBNhc9ig',
                youtube_thumbnail_url: 'https://img.youtube.com/vi/vytmBNhc9ig/maxresdefault.jpg',
                quality: { score: 'AUTO' }, time_until_end: 'CONTINUOUS',
                secs_to_sunset: 86400, weather: { temperature: '-270' }
            });
            locationsData.push({
                id: 'fallback_venice',
                city: 'VENICE', country: 'ITALY', country_code: 'IT',
                embed_link: 'https://www.youtube.com/watch?v=whZHMbZqRFk',
                youtube_thumbnail_url: 'https://img.youtube.com/vi/whZHMbZqRFk/maxresdefault.jpg',
                quality: { score: 'HD' }, time_until_end: 'LIVE',
                secs_to_sunset: 3600, weather: { temperature: '18' }
            });
        }
        
        renderLocations();
        if (locationsData.length > 0) selectLocation(locationsData[0]);
    }

    function renderLocations() {
        if (!locationsGrid) return;
        locationsGrid.innerHTML = '';
        locationsData.forEach(loc => {
            const card = document.createElement('div');
            card.className = 'location-card';
            card.dataset.id = loc.id;
            const thumbUrl = loc.youtube_thumbnail_url || 'https://via.placeholder.com/300x169?text=No+Signal';
            card.innerHTML = `
                <div class="loc-thumb" style="background-image: url('${thumbUrl}')">
                    <div class="loc-quality">Q: ${loc.quality ? loc.quality.score : '-'}</div>
                </div>
                <div class="loc-info">
                    <div class="loc-city">${loc.city}</div>
                    <div class="loc-country">${loc.country}</div>
                    <div class="loc-sunset">IN: ${loc.time_until_end}</div>
                </div>
            `;
            card.addEventListener('click', () => selectLocation(loc));
            locationsGrid.appendChild(card);
        });
    }

    function selectLocation(loc) {
        document.querySelectorAll('.location-card').forEach(c => c.classList.remove('active'));
        const activeCard = document.querySelector(`.location-card[data-id="${loc.id}"]`);
        if (activeCard) activeCard.classList.add('active');

        let youtubeId = '';
        if (loc.embed_link) {
            const match = loc.embed_link.match(/v=([^&]+)/) || loc.embed_link.match(/embed\/([^?&]+)/) || loc.embed_link.match(/youtu\.be\/([^?&]+)/);
            if (match) youtubeId = match[1];
            else if (!loc.embed_link.includes('/')) youtubeId = loc.embed_link;
        }

        if (youtubeId) {
            videoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        } else {
            videoContainer.innerHTML = `<div class="loading-feed" style="color:var(--neon-red)">ВТРАТА СИГНАЛУ</div>`;
        }

        currentLocationEl.textContent = `${loc.city.toUpperCase()}, ${loc.country_code.toUpperCase()}`;
        currentTempEl.textContent = loc.weather ? `${loc.weather.temperature}°C` : '--°C';

        let secs = loc.secs_to_sunset;
        if (currentInterval) clearInterval(currentInterval);
        updateCountdownDisplay(secs);
        currentInterval = setInterval(() => { secs--; updateCountdownDisplay(secs); }, 1000);
    }

    function updateCountdownDisplay(secs) {
        if (secs <= 0) {
            sunsetCountdownEl.textContent = "ЗАХІД СОНЦЯ: ТРИВАЄ";
            sunsetCountdownEl.style.color = "var(--neon-orange)";
            return;
        }
        const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60);
        const format = (val) => val.toString().padStart(2, '0');
        sunsetCountdownEl.textContent = `ЗАХІД СОНЦЯ: -${format(h)}:${format(m)}:${format(s)}`;
        sunsetCountdownEl.style.color = "var(--neon-blue)";
    }

    fetchLocations();
    setInterval(fetchLocations, 300000);
});
