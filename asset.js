// Inisialisasi modul Manajemen Aset
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('assetTabs')) {
        // Inisialisasi DataTable
        initAssetDataTables();
        
        // Load data aset dan peminjaman
        loadAssets();
        loadBorrowings();
        
        // Event listener untuk tombol baru
        document.getElementById('submitAssetBtn').addEventListener('click', submitAsset);
        document.getElementById('submitBorrowBtn').addEventListener('click', submitBorrow);
        document.getElementById('submitReturnBtn').addEventListener('click', submitReturn);
        
        // Event listener untuk form peminjaman
        document.getElementById('borrowDate').addEventListener('change', setMinReturnDate);
    }
});

// Fungsi untuk inisialisasi DataTable
function initAssetDataTables() {
    $('#assetTable').DataTable();
    $('#borrowTable').DataTable();
}

// Fungsi untuk memuat data aset
function loadAssets() {
    getAssetsFromSheet(function(assets) {
        const table = $('#assetTable').DataTable();
        table.clear();
        
        assets.forEach(asset => {
            table.row.add([
                asset.kodeAset,
                asset.jenisAset,
                asset.namaAset,
                asset.merkType,
                asset.noSeri,
                asset.tahun,
                asset.kondisi,
                getStatusBadge(asset.status),
                getAssetActions(asset)
            ]).draw(false);
        });
    });
}

// Fungsi untuk memuat data peminjaman
function loadBorrowings() {
    getBorrowingsFromSheet(function(borrowings) {
        const table = $('#borrowTable').DataTable();
        table.clear();
        
        borrowings.forEach(borrow => {
            table.row.add([
                borrow.kodePeminjaman,
                borrow.namaPeminjam,
                borrow.tanggalPinjam,
                borrow.tanggalKembali,
                borrow.asetDipinjam,
                borrow.tujuan,
                getStatusBadge(borrow.status),
                getBorrowActions(borrow)
            ]).draw(false);
        });
    });
}

// Fungsi untuk mendapatkan badge status aset
function getStatusBadge(status) {
    const statusClass = {
        'Tersedia': 'bg-success',
        'Dipinjam': 'bg-warning',
        'Dalam Perbaikan': 'bg-danger'
    };
    
    return `<span class="badge ${statusClass[status] || 'bg-secondary'}">${status}</span>`;
}

// Fungsi untuk mendapatkan aksi aset
function getAssetActions(asset) {
    let actions = '';
    
    actions += `<button class="btn btn-sm btn-primary edit-asset" data-id="${asset.kodeAset}">
                  <i class="bi bi-pencil"></i>
               </button> `;
               
    actions += `<button class="btn btn-sm btn-danger delete-asset" data-id="${asset.kodeAset}">
                  <i class="bi bi-trash"></i>
               </button>`;
    
    return actions;
}

// Fungsi untuk mendapatkan aksi peminjaman
function getBorrowActions(borrow) {
    let actions = '';
    
    if (borrow.status === 'Dipinjam') {
        actions += `<button class="btn btn-sm btn-success return-asset" data-id="${borrow.kodePeminjaman}">
                      <i class="bi bi-box-arrow-in-down"></i>
                   </button> `;
    }
    
    actions += `<button class="btn btn-sm btn-primary print-ba" data-id="${borrow.kodePeminjaman}">
                  <i class="bi bi-printer"></i>
               </button>`;
    
    return actions;
}

// Fungsi untuk submit aset baru
function submitAsset() {
    const assetType = document.getElementById('assetType').value;
    const assetName = document.getElementById('assetName').value;
    const assetBrand = document.getElementById('assetBrand').value;
    const assetSerial = document.getElementById('assetSerial').value;
    const assetYear = document.getElementById('assetYear').value;
    const assetCondition = document.getElementById('assetCondition').value;
    const assetStatus = document.getElementById('assetStatus').value;
    
    if (!assetType || !assetName || !assetBrand || !assetSerial || !assetYear) {
        Swal.fire({
            icon: 'error',
            title: 'Data tidak lengkap',
            text: 'Harap isi semua field yang diperlukan'
        });
        return;
    }
    
    // Simpan ke Google Sheets
    saveAssetToSheet({
        jenisAset: assetType,
        namaAset: assetName,
        merkType: assetBrand,
        noSeri: assetSerial,
        tahun: assetYear,
        kondisi: assetCondition,
        status: assetStatus
    }, function() {
        Swal.fire({
            icon: 'success',
            title: 'Aset berhasil ditambahkan',
            text: 'Data aset baru telah disimpan'
        });
        
        // Tutup modal dan refresh data
        const assetModal = bootstrap.Modal.getInstance(document.getElementById('addAssetModal'));
        assetModal.hide();
        
        loadAssets();
    });
}

// Fungsi untuk submit peminjaman aset
function submitBorrow() {
    const borrowerName = document.getElementById('borrowerName').value;
    const assetId = document.getElementById('borrowAsset').value;
    const borrowDate = document.getElementById('borrowDate').value;
    const returnDate = document.getElementById('returnDate').value;
    const purpose = document.getElementById('borrowPurpose').value;
    
    if (!borrowerName || !assetId || !borrowDate || !returnDate || !purpose) {
        Swal.fire({
            icon: 'error',
            title: 'Data tidak lengkap',
            text: 'Harap isi semua field yang diperlukan'
        });
        return;
    }
    
    // Simpan ke Google Sheets
    saveBorrowingToSheet({
        namaPeminjam: borrowerName,
        asetId: assetId,
        tanggalPinjam: borrowDate,
        tanggalKembali: returnDate,
        tujuan: purpose,
        status: 'Dipinjam'
    }, function() {
        Swal.fire({
            icon: 'success',
            title: 'Peminjaman berhasil',
            text: 'Data peminjaman aset telah disimpan'
        });
        
        // Tutup modal dan refresh data
        const borrowModal = bootstrap.Modal.getInstance(document.getElementById('borrowAssetModal'));
        borrowModal.hide();
        
        loadBorrowings();
        loadAssets(); // Untuk update status aset
    });
}

// Fungsi untuk submit pengembalian aset
function submitReturn() {
    const condition = document.getElementById('returnCondition').value;
    const notes = document.getElementById('returnNotes').value;
    const actualDate = document.getElementById('returnActualDate').value;
    
    if (!condition || !actualDate) {
        Swal.fire({
            icon: 'error',
            title: 'Data tidak lengkap',
            text: 'Harap isi kondisi dan tanggal pengembalian'
        });
        return;
    }
    
    // Update di Google Sheets
    updateBorrowingInSheet({
        kodePeminjaman: currentBorrowId,
        kondisiKembali: condition,
        catatan: notes,
        tanggalKembaliAktual: actualDate,
        status: 'Dikembalikan'
    }, function() {
        Swal.fire({
            icon: 'success',
            title: 'Pengembalian berhasil',
            text: 'Aset telah dikembalikan dan data telah disimpan'
        });
        
        // Tutup modal dan refresh data
        const returnModal = bootstrap.Modal.getInstance(document.getElementById('returnAssetModal'));
        returnModal.hide();
        
        loadBorrowings();
        loadAssets(); // Untuk update status aset
    });
}

// Fungsi untuk menetapkan tanggal kembali minimal
function setMinReturnDate() {
    const borrowDate = document.getElementById('borrowDate').value;
    document.getElementById('returnDate').min = borrowDate;
}

// Fungsi untuk mencetak berita acara
function printBA() {
    // Implementasi cetak berita acara
    const printWindow = window.open('', '_blank');
    printWindow.document.write(document.getElementById('baContent').innerHTML);
    printWindow.document.close();
    printWindow.print();
}

// Fungsi untuk mengambil data aset dari Google Sheets
function getAssetsFromSheet(callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Aset!A2:H'
    }).then(function(response) {
        const assets = (response.result.values || []).map(r => ({
            kodeAset: r[0],
            jenisAset: r[1],
            namaAset: r[2],
            merkType: r[3],
            noSeri: r[4],
            tahun: r[5],
            kondisi: r[6],
            status: r[7]
        }));
        
        callback(assets);
    }, function(error) {
        console.error("Error mengambil data aset: ", error);
        callback([]);
    });
}

// Fungsi untuk mengambil data peminjaman dari Google Sheets
function getBorrowingsFromSheet(callback) {
    // Implementasi koneksi ke Google Sheets
    // Ini adalah contoh pseudocode, implementasi aktual membutuhkan join antara tabel Peminjaman dan Aset
    gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        ranges: ['Peminjaman!A2:G', 'Aset!A2:B']
    }).then(function(response) {
        const borrowings = response.result.valueRanges[0].values || [];
        const assets = response.result.valueRanges[1].values || [];
        
        const assetMap = {};
        assets.forEach(asset => {
            assetMap[asset[0]] = asset[1]; // kodeAset -> namaAset
        });
        
        const formattedBorrowings = borrowings.map(b => ({
            kodePeminjaman: b[0],
            namaPeminjam: b[1],
            asetId: b[2],
            asetDipinjam: assetMap[b[2]] || 'Unknown',
            tanggalPinjam: b[3],
            tanggalKembali: b[4],
            tujuan: b[5],
            status: b[6]
        }));
        
        callback(formattedBorrowings);
    }, function(error) {
        console.error("Error mengambil data peminjaman: ", error);
        callback([]);
    });
}

// Fungsi untuk menyimpan aset ke Google Sheets
function saveAssetToSheet(data, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Aset!A1',
        valueInputOption: 'RAW',
        values: [[
            generateId(), // Kode Aset
            data.jenisAset,
            data.namaAset,
            data.merkType,
            data.noSeri,
            data.tahun,
            data.kondisi,
            data.status
        ]]
    }).then(function(response) {
        console.log("Data aset berhasil disimpan");
        callback();
    }, function(error) {
        console.error("Error menyimpan data aset: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal menyimpan aset',
            text: 'Terjadi kesalahan saat menyimpan data'
        });
    });
}

// Fungsi untuk menyimpan peminjaman ke Google Sheets
function saveBorrowingToSheet(data, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Peminjaman!A1',
        valueInputOption: 'RAW',
        values: [[
            generateId(), // Kode Peminjaman
            data.namaPeminjam,
            data.asetId,
            data.tanggalPinjam,
            data.tanggalKembali,
            data.tujuan,
            data.status
        ]]
    }).then(function(response) {
        console.log("Data peminjaman berhasil disimpan");
        
        // Update status aset ke "Dipinjam"
        updateAssetStatusInSheet(data.asetId, 'Dipinjam', function() {
            callback();
        });
    }, function(error) {
        console.error("Error menyimpan data peminjaman: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal menyimpan peminjaman',
            text: 'Terjadi kesalahan saat menyimpan data'
        });
    });
}

// Fungsi untuk mengupdate peminjaman di Google Sheets
function updateBorrowingInSheet(data, callback) {
    // Implementasi koneksi ke Google Sheets
    // Pertama perlu menemukan baris yang sesuai dengan kodePeminjaman
    findBorrowingRow(data.kodePeminjaman, function(row) {
        if (row) {
            gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: 'YOUR_SPREADSHEET_ID',
                range: `Peminjaman!F${row}:H${row}`,
                valueInputOption: 'RAW',
                values: [[
                    data.tanggalKembaliAktual,
                    data.kondisiKembali,
                    data.status
                ]]
            }).then(function(response) {
                console.log("Data peminjaman berhasil diupdate");
                
                // Update status aset ke "Tersedia" atau "Dalam Perbaikan"
                const newStatus = data.kondisiKembali === 'Baik' ? 'Tersedia' : 'Dalam Perbaikan';
                
                // Pertama perlu mendapatkan asetId dari peminjaman
                getBorrowingDetails(data.kodePeminjaman, function(borrowing) {
                    if (borrowing) {
                        updateAssetStatusInSheet(borrowing.asetId, newStatus, function() {
                            callback();
                        });
                    }
                });
            }, function(error) {
                console.error("Error mengupdate data peminjaman: ", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal mengupdate peminjaman',
                    text: 'Terjadi kesalahan saat menyimpan data'
                });
            });
        }
    });
}

// Fungsi untuk mengupdate status aset di Google Sheets
function updateAssetStatusInSheet(assetId, newStatus, callback) {
    // Implementasi koneksi ke Google Sheets
    // Pertama perlu menemukan baris yang sesuai dengan assetId
    findAssetRow(assetId, function(row) {
        if (row) {
            gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: 'YOUR_SPREADSHEET_ID',
                range: `Aset!H${row}`,
                valueInputOption: 'RAW',
                values: [[newStatus]]
            }).then(function(response) {
                console.log("Status aset berhasil diupdate");
                callback();
            }, function(error) {
                console.error("Error mengupdate status aset: ", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal mengupdate status aset',
                    text: 'Terjadi kesalahan saat menyimpan data'
                });
            });
        }
    });
}

// Fungsi untuk menemukan baris aset di Google Sheets
function findAssetRow(assetId, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Aset!A2:H'
    }).then(function(response) {
        const assets = response.result.values || [];
        const rowIndex = assets.findIndex(a => a[0] === assetId);
        
        if (rowIndex !== -1) {
            callback(rowIndex + 2); // +2 karena header dan index mulai dari 0
        } else {
            callback(null);
        }
    }, function(error) {
        console.error("Error mencari aset: ", error);
        callback(null);
    });
}

// Fungsi untuk menemukan baris peminjaman di Google Sheets
function findBorrowingRow(borrowingId, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Peminjaman!A2:G'
    }).then(function(response) {
        const borrowings = response.result.values || [];
        const rowIndex = borrowings.findIndex(b => b[0] === borrowingId);
        
        if (rowIndex !== -1) {
            callback(rowIndex + 2); // +2 karena header dan index mulai dari 0
        } else {
            callback(null);
        }
    }, function(error) {
        console.error("Error mencari peminjaman: ", error);
        callback(null);
    });
}

// Fungsi untuk mendapatkan detail peminjaman dari Google Sheets
function getBorrowingDetails(borrowingId, callback) {
    // Implementasi koneksi ke Google Sheets
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        range: 'Peminjaman!A2:G'
    }).then(function(response) {
        const borrowings = response.result.values || [];
        const borrowing = borrowings.find(b => b[0] === borrowingId);
        
        if (borrowing) {
            callback({
                kodePeminjaman: borrowing[0],
                namaPeminjam: borrowing[1],
                asetId: borrowing[2],
                tanggalPinjam: borrowing[3],
                tanggalKembali: borrowing[4],
                tujuan: borrowing[5],
                status: borrowing[6]
            });
        } else {
            callback(null);
        }
    }, function(error) {
        console.error("Error mengambil detail peminjaman: ", error);
        callback(null);
    });
}