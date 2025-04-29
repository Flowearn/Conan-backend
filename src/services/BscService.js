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
        console.log(`[BscService] [API:2] getMoralisTokenHolderStats: ${contractAddress}`);
        console.log(`[BscService] [API:3] getBirdeyeTopTraders: ${contractAddress}, timeframe=24h, limit=10`);
        console.log(`[BscService] [API:4] getMoralisTokenAnalytics: ${contractAddress}`);
        
        // 1. 并行获取所有原始数据
        const results = await Promise.allSettled([
            getMoralisTokenData(contractAddress),      // Index 0
            getMoralisTokenMetadata(contractAddress),  // Index 1
            getMoralisTokenHolderStats(contractAddress), // Index 2
            getBirdeyeTopTraders(contractAddress, '24h', 10, 0, 'volume', 'desc'), // Index 3
            getMoralisTokenAnalytics(contractAddress)  // Index 4
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

        // 处理 API 2: Moralis Holder Stats
        let moralisHolderStatsRaw = null; // Default null
        const statsResult = results[2];
        // Access the stats object from the 'data' key based on Moralis raw response log
        if (statsResult.status === 'fulfilled' && typeof statsResult.value?.data === 'object' && statsResult.value.data !== null) {
            moralisHolderStatsRaw = statsResult.value.data;
            // Also check if 'success' flag exists within the response value itself, if provided by the service wrapper
            if (statsResult.value.success === false) {
                 console.warn(`[BscService] [API:2] Moralis Holder Stats API reported success:false. Error:`, statsResult.value.error || 'Unknown error structure');
                 moralisHolderStatsRaw = null; // Ensure null if success is false
            } else {
                 console.log(`[BscService] [API:2] Successfully extracted Holder Stats object with totalHolders: ${moralisHolderStatsRaw?.totalHolders}`);
            }
        } else {
            console.warn(`[BscService] [API:2] Failed to get or extract Moralis Holder Stats. Status: ${statsResult.status}. Reason/Error:`, statsResult.reason || statsResult.value || 'Expected value.data object not found');
        }


        // 处理 API 3: Birdeye Top Traders
        let birdeyeTopTraders = []; // Default empty array
        const tradersResult = results[3];
        // Access the items array from 'data.items' key based on Birdeye raw response log
        if (tradersResult.status === 'fulfilled' && tradersResult.value?.success && Array.isArray(tradersResult.value.data?.items)) {
            birdeyeTopTraders = tradersResult.value.data.items;
            console.log(`[BscService] [API:3] Successfully extracted ${birdeyeTopTraders.length} Birdeye Top Traders from value.data.items`);
        } else {
             console.warn(`[BscService] [API:3] Failed to get or extract Birdeye Top Traders. Status: ${tradersResult.status}. Reason/Error:`, tradersResult.reason || tradersResult.value?.error || 'Expected value.data.items array not found');
        }

        // --- End: PRECISE Replacement Extraction Logic ---

        // Keep extraction for results[0], results[1], results[4] as they seem to work
        // Assuming metadata is the first element if API returns an array:
        const moralisTokenDataResult = results[0].status === 'fulfilled' && results[0].value?.success ? results[0].value : null;
        const moralisMetadataResult = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value[0] : null;
        const moralisAnalytics = results[4].status === 'fulfilled' && results[4].value?.success ? results[4].value : null;

        // Assign to rawData (make sure names match downstream use)
        rawData = { 
            moralisTokenData: moralisTokenData || moralisTokenDataResult, 
            moralisMetadata: moralisMetadataResult, 
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
        // --- Start: PRECISE Fix for holderStats Standardization Mapping ONLY ---
        console.log('[BscService] Mapping holder stats from raw object:', JSON.stringify(moralisHolderStatsRaw, null, 2)); // Log the input object we successfully extracted previously
        standardizedData.holderStats = {
            // Use optional chaining (?.) and nullish coalescing (??) for safety
            totalHolders: moralisHolderStatsRaw?.totalHolders ?? null, // **FIX:** Read from moralisHolderStatsRaw
            // **FIX:** Ensure other fields are also correctly read from moralisHolderStatsRaw, providing defaults if null/undefined
            holderChange: moralisHolderStatsRaw?.holderChange ?? { '5min':{change:null,changePercent:null},'1h':{change:null,changePercent:null},'6h':{change:null,changePercent:null},'24h':{change:null,changePercent:null},'3d':{change:null,changePercent:null},'7d':{change:null,changePercent:null},'30d':{change:null,changePercent:null} },
            holderSupply: moralisHolderStatsRaw?.holderSupply ?? { top10:{supplyPercent:null},top25:{supplyPercent:null},top50:{supplyPercent:null},top100:{supplyPercent:null} },
            holderDistribution: moralisHolderStatsRaw?.holderDistribution ?? { whales:0, dolphins:0, fish:0, shrimps:0, sharks: 0, octopus: 0, crabs: 0 }, // Provide defaults for all keys
            holdersByAcquisition: moralisHolderStatsRaw?.holdersByAcquisition ?? { swap:null, transfer:null, airdrop:null }
        };
        console.log('[BscService] Final standardized holderStats object after fix:', JSON.stringify(standardizedData.holderStats, null, 2)); // Log the result of the mapping
        // --- End: PRECISE Fix ---
        
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
