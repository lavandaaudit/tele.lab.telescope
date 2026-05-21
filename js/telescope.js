document.addEventListener('DOMContentLoaded', () => {
    const player = document.getElementById('p-player');
    const clipLabel = document.getElementById('clip-id');
    const grid = document.getElementById('main-grid');
    const loader = document.getElementById('gallery-loader');
    
    let existingPhotos = []; // Store only found photos
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
            console.error("Data sync error", e);
        }
    }

    // 2. VIDEO LOGIC: START WITH #1, THEN RANDOM
    async function initVideoSystem() {
        // First, check if 1.mp4 exists
        const startFile = `${VIDEO_DIR}1.mp4`;
        const exists = await checkFile(startFile);
        
        if (exists) {
            playVideo(1);
        } else {
            // If No 1.mp4, just start random search
            playlist = Array.from({length: 1000}, (_, i) => i + 1);
            shuffle(playlist);
            playNextRandom();
        }
    }

    function playVideo(id) {
        player.src = `${VIDEO_DIR}${id}.mp4`;
        clipLabel.textContent = `REC: #${id}`;
        player.play().catch(() => {});
        
        // Prepare random playlist for next clips
        if (playlist.length === 0) {
            playlist = Array.from({length: 1000}, (_, i) => i + 1);
            // Remove id #1 so it doesn't repeat immediately
            playlist = playlist.filter(n => n !== id);
            shuffle(playlist);
        }
    }

    function playNextRandom() {
        if (playlist.length === 0) {
            playlist = Array.from({length: 1000}, (_, i) => i + 1);
            shuffle(playlist);
        }
        
        const id = playlist[currentVideoIdx];
        currentVideoIdx = (currentVideoIdx + 1) % playlist.length;
        
        // Check if random file exists
        checkFile(`${VIDEO_DIR}${id}.mp4`).then(exists => {
            if (exists) {
                playVideo(id);
            } else {
                playNextRandom(); // Try another one
            }
        });
    }

    player.onended = playNextRandom;

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // 3. PHOTO LOGIC: PROBE FOR EXISTING FILES ONLY
    async function probePhotos() {
        loader.textContent = "СИНХРОНІЗАЦІЯ АРХІВУ...";
        let id = 1;
        let missingCount = 0;
        const maxMissing = 5; // Stop after 5 missing files in a row

        while (missingCount < maxMissing && id <= 1000) {
            const url = `${PHOTO_DIR}${id}.jpg`;
            const exists = await checkFile(url);
            if (exists) {
                existingPhotos.push(id);
                addPhotoToGrid(id);
                missingCount = 0;
            } else {
                missingCount++;
            }
            id++;
            // Small delay to prevent browser freezing during massive head requests
            if (id % 20 === 0) await new Promise(r => setTimeout(r, 10));
        }
        
        if (existingPhotos.length === 0) {
            loader.textContent = "АРХІВ ПОРОЖНІЙ";
        } else {
            loader.style.display = 'none';
        }
    }

    function addPhotoToGrid(id) {
        const item = document.createElement('div');
        item.className = 'g-item';
        item.innerHTML = `<img src="${PHOTO_DIR}${id}.jpg" alt="Sunset ${id}" loading="lazy">`;
        item.onclick = () => openLightbox(id);
        grid.appendChild(item);
    }

    async function checkFile(url) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    // 4. LIGHTBOX
    const modal = document.getElementById('f-modal');
    const modalImg = document.getElementById('f-img');
    const fCounter = document.getElementById('f-counter');
    let currentPhotoIdInModal = 0; // index in existingPhotos

    function openLightbox(id) {
        currentPhotoIdInModal = existingPhotos.indexOf(id);
        modal.style.display = 'flex';
        updateLightbox();
        document.body.style.overflow = 'hidden';
    }

    function updateLightbox() {
        const id = existingPhotos[currentPhotoIdInModal];
        modalImg.src = `${PHOTO_DIR}${id}.jpg`;
        fCounter.textContent = `OPTICAL CAPTURE #${id}`;
    }

    function nav(step) {
        currentPhotoIdInModal += step;
        if (currentPhotoIdInModal < 0) currentPhotoIdInModal = existingPhotos.length - 1;
        if (currentPhotoIdInModal >= existingPhotos.length) currentPhotoIdInModal = 0;
        updateLightbox();
    }

    document.querySelector('.f-close').onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };
    document.querySelector('.f-prev').onclick = (e) => { e.stopPropagation(); nav(-1); };
    document.querySelector('.f-next').onclick = (e) => { e.stopPropagation(); nav(1); };
    modal.onclick = (e) => { if(e.target === modal) document.querySelector('.f-close').onclick(); };

    window.onkeydown = (e) => {
        if (modal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') nav(-1);
            if (e.key === 'ArrowRight') nav(1);
            if (e.key === 'Escape') document.querySelector('.f-close').onclick();
        }
    };

    // Init
    updateCosmicData();
    setInterval(updateCosmicData, 60000);
    initVideoSystem();
    probePhotos();
});
