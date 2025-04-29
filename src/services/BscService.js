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
    console.log(`[BscService] Getting data bundle for BSC address: ${address}`);
    const contractAddress = address; // 或进行校验
    let rawData = {};
    let standardizedData = {};

    try {
        // 1. 并行获取所有原始数据
        const results = await Promise.allSettled([
            getMoralisTokenData(contractAddress),      // Index 0
            getMoralisTokenMetadata(contractAddress),  // Index 1
            getMoralisTokenHolders(contractAddress, 'bsc', 100, 0), // Index 2 - 修改参数顺序以匹配函数签名
            getMoralisTokenHolderStats(contractAddress), // Index 3
            getBirdeyeTopTraders(contractAddress, '24h', 10, 0, 'volume', 'desc'), // Index 4 - 使用适当的参数
            getMoralisTokenAnalytics(contractAddress)  // Index 5
        ]);

        // --- 此处添加详细日志记录 results (可选，但推荐) ---
        console.log("[BscService] Raw API call results status:");
        results.forEach((result, index) => {
            console.log(`[${index}]: ${result.status}`);
        });

        // 2. 安全地提取原始数据 (使用健壮逻辑)
        const moralisTokenData = results[0].status === 'fulfilled' ? results[0].value?.data : null;
        const moralisMetadata = results[1].status === 'fulfilled' ? results[1].value?.data : null;
        
        let moralisHolders = []; 
        const holderResult = results[2]; 
        if (holderResult?.status === 'fulfilled' && holderResult.value) { 
            const p = holderResult.value.result || holderResult.value; 
            if (Array.isArray(p)) moralisHolders = p; 
            else console.warn("[BscService] Holders value not array:", holderResult.value); 
        } else if (holderResult?.status === 'rejected') { 
            console.error("[BscService] Holders rejected:", holderResult.reason); 
        }
        
        // 修复: 正确获取 holderStats 数据，直接获取整个对象
        const moralisHolderStats = results[3].status === 'fulfilled' ? 
            (results[3].value?.data || results[3].value) : null;
        
        // 修复: 正确解析 Birdeye topTraders 数据
        let birdeyeTopTraders = []; 
        const traderResult = results[4]; 
        if (traderResult?.status === 'fulfilled') { 
            // 检查各种可能的数据结构
            if (Array.isArray(traderResult.value)) {
                birdeyeTopTraders = traderResult.value;
            } else if (traderResult.value?.data?.items && Array.isArray(traderResult.value.data.items)) {
                birdeyeTopTraders = traderResult.value.data.items;
            } else if (traderResult.value?.items && Array.isArray(traderResult.value.items)) {
                birdeyeTopTraders = traderResult.value.items;
            } else if (traderResult.value?.data && Array.isArray(traderResult.value.data)) {
                birdeyeTopTraders = traderResult.value.data;
            } else {
                console.warn("[BscService] Could not extract traders array from Birdeye response:", 
                    JSON.stringify(traderResult.value, null, 2).substring(0, 200) + "...");
            }
            
            console.log(`[BscService] Extracted ${birdeyeTopTraders.length} top traders`);
        } else if (traderResult?.status === 'rejected') { 
            console.error("[BscService] Traders rejected:", traderResult.reason); 
        }
        
        const moralisAnalytics = results[5].status === 'fulfilled' ? results[5].value : null;
        
        rawData = { 
            moralisTokenData, 
            moralisMetadata, 
            moralisHolders, 
            moralisHolderStats, 
            birdeyeTopTraders, 
            moralisAnalytics 
        }; // 存储原始数据
        
        console.log("[BscService] Raw BSC data extracted.");

        // 3. 执行数据标准化 (将 index.js.backup 的逻辑移入)
        standardizedData = {};

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

        // 3b. 修复: 标准化 top10Holders
        const topHoldersRaw = moralisHolders.slice(0, 10);
        console.log(`[BscService] Processing ${topHoldersRaw.length} top holders with price: ${price}, decimals: ${decimals}`);
        
        standardizedData.top10Holders = topHoldersRaw.map(h => { 
            let qF = 'N/A', vF = 'N/A', qR = BigInt(0); 
            try {
                // 获取地址
                const holderAddress = h?.owner_address || h?.address || h?.TokenHolderAddress || 'N/A'; 
                // 获取余额
                const balance = h?.balance || h?.amount || h?.TokenHolderQuantity || '0'; 
                
                if (holderAddress !== 'N/A' && !isNaN(decimals)) {
                    // 使用 BigInt 处理 balance
                    try {
                        qR = BigInt(balance);
                        // 格式化代币数量
                        qF = formatTokenAmount(balance, decimals, 4); 
                        
                        // 计算美元价值
                        if (typeof price === 'number' && price > 0) {
                            try {
                                // 将数量转换为标准单位
                                const balanceNumber = Number(qR) / (10**decimals);
                                // 计算美元价值
                                const usdValue = balanceNumber * price;
                                // 格式化为美元金额
                                vF = formatCurrency(usdValue);
                                console.log(`[BscService] Holder ${holderAddress.substring(0, 8)}...: Quantity ${qF}, USD Value ${vF}`);
                            } catch(e) {
                                console.error(`[BscService] Error calculating USD value for holder ${holderAddress.substring(0, 8)}...`, e);
                                vF = 'Error';
                            }
                        } else {
                            console.log(`[BscService] Invalid price for holder ${holderAddress.substring(0, 8)}...: ${price}`);
                        }
                    } catch(e) {
                        console.error(`[BscService] Error parsing balance (${balance}) for holder ${holderAddress.substring(0, 8)}...`, e);
                        qF = 'Error';
                    }
                } else {
                    console.log(`[BscService] Invalid holder address or decimals: ${holderAddress}, decimals: ${decimals}`);
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

        // 3c. 修复: 标准化 topTraders
        console.log(`[BscService] Processing ${birdeyeTopTraders.length} top traders`);
        
        standardizedData.topTraders = birdeyeTopTraders.map(t => { 
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

        // 3d. 修复: 标准化 holderStats - 直接使用 Moralis 返回的数据，不再单独计算
        console.log(`[BscService] Processing holder stats from Moralis`);
        console.log(`[BscService] Holder stats data available: ${!!moralisHolderStats}`);
        
        // 直接使用 Moralis 返回的结构
        standardizedData.holderStats = { 
            totalHolders: moralisHolderStats?.totalHolders, 
            holderChange: moralisHolderStats?.holderChange || {
                '5min': {change: null, changePercent: null},
                '1h': {change: null, changePercent: null},
                '6h': {change: null, changePercent: null},
                '24h': {change: null, changePercent: null},
                '3d': {change: null, changePercent: null},
                '7d': {change: null, changePercent: null},
                '30d': {change: null, changePercent: null}
            }, 
            holderSupply: moralisHolderStats?.holderSupply || {
                top10: {supplyPercent: null},
                top25: {supplyPercent: null},
                top50: {supplyPercent: null},
                top100: {supplyPercent: null}
            }, 
            holderDistribution: moralisHolderStats?.holderDistribution || {
                whales: 0,
                dolphins: 0,
                fish: 0,
                shrimps: 0
            }, 
            holdersByAcquisition: moralisHolderStats?.holdersByAcquisition || {
                swap: null,
                transfer: null,
                airdrop: null
            } 
        };
        
        if (moralisHolderStats) {
            console.log(`[BscService] Total holders: ${moralisHolderStats.totalHolders}`);
            console.log(`[BscService] Holder distribution: ${JSON.stringify(moralisHolderStats.holderDistribution || {})}`);
            console.log(`[BscService] Holder supply: ${JSON.stringify(moralisHolderStats.holderSupply || {})}`);
        } else {
            console.warn(`[BscService] No holder stats data available from Moralis`);
        }

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

        console.log("[BscService] Completed BSC data bundle standardization.");
        return standardizedData; // 返回最终标准化数据

    } catch (error) {
        console.error(`[BscService] Error in getBscTokenDataBundle for ${address}:`, error);
        return null; // 或者返回一个包含错误信息的对象
    }
}

// 导出主函数
module.exports = {
    getBscTokenDataBundle
}; 