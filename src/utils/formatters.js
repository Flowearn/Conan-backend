const ethers = require('ethers');

/**
 * 将 Unix 时间戳转换为格式化的日期时间字符串
 * @param {string} unixTimestamp - Unix 时间戳（秒）
 * @returns {string} 格式化的日期时间字符串 (YYYY-MM-DD HH:MM:SS)
 */
function formatTimestamp(unixTimestamp) {
  try {
    if (!unixTimestamp) return 'N/A';
    
    const date = new Date(+unixTimestamp * 1000);
    if (isNaN(date.getTime())) return 'N/A';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0'); 

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'N/A';
  }
}

/**
 * Converts a token amount from its smallest unit (wei) to standard units 
 * and formats it using magnitude suffixes (K/M/B/T).
 * @param {string | number} amountWeiStr - The amount in the smallest unit (wei) as a string or number.
 * @param {number} decimals - The token's decimals (default 18).
 * @param {number} suffixPrecision - Precision for K/M/B/T format (default 1).
 * @returns {string} Formatted token amount with suffix or 'N/A'.
 */
function formatTokenAmount(amountWeiStr, decimals = 18, suffixPrecision = 1) { 
  console.log(`\n=== formatTokenAmount DEBUG START ===`);
  console.log(`Input wei: "${amountWeiStr}"`);
  console.log(`Decimals: ${decimals}`);
  try {
    if (amountWeiStr === null || amountWeiStr === undefined || amountWeiStr === '') {
      console.log('Empty input');
      return 'N/A';
    }
    
    // Ensure decimals is valid
    if (typeof decimals !== 'number' || decimals < 0 || decimals > 30) {
        console.error(`Invalid decimals value: ${decimals}`);
        decimals = 18; // Fallback to default
    }

    // 1. Convert from wei to standard unit string using ethers.js
    let standardUnitStr;
    try {
      // Ensure input is string for formatUnits, remove non-digits
      const normalizedAmount = String(amountWeiStr).replace(/[^\d-]/g, ''); 
      console.log(`Normalized amount: ${normalizedAmount}`);
      
      // Check for empty string after normalization
      if (normalizedAmount === '') {
           console.log('Input resulted in empty normalized amount');
           return 'N/A';
      }
      
      standardUnitStr = ethers.formatUnits(normalizedAmount, decimals);
      console.log(`Converted to standard units: ${standardUnitStr}`);
      
      // Add scientific notation debug
      const scientificNotation = Number(standardUnitStr).toExponential();
      console.log(`Standard units in scientific notation: ${scientificNotation}`);
      
    } catch (conversionError) {
       console.error(`Error using ethers.formatUnits: ${conversionError.message}. Input was: "${amountWeiStr}"`);
       return 'N/A';
    }
    
    // 2. Parse the standard unit string to a number for suffix formatting
    const num = parseFloat(standardUnitStr);
    if (isNaN(num)) {
      console.error(`Failed to parse number from standard unit string: "${standardUnitStr}"`);
      return 'N/A';
    }

    // 3. Apply suffix formatting to the standard unit number
    const result = formatNumberSuffix(num, suffixPrecision); 
    console.log(`Final formatted result: ${result}`);
    console.log(`=== formatTokenAmount DEBUG END ===\n`);
    return result;

  } catch (error) {
    console.error('Unexpected error:', error);
    return 'N/A';
  }
}

/**
 * 格式化大数字，添加千位分隔符
 * @param {number|string} num - 要格式化的数字
 * @param {number} precision - 小数位数（默认2）
 * @returns {string} 格式化后的数字字符串
 */
function formatLargeNumber(num, precision = 2) {
  try {
    if (num === null || num === undefined) return 'N/A';
    
    const number = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(number)) return 'N/A';

    return number.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  } catch (error) {
    console.error('Error formatting large number:', error);
    return 'N/A';
  }
}

/**
 * 格式化货币金额
 * @param {number|string} num - 要格式化的数字
 * @param {number} precision - 小数位数（默认2）
 * @returns {string} 格式化后的货币字符串
 */
function formatCurrency(num, precision = 2) {
  try {
    console.log(`\n=== formatCurrency DEBUG START ===`);
    console.log(`Input: ${num} (type: ${typeof num})`);
    
    if (num === null || num === undefined) {
      console.log(`Result: N/A (null or undefined input)`);
      return 'N/A';
    }
    
    const number = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(number)) {
      console.log(`Result: N/A (NaN after parsing)`);
      return 'N/A';
    }

    console.log(`Parsed number: ${number}`);
    console.log(`Scientific notation: ${number.toExponential()}`);
    
    const absNumber = Math.abs(number);
    const thresholdSmall = 0.001; 
    const thresholdLarge = 1000;
    const smallSignificantDigits = 3; // 保留3位有效数字
    const suffixPrecision = 1; // 后缀格式保留1位小数
    const standardPrecision = 2; // 中间范围保留2位小数
    const sign = number < 0 ? '-' : ''; 

    if (number === 0) {
        // Rule 4: Zero
        console.log(`Case: Zero`);
        console.log(`Result: $0.00`);
        return '$0.00';
    } else if (absNumber > 0 && absNumber < thresholdSmall) {
        // Rule 1: Very Small ($0.0{N}XXX)
        console.log(`Case: Very small number (< ${thresholdSmall})`);
        const numStr = absNumber.toFixed(30); // Use high precision
        const decimalPart = numStr.split('.')[1] || '';
        let zeroCount = 0;
        let firstNonZeroIndex = -1;
        for (let i = 0; i < decimalPart.length; i++) {
            if (decimalPart[i] === '0') {
                zeroCount++;
            } else {
                firstNonZeroIndex = i;
                break;
            }
        }
        if (firstNonZeroIndex !== -1) {
            const significantPart = decimalPart.substring(firstNonZeroIndex, Math.min(firstNonZeroIndex + smallSignificantDigits, decimalPart.length));
            const formattedString = `${sign}$0.0{${zeroCount}}${significantPart}`;
            console.log(`Result: ${formattedString}`);
            return formattedString; 
        } else {
            console.log(`Result: $0.00 (effectively zero)`);
            return '$0.00'; 
        }
    } else if (absNumber >= thresholdLarge) {
        // Rule 3: Large ($X.XK/M/B/T)
        console.log(`Case: Large number (>= ${thresholdLarge})`);
        
        // 直接调用 formatNumberSuffix 进行格式化
        const suffixFormatted = formatNumberSuffix(number, suffixPrecision);
        console.log(`After formatNumberSuffix: ${suffixFormatted}`);
        
        const result = suffixFormatted === 'N/A' ? suffixFormatted : `$${suffixFormatted}`;
        console.log(`Result: ${result}`);
        console.log(`=== formatCurrency DEBUG END ===\n`);
        return result;
    } else {
        // Rule 2: Mid-Range ($X,XXX.XX)
        console.log(`Case: Mid-range number (${thresholdSmall}-${thresholdLarge})`);
        const formatted = formatLargeNumber(number, standardPrecision);
        console.log(`After formatLargeNumber: ${formatted}`);
        
        const result = formatted === 'N/A' ? formatted : `$${formatted}`;
        console.log(`Result: ${result}`);
        console.log(`=== formatCurrency DEBUG END ===\n`);
        return result;
    }
  } catch (error) {
    console.error('Error formatting currency:', error);
    return 'N/A';
  }
}

/**
 * Formats a number using magnitude suffixes (K, M, B, T). 
 * For numbers >= 1 Quadrillion (1e15), displays in Trillions (e.g., 1,600.0T).
 * Also handles mid-range (1 to <1000) and small positive decimals (0 to <1).
 * @param {number|string} num - The number to format.
 * @param {number} suffixPrecision - Decimal places for K/M/B/T format (default 1).
 * @param {number} standardPrecision - Decimal places for numbers between 1 and 1000 (default 2).
 * @param {number} smallPrecision - Decimal places for positive numbers less than 1 (default 6).
 * @returns {string} Formatted number string or 'N/A'.
 */
function formatNumberSuffix(num, suffixPrecision = 1, standardPrecision = 2, smallPrecision = 6) {
  try {
    console.log(`\n=== formatNumberSuffix DEBUG START ===`);
    console.log(`Input number: ${num}`);
    
    if (num === null || num === undefined || num === '') return 'N/A';

    // Clean input (remove commas if any) and convert to number
    const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
    if (isNaN(number)) return 'N/A';

    const absNumber = Math.abs(number);
    console.log(`Absolute number: ${absNumber}`);
    console.log(`Scientific notation: ${absNumber.toExponential()}`);
    
    // Suffixes only up to Trillion ('T' is at index 4)
    const suffixes = ['', 'K', 'M', 'B', 'T']; 
    const threshold = 1000; 
    const smallThreshold = 1; 
    const quadrillionThreshold = 1e15; 
    const trillionBase = 1e12; // 1 Trillion = 1e12

    // Use Number.EPSILON for zero comparison with floats
    if (absNumber < Number.EPSILON) {
       console.log(`Case: Zero`);
       const result = number.toLocaleString(undefined, { 
         minimumFractionDigits: standardPrecision, 
         maximumFractionDigits: standardPrecision 
       });
       console.log(`Result: ${result}`);
       return result;
    } else if (absNumber < smallThreshold) {
       console.log(`Case: Small number (< 1)`);
       const result = number.toLocaleString(undefined, { 
         minimumFractionDigits: smallPrecision, 
         maximumFractionDigits: smallPrecision 
       });
       console.log(`Result: ${result}`);
       return result;
    } else if (absNumber < threshold) {
       console.log(`Case: Medium number (1-999)`);
       const result = number.toLocaleString(undefined, { 
         minimumFractionDigits: standardPrecision, 
         maximumFractionDigits: standardPrecision 
       });
       console.log(`Result: ${result}`);
       return result;
    } else if (absNumber >= 1e12) {
        // Any number >= 1 trillion (1e12) will use 'T' suffix
        console.log(`Case: Trillion or larger (>= 1e12)`);
        
        // For quadrillion or larger, display as XX,XXX.XT
        const scaledNumber = number / trillionBase;
        console.log(`Scaled to trillions: ${scaledNumber}`);
        
        const formattedScaledNumber = scaledNumber.toLocaleString(undefined, {
            minimumFractionDigits: suffixPrecision,
            maximumFractionDigits: suffixPrecision
        });
        console.log(`Formatted scaled number: ${formattedScaledNumber}`);
        
        const result = `${formattedScaledNumber}T`;
        console.log(`Result: ${result}`);
        console.log(`=== formatNumberSuffix DEBUG END ===\n`);
        return result;
    } else {
       console.log(`Case: Large number (>= 1000, < 1e12)`);
       // Calculate magnitude (0 for ones, 1 for K, 2 for M, 3 for B, 4 for T)
       const magnitude = Math.min(4, Math.floor(Math.log10(absNumber) / 3));
       console.log(`Calculated magnitude: ${magnitude}`);

       const divisor = Math.pow(1000, magnitude);
       console.log(`Divisor: ${divisor}`);

       const scaledNumber = number / divisor;
       console.log(`Scaled number: ${scaledNumber}`);

       const formattedScaledNumber = scaledNumber.toLocaleString(undefined, {
           minimumFractionDigits: suffixPrecision,
           maximumFractionDigits: suffixPrecision
       });
       console.log(`Formatted scaled number: ${formattedScaledNumber}`);

       const result = `${formattedScaledNumber}${suffixes[magnitude]}`;
       console.log(`Result: ${result}`);
       console.log(`=== formatNumberSuffix DEBUG END ===\n`);
       return result;
    }
  } catch (error) {
    console.error('Error formatting number with suffix:', error);
    return 'N/A';
  }
}

/**
 * Formats a currency value with suffixes (K, M, B, T)
 * @param {number|string} value - The currency value to format
 * @param {number} precision - Decimal places for suffixes (default 1)
 * @returns {string} Formatted currency string with appropriate suffix
 */
function formatCurrencySuffix(value, precision = 1) {
  try {
    if (value === null || value === undefined) return '$0';
    if (isNaN(value)) return 'N/A';

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue < 1000) {
      return `${sign}$${absValue.toFixed(2)}`;
    } else if (absValue < 1_000_000) {
      return `${sign}$${(absValue / 1000).toFixed(precision)}K`;
    } else if (absValue < 1_000_000_000) {
      return `${sign}$${(absValue / 1_000_000).toFixed(precision)}M`;
    } else if (absValue < 1_000_000_000_000) {
      return `${sign}$${(absValue / 1_000_000_000).toFixed(precision)}B`;
    } else {
      return `${sign}$${(absValue / 1_000_000_000_000).toFixed(precision)}T`;
    }
  } catch (error) {
    console.error('Error formatting currency with suffix:', error);
    return 'N/A';
  }
}

/**
 * Safe wrapper for formatCurrencySuffix that won't throw exceptions
 * @param {any} value - The currency value to format
 * @param {number} precision - Decimal places for suffixes (default 1)
 * @returns {string} Formatted currency string with appropriate suffix, defaults to "$0" on error
 */
function safeCurrencySuffix(value, precision = 1) {
  try {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return '$0';
    }
    return formatCurrencySuffix(value, precision);
  } catch (error) {
    console.error('Error in safeCurrencySuffix:', error);
    return '$0';
  }
}

/**
 * Safe wrapper for formatNumberSuffix that won't throw exceptions
 * @param {any} value - The number to format
 * @param {number} precision - Decimal places for suffixes (default 1)
 * @returns {string} Formatted number string with appropriate suffix, defaults to "0" on error
 */
function safeNumberSuffix(value, precision = 1) {
  try {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return '0';
    }
    return formatNumberSuffix(value, precision);
  } catch (error) {
    console.error('Error in safeNumberSuffix:', error);
    return '0';
  }
}

/**
 * 格式化百分比
 * @param {number|string|null|undefined} value - 要格式化的值
 * @param {number} decimals - 保留的小数位数 (默认 2)
 * @returns {string} 格式化后的百分比字符串 (例如 "12.34%") 或 "N/A"
 */
function formatPercentage(value, decimals = 2) {
  try {
    // 处理 null, undefined, 空字符串
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    // 尝试将输入转为数字
    const number = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value; // 增加去除逗号
    // 检查是否为有效数字
    if (typeof number !== 'number' || isNaN(number)) {
      return 'N/A';
    }
    // 格式化为指定小数位数并添加 '%' 符号
    return number.toFixed(decimals) + '%';
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return 'N/A'; // 出错时返回 N/A
  }
}

/**
 * Special processor for wallet counts, buy counts, and sell counts:
 * - If the value is a string with K/M/B/T suffix, return it unchanged
 * - If the value is a number less than 1000, return it as an integer
 * - If the value is a number greater than or equal to 1000, use safeNumberSuffix
 * @param {any} value - The count value to process
 * @returns {string|number} Processed count value
 */
function processCountValue(value) {
  try {
    // If null, undefined or empty string, return '0'
    if (value === null || value === undefined || value === '') {
      return '0';
    }
    
    // If it's already a string with K/M/B/T suffix, return it unchanged
    if (typeof value === 'string') {
      // Check if the string contains K, M, B, or T suffix
      if (/[KMBTkmbt]/.test(value)) {
        return value;
      }
      
      // Try to parse it as a number
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        return '0'; // Return '0' for invalid strings
      }
      
      // Apply integer rounding for values < 1000
      if (parsedValue < 1000) {
        return Math.floor(parsedValue);
      }
      
      // For values >= 1000, use the safeNumberSuffix formatter
      return safeNumberSuffix(parsedValue, 1);
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      if (isNaN(value)) {
        return '0';
      }
      
      // Apply integer rounding for values < 1000
      if (value < 1000) {
        return Math.floor(value);
      }
      
      // For values >= 1000, use the safeNumberSuffix formatter
      return safeNumberSuffix(value, 1);
    }
    
    // For any other type, return '0'
    return '0';
  } catch (error) {
    console.error('Error in processCountValue:', error);
    return '0';
  }
}

module.exports = {
  formatTimestamp,
  formatTokenAmount,
  formatLargeNumber,
  formatCurrency,
  formatNumberSuffix,
  formatCurrencySuffix,
  safeCurrencySuffix,
  safeNumberSuffix,
  formatPercentage,
  processCountValue
}; 