const moralisService = require('./moralisService');
// 注释掉其他导入
// const birdeyeService = require('./birdeyeService');
// const {
//     formatCurrency, safeCurrencySuffix, safeNumberSuffix, formatTokenAmount
//     // 导入所有需要的 formatters
// } = require('../utils/formatters');

// 只保留需要的 getMoralisTokenOwners 函数导入
// const {
//     getMoralisTokenData,
//     getMoralisTokenMetadata, 
//     getMoralisTokenHolders,
//     getMoralisTokenHolderStats,
//     getMoralisTokenAnalytics
// } = moralisService;
// const {
//     getBirdeyeTopTraders
// } = birdeyeService;

/**
 * 获取并标准化给定 BSC 地址的完整代币数据包。
 * @param {string} address - BSC 代币地址 (e.g., 0x...)
 * @returns {Promise<object|null>} 标准化后的数据对象，如果出错则返回 null。
 */
async function getBscTokenDataBundle(address) {
    // --- Start: ISOLATION TEST CODE for Moralis Owners ---
    console.log(`[ISOLATION TEST] Attempting to fetch ONLY Moralis Owners for ${address}`);
    try {
      // 确认 'getMoralisTokenOwners' 是 moralisService.js 中导出的正确函数名
      const ownersResult = await moralisService.getMoralisTokenOwners(address);
      
      console.log('[ISOLATION TEST] API call completed with result:');
      console.log('Success:', ownersResult?.success);
      console.log('Error:', ownersResult?.error);
      
      if (ownersResult?.success === false) {
        console.error('[ISOLATION TEST] API error:', ownersResult.error);
        console.error('Error details:', ownersResult.details || 'No details available');
        return {
          success: false,
          error: ownersResult.error || 'Error calling Moralis Owners API',
          isolationTest: true
        };
      }
      
      // 尝试提取持有者数据
      const holders = ownersResult?.result || ownersResult?.data || ownersResult;
      
      console.log('[ISOLATION TEST] Owner data type:', typeof holders);
      console.log('[ISOLATION TEST] Is array?', Array.isArray(holders));
      
      if (Array.isArray(holders)) {
        console.log(`[ISOLATION TEST] Successfully retrieved ${holders.length} holders`);
        console.log('[ISOLATION TEST] First few holders sample:');
        const sample = holders.slice(0, 3);
        sample.forEach((holder, index) => {
          console.log(`Holder #${index + 1}:`, JSON.stringify(holder, null, 2));
        });
        
        return {
          success: true,
          holders: holders,
          message: `Successfully retrieved ${holders.length} holders in isolation test`,
          isolationTest: true
        };
      } else {
        console.error('[ISOLATION TEST] Unexpected response format - holders is not an array:');
        console.error('Response keys:', holders ? Object.keys(holders) : 'null/undefined response');
        return {
          success: false,
          error: 'Unexpected response format from Moralis Owners API',
          receivedData: holders ? typeof holders : 'null/undefined',
          isolationTest: true
        };
      }
    } catch (error) {
      console.error('[ISOLATION TEST] Exception during API call:', error.message);
      console.error('Stack trace:', error.stack);
      return {
        success: false,
        error: `Exception during API call: ${error.message}`,
        isolationTest: true
      };
    }
    // --- End: ISOLATION TEST CODE ---
}

// 导出主函数
module.exports = {
    getBscTokenDataBundle
}; 