const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\srhta\\Documents\\Projeler\\banka-finans\\src\\components\\finance\\FinanceTransactionsPage.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('FinanceCharts') || line.includes('chartLayout') || line.includes('Hisse Dağılımı')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
