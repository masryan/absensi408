// Fungsi untuk menampilkan notifikasi real-time
function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        <button class="notification-close">&times;</button>
    `;
    
    document.getElementById('notification-container').appendChild(notification);
    
    // Auto close setelah 5 detik
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
    
    // Close manual
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    });
}

// Fungsi untuk memeriksa dan menampilkan notifikasi yang belum dibaca
function checkUnreadNotifications() {
    const userId = localStorage.getItem('userId');
    
    getUnreadNotificationsFromSheet(userId, function(notifications) {
        notifications.forEach(notif => {
            showNotification(notif.title, notif.message, notif.type);
            markNotificationAsRead(notif.id);
        });
    });
}

// Fungsi untuk mengambil notifikasi dari Google Sheets
function getUnreadNotificationsFromSheet(userId, callback) {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Notifikasi!A2:F'
    }).then(function(response) {
        const notifications = (response.result.values || [])
            .filter(n => n[1] === userId && n[5] === 'FALSE')
            .map(n => ({
                id: n[0],
                userId: n[1],
                title: n[2],
                message: n[3],
                type: n[4],
                isRead: n[5]
            }));
        
        callback(notifications);
    }, function(error) {
        console.error("Error mengambil notifikasi: ", error);
        callback([]);
    });
}

// Fungsi untuk menandai notifikasi sebagai sudah dibaca
function markNotificationAsRead(notificationId) {
    gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: `Notifikasi!F${getNotificationRow(notificationId)}`,
        valueInputOption: 'RAW',
        values: [['TRUE']]
    }).then(function(response) {
        console.log("Notifikasi ditandai sebagai sudah dibaca");
    }, function(error) {
        console.error("Error mengupdate notifikasi: ", error);
    });
}

// Fungsi untuk mengirim notifikasi ke user
function sendNotificationToUser(userId, title, message, type = 'info') {
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Notifikasi!A1',
        valueInputOption: 'RAW',
        values: [[
            generateId(),
            userId,
            title,
            message,
            type,
            'FALSE' // isRead
        ]]
    }).then(function(response) {
        console.log("Notifikasi berhasil dikirim");
    }, function(error) {
        console.error("Error mengirim notifikasi: ", error);
    });
}