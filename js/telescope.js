document.addEventListener('DOMContentLoaded', () => {
    const player = document.getElementById('p-player');
    const clipLabel = document.getElementById('clip-id');
    const grid = document.getElementById('main-grid');
    const loader = document.getElementById('gallery-loader');
    
    let photoIndex = 1;
    let loading = false;
    let playlist = Array.from({length: 1000}, (_, i) => i + 1);
    let allPhotos = []; // Index tracking

    // 1. COSMIC DATA FETCHING (NOAA)
    async function updateCosmicData() {
        try {
            // K-Index
            const kpRes = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
            const kpData = await kpRes.json();
            const lastKp = parseFloat(kpData[kpData.length-1].kp_index);
            const kpEl = document.getElementById('kp-val');
            kpEl.textContent = lastKp.toFixed(1);
            kpEl.className = 'value ' + (lastKp < 4 ? 'low' : lastKp < 6 ? 'mid' : 'high');

            // Solar Wind
            const windRes = await fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json');
            const windData = await windRes.json();
            const lastWind = parseFloat(windData[windData.length-1][2]); // velocity
            const windEl = document.getElementById('wind-val');
            windEl.innerHTML = `${Math.round(lastWind)} <small>km/s</small>`;
            windEl.className = 'value ' + (lastWind < 400 ? 'low' : lastWind < 600 ? 'mid' : 'high');

            // Flares (GOES X-Ray)
            const flareRes = await fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json');
            const flareData = await flareRes.json();
            const lastFlare = flareData[flareData.length-1].flux;
            let flareVal = 'B';
            if (lastFlare >= 1e-4) flareVal = 'X';
            else if (lastFlare >= 1e-5) flareVal = 'M';
            else if (lastFlare >= 1e-6) flareVal = 'C';
            
            const flareEl = document.getElementById('flare-val');
            flareEl.textContent = flareVal + '-CLASS';
            flareEl.className = 'value ' + (flareVal == 'B' ? 'low' : flareVal == 'C' ? 'mid' : 'high');

        } catch (e) {
            console.error("Data synchronization error", e);
        }
    }

    // 2. RANDOM VIDEO PLAYER (1-1000)
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    let currentVideoIdx = 0;
    shuffle(playlist);

    function playRandom() {
        const id = playlist[currentVideoIdx];
        player.src = `videos/${id}.mp4`;
        clipLabel.textContent = `REC: #${id}`;
        player.play().catch(() => {});
        currentVideoIdx = (currentVideoIdx + 1) % playlist.length;
    }

    player.onended = playRandom;

    // 3. INFINITE GALLERY (Lazy Load 50 at a time)
    function loadPhotos(count = 50) {
        if (photoIndex > 1000 || loading) return;
        loading = true;
        
        for (let i = 0; i < count; i++) {
            if (photoIndex > 1000) break;
            const id = photoIndex;
            const item = document.createElement('div');
            item.className = 'g-item';
            const imgUrl = `photos/${id}.jpg`;
            item.innerHTML = `<img src="${imgUrl}" alt="Capture ${id}" loading="lazy">`;
            
            item.onclick = () => openLightbox(id);
            grid.appendChild(item);
            photoIndex++;
        }
        loading = false;
        if (photoIndex > 1000) loader.style.display = 'none';
    }

    // Infinite Scroll detection
    window.onscroll = () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
            loadPhotos(25);
        }
    };

    // 4. LIGHTBOX NAVIGATION
    const modal = document.getElementById('f-modal');
    const modalImg = document.getElementById('f-img');
    const fCounter = document.getElementById('f-counter');
    let currentPhotoId = 1;

    function openLightbox(id) {
        currentPhotoId = id;
        modal.style.display = 'flex';
        updateLightbox();
        document.body.style.overflow = 'hidden';
    }

    function updateLightbox() {
        modalImg.src = `photos/${currentPhotoId}.jpg`;
        fCounter.textContent = `OPTICAL CAPTURE #${currentPhotoId}`;
    }

    function nav(step) {
        currentPhotoId += step;
        if (currentPhotoId < 1) currentPhotoId = 1000;
        if (currentPhotoId > 1000) currentPhotoId = 1;
        updateLightbox();
    }

    document.querySelector('.f-close').onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };
    document.querySelector('.f-prev').onclick = (e) => { e.stopPropagation(); nav(-1); };
    document.querySelector('.f-next').onclick = (e) => { e.stopPropagation(); nav(1); };
    modal.onclick = (e) => { if(e.target === modal) document.querySelector('.f-close').onclick(); };

    // Keyboard support
    window.onkeydown = (e) => {
        if (modal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') nav(-1);
            if (e.key === 'ArrowRight') nav(1);
            if (e.key === 'Escape') document.querySelector('.f-close').onclick();
        }
    };

    // Initialize
    updateCosmicData();
    setInterval(updateCosmicData, 60000); // 1 min sync
    playRandom();
    loadPhotos(50);
});
