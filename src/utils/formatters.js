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
  try {
    if (amountWeiStr === null || amountWeiStr === undefined || amountWeiStr === '') {
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
      
      // Check for empty string after normalization
      if (normalizedAmount === '') {
           return 'N/A';
      }
      
      standardUnitStr = ethers.formatUnits(normalizedAmount, decimals);
      
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
    if (num === null || num === undefined) {
      return 'N/A';
    }
    
    const number = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(number)) {
      return 'N/A';
    }
    
    const absNumber = Math.abs(number);
    const thresholdSmall = 0.001; 
    const thresholdLarge = 1000;
    const smallSignificantDigits = 3; // 保留3位有效数字
    const suffixPrecision = 1; // 后缀格式保留1位小数
    const standardPrecision = 2; // 中间范围保留2位小数
    const sign = number < 0 ? '-' : ''; 

    if (number === 0) {
        // Rule 4: Zero
        return '$0.00';
    } else if (absNumber > 0 && absNumber < thresholdSmall) {
        // Rule 1: Very Small ($0.0{N}XXX)
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
            return formattedString; 
        } else {
            return '$0.00'; 
        }
    } else if (absNumber >= thresholdLarge) {
        // Rule 3: Large ($X.XK/M/B/T)
        
        // 直接调用 formatNumberSuffix 进行格式化
        const suffixFormatted = formatNumberSuffix(number, suffixPrecision);
        
        const result = suffixFormatted === 'N/A' ? suffixFormatted : `$${suffixFormatted}`;
        return result;
    } else {
        // Rule 2: Mid-Range ($X,XXX.XX)
        const formatted = formatLargeNumber(number, standardPrecision);
        
        const result = formatted === 'N/A' ? formatted : `$${formatted}`;
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
    if (num === null || num === undefined || num === '') return 'N/A';

    // Clean input (remove commas if any) and convert to number
    const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
    if (isNaN(number)) return 'N/A';

    const absNumber = Math.abs(number);
    
    // Suffixes only up to Trillion ('T' is at index 4)
    const suffixes = ['', 'K', 'M', 'B', 'T']; 
    const threshold = 1000; 
    const smallThreshold = 1; 
    const quadrillionThreshold = 1e15; 
    const trillionBase = 1e12; // 1 Trillion = 1e12

    // Use Number.EPSILON for zero comparison with floats
    if (absNumber < Number.EPSILON) {
       const result = number.toLocaleString(undefined, { 
         minimumFractionDigits: standardPrecision, 
         maximumFractionDigits: standardPrecision 
       });
       return result;
    } else if (absNumber < smallThreshold) {
       const result = number.toLocaleString(undefined, { 
         minimumFractionDigits: smallPrecision, 
         maximumFractionDigits: smallPrecision 
       });
       return result;
    } else if (absNumber < threshold) {
       const result = number.toLocaleString(undefined, { 
         minimumFractionDigits: standardPrecision, 
         maximumFractionDigits: standardPrecision 
       });
       return result;
    } else if (absNumber >= 1e12) {
        // Any number >= 1 trillion (1e12) will use 'T' suffix
        
        // For quadrillion or larger, display as XX,XXX.XT
        const scaledNumber = number / trillionBase;
        
        const formattedScaledNumber = scaledNumber.toLocaleString(undefined, {
            minimumFractionDigits: suffixPrecision,
            maximumFractionDigits: suffixPrecision
        });
        
        const result = `${formattedScaledNumber}T`;
        return result;
    } else {
       // Calculate magnitude (0 for ones, 1 for K, 2 for M, 3 for B, 4 for T)
       const magnitude = Math.min(4, Math.floor(Math.log10(absNumber) / 3));

       const divisor = Math.pow(1000, magnitude);

       const scaledNumber = number / divisor;

       const formattedScaledNumber = scaledNumber.toLocaleString(undefined, {
           minimumFractionDigits: suffixPrecision,
           maximumFractionDigits: suffixPrecision
       });

       const result = `${formattedScaledNumber}${suffixes[magnitude]}`;
       return result;
    }
  } catch (error) {
    console.error('Error formatting number with suffix:', error);
    return 'N/A';
  }
}

/**
 * Special processor for wallet counts, buy counts, and sell counts:
 * - Ensures values are non-negative integers or formatted strings
 * - Properly handles null/undefined values
 * - Returns formatted string with K/M/B/T suffix or "N/A" for unavailable data
 * @param {any} value - The count value to process
 * @param {string} placeholder - The placeholder to use when data is not available (default "N/A")
 * @returns {string} Formatted count value string or placeholder for unavailable data
 */
function processCountValue(value, placeholder = 'N/A') {
  try {
    // If null, undefined or empty string, return placeholder
    if (value === null || value === undefined || value === '') {
      return placeholder;
    }
    
    // If it's already a string with K/M/B/T suffix, ensure it's valid
    if (typeof value === 'string') {
      // Check if the string contains K, M, B, or T suffix
      if (/[KMBTkmbt]/.test(value)) {
        return value; // Already formatted string
      }
      
      // Try to parse it as a number
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        return placeholder; // Return placeholder for invalid strings
      }
      
      // Ensure non-negative
      const absValue = Math.abs(parsedValue);
      
      // Special case for zero
      if (absValue < Number.EPSILON) {
        return '0';
      }
      
      // Apply integer rounding for ALL values (new)
      // For values < 1000, return as simple integer string
      if (absValue < 1000) {
        return Math.floor(absValue).toString(); // Return as string
      }
      
      // For values >= 1000, handle thousands, millions, etc.
      // We'll always floor the value before formatting with suffix
      const flooredValue = Math.floor(absValue);
      
      if (absValue < 1_000_000) {
        // For thousands (K)
        return `${Math.floor(flooredValue / 1000)}K`;
      } else if (absValue < 1_000_000_000) {
        // For millions (M)
        return `${Math.floor(flooredValue / 1_000_000)}M`;
      } else if (absValue < 1_000_000_000_000) {
        // For billions (B)
        return `${Math.floor(flooredValue / 1_000_000_000)}B`;
      } else {
        // For trillions (T)
        return `${Math.floor(flooredValue / 1_000_000_000_000)}T`;
      }
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      if (isNaN(value)) {
        return placeholder;
      }
      
      // Ensure non-negative 
      const absValue = Math.abs(value);
      
      // Special case for zero
      if (absValue < Number.EPSILON) {
        return '0';
      }
      
      // Apply integer rounding for ALL values (new)
      // For values < 1000, return as simple integer string
      if (absValue < 1000) {
        return Math.floor(absValue).toString(); // Return as string
      }
      
      // For values >= 1000, handle thousands, millions, etc.
      // We'll always floor the value before formatting with suffix
      const flooredValue = Math.floor(absValue);
      
      if (absValue < 1_000_000) {
        // For thousands (K)
        return `${Math.floor(flooredValue / 1000)}K`;
      } else if (absValue < 1_000_000_000) {
        // For millions (M)
        return `${Math.floor(flooredValue / 1_000_000)}M`;
      } else if (absValue < 1_000_000_000_000) {
        // For billions (B)
        return `${Math.floor(flooredValue / 1_000_000_000)}B`;
      } else {
        // For trillions (T)
        return `${Math.floor(flooredValue / 1_000_000_000_000)}T`;
      }
    }
    
    // For any other type, return placeholder
    return placeholder;
  } catch (error) {
    console.error('Error in processCountValue:', error);
    return placeholder;
  }
}

/**
 * 格式化百分比数值，专门用于发送给AI的文本提示
 * @param {number | string | null | undefined} value - 要格式化的百分比值
 * @param {number} digits - 小数位数（默认2）
 * @param {string} placeholder - 当数据不可用时使用的占位符（默认"N/A"）
 * @returns {string} 格式化后的百分比字符串或占位符
 */
function formatPercentageForAI(value, digits = 2, placeholder = 'N/A') {
  try {
    // 处理null、undefined或空字符串
    if (value === null || value === undefined || value === '') {
      console.log(`[formatPercentageForAI] Null/undefined/empty value, returning placeholder`);
      return placeholder;
    }
    
    // 如果已经是格式化的百分比字符串，直接返回
    if (typeof value === 'string' && value.endsWith('%')) {
      // 验证是否为有效数字+%的格式
      const numPart = value.replace('%', '');
      const isValidNum = !isNaN(parseFloat(numPart));
      if (isValidNum) {
        console.log(`[formatPercentageForAI] Already formatted percentage string: ${value}`);
        return value;
      }
    }
    
    // 将字符串转换为数字
    let num;
    if (typeof value === 'string') {
      // 移除千分位分隔符和百分号
      const cleanStr = value.replace(/[,%]/g, '');
      num = parseFloat(cleanStr);
    } else {
      num = value;
    }
    
    // 检查是否为有效数字
    if (typeof num !== 'number' || isNaN(num)) {
      console.log(`[formatPercentageForAI] Invalid number after parsing: ${value} → ${num}`);
      return placeholder;
    }
    
    console.log(`[formatPercentageForAI] Formatting value: ${value} → ${num.toFixed(digits)}%`);
    
    // 格式化数字并添加百分号
    return `${num.toFixed(digits)}%`;
  } catch (error) {
    console.error('Error formatting percentage for AI:', error);
    return placeholder;
  }
}

/**
 * Formats a currency value with suffixes (K, M, B, T)
 * @param {number|string} value - The currency value to format
 * @param {number} precision - Decimal places for suffixes (default 1)
 * @param {string} placeholder - Placeholder text when value is invalid (default "N/A")
 * @returns {string} Formatted currency string with appropriate suffix or placeholder
 */
function formatCurrencySuffix(value, precision = 1, placeholder = 'N/A') {
  try {
    if (value === null || value === undefined) return placeholder;
    if (isNaN(value)) return placeholder;

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    // Special case for zero
    if (absValue < Number.EPSILON) {
      return '$0.00';
    }

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
    return placeholder;
  }
}

/**
 * Safe wrapper for formatCurrencySuffix that won't throw exceptions
 * @param {any} value - The currency value to format
 * @param {number} precision - Decimal places for suffixes (default 1)
 * @param {string} placeholder - Placeholder when value is invalid (default "N/A")
 * @returns {string} Formatted currency string with appropriate suffix or placeholder
 */
function safeCurrencySuffix(value, precision = 1, placeholder = 'N/A') {
  try {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return placeholder;
    }
    return formatCurrencySuffix(value, precision, placeholder);
  } catch (error) {
    console.error('Error in safeCurrencySuffix:', error);
    return placeholder;
  }
}

/**
 * Safe wrapper for formatNumberSuffix that won't throw exceptions
 * @param {any} value - The number to format
 * @param {number} precision - Decimal places for suffixes (default 1)
 * @param {string} placeholder - Placeholder when value is invalid (default "N/A")
 * @returns {string} Formatted number string with appropriate suffix or placeholder
 */
function safeNumberSuffix(value, precision = 1, placeholder = 'N/A') {
  try {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return placeholder;
    }
    return formatNumberSuffix(value, precision);
  } catch (error) {
    console.error('Error in safeNumberSuffix:', error);
    return placeholder;
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
  processCountValue,
  formatPercentageForAI
}; 