import { doc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Parses string amounts with dot thousands and comma decimals into Double numbers.
 */
export function parseAmt(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();
  if (!str) return 0;
  let cleaned = str;
  if (str.includes(',')) {
    cleaned = str.replace(/\./g, '').replace(',', '.');
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Updates pre-calculated bank transaction summary (users/{userId}/summaries/overview)
 * atomically using Firestore increment().
 */
export async function updateBankTransactionSummary(userUid, bankId, amountDelta) {
  if (!userUid || !amountDelta || isNaN(amountDelta)) return;
  try {
    const summaryRef = doc(db, `users/${userUid}/summaries/overview`);
    const updatePayload = {
      totalBankBalance: increment(amountDelta),
      lastUpdated: serverTimestamp()
    };
    if (bankId) {
      updatePayload[`bankBalances.${bankId}`] = increment(amountDelta);
    }
    await setDoc(summaryRef, updatePayload, { merge: true });
  } catch (error) {
    console.error("Error updating bank transaction summary:", error);
  }
}

/**
 * Updates pre-calculated stock/finance transaction summary (users/{userId}/summaries/overview)
 * atomically using Firestore increment().
 */
export async function updateStockPortfolioSummary(userUid, portfolioDelta = 0, taxDelta = 0) {
  if (!userUid) return;
  try {
    const summaryRef = doc(db, `users/${userUid}/summaries/overview`);
    const updatePayload = { lastUpdated: serverTimestamp() };
    if (portfolioDelta && !isNaN(portfolioDelta)) {
      updatePayload.totalStockPortfolio = increment(portfolioDelta);
    }
    if (taxDelta && !isNaN(taxDelta)) {
      updatePayload.totalStockTax = increment(taxDelta);
    }
    await setDoc(summaryRef, updatePayload, { merge: true });
  } catch (error) {
    console.error("Error updating stock portfolio summary:", error);
  }
}

/**
 * Full recalculation and sync of all stock portfolio summaries into users/{userId}/summaries/overview.
 */
export async function resyncAllFinanceSummaries(userUid, processedTransactions = [], stocks = [], institutions = []) {
  if (!userUid) return;
  try {
    let totalPortfolioVal = 0;
    let totalTaxVal = 0;

    const parsePrice = (p) => {
      if (!p) return 0;
      if (typeof p === 'number') return isNaN(p) ? 0 : p;
      const str = p.toString().trim();
      if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
      return parseFloat(str) || 0;
    };

    const stockMap = new Map();
    (stocks || []).forEach(s => {
      if (s?.id) stockMap.set(s.id, parsePrice(s.currentPrice));
    });

    const institutionBalancesMap = {};
    (institutions || []).forEach(inst => {
      if (inst?.id) institutionBalancesMap[inst.id] = 0;
    });

    const stockSummariesMap = {};

    const activeTrans = (processedTransactions || []).filter(t => t.deleted !== true);
    
    activeTrans.forEach(t => {
      const isAlisType = (t.type || '').toString().trim().toUpperCase().startsWith('AL');
      if (isAlisType) {
        const qty = t.calculatedRemaining !== undefined ? t.calculatedRemaining : (t.remainingQuantity || 0);
        const sId = t.stockId;
        const instId = t.institutionId;
        const stockPrc = stockMap.get(sId);
        const prc = stockPrc > 0 ? stockPrc : parseAmt(t.price);
        const buyPrice = parseAmt(t.price);
        const taxRate = parseAmt(t.taxRate);
        const date = t.date || '';

        if (qty > 0) {
          const itemVal = qty * prc;
          totalPortfolioVal += itemVal;
          if (instId) {
            institutionBalancesMap[instId] = (institutionBalancesMap[instId] || 0) + itemVal;
          }
          if (t.calculatedTaxDeduction) {
            totalTaxVal += parseAmt(t.calculatedTaxDeduction);
          }

          if (sId) {
            if (!stockSummariesMap[sId]) {
              stockSummariesMap[sId] = {
                stockId: sId,
                quantity: 0,
                totalCost: 0,
                firstPurchaseDate: date,
                institutionBreakdown: {},
                activeLots: []
              };
            }
            const sSum = stockSummariesMap[sId];
            sSum.quantity += qty;
            sSum.totalCost += qty * buyPrice;
            if (instId) {
              sSum.institutionBreakdown[instId] = (sSum.institutionBreakdown[instId] || 0) + qty;
            }
            if (date && (!sSum.firstPurchaseDate || date < sSum.firstPurchaseDate)) {
              sSum.firstPurchaseDate = date;
            }
            sSum.activeLots.push({
              remaining: qty,
              price: buyPrice,
              taxRate: taxRate,
              date: date,
              institutionId: instId || ''
            });
          }
        }
      }
    });

    const summaryRef = doc(db, `users/${userUid}/summaries/overview`);
    await setDoc(summaryRef, {
      institutionBalances: institutionBalancesMap,
      stockSummaries: stockSummariesMap,
      totalStockPortfolio: totalPortfolioVal,
      totalStockTax: totalTaxVal,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    console.log("Finance summaries resynced to Firestore:", { institutionBalances: institutionBalancesMap, stockSummaries: stockSummariesMap, totalStockPortfolio: totalPortfolioVal, totalStockTax: totalTaxVal });
  } catch (error) {
    console.error("Error resyncing finance summaries:", error);
  }
}

/**
 * Full recalculation and sync of all bank balances into users/{userId}/summaries/overview.
 * Populates EVERY bank ID (Akbank, Garanti, Ziraat, etc.) into the bankBalances map in Firestore.
 */
export async function resyncAllBankSummaries(userUid, banks = [], transactions = []) {
  if (!userUid) return;
  try {
    const bankBalancesMap = {};
    let grandTotal = 0;

    // Initialize all banks with 0 balance
    banks.forEach(b => {
      if (b.id) bankBalancesMap[b.id] = 0;
    });

    // Sum active transactions for each bank (excluding credit card type Eyv0oZlOuCPWJbmRkv0h)
    transactions.forEach(t => {
      if (t.deleted === true || t.type === 'Eyv0oZlOuCPWJbmRkv0h') return;
      const bId = t.bankId;
      if (!bId) return;

      const amt = parseAmt(t.amount);
      bankBalancesMap[bId] = (bankBalancesMap[bId] || 0) + amt;
    });

    // Compute total balance across visible banks
    const visibleBankIds = new Set(banks.filter(b => b.visible !== false && b.visible !== 'false').map(b => b.id));
    Object.keys(bankBalancesMap).forEach(bId => {
      if (visibleBankIds.has(bId)) {
        grandTotal += bankBalancesMap[bId];
      }
    });

    const summaryRef = doc(db, `users/${userUid}/summaries/overview`);
    await setDoc(summaryRef, {
      bankBalances: bankBalancesMap,
      totalBankBalance: grandTotal,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    console.log("Bank summaries successfully resynced to Firestore:", bankBalancesMap);
  } catch (error) {
    console.error("Error resyncing bank summaries:", error);
  }
}
