let currentEmail = localStorage.getItem('temp_email') || null;
let refreshTimer = null;
let countdownInterval = null;

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (currentEmail) {
        updateEmailDisplay(currentEmail);
        fetchInbox();
    } else {
        generateNewEmail();
    }
    
    // Start countdown and auto refresh loop
    startAutoRefresh();
});

async function generateNewEmail() {
    const emailBox = document.getElementById('emailAddress');
    emailBox.innerHTML = '<span class="loading-text">Generating...</span>';
    
    // Reset Inbox
    document.getElementById('inboxList').innerHTML = `
        <div class="empty-state">
            <i class="bi bi-hourglass-split"></i>
            <p>Membuat identitas baru...</p>
        </div>
    `;

    try {
        const response = await fetch('/api?action=generate');
        const data = await response.json();

        if (data.success) {
            currentEmail = data.result.email;
            localStorage.setItem('temp_email', currentEmail);
            updateEmailDisplay(currentEmail);
            fetchInbox(); // Initial inbox check
        } else {
            alert('Gagal membuat email. Coba lagi.');
        }
    } catch (error) {
        console.error('Error:', error);
        emailBox.innerText = 'Error Connection';
    }
}

function updateEmailDisplay(email) {
    document.getElementById('emailAddress').innerText = email;
}

async function fetchInbox() {
    if (!currentEmail) return;

    try {
        const response = await fetch(`/api?action=inbox&email=${currentEmail}`);
        const data = await response.json();

        if (data.success && data.result.inbox) {
            renderInbox(data.result.inbox);
            document.getElementById('inboxCount').innerText = data.result.inbox.length;
        }
    } catch (error) {
        console.error('Inbox Error:', error);
    }
}

function renderInbox(messages) {
    const list = document.getElementById('inboxList');
    
    if (messages.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-envelope-open"></i>
                <p>Menunggu pesan masuk...</p>
            </div>
        `;
        return;
    }

    list.innerHTML = messages.map(msg => `
        <div class="email-item" onclick="alert('Isi pesan:\\n\\n${msg.message}')">
            <div class="email-meta">
                <span class="email-sender">${msg.from}</span>
                <span>${msg.created}</span>
            </div>
            <div class="email-subject">${msg.subject || '(Tanpa Subjek)'}</div>
            <div class="email-preview">${msg.message}</div>
        </div>
    `).join('');
}

function copyEmail() {
    if (!currentEmail) return;
    navigator.clipboard.writeText(currentEmail).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    });
}

function startAutoRefresh() {
    let timeLeft = 10;
    const timerDisplay = document.getElementById('timer');

    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = timeLeft;
        
        if (timeLeft <= 0) {
            fetchInbox();
            timeLeft = 10; // Reset ke 10 detik
        }
    }, 1000);
}
