document.addEventListener('DOMContentLoaded', () => {
    const player = document.getElementById('p-player');
    const clipLabel = document.getElementById('clip-id');
    const grid = document.getElementById('main-grid');
    const loader = document.getElementById('gallery-loader');
    
    let existingPhotos = [];
    let playlist = [];
    let currentVideoIdx = 0;
    const VIDEO_DIR = 'videos/';
    const PHOTO_DIR = 'photos/';

    // 1. COSMIC DATA FETCHING (NOAA)
    async function updateCosmicData() {
        try {
            const kpRes = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
            const kpData = await kpRes.json();
            const lastKp = parseFloat(kpData[kpData.length-1].kp_index);
            const kpEl = document.getElementById('kp-val');
            kpEl.textContent = lastKp.toFixed(1);
            kpEl.className = 'value ' + (lastKp < 4 ? 'low' : lastKp < 6 ? 'mid' : 'high');

            const windRes = await fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json');
            const windData = await windRes.json();
            const lastWind = parseFloat(windData[windData.length-1][2]); 
            const windEl = document.getElementById('wind-val');
            windEl.innerHTML = `${Math.round(lastWind)} <small>km/s</small>`;
            windEl.className = 'value ' + (lastWind < 400 ? 'low' : lastWind < 600 ? 'mid' : 'high');

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
            console.error("Cosmic Data Error:", e);
        }
    }

    // 2. VIDEO PLAYER LOGIC
    async function initVideo() {
        const startFile = `${VIDEO_DIR}1.mp4`;
        const exists = await checkFile(startFile);
        
        if (exists) {
            playVideo(1);
        } else {
            console.warn("Clip #1 not found, seeking random...");
            startRandomStream();
        }
    }

    function playVideo(id) {
        player.pause();
        player.src = `${VIDEO_DIR}${id}.mp4`;
        player.load();
        player.muted = true; // Hard-enforce mute for autoplay
        player.play().catch(e => console.warn("Player blocked", e));
        clipLabel.textContent = `REC: #${id}`;
        
        // Setup random playlist for later
        if (playlist.length === 0) {
            playlist = Array.from({length: 1000}, (_, i) => i + 1);
            playlist = playlist.filter(n => n !== id);
            shuffle(playlist);
        }
    }

    function startRandomStream() {
        if (playlist.length === 0) {
            playlist = Array.from({length: 1000}, (_, i) => i + 1);
            shuffle(playlist);
        }
        playNextInRandom();
    }

    async function playNextInRandom() {
        const id = playlist[currentVideoIdx];
        currentVideoIdx = (currentVideoIdx + 1) % playlist.length;
        
        const exists = await checkFile(`${VIDEO_DIR}${id}.mp4`);
        if (exists) {
            playVideo(id);
        } else {
            playNextInRandom();
        }
    }

    player.onended = playNextInRandom;

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // 3. PHOTO ARCHIVE PROBE (Sequential logic with limit)
    async function probePhotos() {
        loader.textContent = "SYNCHRONIZING ARCHIVE...";
        let id = 1;
        let consecutiveMissing = 0;
        const stopLimit = 10; // Stop after 10 missing files

        while (consecutiveMissing < stopLimit && id <= 1000) {
            const url = `${PHOTO_DIR}${id}.jpg`;
            const exists = await checkFile(url);
            if (exists) {
                existingPhotos.push(id);
                addPhotoToGrid(id);
                consecutiveMissing = 0;
            } else {
                consecutiveMissing++;
            }
            id++;
            if (id % 15 === 0) await new Promise(r => setTimeout(r, 5));
        }

        if (existingPhotos.length === 0) {
            loader.textContent = "ARCHIVE EMPTY (CHECK photos/ FOLDER)";
        } else {
            loader.style.display = 'none';
        }
    }

    function addPhotoToGrid(id) {
        const item = document.createElement('div');
        item.className = 'g-item';
        const img = document.createElement('img');
        img.src = `${PHOTO_DIR}${id}.jpg`;
        img.alt = `Sunset ${id}`;
        img.loading = "lazy";
        item.appendChild(img);
        
        item.onclick = () => openLightbox(id);
        grid.appendChild(item);
    }

    async function checkFile(url) {
        try {
            // Using GET instead of HEAD for more reliable cross-platform detection
            const res = await fetch(url, { method: 'GET' });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    // 4. PHOTO LIGHTBOX
    const modal = document.getElementById('f-modal');
    const modalImg = document.getElementById('f-img');
    const fCounter = document.getElementById('f-counter');
    let activePhotoIdx = 0;

    function openLightbox(id) {
        activePhotoIdx = existingPhotos.indexOf(id);
        modal.style.display = 'flex';
        updateLightbox();
        document.body.style.overflow = 'hidden';
    }

    function updateLightbox() {
        if (existingPhotos.length === 0) return;
        const id = existingPhotos[activePhotoIdx];
        modalImg.src = `${PHOTO_DIR}${id}.jpg`;
        fCounter.textContent = `CAPTURE #${id} (${activePhotoIdx + 1} / ${existingPhotos.length})`;
    }

    function navigate(step) {
        if (existingPhotos.length === 0) return;
        activePhotoIdx += step;
        if (activePhotoIdx < 0) activePhotoIdx = existingPhotos.length - 1;
        if (activePhotoIdx >= existingPhotos.length) activePhotoIdx = 0;
        updateLightbox();
    }

    const closer = document.querySelector('.f-close');
    const prevBtn = document.querySelector('.f-prev');
    const nextBtn = document.querySelector('.f-next');

    if (closer) closer.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };
    if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); navigate(-1); };
    if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); navigate(1); };
    
    modal.onclick = (e) => { 
        if(e.target === modal || e.target === document.querySelector('.f-content')) {
            closer.onclick();
        }
    };

    window.onkeydown = (e) => {
        if (modal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') navigate(-1);
            if (e.key === 'ArrowRight') navigate(1);
            if (e.key === 'Escape') closer.onclick();
        }
    };

    // User interaction to enable sound
    window.addEventListener('click', () => {
        if (player.muted) player.muted = false;
    }, { once: true });

    // Bootstrap
    updateCosmicData();
    setInterval(updateCosmicData, 60000);
    initVideo();
    probePhotos();
});
