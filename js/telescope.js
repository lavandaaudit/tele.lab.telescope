document.addEventListener('DOMContentLoaded', () => {
    const player = document.getElementById('p-player');
    const clipLabel = document.getElementById('clip-id');
    const grid = document.getElementById('main-grid');
    const loader = document.getElementById('gallery-loader');
    const vList = document.getElementById('v-list');
    
    let existingPhotos = [];
    let existingVideos = [];
    let playlist = [];
    let currentVideoIdx = 0;
    const VIDEO_DIR = 'videos/';
    const PHOTO_DIR = 'photos/';

    // --- COSMIC DATA ---
    async function updateCosmicData() {
        try {
            const kpRes = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
            const kpData = await kpRes.json();
            const lastKp = parseFloat(kpData[kpData.length-1].kp_index);
            const kpEl = document.getElementById('kp-val');
            if (kpEl) {
                kpEl.textContent = lastKp.toFixed(1);
                kpEl.className = 'value ' + (lastKp < 4 ? 'low' : lastKp < 6 ? 'mid' : 'high');
            }

            const windRes = await fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json');
            const windData = await windRes.json();
            const lastWind = parseFloat(windData[windData.length-1][2]); 
            const windEl = document.getElementById('wind-val');
            if (windEl) {
                windEl.innerHTML = `${Math.round(lastWind)} <small>km/s</small>`;
                windEl.className = 'value ' + (lastWind < 400 ? 'low' : lastWind < 600 ? 'mid' : 'high');
            }

            const flareRes = await fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json');
            const flareData = await flareRes.json();
            const lastFlare = flareData[flareData.length-1].flux;
            let flareVal = 'B';
            if (lastFlare >= 1e-4) flareVal = 'X';
            else if (lastFlare >= 1e-5) flareVal = 'M';
            else if (lastFlare >= 1e-6) flareVal = 'C';
            const flareEl = document.getElementById('flare-val');
            if (flareEl) {
                flareEl.textContent = flareVal + '-CLASS';
                flareEl.className = 'value ' + (flareVal == 'B' ? 'low' : flareVal == 'C' ? 'mid' : 'high');
            }
        } catch (e) {
            console.error("Telemetry Error", e);
        }
    }

    // --- VIDEO SYSTEM ---
    async function findVideos() {
        console.log("Starting video scan...");
        let consecutiveMiss = 0;
        for (let i = 1; i <= 1000; i++) {
            const exists = await checkFile(`${VIDEO_DIR}${i}.mp4`);
            if (exists) {
                existingVideos.push(i);
                addVideoToPlaylist(i);
                consecutiveMiss = 0;
            } else {
                consecutiveMiss++;
            }
            
            // Limit search: stop if we miss 10 in a row
            if (consecutiveMiss > 10) break;
            
            // Minimal pause to keep UI responsive
            if (i % 30 === 0) await new Promise(r => setTimeout(r, 10));
        }

        if (existingVideos.length > 0) {
            // First play #1 if exists, otherwise first found
            const startId = existingVideos.includes(1) ? 1 : existingVideos[0];
            playVideo(startId);
        } else {
            console.warn("No videos found in videos/ folder.");
        }
    }

    function addVideoToPlaylist(id) {
        if (!vList) return;
        const btn = document.createElement('div');
        btn.className = 'v-item';
        btn.textContent = id;
        btn.dataset.id = id;
        btn.onclick = () => playVideo(id);
        vList.appendChild(btn);
    }

    function playVideo(id) {
        if (!player) return;
        player.muted = true;
        player.src = `${VIDEO_DIR}${id}.mp4`;
        clipLabel.textContent = `REC: #${id}`;
        
        document.querySelectorAll('.v-item').forEach(el => el.classList.remove('active'));
        const activeBtn = document.querySelector(`.v-item[data-id="${id}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        player.play().catch(e => console.log("User interaction required for play."));
        
        if (playlist.length === 0 && existingVideos.length > 0) {
            playlist = [...existingVideos];
            shuffle(playlist);
        }
    }

    function playNextRandom() {
        if (playlist.length === 0) return;
        currentVideoIdx = (currentVideoIdx + 1) % playlist.length;
        playVideo(playlist[currentVideoIdx]);
    }

    if (player) player.onended = playNextRandom;

    // --- PHOTO SYSTEM ---
    async function findPhotos() {
        console.log("Starting photo scan...");
        let id = 1;
        let consecutiveMiss = 0;
        const stopLimit = 15;

        while (consecutiveMiss < stopLimit && id <= 1000) {
            const exists = await checkFile(`${PHOTO_DIR}${id}.jpg`);
            if (exists) {
                existingPhotos.push(id);
                addPhotoToGrid(id);
                consecutiveMiss = 0;
            } else {
                consecutiveMiss++;
            }
            id++;
            if (id % 30 === 0) await new Promise(r => setTimeout(r, 10));
        }
        if (loader) loader.style.display = 'none';
        if (existingPhotos.length === 0 && loader) {
            loader.style.display = 'block';
            loader.textContent = "OPTICAL ARCHIVE EMPTY";
        }
    }

    function addPhotoToGrid(id) {
        if (!grid) return;
        const item = document.createElement('div');
        item.className = 'g-item';
        item.innerHTML = `<img src="${PHOTO_DIR}${id}.jpg" loading="lazy">`;
        item.onclick = () => openLightbox(id);
        grid.appendChild(item);
    }

    // --- UTILS ---
    async function checkFile(url) {
        try {
            // Using random param to force check on server
            const res = await fetch(url + '?v=' + Math.random(), { method: 'HEAD' });
            return res.ok;
        } catch (e) { return false; }
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- LIGHTBOX ---
    const modal = document.getElementById('f-modal');
    const modalImg = document.getElementById('f-img');
    const fCounter = document.getElementById('f-counter');
    let modalIdx = 0;

    function openLightbox(id) {
        modalIdx = existingPhotos.indexOf(id);
        if (modal) modal.style.display = 'flex';
        updateLightbox();
        document.body.style.overflow = 'hidden';
    }

    function updateLightbox() {
        const id = existingPhotos[modalIdx];
        if (modalImg) modalImg.src = `${PHOTO_DIR}${id}.jpg`;
        if (fCounter) fCounter.textContent = `IMG: #${id} (${modalIdx + 1} / ${existingPhotos.length})`;
    }

    function navigate(step) {
        if (existingPhotos.length === 0) return;
        modalIdx += step;
        if (modalIdx < 0) modalIdx = existingPhotos.length - 1;
        if (modalIdx >= existingPhotos.length) modalIdx = 0;
        updateLightbox();
    }

    const closeBtn = document.querySelector('.f-close');
    const closeLightbox = () => {
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    if (closeBtn) closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
    });

    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('f-content')) {
            closeLightbox();
        }
    });

    const prevBtn = document.querySelector('.f-prev');
    const nextBtn = document.querySelector('.f-next');
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigate(-1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigate(1); });
    
    window.addEventListener('keydown', (e) => {
        if (modal && modal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') navigate(-1);
            if (e.key === 'ArrowRight') navigate(1);
            if (e.key === 'Escape') closeLightbox();
        }
    });

    // BOOTSTRAP
    updateCosmicData();
    setInterval(updateCosmicData, 60000);
    findVideos();
    findPhotos();
});
