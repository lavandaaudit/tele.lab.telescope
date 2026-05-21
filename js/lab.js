document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('lab-video-player');
    const playlistContainer = document.getElementById('playlist-container');
    const titleHUD = document.getElementById('current-video-title');
    const photoGrid = document.getElementById('photo-gallery-grid');
    const expandBtnContainer = document.getElementById('expand-btn-container');
    const expandBtn = document.getElementById('gallery-expand-btn');
    
    // Modal elements
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-img');
    const closeModalBtn = document.querySelector('.modal-close-lab');
    const modalPrev = document.getElementById('modal-prev');
    const modalNext = document.getElementById('modal-next');
    const modalCounter = document.getElementById('modal-counter-lab');

    let videoPlaylist = [];
    let photoPlaylist = [];
    let currentVideoIndex = 0;
    let currentPhotoIndexInModal = 0;

    const MAX_ITEMS = 1000;
    const VIDEO_DIR = 'videos/';
    const PHOTO_DIR = 'photos/';

    async function probeFiles() {
        console.log("Starting media search...");
        
        // 1. Probe Videos
        playlistContainer.innerHTML = '<div class="loading-feed">SCANNING...</div>';
        videoPlaylist = await findSequentialFiles(VIDEO_DIR, ['mp4', 'MP4', 'mov', 'MOV'], 1, MAX_ITEMS);
        
        if (videoPlaylist.length === 0) {
            playlistContainer.innerHTML = '<div class="playlist-item">ВІДЕО НЕ ЗНАЙДЕНО (videos/)</div>';
        } else {
            renderPlaylist();
            if (!videoPlayer.src || videoPlayer.src === "") {
                playVideo(0);
            }
        }

        // 2. Probe Photos
        photoGrid.innerHTML = '<div class="loading-feed">SCANNING ARCHIVE...</div>';
        photoPlaylist = await findSequentialFiles(PHOTO_DIR, ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG'], 1, MAX_ITEMS);
        
        if (photoPlaylist.length === 0) {
            photoGrid.innerHTML = '<div class="loading-feed" style="color:var(--neon-blue); grid-column:1/-1;">ФОТО НЕ ЗНАЙДЕНО (photos/)</div>';
        } else {
            renderGallery();
            // Show expand button if there are more than ~6-9 photos (depends on layout)
            // But usually we show it if we have any photos to allow "expanding" the grid height
            if (photoPlaylist.length > 0) {
                expandBtnContainer.style.display = 'block';
            }
        }
    }

    async function findSequentialFiles(dir, extensions, start, max) {
        if (!Array.isArray(extensions)) extensions = [extensions];
        let found = [];
        let p = start;
        let keepSearching = true;

        while(keepSearching && p <= max) {
            let foundInStep = false;
            for (let ext of extensions) {
                let url = `${dir}${p}.${ext}`;
                let res = await checkFile(url, p);
                if (res.exists) {
                    found.push({ id: res.id, url: res.url });
                    foundInStep = true;
                    break;
                }
            }
            if (!foundInStep) keepSearching = false;
            p++;
        }
        return found;
    }

    async function checkFile(url, id) {
        try {
            // Using random param to prevent cache during development probes
            const response = await fetch(url + '?v=' + Math.random(), { method: 'HEAD' });
            if (response.ok) {
                return { exists: true, url, id };
            }
        } catch (e) {}
        return { exists: false };
    }

    function renderPlaylist() {
        playlistContainer.innerHTML = '';
        videoPlaylist.forEach((video, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.index = index;
            item.textContent = `САНСЕТ #${video.id}`;
            item.addEventListener('click', () => playVideo(index));
            playlistContainer.appendChild(item);
        });
    }

    function playVideo(index) {
        if (index < 0 || index >= videoPlaylist.length) return;
        currentVideoIndex = index;
        const video = videoPlaylist[index];
        
        document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`.playlist-item[data-index="${index}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        
        videoPlayer.src = video.url;
        videoPlayer.play().catch(e => console.error("Auto-play prevented", e));
        titleHUD.textContent = `САНСЕТ #${video.id}`;
    }

    videoPlayer.addEventListener('ended', () => {
        let nextIndex = currentVideoIndex + 1;
        if (nextIndex < videoPlaylist.length) playVideo(nextIndex);
        else playVideo(0);
    });

    function renderGallery() {
        photoGrid.innerHTML = '';
        photoPlaylist.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'lab-photo-item';
            item.innerHTML = `<img src="${photo.url}" alt="Sunset ${photo.id}" loading="lazy"><div class="lab-photo-overlay">САНСЕТ #${photo.id}</div>`;
            item.addEventListener('click', () => openModal(index));
            photoGrid.appendChild(item);
        });
    }

    // Gallery Expand Logic
    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            photoGrid.classList.toggle('expanded');
            if (photoGrid.classList.contains('expanded')) {
                expandBtn.textContent = 'ЗГОРНУТИ АРХІВ';
                expandBtnContainer.classList.add('expanded-state');
            } else {
                expandBtn.textContent = 'РОЗГОРНУТИ ВЕСЬ АРХІВ';
                expandBtnContainer.classList.remove('expanded-state');
                photoGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    function openModal(index) {
        if (index < 0 || index >= photoPlaylist.length) return;
        currentPhotoIndexInModal = index;
        const photo = photoPlaylist[index];

        modal.style.display = "flex";
        updateModalContent(photo);
        document.body.style.overflow = "hidden"; // Prevent scroll
    }

    function updateModalContent(photo) {
        modalImg.src = photo.url;
        modalCounter.textContent = `${currentPhotoIndexInModal + 1} / ${photoPlaylist.length}`;
    }

    function navigateModal(step) {
        let newIndex = currentPhotoIndexInModal + step;
        if (newIndex >= 0 && newIndex < photoPlaylist.length) {
            currentPhotoIndexInModal = newIndex;
            updateModalContent(photoPlaylist[newIndex]);
        } else if (newIndex < 0) {
            currentPhotoIndexInModal = photoPlaylist.length - 1;
            updateModalContent(photoPlaylist[currentPhotoIndexInModal]);
        } else if (newIndex >= photoPlaylist.length) {
            currentPhotoIndexInModal = 0;
            updateModalContent(photoPlaylist[0]);
        }
    }

    function closeModal() {
        modal.style.display = "none";
        modalImg.src = "";
        document.body.style.overflow = "auto";
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalPrev) modalPrev.addEventListener('click', (e) => { e.stopPropagation(); navigateModal(-1); });
    if (modalNext) modalNext.addEventListener('click', (e) => { e.stopPropagation(); navigateModal(1); });
    
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    window.addEventListener('keydown', (e) => { 
        if (modal.style.display === "flex") {
            if (e.key === "Escape") closeModal();
            if (e.key === "ArrowLeft") navigateModal(-1);
            if (e.key === "ArrowRight") navigateModal(1);
        }
    });

    // Start scanning
    probeFiles();
});
