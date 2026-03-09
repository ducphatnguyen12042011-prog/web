/**
 * CS2 TV PRO - Nâng cấp 3D & Chuyển đổi sang RapidAPI (HLTV)
 */

// ==========================================
// 1. CẤU HÌNH API
// ==========================================
const CONFIG = {
    // Dán X-RapidAPI-Key của bạn vào đây
    RAPID_API_KEY: 'df8b45ecb3msh5cb7ad7385ba8e7p1bae5cjsna241fa2b2c92',
    RAPID_API_HOST: 'hltv-api.p.rapidapi.com', // Thay đổi host tùy thuộc vào API HLTV bạn chọn trên RapidAPI
    
    YOUTUBE_API_KEY: 'DÁN_API_KEY_YOUTUBE_TẠI_ĐÂY',
    FALLBACK_VIDEO_ID: 'eOqD2Q5s2M0', 
    REFRESH_INTERVAL: 5 * 60 * 1000 // Cập nhật 5 phút/lần
};

// Cấu hình Header cho RapidAPI
const rapidApiHeaders = {
    'X-RapidAPI-Key': CONFIG.RAPID_API_KEY,
    'X-RapidAPI-Host': CONFIG.RAPID_API_HOST
};

// ==========================================
// 2. KHỞI TẠO HỆ THỐNG
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initCS2TV();
    loadSchedule();
    
    setInterval(() => {
        console.log("Đang cập nhật Radar sóng mới...");
        initCS2TV();
        loadSchedule();
    }, CONFIG.REFRESH_INTERVAL);
});

// ==========================================
// 3. XỬ LÝ TV TRỰC TIẾP
// ==========================================
async function initCS2TV() {
    const player = document.getElementById('video-player');
    const title = document.getElementById('tv-title');
    const currentDomain = window.location.hostname || "localhost";

    title.innerHTML = `<i class="fa-solid fa-satellite-dish fa-spin"></i> Đang dò sóng tín hiệu vệ tinh...`;

    try {
        // KIỂM TRA TRẬN ĐANG LIVE TỪ RAPID API
        // *Lưu ý: Endpoint có thể thay đổi tùy thuộc vào tài liệu của API bạn chọn
        const response = await fetch(`https://${CONFIG.RAPID_API_HOST}/api/matches.json`, {
            method: 'GET',
            headers: rapidApiHeaders
        });
        
        const data = await response.json();
        
        // Lọc các trận đấu đang Live (giả định cấu trúc mảng trả về có cờ live: true)
        const liveMatches = data.filter(match => match.live === true);

        if (liveMatches && liveMatches.length > 0) {
            const match = liveMatches[0];
            
            // Giả sử API trả về link twitch trong object
            if (match.twitchUrl || match.url) {
                const channel = extractTwitchChannel(match.twitchUrl || match.url);
                
                title.innerHTML = `<span class="pulse-green"></span> TRỰC TIẾP: ${match.team1.name} VS ${match.team2.name}`;
                player.innerHTML = `
                    <iframe 
                        src="https://player.twitch.tv/?channel=${channel}&parent=${currentDomain}&autoplay=true&muted=false" 
                        allowfullscreen="true"
                        style="width:100%; height:100%; border:none;">
                    </iframe>`;
                return;
            }
        }

        // ƯU TIÊN 2: Nếu không có Live, mở Highlight mới nhất
        await loadYouTubeHighlight(player, title);

    } catch (error) {
        console.warn("Chưa cấu hình RapidAPI hoặc lỗi mạng. Chuyển sang dự phòng.", error);
        loadYouTubeHighlight(player, title); // Fallback sang Youtube nếu lỗi API
    }
}

function extractTwitchChannel(url) {
    if(!url) return 'eslcs'; // Mặc định kênh ESL nếu lỗi
    const parts = url.split('/');
    return parts[parts.length - 1];
}

async function loadYouTubeHighlight(player, title) {
    try {
        const query = encodeURIComponent("CS2 highlights pro matches live");
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&order=date&maxResults=1&key=${CONFIG.YOUTUBE_API_KEY}`);
        const data = await res.json();

        if (data.items && data.items.length > 0) {
            const videoId = data.items[0].id.videoId;
            title.innerHTML = `<i class="fa-solid fa-fire" style="color:var(--gold)"></i> Đang phát: CS2 Highlights`;
            player.innerHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0" 
                    allow="autoplay; encrypted-media" 
                    allowfullscreen
                    style="width:100%; height:100%; border:none;">
                </iframe>`;
        } else {
            throw new Error("Không tìm thấy video Youtube");
        }
    } catch (err) {
        title.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Kênh Dự Phòng G-TV`;
        player.innerHTML = `<iframe src="https://www.youtube.com/embed/${CONFIG.FALLBACK_VIDEO_ID}?autoplay=1&mute=1" allowfullscreen style="width:100%; height:100%; border:none;"></iframe>`;
    }
}

// ==========================================
// 4. LẤY LỊCH THI ĐẤU & HIỂN THỊ
// ==========================================
async function loadSchedule() {
    const list = document.getElementById('matches-list');
    if (!list) return;

    try {
        // Lấy danh sách trận đấu sắp tới
        const res = await fetch(`https://${CONFIG.RAPID_API_HOST}/api/matches.json`, {
            method: 'GET',
            headers: rapidApiHeaders
        });
        
        const matches = await res.json();
        
        // Cắt lấy 8 trận gần nhất
        const upcomingMatches = matches.slice(0, 8);

        list.innerHTML = upcomingMatches.map(m => {
            // Xử lý dữ liệu fallback nếu API trả thiếu
            const t1Name = m.team1?.name || 'TBD';
            const t2Name = m.team2?.name || 'TBD';
            const t1Logo = m.team1?.logo || 'https://via.placeholder.com/65x65/1a1a24/fca311?text=TBD';
            const t2Logo = m.team2?.logo || 'https://via.placeholder.com/65x65/1a1a24/fca311?text=TBD';
            const eventName = m.event?.name || 'CS2 Pro League';
            const matchTime = new Date(m.date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

            return `
                <div class="match-card 3d-box">
                    <div class="league-tag"><i class="fa-solid fa-trophy"></i> ${eventName}</div>
                    <div class="team-vs-team">
                        <div class="team-box">
                            <img src="${t1Logo}" alt="${t1Name}">
                            <div class="team-name">${t1Name}</div>
                        </div>
                        <div class="vs-circle">VS</div>
                        <div class="team-box">
                            <img src="${t2Logo}" alt="${t2Name}">
                            <div class="team-name">${t2Name}</div>
                        </div>
                    </div>
                    <div style="margin-top: 20px; text-align: center; color: var(--text-dim); font-size: 13px; font-weight: 600;">
                        <i class="fa-regular fa-clock"></i> Bắt đầu: ${matchTime}
                    </div>
                </div>
            `;
        }).join('');

        // KÍCH HOẠT HIỆU ỨNG TƯƠNG TÁC 3D SAU KHI RENDER XONG
        init3DHoverCards();

    } catch (e) {
        list.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--panel-bg); border-radius: 15px; border: 1px dashed var(--gold);">
                <i class="fa-solid fa-plug-circle-xmark" style="font-size: 30px; color: var(--gold); margin-bottom: 10px;"></i>
                <p>Chưa kết nối API hoặc Lỗi máy chủ. Vui lòng nhập X-RapidAPI-Key vào file config.</p>
            </div>`;
    }
}

// ==========================================
// 5. HIỆU ỨNG TƯƠNG TÁC VẬT LÝ 3D (MOUSE TILT)
// ==========================================
function init3DHoverCards() {
    const cards = document.querySelectorAll('.match-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // Vị trí chuột X bên trong thẻ
            const y = e.clientY - rect.top;  // Vị trí chuột Y bên trong thẻ
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Tính toán góc nghiêng (chia số càng lớn góc nghiêng càng ít)
            const rotateX = ((y - centerY) / centerY) * -8; 
            const rotateY = ((x - centerX) / centerX) * 8;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        // Trả lại trạng thái cũ khi chuột rời đi
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)`;
        });
    });
}

// ==========================================
// 6. ĐIỀU HƯỚNG TAB
// ==========================================
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}
