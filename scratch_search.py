with open(r'c:\Users\srhta\Documents\Projeler\banka-finans\src\components\finance\FinanceTransactionsPage.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'FinanceCharts' in line or 'chartLayout' in line or 'Hisse Dağılımı' in line:
        print(f"{idx+1}: {line.strip()}")
