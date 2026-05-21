document.addEventListener('DOMContentLoaded', () => {
    const galleryGrid = document.getElementById('gallery-grid');
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');
    const closeModalBtn = document.querySelector('.modal-close');

    async function fetchSunsetPhotos() {
        let photos = [];
        
        console.log("Starting fresh sunset hunt...");

        // Method 1: Flickr JSONP (Bypasses CORS entirely)
        try {
            console.log("Attempting Flickr JSONP...");
            const flickrData = await fetchFlickrJSONP();
            if (flickrData && flickrData.items) {
                flickrData.items.forEach(item => {
                    // m.jpg is 240px, b.jpg is 1024px
                    const imgUrl = item.media.m.replace('_m.jpg', '_b.jpg');
                    photos.push({
                        url: imgUrl,
                        title: item.title || "Global Sunset",
                        info: `Captured recently by ${item.author.split('"')[1] || 'Flickr User'}.`,
                        author: "Flickr"
                    });
                });
            }
        } catch (e) {
            console.error("Flickr JSONP failed:", e);
        }

        // Method 2: LiveSunset thumbnails (if Flickr didn't give enough or failed)
        if (photos.length < 10) {
            try {
                console.log("Attempting LiveSunset thumbnails...");
                const LIVESUNSET_API = 'https://www.livesunset.io/api/get-locations.php';
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(LIVESUNSET_API)}`;
                const res = await fetch(proxyUrl);
                const data = await res.json();
                
                if (data && data.locations) {
                    data.locations.forEach(loc => {
                        if (loc.youtube_thumbnail_url) {
                            let imgUrl = loc.youtube_thumbnail_url.replace('w_300', 'w_1280');
                            photos.push({
                                url: imgUrl,
                                title: `${loc.city}, ${loc.country}`,
                                info: loc.quality ? loc.quality.reason : "Live feed screenshot.",
                                author: "Live Cam"
                            });
                        }
                    });
                }
            } catch (e) {
                console.error("LiveSunset fetch failed:", e);
            }
        }

        // Final Render
        if (photos.length > 0) {
            // Shuffle to get diverse locations if we have many
            photos = photos.sort(() => Math.random() - 0.5);
            renderGallery(photos.slice(0, 18)); // Limit to exactly 18 photos
        } else {
            console.warn("All fresh sources failed. Showing backup.");
            renderGallery([
                { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', title: 'Yosemite Twilight', info: 'Fallback archival image.', author: 'Unsplash' },
                { url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80', title: 'Ocean Horizon', info: 'Fallback archival image.', author: 'Unsplash' }
            ]);
        }
    }

    function fetchFlickrJSONP() {
        return new Promise((resolve, reject) => {
            const callbackName = 'flickr_cb_' + Date.now();
            window[callbackName] = (data) => {
                delete window[callbackName];
                resolve(data);
            };
            
            const script = document.createElement('script');
            script.src = `https://www.flickr.com/services/feeds/photos_public.gne?tags=sunset&format=json&jsoncallback=${callbackName}`;
            script.onerror = () => reject(new Error("Script load error"));
            document.head.appendChild(script);
            
            // Timeout after 10s
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    reject(new Error("Timeout"));
                }
            }, 10000);
        });
    }

    function renderGallery(photos) {
        galleryGrid.innerHTML = '';
        
        // Force grid styles directly on the container
        galleryGrid.style.display = 'grid';
        galleryGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(240px, 1fr))';
        galleryGrid.style.gap = '15px';
        galleryGrid.style.padding = '10px';
        galleryGrid.style.marginTop = '20px';

        photos.forEach(photo => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            // Force item styles
            item.style.position = 'relative';
            item.style.borderRadius = '15px';
            item.style.overflow = 'hidden';
            item.style.cursor = 'pointer';
            item.style.aspectRatio = '3 / 2';
            item.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            item.style.backgroundColor = '#111';

            item.innerHTML = `
                <img src="${photo.url}" alt="${photo.title}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='https://via.placeholder.com/400x225?text=Signal+Lost'" loading="lazy">
                <div class="overlay-info" style="position:absolute; bottom:0; left:0; width:100%; padding:15px 10px 8px; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent); color:#fff; font-size:0.85rem; opacity:0; transition:opacity 0.3s ease;">${photo.title}</div>
            `;
            
            // Hover effect in JS
            item.onmouseenter = () => {
                item.querySelector('.overlay-info').style.opacity = '1';
                item.style.borderColor = '#00f3ff';
                item.style.boxShadow = '0 0 15px rgba(0, 243, 255, 0.3)';
            };
            item.onmouseleave = () => {
                item.querySelector('.overlay-info').style.opacity = '0';
                item.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                item.style.boxShadow = 'none';
            };

            item.addEventListener('click', () => {
                openModal(photo.url, photo.title, photo.info);
            });
            
            galleryGrid.appendChild(item);
        });
    }

    function openModal(imgUrl, title, info) {
        // Force modal styles directly
        modal.style.display = "flex";
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100vw";
        modal.style.height = "100vh";
        modal.style.zIndex = "10000";
        modal.style.backgroundColor = "rgba(0,0,0,0.9)";
        modal.style.backdropFilter = "blur(10px)";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.flexDirection = "column";

        modalImg.src = imgUrl;
        modalImg.style.maxWidth = "90%";
        modalImg.style.maxHeight = "80vh";
        modalImg.style.border = "2px solid #00f3ff";
        modalImg.style.borderRadius = "10px";
        modalImg.style.boxShadow = "0 0 30px rgba(0, 243, 255, 0.5)";

        modalCaption.innerHTML = `<strong style="color:#00f3ff; font-size:1.2rem;">${title}</strong><br><span style="font-size: 0.9rem; color: #ccc; margin-top:10px; display:block;">${info}</span>`;
        modalCaption.style.backgroundColor = "rgba(10, 15, 25, 0.9)";
        modalCaption.style.padding = "20px";
        modalCaption.style.marginTop = "15px";
        modalCaption.style.borderRadius = "10px";
        modalCaption.style.textAlign = "center";
        modalCaption.style.maxWidth = "80%";
    }

    function closeModal() {
        modal.style.display = "none";
        modalImg.src = "";
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    window.addEventListener('keydown', (e) => { if (e.key === "Escape") closeModal(); });

    fetchSunsetPhotos();
    // Refresh every 5 minutes (300000 ms) for more dynamic updates
    setInterval(fetchSunsetPhotos, 300000);
});
