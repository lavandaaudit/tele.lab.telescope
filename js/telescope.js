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
            console.error("Data error", e);
        }
    }

    // --- VIDEO SYSTEM ---
    async function initVideo() {
        // Probe for videos 1...1000
        for (let i = 1; i <= 1000; i++) {
            const exists = await checkFile(`${VIDEO_DIR}${i}.mp4`);
            if (exists) {
                existingVideos.push(i);
                addVideoToPlaylist(i);
            } else if (i > 20 && existingVideos.length < i / 2) {
                // Heuristic to stop probing if too many miss (but allow some gaps)
                if (i > existingVideos[existingVideos.length-1] + 10) break;
            }
            if (i % 20 === 0) await new Promise(r => setTimeout(r, 5));
        }

        if (existingVideos.includes(1)) {
            playVideo(1);
        } else if (existingVideos.length > 0) {
            playVideo(existingVideos[0]);
        }
    }

    function addVideoToPlaylist(id) {
        const btn = document.createElement('div');
        btn.className = 'v-item';
        btn.textContent = id;
        btn.dataset.id = id;
        btn.onclick = () => playVideo(id);
        vList.appendChild(btn);
    }

    function playVideo(id) {
        player.muted = true; // Hard-enforce mute
        player.src = `${VIDEO_DIR}${id}.mp4`;
        clipLabel.textContent = `REC: #${id}`;
        
        // Update active state in list
        document.querySelectorAll('.v-item').forEach(el => el.classList.remove('active'));
        const activeBtn = document.querySelector(`.v-item[data-id="${id}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        player.play().catch(() => console.log("Waiting for interaction..."));
        
        // Update shuffle queue
        if (playlist.length === 0) {
            playlist = [...existingVideos];
            shuffle(playlist);
        }
    }

    function playNextRandom() {
        if (existingVideos.length === 0) return;
        currentVideoIdx = (currentVideoIdx + 1) % playlist.length;
        playVideo(playlist[currentVideoIdx]);
    }

    player.onended = playNextRandom;

    // --- PHOTO SYSTEM ---
    async function probePhotos() {
        let id = 1;
        let miss = 0;
        while (miss < 10 && id <= 1000) {
            const exists = await checkFile(`${PHOTO_DIR}${id}.jpg`);
            if (exists) {
                existingPhotos.push(id);
                addPhotoToGrid(id);
                miss = 0;
            } else { miss++; }
            id++;
            if (id % 20 === 0) await new Promise(r => setTimeout(r, 5));
        }
        loader.style.display = 'none';
    }

    function addPhotoToGrid(id) {
        const item = document.createElement('div');
        item.className = 'g-item';
        item.innerHTML = `<img src="${PHOTO_DIR}${id}.jpg" loading="lazy">`;
        item.onclick = () => openLightbox(id);
        grid.appendChild(item);
    }

    // --- UTILS ---
    async function checkFile(url) {
        try {
            const res = await fetch(url, { method: 'GET' });
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
        modal.style.display = 'flex';
        updateLightbox();
        document.body.style.overflow = 'hidden';
    }

    function updateLightbox() {
        const id = existingPhotos[modalIdx];
        modalImg.src = `${PHOTO_DIR}${id}.jpg`;
        fCounter.textContent = `IMG: #${id} (${modalIdx + 1} / ${existingPhotos.length})`;
    }

    function navigate(step) {
        modalIdx += step;
        if (modalIdx < 0) modalIdx = existingPhotos.length - 1;
        if (modalIdx >= existingPhotos.length) modalIdx = 0;
        updateLightbox();
    }

    document.querySelector('.f-close').onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };
    document.querySelector('.f-prev').onclick = (e) => { e.stopPropagation(); navigate(-1); };
    document.querySelector('.f-next').onclick = (e) => { e.stopPropagation(); navigate(1); };
    
    window.onkeydown = (e) => {
        if (modal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') navigate(-1);
            if (e.key === 'ArrowRight') navigate(1);
            if (e.key === 'Escape') document.querySelector('.f-close').onclick();
        }
    };

    updateCosmicData();
    setInterval(updateCosmicData, 60000);
    initVideo();
    probePhotos();
});
