document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('tv-player');
    const clipLabel = document.getElementById('current-clip');
    const clockElement = document.getElementById('digital-clock');
    
    let playlist = [];
    let currentIndex = 0;
    const VIDEO_DIR = 'videos/';
    const MAX_CLIPS = 1000;

    // 1. Initialize random playlist
    function initPlaylist() {
        playlist = Array.from({length: MAX_CLIPS}, (_, i) => i + 1);
        // Shuffle
        for (let i = playlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
        }
    }

    // 2. Play next video
    async function playNext() {
        if (playlist.length === 0) initPlaylist();
        
        const videoId = playlist[currentIndex];
        const url = `${VIDEO_DIR}${videoId}.mp4`;

        // Check if file exists before playing to avoid black screen
        const exists = await checkFile(url);
        
        if (exists) {
            videoPlayer.src = url;
            videoPlayer.play().catch(e => {
                console.warn("Autoplay failed, waiting for user interaction", e);
                // On first load, browser might block autoplay without click
            });
            clipLabel.textContent = `CLIP: #${videoId}`;
            
            // Visual effect on change
            document.body.classList.remove('screen-flash');
            void document.body.offsetWidth; // trigger reflow
            document.body.classList.add('screen-flash');
        } else {
            console.log(`Video #${videoId} not found, skipping...`);
            skipToNext();
        }
    }

    function skipToNext() {
        currentIndex++;
        if (currentIndex >= playlist.length) {
            initPlaylist();
            currentIndex = 0;
        }
        playNext();
    }

    async function checkFile(url) {
        try {
            const res = await fetch(url + '?v=' + Math.random(), { method: 'HEAD' });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    // 3. Digital Clock
    function updateClock() {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString('uk-UA', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        });
    }

    // Event Listeners
    videoPlayer.addEventListener('ended', skipToNext);
    
    // Initial start
    initPlaylist();
    playNext();
    
    setInterval(updateClock, 1000);
    updateClock();

    // Click anywhere to unmute/play if blocked
    window.addEventListener('click', () => {
        if (videoPlayer.paused) videoPlayer.play();
        videoPlayer.muted = false; // TV should probably have sound if available
    }, { once: true });
});
