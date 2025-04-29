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
        
        // 处理 API 2: Moralis Token Holders
        let moralisHolders = []; 
        const holderResult = results[2]; 
        if (holderResult?.status === 'rejected') { 
            console.warn(`[BscService] [API:2] Token Holders API call rejected: ${holderResult.reason?.message || 'Unknown error'}`);
        } else if (holderResult?.status === 'fulfilled') {
            if (holderResult.value?.success === false) {
                console.warn(`[BscService] [API:2] Token Holders API call returned business error: ${holderResult.value?.error || 'Unknown error'}`);
            } else {
                const potentialHolders = holderResult.value?.result || holderResult.value;
                if (Array.isArray(potentialHolders)) {
                    moralisHolders = potentialHolders;
                    console.log(`[BscService] [API:2] Successfully extracted ${moralisHolders.length} Token Holders`);
                } else {
                    console.warn(`[BscService] [API:2] Token Holders value is not an array:`, 
                                typeof potentialHolders, potentialHolders ? Object.keys(potentialHolders) : 'null');
                }
            }
        }
        
        // 处理 API 3: Moralis Holder Stats
        let moralisHolderStatsRaw = null;
        const holderStatsResult = results[3];
        if (holderStatsResult?.status === 'rejected') {
            console.warn(`[BscService] [API:3] Holder Stats API call rejected: ${holderStatsResult.reason?.message || 'Unknown error'}`);
        } else if (holderStatsResult?.status === 'fulfilled') {
            if (holderStatsResult.value?.success === false) {
                console.warn(`[BscService] [API:3] Holder Stats API call returned business error: ${holderStatsResult.value?.error || 'Unknown error'}`);
            } else {
                moralisHolderStatsRaw = holderStatsResult.value?.data || holderStatsResult.value;
                if (moralisHolderStatsRaw) {
                    console.log(`[BscService] [API:3] Successfully extracted Holder Stats with totalHolders: ${moralisHolderStatsRaw.totalHolders || 'undefined'}`);
                } else {
                    console.warn(`[BscService] [API:3] Holder Stats data is empty or invalid`);
                }
            }
        }
        
        // 处理 API 4: Birdeye Top Traders
        let birdeyeTopTraders = []; 
        const traderResult = results[4]; 
        if (traderResult?.status === 'rejected') { 
            console.warn(`[BscService] [API:4] Top Traders API call rejected: ${traderResult.reason?.message || 'Unknown error'}`);
        } else if (traderResult?.status === 'fulfilled') {
            if (traderResult.value?.success === false) {
                console.warn(`[BscService] [API:4] Top Traders API call returned business error: ${traderResult.value?.error || 'Unknown error'}`);
            } else {
                // 尝试多种路径提取交易者数组
                let extractedArray = null;
                
                // 检查各种可能的数据结构
                if (Array.isArray(traderResult.value)) {
                    extractedArray = traderResult.value;
                } else if (traderResult.value?.data?.items && Array.isArray(traderResult.value.data.items)) {
                    extractedArray = traderResult.value.data.items;
                } else if (traderResult.value?.items && Array.isArray(traderResult.value.items)) {
                    extractedArray = traderResult.value.items;
                } else if (traderResult.value?.data && Array.isArray(traderResult.value.data)) {
                    extractedArray = traderResult.value.data;
                }
                
                if (extractedArray) {
                    birdeyeTopTraders = extractedArray;
                    console.log(`[BscService] [API:4] Successfully extracted ${birdeyeTopTraders.length} Top Traders`);
                } else {
                    console.warn(`[BscService] [API:4] Could not extract traders array from response:`, 
                                typeof traderResult.value, traderResult.value ? Object.keys(traderResult.value) : 'null');
                }
            }
        }
        
        // 处理 API 5: Moralis Token Analytics
        let moralisAnalytics = null;
        const analyticsResult = results[5];
        if (analyticsResult?.status === 'rejected') {
            console.warn(`[BscService] [API:5] Token Analytics API call rejected: ${analyticsResult.reason?.message || 'Unknown error'}`);
        } else if (analyticsResult?.status === 'fulfilled') {
            if (analyticsResult.value?.success === false) {
                console.warn(`[BscService] [API:5] Token Analytics API call returned business error: ${analyticsResult.value?.error || 'Unknown error'}`);
            } else {
                moralisAnalytics = analyticsResult.value;
                console.log(`[BscService] [API:5] Successfully extracted Token Analytics`);
            }
        }
        
        // 存储原始数据
        rawData = { 
            moralisTokenData, 
            moralisMetadata, 
            moralisHolders, 
            moralisHolderStatsRaw,
            birdeyeTopTraders, 
            moralisAnalytics 
        };
        console.log(`[HANG DEBUG] After Robust Extraction`); // 5. 原始数据提取后
        
        console.log("[BscService] Raw BSC data extracted.");

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
        // 3b. 修复 2: 标准化 top10Holders - 改进格式化逻辑和错误处理
        const topHoldersRaw = moralisHolders.slice(0, 10);
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

        console.log(`[HANG DEBUG] Before topTraders standardization`); // 11. topTraders 前
        // 3c. 修复 3: 标准化 topTraders - 确保处理并正确赋值
        console.log(`[BscService] Processing ${birdeyeTopTraders.length} top traders`);
        
        const tradersResult = birdeyeTopTraders.map(t => { 
            try {
                // 获取交易者标签
                const tags = Array.isArray(t?.tags) ? t.tags : [];
                // 判断是否为机器人
                const displayTags = tags.includes('sniper-bot') || tags.includes('arbitrage-bot') ? ['bot'] : tags;
                
                // 获取交易量数据
                const volumeUsd = typeof t?.volume === 'number' ? t.volume : t?.volumeUsd;
                const volumeBuyUsd = typeof t?.volumeBuy === 'number' ? t.volumeBuy : t?.volumeBuyUsd;
                const volumeSellUsd = typeof t?.volumeSell === 'number' ? t.volumeSell : t?.volumeSellUsd;
                
                // 记录交易者数据
                console.log(`[BscService] Trader ${t?.owner || 'Unknown'}: Volume: ${volumeUsd}, Buy: ${volumeBuyUsd}, Sell: ${volumeSellUsd}`);
                
                return {
                    owner: t?.owner || 'N/A',
                    trade: t?.trade ?? t?.tradeCount ?? 0,
                    tradeBuy: t?.tradeBuy ?? t?.tradeBuyCount ?? 0,
                    tradeSell: t?.tradeSell ?? t?.tradeSellCount ?? 0,
                    tags: displayTags,
                    volumeUsdFormatted: safeCurrencySuffix(volumeUsd),
                    volumeBuyUsdFormatted: safeCurrencySuffix(volumeBuyUsd),
                    volumeSellUsdFormatted: safeCurrencySuffix(volumeSellUsd),
                    // Token数量不可用，设为 N/A
                    volumeTokenFormatted: 'N/A',
                    volumeBuyTokenFormatted: 'N/A',
                    volumeSellTokenFormatted: 'N/A'
                };
            } catch(e) {
                console.error("[BscService] Error processing trader:", e);
                // 返回一个安全的默认值
                return {
                    owner: t?.owner || 'Error',
                    trade: 0,
                    tradeBuy: 0,
                    tradeSell: 0,
                    tags: [],
                    volumeUsdFormatted: 'Error',
                    volumeBuyUsdFormatted: 'Error',
                    volumeSellUsdFormatted: 'Error',
                    volumeTokenFormatted: 'N/A',
                    volumeBuyTokenFormatted: 'N/A',
                    volumeSellTokenFormatted: 'N/A'
                };
            }
        });
        
        // 显式赋值以确保结果不丢失
        standardizedData.topTraders = tradersResult;
        console.log(`[BscService] Processed ${standardizedData.topTraders.length} traders`);
        console.log(`[HANG DEBUG] After topTraders standardization`); // 12. topTraders 后

        console.log(`[HANG DEBUG] Before holderStats standardization`); // 13. holderStats 前
        // 3d. 修复 1: 标准化 holderStats - 直接使用 moralisHolderStatsRaw
        console.log(`[BscService] Processing holder stats from Moralis`);
        console.log(`[BscService] Holder stats data available: ${!!moralisHolderStatsRaw}`);
        
        // 直接使用 Moralis 返回的结构，使用 moralisHolderStatsRaw
        standardizedData.holderStats = { 
            totalHolders: moralisHolderStatsRaw?.totalHolders ?? null,
            holderChange: moralisHolderStatsRaw?.holderChange || {
                '5min': {change: null, changePercent: null},
                '1h': {change: null, changePercent: null},
                '6h': {change: null, changePercent: null},
                '24h': {change: null, changePercent: null},
                '3d': {change: null, changePercent: null},
                '7d': {change: null, changePercent: null},
                '30d': {change: null, changePercent: null}
            }, 
            holderSupply: moralisHolderStatsRaw?.holderSupply || {
                top10: {supplyPercent: null},
                top25: {supplyPercent: null},
                top50: {supplyPercent: null},
                top100: {supplyPercent: null}
            }, 
            holderDistribution: moralisHolderStatsRaw?.holderDistribution || {
                whales: 0,
                dolphins: 0,
                fish: 0,
                shrimps: 0
            }, 
            holdersByAcquisition: moralisHolderStatsRaw?.holdersByAcquisition || {
                swap: null,
                transfer: null,
                airdrop: null
            } 
        };
        
        if (moralisHolderStatsRaw) {
            console.log(`[BscService] Total holders: ${moralisHolderStatsRaw.totalHolders}`);
            if (moralisHolderStatsRaw.holderDistribution) {
                console.log(`[BscService] Holder distribution: ${JSON.stringify(moralisHolderStatsRaw.holderDistribution)}`);
            }
            if (moralisHolderStatsRaw.holderSupply) {
                console.log(`[BscService] Holder supply: ${JSON.stringify(moralisHolderStatsRaw.holderSupply)}`);
            }
        } else {
            console.warn(`[BscService] No holder stats data available from Moralis`);
        }
        console.log(`[HANG DEBUG] After holderStats standardization`); // 14. holderStats 后

        console.log(`[HANG DEBUG] Before tokenAnalytics standardization`); // 15. tokenAnalytics 前
        // 3e. 标准化 tokenAnalytics
        standardizedData.tokenAnalytics = { 
            totalBuyers: moralisAnalytics?.totalBuyers ?? {}, 
            totalSellers: moralisAnalytics?.totalSellers ?? {}, 
            totalBuys: moralisAnalytics?.totalBuys ?? {}, 
            totalSells: moralisAnalytics?.totalSells ?? {}, 
            totalBuyVolumeFormatted: safeCurrencySuffix(moralisAnalytics?.totalBuyVolume), 
            totalSellVolumeFormatted: safeCurrencySuffix(moralisAnalytics?.totalSellVolume), 
            rawData: moralisAnalytics ?? {} 
        };
        console.log(`[HANG DEBUG] After tokenAnalytics standardization`); // 16. tokenAnalytics 后

        console.log(`[HANG DEBUG] Before metadata standardization`); // 17. metadata 前
        // 3f. 标准化 metadata
        standardizedData.metadata = { 
            address: moralisMetadata?.address || contractAddress, 
            decimals: decimals, 
            name: overview.name, 
            symbol: overview.symbol, 
            totalSupply: moralisMetadata?.total_supply ?? null, 
            fully_diluted_valuation: moralisMetadata?.fully_diluted_valuation ?? null, 
            market_cap_usd: overview.marketCap, 
            explorerUrl: overview.explorerUrl, 
            verified_contract: moralisMetadata?.verified_contract ?? null 
        };
        console.log(`[HANG DEBUG] After metadata standardization`); // 18. metadata 后

        console.log("[BscService] Completed BSC data bundle standardization.");

        console.log(`[HANG DEBUG] Before returning standardizedData`); // 19. 返回前
        return standardizedData; // 返回最终标准化数据

    } catch (error) {
        console.error(`[BscService] Error in getBscTokenDataBundle for ${address}:`, error);
        console.log(`[HANG DEBUG] Error caught in main try-catch`); // 20. 错误捕获
        return null; // 或者返回一个包含错误信息的对象
    }
}

// 导出主函数
module.exports = {
    getBscTokenDataBundle
}; 