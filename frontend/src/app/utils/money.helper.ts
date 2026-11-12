/**
 * Formats a number into Indian Currency string with ₹ symbol.
 * Example: 125000 -> ₹1,25,000
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Converts a numeric amount into words in Indian context (Lakhs, Crores).
 */
export function amountToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (num: number): string => {
    let res = '';
    if (num >= 100) {
      res += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      res += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      res += ones[num] + ' ';
    }
    return res.trim();
  };

  let result = '';
  const crore = Math.floor(amount / 10000000);
  amount %= 10000000;
  const lakh = Math.floor(amount / 100000);
  amount %= 100000;
  const thousand = Math.floor(amount / 1000);
  amount %= 1000;
  const remaining = Math.floor(amount);

  if (crore > 0) result += convertLessThanOneThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanOneThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanOneThousand(thousand) + ' Thousand ';
  if (remaining > 0) result += convertLessThanOneThousand(remaining) + ' ';

  return (result.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}
