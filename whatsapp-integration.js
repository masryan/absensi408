// Fungsi untuk mengirim notifikasi WhatsApp
function sendWhatsAppNotification(phoneNumber, message) {
    // Format nomor telepon (hilangkan karakter selain angka)
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    
    // Cek apakah nomor valid (minimal 10 digit)
    if (formattedPhone.length < 10) {
        console.error("Nomor telepon tidak valid");
        return;
    }
    
    // Buat link WhatsApp
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    
    // Buka jendela baru
    window.open(whatsappUrl, '_blank');
}

// Fungsi untuk mengirim notifikasi cuti via WhatsApp
function sendLeaveApprovalWhatsApp(userId, leaveRequest) {
    // Dapatkan nomor telepon user dari database
    getUserPhoneNumber(userId, function(phoneNumber) {
        if (!phoneNumber) {
            console.error("Nomor telepon tidak ditemukan");
            return;
        }
        
        const message = `Pengajuan Cuti Anda:\n\n` +
                        `Jenis: ${leaveRequest.jenisIzin}\n` +
                        `Tanggal: ${leaveRequest.tanggalMulaiIzin} s/d ${leaveRequest.tanggalSelesaiIzin}\n` +
                        `Status: DISETUJUI\n\n` +
                        `Silakan login ke sistem untuk mencetak formulir cuti.`;
        
        sendWhatsAppNotification(phoneNumber, message);
    });
}

// Fungsi untuk mengingatkan absen via WhatsApp
function sendAttendanceReminderWhatsApp() {
    // Dapatkan semua user yang belum absen hari ini
    getUsersWhoHaventCheckedIn(function(users) {
        const currentHour = new Date().getHours();
        
        users.forEach(user => {
            if (user.phoneNumber) {
                let message = '';
                
                if (currentHour < 12) {
                    // Notifikasi pagi untuk yang belum absen masuk
                    message = `Hai ${user.namaPegawai},\n\n` +
                              `Anda belum melakukan absen masuk hari ini. ` +
                              `Silakan lakukan absen segera.\n\n` +
                              `Salam,\nHRD Kantorku`;
                } else {
                    // Notifikasi sore untuk yang belum absen pulang
                    message = `Hai ${user.namaPegawai},\n\n` +
                              `Anda belum melakukan absen pulang hari ini. ` +
                              `Silakan lakukan absen pulang sebelum jam kerja berakhir.\n\n` +
                              `Salam,\nHRD Kantorku`;
                }
                
                sendWhatsAppNotification(user.phoneNumber, message);
            }
        });
    });
}

// Fungsi untuk mendapatkan nomor telepon user
function getUserPhoneNumber(userId, callback) {
    // Implementasi pengambilan data dari Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'User!A2:G' // Asumsi kolom G adalah nomor telepon
    }).then(function(response) {
        const users = response.result.values || [];
        const user = users.find(u => u[0] === userId);
        callback(user ? user[6] : null);
    }, function(error) {
        console.error("Error mengambil data user: ", error);
        callback(null);
    });
}