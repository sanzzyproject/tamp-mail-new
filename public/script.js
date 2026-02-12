let currentEmail = localStorage.getItem('sann404_mail') || null;
// Menyimpan ID pesan yang sudah dibaca (kombinasi pengirim + waktu)
let readMessages = JSON.parse(localStorage.getItem('sann404_read_msgs') || "[]");
let inboxData = [];
let refreshInterval;

document.addEventListener('DOMContentLoaded', () => {
    if (currentEmail) {
        document.getElementById('emailAddress').innerText = currentEmail;
        fetchInbox();
    } else {
        generateNewEmail();
    }
    
    // Auto refresh setiap 10 detik
    startAutoRefresh();
});

// Tab Switcher
function switchTab(viewId, element) {
    // Hide all tabs
    document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));
    // Show selected tab
    document.getElementById(viewId).classList.add('active');
    
    // Update nav active state
    if(element) { // element null jika dipanggil dari fungsi lain
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }
}

async function confirmNewEmail() {
    if(confirm('Buat email baru? Inbox lama akan hilang.')) {
        generateNewEmail();
    }
}

async function generateNewEmail() {
    const emailDisplay = document.getElementById('emailAddress');
    emailDisplay.innerText = "Membuat ID baru...";
    
    // Reset state lokal
    readMessages = [];
    localStorage.removeItem('sann404_read_msgs');
    updateBadge(0);
    
    try {
        const res = await fetch('/api?action=generate');
        const data = await res.json();
        
        if (data.success) {
            currentEmail = data.result.email;
            localStorage.setItem('sann404_mail', currentEmail);
            emailDisplay.innerText = currentEmail;
            
            // Bersihkan tampilan
            document.getElementById('unreadList').innerHTML = emptyState('updates');
            document.getElementById('readList').innerHTML = emptyState('inbox');
            
            // Pindah ke home
            switchTab('view-home', document.querySelector('.nav-item:first-child'));
            
        } else {
            alert('Gagal: ' + data.result);
        }
    } catch (e) {
        emailDisplay.innerText = "Error Jaringan";
    }
}

async function fetchInbox() {
    if (!currentEmail) return;

    try {
        const res = await fetch(`/api?action=inbox&email=${currentEmail}`);
        const data = await res.json();

        if (data.success && data.result.inbox) {
            inboxData = data.result.inbox;
            processMessages(inboxData);
        }
    } catch (e) {
        console.log("Fetch error (ignore if offline)");
    }
}

function processMessages(messages) {
    const unreadContainer = document.getElementById('unreadList');
    const readContainer = document.getElementById('readList');
    
    let unreadHTML = '';
    let readHTML = '';
    let unreadCount = 0;

    messages.forEach((msg, index) => {
        // Kita buat ID unik sederhana dari kombinasi waktu + pengirim
        const msgId = `${msg.created}_${msg.from}`.replace(/\s/g, '');
        
        const isRead = readMessages.includes(msgId);
        
        const html = `
            <div class="message-card ${isRead ? 'read' : 'unread'}" onclick="openMessage(${index}, '${msgId}', ${isRead})">
                <div class="msg-top">
                    <span class="msg-from">${msg.from}</span>
                    <span class="msg-time">${msg.created}</span>
                </div>
                <div class="msg-subject">${msg.subject || '(Tanpa Subjek)'}</div>
                <div class="msg-snippet">${msg.message}</div>
            </div>
        `;

        if (isRead) {
            readHTML += html;
        } else {
            unreadHTML += html;
            unreadCount++;
        }
    });

    // Update DOM
    unreadContainer.innerHTML = unreadHTML || emptyState('updates');
    readContainer.innerHTML = readHTML || emptyState('inbox');
    
    updateBadge(unreadCount);
}

function openMessage(index, msgId, isAlreadyRead) {
    const msg = inboxData[index];
    
    // Tampilkan di modal
    document.getElementById('modalSubject').innerText = msg.subject || '(No Subject)';
    document.getElementById('modalFrom').innerText = msg.from;
    document.getElementById('modalTime').innerText = msg.created;
    document.getElementById('modalBody').innerText = msg.message;
    
    const modal = document.getElementById('msgModal');
    modal.classList.add('show');

    // Jika pesan dari tab Updates (belum dibaca), tandai sbg dibaca
    if (!isAlreadyRead) {
        readMessages.push(msgId);
        localStorage.setItem('sann404_read_msgs', JSON.stringify(readMessages));
        
        // Refresh list tampilan di background
        processMessages(inboxData);
    }
}

function closeModal() {
    document.getElementById('msgModal').classList.remove('show');
}

function updateBadge(count) {
    const badge = document.getElementById('badge-count');
    const dot = document.getElementById('nav-dot');
    
    if (count > 0) {
        badge.innerText = count;
        badge.style.display = 'inline-block';
        dot.style.display = 'block';
    } else {
        badge.style.display = 'none';
        dot.style.display = 'none';
    }
}

function emptyState(type) {
    const icon = type === 'updates' ? 'bi-bell-slash' : 'bi-inbox';
    const text = type === 'updates' ? 'Belum ada pesan baru.' : 'Belum ada pesan terbaca.';
    return `
        <div class="empty-placeholder">
            <i class="bi ${icon}"></i>
            <p>${text}</p>
        </div>
    `;
}

function copyEmail() {
    if (!currentEmail) return;
    navigator.clipboard.writeText(currentEmail);
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

function startAutoRefresh() {
    let timeLeft = 10;
    const timerText = document.getElementById('timerText');
    
    setInterval(() => {
        timeLeft--;
        timerText.innerText = `Auto-refresh: ${timeLeft}s`;
        if (timeLeft <= 0) {
            fetchInbox();
            timeLeft = 10;
        }
    }, 1000);
}
