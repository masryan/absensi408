// Inisialisasi modul SDM
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('sdmTabs')) {
        // Cek tab yang aktif dari URL
        const urlParams = new URLSearchParams(window.location.search);
        const activeTab = urlParams.get('tab');
        
        if (activeTab === 'leave') {
            const leaveTab = new bootstrap.Tab(document.querySelector('#sdmTabs a[href="#leaveTab"]'));
            leaveTab.show();
        }
        
        // Inisialisasi DataTable
        initDataTables();
        
        // Load data cuti
        loadLeaveRequests();
        
        // Jika admin, load data admin
        if (localStorage.getItem('userStatus') === 'admin') {
            loadAdminLeaveRequests();
            loadAdminAttendance();
            loadHolidays();
            loadLeaveBalances();
        }
        
        // Event listener untuk tombol baru
        document.getElementById('newLeaveBtn').addEventListener('click', resetLeaveForm);
        document.getElementById('submitLeaveBtn').addEventListener('click', submitLeaveRequest);
        document.getElementById('submitHolidayBtn').addEventListener('click', submitHoliday);
        
        // Event listener untuk filter
        document.getElementById('filterAttendanceBtn').addEventListener('click', filterAttendance);
        document.getElementById('adminFilterBtn').addEventListener('click', filterAdminAttendance);
        
        // Event listener untuk form pengaturan
        document.getElementById('locationForm').addEventListener('submit', saveLocationSettings);
        document.getElementById('workHoursForm').addEventListener('submit', saveWorkHoursSettings);
    }
});

// Fungsi untuk inisialisasi DataTable
function initDataTables() {
    $('#attendanceTable').DataTable();
    $('#leaveTable').DataTable();
    
    if (localStorage.getItem('userStatus') === 'admin') {
        $('#adminLeaveTable').DataTable();
        $('#adminAttendanceTable').DataTable();
        $('#holidayTable').DataTable();
        $('#leaveBalanceTable').DataTable();
    }
}

// Fungsi untuk memuat data pengajuan cuti
function loadLeaveRequests() {
    const userId = localStorage.getItem('userId');
    
    getLeaveRequestsFromSheet(userId, function(requests) {
        const table = $('#leaveTable').DataTable();
        table.clear();
        
        requests.forEach(request => {
            const startDate = new Date(request.tanggalMulaiIzin);
            const endDate = new Date(request.tanggalSelesaiIzin);
            const duration = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;
            
            table.row.add([
                request.tanggalPengajuan,
                request.jenisIzin,
                request.tanggalMulaiIzin,
                request.tanggalSelesaiIzin,
                `${duration} hari`,
                request.alasan,
                getStatusBadge(request.statusPengajuan),
                getLeaveActions(request)
            ]).draw(false);
        });
    });
}

// Fungsi untuk memuat data pengajuan cuti untuk admin
function loadAdminLeaveRequests() {
    getAllLeaveRequestsFromSheet(function(requests) {
        const table = $('#adminLeaveTable').DataTable();
        table.clear();
        
        requests.forEach(request => {
            const startDate = new Date(request.tanggalMulaiIzin);
            const endDate = new Date(request.tanggalSelesaiIzin);
            const duration = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;
            
            table.row.add([
                request.namaPegawai,
                request.jenisIzin,
                request.tanggalMulaiIzin,
                request.tanggalSelesaiIzin,
                `${duration} hari`,
                request.alasan,
                getStatusBadge(request.statusPengajuan),
                getAdminLeaveActions(request)
            ]).draw(false);
        });
    });
}

// Fungsi untuk memuat data absensi untuk admin
function loadAdminAttendance() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30); // 30 hari terakhir
    
    getAttendanceForAdminFromSheet(
        formatDate(startDate), 
        formatDate(endDate), 
        '', 
        function(records) {
            const table = $('#adminAttendanceTable').DataTable();
            table.clear();
            
            records.forEach(record => {
                table.row.add([
                    record.namaPegawai,
                    record.tanggal,
                    record.jamMasuk || '-',
                    record.statusMasuk ? getStatusBadge(record.statusMasuk) : '-',
                    record.jamPulang || '-',
                    record.statusPulang ? getStatusBadge(record.statusPulang) : '-',
                    record.lokasiMasukLat ? 'Valid' : 'Tidak Valid'
                ]).draw(false);
            });
        }
    );
}

// Fungsi untuk memuat daftar hari libur
function loadHolidays() {
    getHolidaysFromSheet(function(holidays) {
        const tableBody = document.getElementById('holidayTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';
        
        holidays.forEach(holiday => {
            const row = tableBody.insertRow();
            
            row.innerHTML = `
                <td>${holiday.tanggal}</td>
                <td>${holiday.keterangan}</td>
                <td>
                    <button class="btn btn-sm btn-danger delete-holiday" data-date="${holiday.tanggal}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
        });
        
        // Tambahkan event listener untuk tombol delete
        document.querySelectorAll('.delete-holiday').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteHoliday(this.getAttribute('data-date'));
            });
        });
    });
}

// Fungsi untuk memuat saldo cuti semua pegawai
function loadLeaveBalances() {
    getLeaveBalancesFromSheet(function(balances) {
        const tableBody = document.getElementById('leaveBalanceTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';
        
        balances.forEach(balance => {
            const row = tableBody.insertRow();
            const remaining = balance.saldoCuti - (balance.cutiTerpakai || 0);
            
            row.innerHTML = `
                <td>${balance.nama}</td>
                <td>${balance.spk}</td>
                <td>${balance.tahun}</td>
                <td>${balance.saldoCuti}</td>
                <td>${balance.cutiTerpakai || 0}</td>
                <td>${remaining}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-balance" 
                            data-id="${balance.idPPNPN}" 
                            data-balance="${balance.saldoCuti}">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            `;
        });
        
        // Tambahkan event listener untuk tombol edit
        document.querySelectorAll('.edit-balance').forEach(btn => {
            btn.addEventListener('click', function() {
                editLeaveBalance(
                    this.getAttribute('data-id'),
                    this.getAttribute('data-balance')
                );
            });
        });
    });
}

// Fungsi untuk mendapatkan badge status
function getStatusBadge(status) {
    const statusClass = {
        'Pending': 'bg-warning',
        'Disetujui': 'bg-success',
        'Ditolak': 'bg-danger',
        'Terlambat': 'bg-danger',
        'Pulang Cepat': 'bg-warning',
        'Tepat Waktu': 'bg-success'
    };
    
    return `<span class="badge ${statusClass[status] || 'bg-secondary'}">${status}</span>`;
}

// Fungsi untuk mendapatkan aksi cuti
function getLeaveActions(request) {
    let actions = '';
    
    if (request.statusPengajuan === 'Disetujui') {
        actions += `<button class="btn btn-sm btn-success print-leave" data-id="${request.idPengajuan}">
                      <i class="bi bi-printer"></i>
                   </button> `;
    }
    
    if (request.statusPengajuan === 'Pending') {
        actions += `<button class="btn btn-sm btn-danger cancel-leave" data-id="${request.idPengajuan}">
                      <i class="bi bi-x-circle"></i>
                   </button>`;
    }
    
    return actions;
}

// Fungsi untuk mendapatkan aksi cuti admin
function getAdminLeaveActions(request) {
    let actions = '';
    
    if (request.statusPengajuan === 'Pending') {
        actions += `<button class="btn btn-sm btn-success approve-leave" data-id="${request.idPengajuan}">
                      <i class="bi bi-check-circle"></i>
                   </button> `;
                   
        actions += `<button class="btn btn-sm btn-danger reject-leave" data-id="${request.idPengajuan}">
                      <i class="bi bi-x-circle"></i>
                   </button>`;
    }
    
    if (request.statusPengajuan === 'Disetujui') {
        actions += `<button class="btn btn-sm btn-success print-leave" data-id="${request.idPengajuan}">
                      <i class="bi bi-printer"></i>
                   </button>`;
    }
    
    return actions;
}

// Fungsi untuk reset form cuti
function resetLeaveForm() {
    document.getElementById('leaveForm').reset();
    document.getElementById('availableLeaveBalance').textContent = 
        document.getElementById('remainingLeave').textContent;
    document.getElementById('leaveDuration').textContent = '0';
    
    // Set tanggal minimal hari ini
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDateLeave').min = today;
    document.getElementById('endDateLeave').min = today;
}

// Fungsi untuk submit pengajuan cuti
function submitLeaveRequest() {
    const leaveType = document.getElementById('leaveType').value;
    const startDate = document.getElementById('startDateLeave').value;
    const endDate = document.getElementById('endDateLeave').value;
    const halfDay = document.getElementById('halfDayLeave').value;
    const reason = document.getElementById('leaveReason').value;
    
    if (!leaveType || !startDate || !endDate || !reason) {
        Swal.fire({
            icon: 'error',
            title: 'Data tidak lengkap',
            text: 'Harap isi semua field yang diperlukan'
        });
        return;
    }
    
    // Hitung durasi cuti
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = (end - start) / (1000 * 60 * 60 * 24) + 1;
    
    // Cek sisa cuti
    const remainingLeave = parseInt(document.getElementById('remainingLeave').textContent);
    if (leaveType === 'Cuti Tahunan' && duration > remainingLeave) {
        Swal.fire({
            icon: 'error',
            title: 'Saldo cuti tidak mencukupi',
            text: `Anda hanya memiliki ${remainingLeave} hari cuti tersedia`
        });
        return;
    }
    
    // Simpan ke Google Sheets
    saveLeaveRequestToSheet({
        idPPNPN: localStorage.getItem('userId'),
        tanggalPengajuan: formatDate(new Date()),
        tanggalMulaiIzin: startDate,
        tanggalSelesaiIzin: endDate,
        jenisIzin: leaveType,
        alasan: reason,
        durasi: duration,
        halfDay: halfDay,
        statusPengajuan: 'Pending'
    }, function() {
        Swal.fire({
            icon: 'success',
            title: 'Pengajuan cuti berhasil',
            text: 'Pengajuan cuti Anda telah dikirim dan menunggu persetujuan'
        });
        
        // Tutup modal dan refresh data
        const leaveModal = bootstrap.Modal.getInstance(document.getElementById('leaveModal'));
        leaveModal.hide();
        
        loadLeaveRequests();
        loadLeaveBalance();
    });
}

// Fungsi untuk submit hari libur
function submitHoliday() {
    const date = document.getElementById('holidayDate').value;
    const desc = document.getElementById('holidayDesc').value;
    
    if (!date || !desc) {
        Swal.fire({
            icon: 'error',
            title: 'Data tidak lengkap',
            text: 'Harap isi tanggal dan keterangan hari libur'
        });
        return;
    }
    
    // Simpan ke Google Sheets
    saveHolidayToSheet({
        tanggal: date,
        keterangan: desc
    }, function() {
        Swal.fire({
            icon: 'success',
            title: 'Hari libur berhasil ditambahkan',
            text: `Hari libur pada ${date} telah disimpan`
        });
        
        // Tutup modal dan refresh data
        const holidayModal = bootstrap.Modal.getInstance(document.getElementById('addHolidayModal'));
        holidayModal.hide();
        
        loadHolidays();
    });
}

// Fungsi untuk filter absensi
function filterAttendance() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const userId = localStorage.getItem('userId');
    
    if (!startDate || !endDate) {
        Swal.fire({
            icon: 'error',
            title: 'Filter tidak valid',
            text: 'Harap pilih tanggal awal dan akhir'
        });
        return;
    }
    
    getAttendanceHistoryFromSheet(userId, startDate, endDate, function(history) {
        const table = $('#attendanceTable').DataTable();
        table.clear();
        
        history.forEach(record => {
            table.row.add([
                record.tanggal,
                record.jamMasuk || '-',
                record.statusMasuk ? getStatusBadge(record.statusMasuk) : '-',
                record.jamPulang || '-',
                record.statusPulang ? getStatusBadge(record.statusPulang) : '-',
                record.lokasiMasukLat ? 'Valid' : 'Tidak Valid'
            ]).draw(false);
        });
    });
}

// Fungsi untuk filter absensi admin
function filterAdminAttendance() {
    const startDate = document.getElementById('adminStartDate').value;
    const endDate = document.getElementById('adminEndDate').value;
    const employeeId = document.getElementById('employeeSelect').value;
    
    if (!startDate || !endDate) {
        Swal.fire({
            icon: 'error',
            title: 'Filter tidak valid',
            text: 'Harap pilih tanggal awal dan akhir'
        });
        return;
    }
    
    getAttendanceForAdminFromSheet(startDate, endDate, employeeId, function(records) {
        const table = $('#adminAttendanceTable').DataTable();
        table.clear();
        
        records.forEach(record => {
            table.row.add([
                record.namaPegawai,
                record.tanggal,
                record.jamMasuk || '-',
                record.statusMasuk ? getStatusBadge(record.statusMasuk) : '-',
                record.jamPulang || '-',
                record.statusPulang ? getStatusBadge(record.statusPulang) : '-',
                record.lokasiMasukLat ? 'Valid' : 'Tidak Valid'
            ]).draw(false);
        });
    });
}

// Fungsi untuk menyimpan pengaturan lokasi
function saveLocationSettings(e) {
    e.preventDefault();
    
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    const radius = document.getElementById('radius').value;
    
    // Simpan ke Google Sheets
    saveLocationSettingsToSheet({
        latitude: latitude,
        longitude: longitude,
        radius: radius
    }, function() {
        Swal.fire({
            icon: 'success',
            title: 'Pengaturan lokasi berhasil disimpan',
            text: `Lokasi kantor diupdate ke ${latitude}, ${longitude} dengan radius ${radius} meter`
        });
    });
}

// Fungsi untuk menyimpan pengaturan jam kerja
function saveWorkHoursSettings(e) {
    e.preventDefault();
    
    const workHours = {
        'Cleaning Service': {
            start: document.getElementById('csStart').value,
            end: document.getElementById('csEnd').value
        },
        'Pramubakti': {
            start: document.getElementById('pbStart').value,
            end: document.getElementById('pbEnd').value
        },
        'Satpam Pagi': {
            start: document.getElementById('spStart').value,
            end: document.getElementById('spEnd').value
        },
        'Satpam Malam': {
            start: document.getElementById('smStart').value,
            end: document.getElementById('smEnd').value
        }
    };
    
    // Simpan ke Google Sheets
    saveWorkHoursSettingsToSheet(workHours, function() {
        Swal.fire({
            icon: 'success',
            title: 'Pengaturan jam kerja berhasil disimpan',
            text: 'Jam kerja untuk semua bagian telah diupdate'
        });
    });
}

// Fungsi untuk menghapus hari libur
function deleteHoliday(date) {
    Swal.fire({
        title: 'Hapus hari libur?',
        text: `Anda yakin ingin menghapus hari libur pada ${date}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Hapus',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            // Hapus dari Google Sheets
            deleteHolidayFromSheet(date, function() {
                Swal.fire(
                    'Terhapus!',
                    'Hari libur telah dihapus.',
                    'success'
                );
                loadHolidays();
            });
        }
    });
}

// Fungsi untuk mengedit saldo cuti
function editLeaveBalance(userId, currentBalance) {
    Swal.fire({
        title: 'Edit Saldo Cuti',
        input: 'number',
        inputValue: currentBalance,
        inputAttributes: {
            min: 0,
            step: 1
        },
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        inputValidator: (value) => {
            if (!value || value < 0) {
                return 'Saldo cuti harus angka positif';
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Update di Google Sheets
            updateLeaveBalanceInSheet(userId, result.value, function() {
                Swal.fire(
                    'Berhasil!',
                    'Saldo cuti telah diupdate.',
                    'success'
                );
                loadLeaveBalances();
            });
        }
    });
}

// Fungsi untuk mengambil data pengajuan cuti dari Google Sheets
function getLeaveRequestsFromSheet(userId, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Ijin!A2:I'
    }).then(function(response) {
        const requests = response.result.values
            .filter(r => r[1] === userId)
            .map(r => ({
                idPengajuan: r[0],
                idPPNPN: r[1],
                tanggalPengajuan: r[2],
                tanggalMulaiIzin: r[3],
                tanggalSelesaiIzin: r[4],
                jenisIzin: r[5],
                alasan: r[6],
                statusPengajuan: r[7],
                disetujuiOleh: r[8],
                tanggalPersetujuan: r[9]
            }));
        
        callback(requests);
    }, function(error) {
        console.error("Error mengambil data cuti: ", error);
        callback([]);
    });
}

// Fungsi untuk mengambil semua data pengajuan cuti (untuk admin)
function getAllLeaveRequestsFromSheet(callback) {
    // Implementasi koneksi ke Google Sheets
    // Ini adalah contoh pseudocode, implementasi aktual membutuhkan join antara tabel Ijin dan User
    gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        ranges: ['Ijin!A2:I', 'User!A2:B']
    }).then(function(response) {
        const requests = response.result.valueRanges[0].values || [];
        const users = response.result.valueRanges[1].values || [];
        
        const userMap = {};
        users.forEach(user => {
            userMap[user[0]] = user[1]; // idPPNPN -> namaPegawai
        });
        
        const formattedRequests = requests.map(r => ({
            idPengajuan: r[0],
            idPPNPN: r[1],
            namaPegawai: userMap[r[1]] || 'Unknown',
            tanggalPengajuan: r[2],
            tanggalMulaiIzin: r[3],
            tanggalSelesaiIzin: r[4],
            jenisIzin: r[5],
            alasan: r[6],
            statusPengajuan: r[7],
            disetujuiOleh: r[8],
            tanggalPersetujuan: r[9]
        }));
        
        callback(formattedRequests);
    }, function(error) {
        console.error("Error mengambil data cuti: ", error);
        callback([]);
    });
}

// Fungsi untuk menyimpan pengajuan cuti ke Google Sheets
function saveLeaveRequestToSheet(data, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Ijin!A1',
        valueInputOption: 'RAW',
        values: [[
            generateId(), // ID Pengajuan
            data.idPPNPN,
            data.tanggalPengajuan,
            data.tanggalMulaiIzin,
            data.tanggalSelesaiIzin,
            data.jenisIzin,
            data.alasan,
            data.statusPengajuan,
            '', // Disetujui Oleh
            ''  // Tanggal Persetujuan
        ]]
    }).then(function(response) {
        console.log("Data cuti berhasil disimpan");
        callback();
    }, function(error) {
        console.error("Error menyimpan data cuti: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal menyimpan pengajuan cuti',
            text: 'Terjadi kesalahan saat menyimpan data'
        });
    });
}

// Fungsi untuk mengambil data absensi untuk admin dari Google Sheets
function getAttendanceForAdminFromSheet(startDate, endDate, employeeId, callback) {
    // Implementasi koneksi ke Google Sheets
    // Ini adalah contoh pseudocode, implementasi aktual membutuhkan join antara tabel Absensi dan User
    gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        ranges: ['Absensi!A2:N', 'User!A2:B']
    }).then(function(response) {
        const attendance = response.result.valueRanges[0].values || [];
        const users = response.result.valueRanges[1].values || [];
        
        const userMap = {};
        users.forEach(user => {
            userMap[user[0]] = user[1]; // idPPNPN -> namaPegawai
        });
        
        const filteredRecords = attendance
            .filter(r => {
                const dateMatch = (!startDate || r[2] >= startDate) && (!endDate || r[2] <= endDate);
                const employeeMatch = !employeeId || r[1] === employeeId;
                return dateMatch && employeeMatch;
            })
            .map(r => ({
                idAbsensi: r[0],
                idPPNPN: r[1],
                namaPegawai: userMap[r[1]] || 'Unknown',
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
        
        callback(filteredRecords);
    }, function(error) {
        console.error("Error mengambil data absensi: ", error);
        callback([]);
    });
}

// Fungsi untuk mengambil daftar hari libur dari Google Sheets
function getHolidaysFromSheet(callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'HariLibur!A2:B'
    }).then(function(response) {
        const holidays = (response.result.values || []).map(r => ({
            tanggal: r[0],
            keterangan: r[1]
        }));
        
        callback(holidays);
    }, function(error) {
        console.error("Error mengambil data hari libur: ", error);
        callback([]);
    });
}

// Fungsi untuk menyimpan hari libur ke Google Sheets
function saveHolidayToSheet(data, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'HariLibur!A1',
        valueInputOption: 'RAW',
        values: [[
            data.tanggal,
            data.keterangan
        ]]
    }).then(function(response) {
        console.log("Data hari libur berhasil disimpan");
        callback();
    }, function(error) {
        console.error("Error menyimpan data hari libur: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal menyimpan hari libur',
            text: 'Terjadi kesalahan saat menyimpan data'
        });
    });
}

// Fungsi untuk menghapus hari libur dari Google Sheets
function deleteHolidayFromSheet(date, callback) {
    // Implementasi koneksi ke Google Sheets
    // Pertama perlu menemukan baris yang sesuai dengan tanggal
    findHolidayRow(date, function(row) {
        if (row) {
            gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: 'YOUR_SPREADSHEET_ID',
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: getSheetIdByName('HariLibur'),
                            dimension: 'ROWS',
                            startIndex: row - 1,
                            endIndex: row
                        }
                    }
                }]
            }).then(function(response) {
                console.log("Hari libur berhasil dihapus");
                callback();
            }, function(error) {
                console.error("Error menghapus hari libur: ", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal menghapus hari libur',
                    text: 'Terjadi kesalahan saat menghapus data'
                });
            });
        }
    });
}

// Fungsi untuk mengambil saldo cuti semua pegawai dari Google Sheets
function getLeaveBalancesFromSheet(callback) {
    // Implementasi koneksi ke Google Sheets
    // Ini adalah contoh pseudocode, implementasi aktual membutuhkan join antara tabel DataCuti dan User
    gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        ranges: ['DataCuti!A2:E', 'User!A2:B']
    }).then(function(response) {
        const balances = response.result.valueRanges[0].values || [];
        const users = response.result.valueRanges[1].values || [];
        
        const userMap = {};
        users.forEach(user => {
            userMap[user[0]] = user[1]; // idPPNPN -> namaPegawai
        });
        
        const formattedBalances = balances.map(b => ({
            idPPNPN: b[0],
            nama: userMap[b[0]] || 'Unknown',
            tahun: b[2],
            spk: b[3],
            saldoCuti: parseInt(b[4]),
            cutiTerpakai: parseInt(b[5]) || 0
        }));
        
        callback(formattedBalances);
    }, function(error) {
        console.error("Error mengambil data saldo cuti: ", error);
        callback([]);
    });
}

// Fungsi untuk menyimpan pengaturan lokasi ke Google Sheets
function saveLocationSettingsToSheet(data, callback) {
    // Implementasi koneksi ke Google Sheets
    // Asumsi pengaturan disimpan di sheet Pengaturan
    gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Pengaturan!A1:C1',
        valueInputOption: 'RAW',
        values: [[
            data.latitude,
            data.longitude,
            data.radius
        ]]
    }).then(function(response) {
        console.log("Pengaturan lokasi berhasil disimpan");
        callback();
    }, function(error) {
        console.error("Error menyimpan pengaturan lokasi: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal menyimpan pengaturan lokasi',
            text: 'Terjadi kesalahan saat menyimpan data'
        });
    });
}

// Fungsi untuk menyimpan pengaturan jam kerja ke Google Sheets
function saveWorkHoursSettingsToSheet(data, callback) {
    // Implementasi koneksi ke Google Sheets
    // Asumsi pengaturan disimpan di sheet PengaturanJamKerja
    const values = [
        ['Cleaning Service', data['Cleaning Service'].start, data['Cleaning Service'].end],
        ['Pramubakti', data['Pramubakti'].start, data['Pramubakti'].end],
        ['Satpam Pagi', data['Satpam Pagi'].start, data['Satpam Pagi'].end],
        ['Satpam Malam', data['Satpam Malam'].start, data['Satpam Malam'].end]
    ];
    
    gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'PengaturanJamKerja!A1:D4',
        valueInputOption: 'RAW',
        values: values
    }).then(function(response) {
        console.log("Pengaturan jam kerja berhasil disimpan");
        callback();
    }, function(error) {
        console.error("Error menyimpan pengaturan jam kerja: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal menyimpan pengaturan jam kerja',
            text: 'Terjadi kesalahan saat menyimpan data'
        });
    });
}

// Fungsi untuk mengupdate saldo cuti di Google Sheets
function updateLeaveBalanceInSheet(userId, newBalance, callback) {
    // Implementasi koneksi ke Google Sheets
    // Pertama perlu menemukan baris yang sesuai dengan userId
    findLeaveBalanceRow(userId, function(row) {
        if (row) {
            gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: 'YOUR_SPREADSHEET_ID',
                range: `DataCuti!D${row}`,
                valueInputOption: 'RAW',
                values: [[newBalance]]
            }).then(function(response) {
                console.log("Saldo cuti berhasil diupdate");
                callback();
            }, function(error) {
                console.error("Error mengupdate saldo cuti: ", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal mengupdate saldo cuti',
                    text: 'Terjadi kesalahan saat menyimpan data'
                });
            });
        }
    });
}

// Fungsi untuk menemukan baris hari libur di Google Sheets
function findHolidayRow(date, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'HariLibur!A2:B'
    }).then(function(response) {
        const holidays = response.result.values || [];
        const rowIndex = holidays.findIndex(h => h[0] === date);
        
        if (rowIndex !== -1) {
            callback(rowIndex + 2); // +2 karena header dan index mulai dari 0
        } else {
            callback(null);
        }
    }, function(error) {
        console.error("Error mencari hari libur: ", error);
        callback(null);
    });
}

// Fungsi untuk menemukan baris saldo cuti di Google Sheets
function findLeaveBalanceRow(userId, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'DataCuti!A2:E'
    }).then(function(response) {
        const balances = response.result.values || [];
        const rowIndex = balances.findIndex(b => b[0] === userId);
        
        if (rowIndex !== -1) {
            callback(rowIndex + 2); // +2 karena header dan index mulai dari 0
        } else {
            callback(null);
        }
    }, function(error) {
        console.error("Error mencari saldo cuti: ", error);
        callback(null);
    });
}

// Fungsi untuk mendapatkan ID sheet berdasarkan nama
function getSheetIdByName(sheetName) {
    // Implementasi aktual membutuhkan metadata spreadsheet
    // Ini adalah contoh pseudocode
    const sheetMap = {
        'Absensi': 123456,
        'User': 234567,
        'DataCuti': 345678,
        'HariLibur': 456789,
        'Ijin': 567890,
        'Pengaturan': 678901,
        'PengaturanJamKerja': 789012
    };
    
    return sheetMap[sheetName] || 0;
}