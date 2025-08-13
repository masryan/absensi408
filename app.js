// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    // Cek status login
    checkLoginStatus();
    
    // Update tanggal dan waktu
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Inisialisasi komponen
    initCamera();
    initAttendanceButtons();
    initLocation();
    
    // Load data
    loadAttendanceHistory();
    loadLeaveBalance();
});

// Fungsi untuk mengecek status login
function checkLoginStatus() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'index.html';
    } else {
        document.getElementById('userName').textContent = localStorage.getItem('userName');
        
        // Tampilkan tab admin jika user adalah admin
        if (localStorage.getItem('userStatus') === 'admin') {
            document.getElementById('adminTab').style.display = 'block';
        }
    }
}

// Fungsi untuk update tanggal dan waktu
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('currentDateTime').textContent = now.toLocaleDateString('id-ID', options);
}

// Fungsi untuk inisialisasi kamera
function initCamera() {
    const video = document.getElementById('video');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                video.srcObject = stream;
            })
            .catch(function(error) {
                console.error("Error accessing camera: ", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Kamera tidak dapat diakses',
                    text: 'Pastikan Anda memberikan izin akses kamera'
                });
            });
    }
}

// Fungsi untuk inisialisasi tombol absensi
function initAttendanceButtons() {
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    
    checkInBtn.addEventListener('click', function() {
        document.getElementById('modalTitle').textContent = 'Absen Masuk';
        document.getElementById('submitAttendanceBtn').textContent = 'Absen Masuk';
        document.getElementById('submitAttendanceBtn').onclick = submitCheckIn;
        
        const attendanceModal = new bootstrap.Modal(document.getElementById('attendanceModal'));
        attendanceModal.show();
    });
    
    checkOutBtn.addEventListener('click', function() {
        document.getElementById('modalTitle').textContent = 'Absen Pulang';
        document.getElementById('submitAttendanceBtn').textContent = 'Absen Pulang';
        document.getElementById('submitAttendanceBtn').onclick = submitCheckOut;
        
        const attendanceModal = new bootstrap.Modal(document.getElementById('attendanceModal'));
        attendanceModal.show();
    });
    
    // Cek status absensi hari ini
    checkTodayAttendance();
}

// Fungsi untuk inisialisasi lokasi
function initLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const officeLat = -6.306848;
                const officeLng = 107.306455;
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                const distance = calculateDistance(officeLat, officeLng, userLat, userLng);
                
                document.getElementById('currentLocation').textContent = 
                    `Lat: ${userLat.toFixed(6)}, Lng: ${userLng.toFixed(6)}`;
                document.getElementById('distanceInfo').textContent = 
                    `Jarak dari kantor: ${distance.toFixed(2)} meter`;
                
                // Aktifkan tombol submit jika dalam radius 100m
                if (distance <= 100) {
                    document.getElementById('submitAttendanceBtn').disabled = false;
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Anda di luar radius absensi',
                        text: `Anda berada ${distance.toFixed(2)} meter dari kantor (maksimal 100 meter)`
                    });
                }
            },
            function(error) {
                console.error("Error getting location: ", error);
                document.getElementById('currentLocation').textContent = 'Lokasi tidak dapat diakses';
                document.getElementById('distanceInfo').textContent = 'Pastikan Anda mengizinkan akses lokasi';
            }
        );
    } else {
        document.getElementById('currentLocation').textContent = 'Geolocation tidak didukung oleh browser Anda';
    }
}

// Fungsi untuk menghitung jarak antara dua koordinat (dalam meter)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius bumi dalam meter
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Fungsi untuk submit absen masuk
function submitCheckIn() {
    // Ambil foto dari kamera
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/png');
    
    // Dapatkan lokasi
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const now = new Date();
            const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
            
            // Simpan data absensi ke Google Sheets
            saveAttendanceToSheet({
                idPPNPN: localStorage.getItem('userId'),
                tanggal: formatDate(now),
                jamMasuk: currentTime,
                lokasiMasukLat: position.coords.latitude,
                lokasiMasukLng: position.coords.longitude,
                fotoMasuk: photoData,
                statusMasuk: checkAttendanceStatus('in', currentTime)
            });
            
            // Tutup modal
            const attendanceModal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
            attendanceModal.hide();
            
            // Update status absensi
            checkTodayAttendance();
            
            Swal.fire({
                icon: 'success',
                title: 'Absen Masuk Berhasil',
                text: `Anda absen masuk pada pukul ${currentTime}`
            });
        },
        function(error) {
            console.error("Error getting location: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal mendapatkan lokasi',
                text: 'Pastikan Anda mengizinkan akses lokasi'
            });
        }
    );
}

// Fungsi untuk submit absen pulang
function submitCheckOut() {
    // Ambil foto dari kamera
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/png');
    
    // Dapatkan lokasi
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const now = new Date();
            const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
            
            // Update data absensi di Google Sheets
            updateAttendanceInSheet({
                idPPNPN: localStorage.getItem('userId'),
                tanggal: formatDate(now),
                jamPulang: currentTime,
                lokasiPulangLat: position.coords.latitude,
                lokasiPulangLng: position.coords.longitude,
                fotoPulang: photoData,
                statusPulang: checkAttendanceStatus('out', currentTime)
            });
            
            // Tutup modal
            const attendanceModal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
            attendanceModal.hide();
            
            // Update status absensi
            checkTodayAttendance();
            
            Swal.fire({
                icon: 'success',
                title: 'Absen Pulang Berhasil',
                text: `Anda absen pulang pada pukul ${currentTime}`
            });
        },
        function(error) {
            console.error("Error getting location: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal mendapatkan lokasi',
                text: 'Pastikan Anda mengizinkan akses lokasi'
            });
        }
    );
}

// Fungsi untuk memeriksa status absensi (tepat waktu, terlambat, pulang cepat)
function checkAttendanceStatus(type, time) {
    const userShift = localStorage.getItem('userShift');
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // dalam menit
    
    // Definisikan jam kerja untuk setiap jabatan
    const workHours = {
        'Cleaning Service': { in: 6 * 60, out: 17 * 60 + 30 }, // 06:00 - 17:30
        'Pramubakti': { in: 7 * 60, out: 17 * 60 }, // 07:00 - 17:00
        'Satpam Pagi': { in: 7 * 60, out: 19 * 60 }, // 07:00 - 19:00
        'Satpam Malam': { in: 19 * 60, out: 7 * 60 } // 19:00 - 07:00 (hari berikutnya)
    };
    
    let shiftKey = localStorage.getItem('userJob');
    if (shiftKey === 'Satpam') {
        // Untuk satpam, perlu cek shift hari ini
        shiftKey += ' ' + (currentTime >= 7 * 60 && currentTime < 19 * 60 ? 'Pagi' : 'Malam');
    }
    
    const targetTime = type === 'in' ? workHours[shiftKey].in : workHours[shiftKey].out;
    const timeParts = time.split(':');
    const actualTime = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
    
    if (type === 'in') {
        return actualTime > targetTime ? 'Terlambat' : 'Tepat Waktu';
    } else {
        return actualTime < targetTime ? 'Pulang Cepat' : 'Tepat Waktu';
    }
}

// Fungsi untuk memeriksa absensi hari ini
function checkTodayAttendance() {
    const today = formatDate(new Date());
    const userId = localStorage.getItem('userId');
    
    // Cek di Google Sheets apakah sudah ada absensi hari ini
    getTodayAttendanceFromSheet(userId, today, function(attendance) {
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');
        const statusText = document.getElementById('statusText');
        
        if (attendance && attendance.jamMasuk) {
            checkInBtn.disabled = true;
            checkOutBtn.disabled = false;
            statusText.textContent = `Sudah absen masuk pukul ${attendance.jamMasuk}`;
            
            if (attendance.statusMasuk === 'Terlambat') {
                statusText.classList.add('status-late');
                statusText.classList.remove('status-ontime', 'status-early');
            } else {
                statusText.classList.add('status-ontime');
                statusText.classList.remove('status-late', 'status-early');
            }
            
            if (attendance.jamPulang) {
                checkOutBtn.disabled = true;
                statusText.textContent += ` dan pulang pukul ${attendance.jamPulang}`;
                
                if (attendance.statusPulang === 'Pulang Cepat') {
                    statusText.classList.add('status-early');
                    statusText.classList.remove('status-ontime', 'status-late');
                }
            }
        } else {
            checkInBtn.disabled = false;
            checkOutBtn.disabled = true;
            statusText.textContent = 'Belum absen masuk hari ini';
            statusText.classList.remove('status-late', 'status-ontime', 'status-early');
        }
    });
}

// Fungsi untuk memuat riwayat absensi
function loadAttendanceHistory() {
    const userId = localStorage.getItem('userId');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // 7 hari terakhir
    
    getAttendanceHistoryFromSheet(
        userId, 
        formatDate(startDate), 
        formatDate(endDate), 
        function(history) {
            const tableBody = document.getElementById('attendanceHistory');
            tableBody.innerHTML = '';
            
            history.forEach(record => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${record.tanggal}</td>
                    <td>${record.jamMasuk || '-'}</td>
                    <td class="${record.statusMasuk === 'Terlambat' ? 'status-late' : 'status-ontime'}">
                        ${record.statusMasuk || '-'}
                    </td>
                    <td>${record.jamPulang || '-'}</td>
                    <td class="${record.statusPulang === 'Pulang Cepat' ? 'status-early' : 'status-ontime'}">
                        ${record.statusPulang || '-'}
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
        }
    );
}

// Fungsi untuk memuat saldo cuti
function loadLeaveBalance() {
    const userId = localStorage.getItem('userId');
    getLeaveBalanceFromSheet(userId, function(balance) {
        if (balance) {
            document.getElementById('leaveBalance').textContent = balance.saldoCuti;
            document.getElementById('usedLeave').textContent = balance.cutiTerpakai || 0;
            document.getElementById('remainingLeave').textContent = balance.saldoCuti - (balance.cutiTerpakai || 0);
        }
    });
}

// Fungsi utilitas untuk format tanggal YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// Fungsi untuk menyimpan data ke Google Sheets
function saveAttendanceToSheet(data) {
    // Implementasi koneksi ke Google Sheets
    // Ini adalah contoh pseudocode, implementasi aktual tergantung pada API yang digunakan
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Absensi!A1',
        valueInputOption: 'RAW',
        values: [[
            generateId(), // ID Absensi
            data.idPPNPN,
            data.tanggal,
            data.jamMasuk,
            data.lokasiMasukLat,
            data.lokasiMasukLng,
            data.fotoMasuk,
            data.statusMasuk,
            '', // Jam Pulang
            '', // Lokasi Pulang Lat
            '', // Lokasi Pulang Lng
            '', // Foto Pulang
            ''  // Status Pulang
        ]]
    }).then(function(response) {
        console.log("Data absensi berhasil disimpan");
    }, function(error) {
        console.error("Error menyimpan data absensi: ", error);
    });
}

// Fungsi untuk update data absensi di Google Sheets
function updateAttendanceInSheet(data) {
    // Implementasi koneksi ke Google Sheets
    // Ini adalah contoh pseudocode, implementasi aktual tergantung pada API yang digunakan
    // Pertama perlu menemukan baris yang sesuai dengan idPPNPN dan tanggal
    findAttendanceRow(data.idPPNPN, data.tanggal, function(row) {
        if (row) {
            gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: 'YOUR_SPREADSHEET_ID',
                range: `Absensi!I${row}:N${row}`,
                valueInputOption: 'RAW',
                values: [[
                    data.jamPulang,
                    data.lokasiPulangLat,
                    data.lokasiPulangLng,
                    data.fotoPulang,
                    data.statusPulang
                ]]
            }).then(function(response) {
                console.log("Data absensi berhasil diupdate");
            }, function(error) {
                console.error("Error mengupdate data absensi: ", error);
            });
        }
    });
}

// Fungsi untuk menghasilkan ID unik
function generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
}