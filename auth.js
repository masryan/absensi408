// Fungsi untuk menangani login
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Cek kredensial di Google Sheets
    checkCredentials(username, password, function(user) {
        if (user) {
            // Simpan data user di localStorage
            localStorage.setItem('userId', user.idPPNPN);
            localStorage.setItem('userName', user.namaPegawai);
            localStorage.setItem('userStatus', user.status);
            localStorage.setItem('userJob', user.pekerjaan);
            localStorage.setItem('userShift', user.shift);
            
            // Redirect ke dashboard
            window.location.href = 'dashboard.html';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Login Gagal',
                text: 'ID Pegawai atau Password salah'
            });
        }
    });
});

// Fungsi untuk logout
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('logoutBtn2').addEventListener('click', logout);

function logout() {
    // Hapus data user dari localStorage
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userStatus');
    localStorage.removeItem('userJob');
    localStorage.removeItem('userShift');
    
    // Redirect ke halaman login
    window.location.href = 'index.html';
}

// Fungsi untuk memeriksa kredensial di Google Sheets
function checkCredentials(username, password, callback) {
    // Implementasi koneksi ke Google Sheets
    // Ini adalah contoh pseudocode, implementasi aktual tergantung pada API yang digunakan
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'User!A2:E'
    }).then(function(response) {
        const users = response.result.values;
        const user = users.find(u => u[2] === username && u[3] === password);
        
        if (user) {
            callback({
                idPPNPN: user[0],
                namaPegawai: user[1],
                username: user[2],
                password: user[3],
                status: user[4],
                pekerjaan: user[5],
                shift: user[6]
            });
        } else {
            callback(null);
        }
    }, function(error) {
        console.error("Error mengambil data user: ", error);
        callback(null);
    });
}

// Fungsi untuk mengambil data absensi hari ini dari Google Sheets
function getTodayAttendanceFromSheet(userId, date, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Absensi!A2:N'
    }).then(function(response) {
        const records = response.result.values;
        const todayRecord = records.find(r => r[1] === userId && r[2] === date);
        
        if (todayRecord) {
            callback({
                idAbsensi: todayRecord[0],
                idPPNPN: todayRecord[1],
                tanggal: todayRecord[2],
                jamMasuk: todayRecord[3],
                lokasiMasukLat: todayRecord[4],
                lokasiMasukLng: todayRecord[5],
                fotoMasuk: todayRecord[6],
                statusMasuk: todayRecord[7],
                jamPulang: todayRecord[8],
                lokasiPulangLat: todayRecord[9],
                lokasiPulangLng: todayRecord[10],
                fotoPulang: todayRecord[11],
                statusPulang: todayRecord[12]
            });
        } else {
            callback(null);
        }
    }, function(error) {
        console.error("Error mengambil data absensi: ", error);
        callback(null);
    });
}

// Fungsi untuk mengambil riwayat absensi dari Google Sheets
function getAttendanceHistoryFromSheet(userId, startDate, endDate, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Absensi!A2:N'
    }).then(function(response) {
        const records = response.result.values;
        const history = records
            .filter(r => r[1] === userId && r[2] >= startDate && r[2] <= endDate)
            .map(r => ({
                idAbsensi: r[0],
                idPPNPN: r[1],
                tanggal: r[2],
                jamMasuk: r[3],
                lokasiMasukLat: r[4],
                lokasiMasukLng: r[5],
                fotoMasuk: r[6],
                statusMasuk: r[7],
                jamPulang: r[8],
                lokasiPulangLat: r[9],
                lokasiPulangLng: r[10],
                fotoPulang: r[11],
                statusPulang: r[12]
            }));
        
        callback(history);
    }, function(error) {
        console.error("Error mengambil riwayat absensi: ", error);
        callback([]);
    });
}

// Fungsi untuk mengambil saldo cuti dari Google Sheets
function getLeaveBalanceFromSheet(userId, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'DataCuti!A2:E'
    }).then(function(response) {
        const balances = response.result.values;
        const userBalance = balances.find(b => b[0] === userId);
        
        if (userBalance) {
            callback({
                idPPNPN: userBalance[0],
                nama: userBalance[1],
                tahun: userBalance[2],
                spk: userBalance[3],
                saldoCuti: parseInt(userBalance[4]),
                cutiTerpakai: parseInt(userBalance[5]) || 0
            });
        } else {
            callback(null);
        }
    }, function(error) {
        console.error("Error mengambil data cuti: ", error);
        callback(null);
    });
}

// Fungsi untuk menemukan baris absensi di Google Sheets
function findAttendanceRow(userId, date, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Absensi!A2:N'
    }).then(function(response) {
        const records = response.result.values;
        const rowIndex = records.findIndex(r => r[1] === userId && r[2] === date);
        
        if (rowIndex !== -1) {
            callback(rowIndex + 2); // +2 karena header dan index mulai dari 0
        } else {
            callback(null);
        }
    }, function(error) {
        console.error("Error mencari data absensi: ", error);
        callback(null);
    });
}