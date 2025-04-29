const moralisService = require('./moralisService');
const birdeyeService = require('./birdeyeService');
const {
    formatCurrency, safeCurrencySuffix, safeNumberSuffix, formatTokenAmount
    // 导入所有需要的 formatters
} = require('../utils/formatters');

// --- 确认并导入需要调用的 Service 函数 ---
// 使用现有的函数名称而不是预期的 BSC 特定命名
const {
    getMoralisTokenData, // 使用原始函数名
    getMoralisTokenMetadata, 
    getMoralisTokenHolders,
    getMoralisTokenHolderStats,
    getMoralisTokenAnalytics
} = moralisService;
const {
    getBirdeyeTopTraders // 使用原始函数名
} = birdeyeService;
// -----------------------------------------

/**
 * 获取并标准化给定 BSC 地址的完整代币数据包。
 * @param {string} address - BSC 代币地址 (e.g., 0x...)
 * @returns {Promise<object|null>} 标准化后的数据对象，如果出错则返回 null。
 */
async function getBscTokenDataBundle(address) {
    console.log(`[HANG DEBUG] === Entering getBscTokenDataBundle for ${address} ===`); // 1. 函数入口
    console.log(`[BscService] Getting data bundle for BSC address: ${address}`);
    const contractAddress = address; // 或进行校验
    let rawData = {};
    let standardizedData = {};

    try {
        console.log(`[HANG DEBUG] Before Promise.allSettled`); // 2. API 调用前
        
        // 添加更详细的API调用日志
        console.log('[BscService] Calling Moralis/Birdeye APIs with following parameters:');
        console.log(`[BscService] [API:0] getMoralisTokenData: ${contractAddress}`);
        console.log(`[BscService] [API:1] getMoralisTokenMetadata: ${contractAddress}`);
        console.log(`[BscService] [API:2] getMoralisTokenHolders: ${contractAddress}, chain=bsc, limit=100, offset=0`);
        console.log(`[BscService] [API:3] getMoralisTokenHolderStats: ${contractAddress}`);
        console.log(`[BscService] [API:4] getBirdeyeTopTraders: ${contractAddress}, timeframe=24h, limit=10`);
        console.log(`[BscService] [API:5] getMoralisTokenAnalytics: ${contractAddress}`);
        
        // 1. 并行获取所有原始数据
        const results = await Promise.allSettled([
            getMoralisTokenData(contractAddress),      // Index 0
            getMoralisTokenMetadata(contractAddress),  // Index 1
            getMoralisTokenHolders(contractAddress, 'bsc', 100, 0), // Index 2 - 修改参数顺序以匹配函数签名
            getMoralisTokenHolderStats(contractAddress), // Index 3
            getBirdeyeTopTraders(contractAddress, '24h', 10, 0, 'volume', 'desc'), // Index 4 - 使用适当的参数
            getMoralisTokenAnalytics(contractAddress)  // Index 5
        ]);
        console.log(`[HANG DEBUG] After Promise.allSettled`); // 3. API 调用后

        // --- 此处添加详细日志记录 results (可选，但推荐) ---
        console.log("[BscService] Raw API call results status:");
        results.forEach((result, index) => {
            console.log(`[${index}]: ${result.status}`);
        });

        console.log(`[HANG DEBUG] Before Robust Extraction`); // 4. 原始数据提取前
        // 2. 安全地提取原始数据 (使用健壮逻辑)
        
        // 处理 API 0: Moralis Token Data
        let moralisTokenData = null;
        const tokenDataResult = results[0]; 
        if (tokenDataResult?.status === 'rejected') {
            console.warn(`[BscService] [API:0] Token Data API call rejected: ${tokenDataResult.reason?.message || 'Unknown error'}`);
        } else if (tokenDataResult?.status === 'fulfilled') {
            if (tokenDataResult.value?.success === false) {
                console.warn(`[BscService] [API:0] Token Data API call returned business error: ${tokenDataResult.value?.error || 'Unknown error'}`);
            } else {
                moralisTokenData = tokenDataResult.value?.data;
                console.log(`[BscService] [API:0] Successfully extracted Token Data`);
            }
        }
        
        // 处理 API 1: Moralis Token Metadata
        let moralisMetadata = null;
        const metadataResult = results[1];
        if (metadataResult?.status === 'rejected') {
            console.warn(`[BscService] [API:1] Token Metadata API call rejected: ${metadataResult.reason?.message || 'Unknown error'}`);
        } else if (metadataResult?.status === 'fulfilled') {
            if (metadataResult.value?.success === false) {
                console.warn(`[BscService] [API:1] Token Metadata API call returned business error: ${metadataResult.value?.error || 'Unknown error'}`);
            } else {
                moralisMetadata = metadataResult.value?.data;
                console.log(`[BscService] [API:1] Successfully extracted Token Metadata`);
            }
        }
        
        // --- Start: PRECISE Replacement Extraction Logic for Indices 2, 3, 4 ---

        // 处理 API 2: Moralis Token Holders
        let moralisHolders = []; // Default empty array
        const ownersResult = results[2];
        if (ownersResult.status === 'fulfilled' && ownersResult.value?.result && Array.isArray(ownersResult.value.result)) {
            // Access the array directly from the 'result' key based on Moralis raw response log
            moralisHolders = ownersResult.value.result;
            console.log(`[BscService] [API:2] Successfully extracted ${moralisHolders.length} Moralis Owners from value.result`);
        } else {
             console.warn(`[BscService] [API:2] Failed to get or extract Moralis Owners. Status: ${ownersResult.status}. Reason/Error:`, ownersResult.reason || ownersResult.value || 'Expected value.result array not found');
        }
        // Keep the slice for top 10 after this block
        const topHoldersRaw = moralisHolders.slice(0, 10);


        // 处理 API 3: Moralis Holder Stats
        let moralisHolderStatsRaw = null; // Default null
        const statsResult = results[3];
        // Access the stats object from the 'data' key based on Moralis raw response log
        if (statsResult.status === 'fulfilled' && typeof statsResult.value?.data === 'object' && statsResult.value.data !== null) {
            moralisHolderStatsRaw = statsResult.value.data;
            // Also check if 'success' flag exists within the response value itself, if provided by the service wrapper
            if (statsResult.value.success === false) {
                 console.warn(`[BscService] [API:3] Moralis Holder Stats API reported success:false. Error:`, statsResult.value.error || 'Unknown error structure');
                 moralisHolderStatsRaw = null; // Ensure null if success is false
            } else {
                 console.log(`[BscService] [API:3] Successfully extracted Holder Stats object with totalHolders: ${moralisHolderStatsRaw?.totalHolders}`);
            }
        } else {
            console.warn(`[BscService] [API:3] Failed to get or extract Moralis Holder Stats. Status: ${statsResult.status}. Reason/Error:`, statsResult.reason || statsResult.value || 'Expected value.data object not found');
        }


        // 处理 API 4: Birdeye Top Traders
        let birdeyeTopTraders = []; // Default empty array
        const tradersResult = results[4];
        // Access the items array from 'data.items' key based on Birdeye raw response log
        if (tradersResult.status === 'fulfilled' && tradersResult.value?.success && Array.isArray(tradersResult.value.data?.items)) {
            birdeyeTopTraders = tradersResult.value.data.items;
            console.log(`[BscService] [API:4] Successfully extracted ${birdeyeTopTraders.length} Birdeye Top Traders from value.data.items`);
        } else {
             console.warn(`[BscService] [API:4] Failed to get or extract Birdeye Top Traders. Status: ${tradersResult.status}. Reason/Error:`, tradersResult.reason || tradersResult.value?.error || 'Expected value.data.items array not found');
        }

        // --- End: PRECISE Replacement Extraction Logic ---

        // Keep extraction for results[0], results[1], results[5] as they seem to work
        // Assuming metadata is the first element if API returns an array:
        const moralisTokenDataResult = results[0].status === 'fulfilled' && results[0].value?.success ? results[0].value : null;
        const moralisMetadataResult = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value[0] : null;
        const moralisAnalytics = results[5].status === 'fulfilled' && results[5].value?.success ? results[5].value : null;

        // Assign to rawData (make sure names match downstream use)
        rawData = { 
            moralisTokenData: moralisTokenData || moralisTokenDataResult, 
            moralisMetadata: moralisMetadataResult, 
            moralisHolders: moralisHolders, 
            moralisHolderStats: moralisHolderStatsRaw, 
            birdeyeTopTraders: birdeyeTopTraders, 
            moralisAnalytics 
        };
        console.log("[BscService] Raw BSC data extracted after precise fixes.");
        
        console.log(`[HANG DEBUG] Before Standardization Logic`); // 6. 标准化开始前
        // 3. 执行数据标准化 (将 index.js.backup 的逻辑移入)
        standardizedData = {};

        console.log(`[HANG DEBUG] Before tokenOverview standardization`); // 7. tokenOverview 前
        // 3a. 标准化 tokenOverview
        const overview = {};
        const price = moralisTokenData?.usdPrice ?? moralisMetadata?.usdPrice;
        const decimals = parseInt(moralisMetadata?.decimals ?? '18', 10);
        const circulatingSupply = moralisMetadata?.circulating_supply ?? moralisTokenData?.circulatingSupply;
        
        overview.name = moralisMetadata?.name || moralisTokenData?.tokenName || 'N/A';
        overview.symbol = moralisMetadata?.symbol || moralisTokenData?.tokenSymbol || 'N/A';
        overview.logoURI = moralisMetadata?.logo || moralisTokenData?.tokenLogo || null;
        overview.price = price ?? 0;
        overview.priceFormatted = formatCurrency(price);
        overview.priceChange24h = moralisTokenData?.priceChange24h ?? moralisTokenData?.['24hrPercentChange'] ?? null;
        overview.liquidityFormatted = safeCurrencySuffix(moralisTokenData?.liquidity ?? moralisTokenData?.pairTotalLiquidityUsd);
        
        let marketCap = moralisMetadata?.market_cap_usd;
        if (!marketCap && circulatingSupply && typeof price === 'number' && price > 0 && !isNaN(decimals)) { 
            try { 
                const c = BigInt(String(circulatingSupply).split('.')[0]); 
                const p = BigInt(Math.round(price * 1e6)); 
                const d = BigInt(decimals); 
                if (d >= 0) { 
                    const div = BigInt(1e6) * (BigInt(10)**d); 
                    if (div > 0) marketCap = Number((c * p) / div); 
                    else marketCap = 0; 
                } else marketCap = 0; 
            } catch(e){ 
                console.error("Err calc BSC MC:", e); 
                marketCap = 0; 
            } 
        }
        
        overview.marketCap = marketCap ?? 0;
        overview.marketCapFormatted = safeCurrencySuffix(marketCap);
        overview.fdvFormatted = safeCurrencySuffix(moralisMetadata?.fully_diluted_valuation);
        overview.circulatingSupply = circulatingSupply ?? 0;
        overview.circulatingSupplyFormatted = safeNumberSuffix(circulatingSupply);
        overview.explorerUrl = moralisMetadata?.address ? `https://bscscan.com/token/${moralisMetadata.address}` : null;
        
        standardizedData.tokenOverview = overview;
        console.log(`[HANG DEBUG] After tokenOverview standardization`); // 8. tokenOverview 后

        console.log(`[HANG DEBUG] Before top10Holders standardization`); // 9. top10Holders 前
        // 3b. 标准化 top10Holders - 改进格式化逻辑和错误处理
        console.log(`[BscService] Processing ${topHoldersRaw.length} top holders with price: ${price}, decimals: ${decimals}`);
        
        // 确保 price 和 decimals 值正确且类型匹配
        const validPrice = typeof price === 'number' && !isNaN(price) ? price : 0;
        const validDecimals = !isNaN(decimals) ? decimals : 18;
        
        console.log(`[BscService] Using validPrice: ${validPrice}, validDecimals: ${validDecimals} for holders calculation`);
        
        standardizedData.top10Holders = topHoldersRaw.map((h, index) => { 
            let qF = 'N/A', vF = 'N/A', qR = BigInt(0); 
            try {
                // 获取地址
                const holderAddress = h?.owner_address || h?.address || h?.TokenHolderAddress || 'N/A'; 
                // 获取余额
                const balance = h?.balance || h?.amount || h?.TokenHolderQuantity || '0'; 
                
                console.log(`[BscService] Holder #${index+1}: ${holderAddress.substring(0, 8)}..., balance: ${balance}`);
                
                if (holderAddress !== 'N/A') {
                    // 使用 BigInt 处理 balance - 更加健壮的解析逻辑
                    try {
                        // 确保 balance 是有效字符串
                        const cleanBalance = String(balance).replace(/[^\d]/g, '');
                        qR = BigInt(cleanBalance || '0');
                        
                        // 格式化代币数量 - 使用安全的 formatTokenAmount
                        try {
                            qF = formatTokenAmount(cleanBalance, validDecimals, 4);
                            console.log(`[BscService] Formatted quantity for ${holderAddress.substring(0, 8)}...: ${qF}`);
                        } catch(fmtErr) {
                            console.error(`[BscService] Error in formatTokenAmount:`, fmtErr);
                            qF = 'Format Error';
                        }
                        
                        // 计算美元价值
                        if (validPrice > 0) {
                            try {
                                // 安全计算
                                const divisor = Math.pow(10, validDecimals);
                                const balanceNumber = Number(qR) / divisor;
                                const usdValue = balanceNumber * validPrice;
                                
                                // 使用 formatCurrency 格式化
                                try {
                                    vF = formatCurrency(usdValue);
                                    console.log(`[BscService] USD value for ${holderAddress.substring(0, 8)}...: ${vF}`);
                                } catch(fmtErr) {
                                    console.error(`[BscService] Error in formatCurrency:`, fmtErr);
                                    vF = `$${usdValue.toFixed(2)}`;
                                }
                            } catch(calcErr) {
                                console.error(`[BscService] Error calculating USD value:`, calcErr);
                                vF = '$0.00';
                            }
                        } else {
                            console.log(`[BscService] Price is zero or invalid: ${validPrice}`);
                            vF = '$0.00';
                        }
                    } catch(parseErr) {
                        console.error(`[BscService] Error parsing balance (${balance}):`, parseErr);
                        qF = '0';
                        vF = '$0.00';
                    }
                } else {
                    console.log(`[BscService] Invalid holder address: ${holderAddress}`);
                }
            } catch(e) {
                console.error("[BscService] Error processing holder:", e);
            } 
            
            return {
                TokenHolderAddress: h?.owner_address || h?.address || h?.TokenHolderAddress || 'N/A',
                TokenHolderQuantity: h?.balance || h?.amount || h?.TokenHolderQuantity || '0',
                TokenHolderQuantityFormatted: qF,
                TokenHolderUsdValueFormatted: vF
            };
        });
        
        console.log(`[BscService] Processed ${standardizedData.top10Holders.length} top holders`);
        console.log(`[HANG DEBUG] After top10Holders standardization`); // 10. top10Holders 后

        console.log("[HANG DEBUG] Before topTraders standardization"); // 修复：添加正确终止的模板字符串
        
        // 3c. 标准化 topTraders
        standardizedData.topTraders = birdeyeTopTraders.map((trader) => ({
            address: trader.address || 'N/A',
            buy: {
                amount: trader.buyAmount,
                amountUSD: trader.buyAmountUsd,
                count: trader.buyCount,
                price: trader.buyPrice
            },
            sell: {
                amount: trader.sellAmount,
                amountUSD: trader.sellAmountUsd,
                count: trader.sellCount,
                price: trader.sellPrice
            },
            total: {
                amount: (trader.buyAmount || 0) + (trader.sellAmount || 0),
                amountUSD: (trader.buyAmountUsd || 0) + (trader.sellAmountUsd || 0),
                count: (trader.buyCount || 0) + (trader.sellCount || 0)
            }
        }));

        console.log("[HANG DEBUG] After topTraders standardization");

        // 3d. 生成 holderStats 数据
        standardizedData.holderStats = {
            totalHolders: moralisHolderStatsRaw?.totalHolders || 0,
            totalHoldersFormatted: safeNumberSuffix(moralisHolderStatsRaw?.totalHolders),
            holdersV: moralisHolderStatsRaw?.holdersV || [0,0,0,0,0,0,0],
            noHolders: moralisHolderStatsRaw?.holdersV?.reduce((c, h) => c + h, 0) || 0,
            totalSupply: moralisMetadata?.totalSupply || 0,
            decimalPlace: moralisMetadata?.decimals || 18
        };
        
        // Return the standardized data object
        console.log(`[HANG DEBUG] End of getBscTokenDataBundle`); // 11. 函数结束
        return standardizedData;
    } catch (e) {
        console.error("[BscService] Error processing token data bundle:", e);
        return null;
    }
}

console.log("[BscService] BscTokenDataBundle function defined");

module.exports = {
    getBscTokenDataBundle
};
