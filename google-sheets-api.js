// Konfigurasi Google Sheets API
const SPREADSHEET_ID = '1O66uqln2YtRlQnoK2hKfwXtuCAacMHBm2Y1bAfOlwY4';
const API_KEY = 'AIzaSyD5qVvZvXvXvXvXvXvXvXvXvXvXvXvXvXvXvX'; // Ganti dengan API key Anda
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'; // Ganti dengan Client ID Anda

// Inisialisasi Google API
function initGoogleAPI() {
    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', () => {
            gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                scope: 'https://www.googleapis.com/auth/spreadsheets'
            }).then(() => {
                resolve();
            }).catch(err => {
                console.error('Error initializing Google API:', err);
                reject(err);
            });
        });
    });
}

// Fungsi untuk membaca data dari Google Sheets
async function readSheetData(sheetName, range) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!${range}`
        });
        return response.result.values;
    } catch (error) {
        console.error('Error reading sheet data:', error);
        return null;
    }
}

// Fungsi untuk menulis data ke Google Sheets
async function writeSheetData(sheetName, range, values) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!${range}`,
            valueInputOption: 'RAW',
            resource: { values }
        });
        return response;
    } catch (error) {
        console.error('Error writing to sheet:', error);
        return null;
    }
}

// Fungsi untuk menambahkan data baru ke Google Sheets
async function appendSheetData(sheetName, values) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            resource: { values }
        });
        return response;
    } catch (error) {
        console.error('Error appending to sheet:', error);
        return null;
    }
}

export { initGoogleAPI, readSheetData, writeSheetData, appendSheetData };