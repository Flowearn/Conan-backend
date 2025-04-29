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
        
        const moralisHolderStats = results[3].status === 'fulfilled' ? results[3].value : null;
        
        let birdeyeTopTraders = []; 
        const traderResult = results[4]; 
        if (traderResult?.status === 'fulfilled' && traderResult.value) { 
            const p = traderResult.value.data?.items || traderResult.value; 
            if (Array.isArray(p)) birdeyeTopTraders = p; 
            else console.warn("[BscService] Traders value not array:", traderResult.value); 
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

        // 3b. 标准化 top10Holders
        const topHoldersRaw = moralisHolders.slice(0, 10);
        standardizedData.top10Holders = topHoldersRaw.map(h => { 
            let qF = 'N/A', vF = 'N/A', qR = BigInt(0); 
            try {
                const a = h?.owner_address || h?.address || h?.TokenHolderAddress || 'N/A'; 
                const m = h?.balance || h?.amount || h?.TokenHolderQuantity || '0'; 
                if (a !== 'N/A' && !isNaN(decimals)) {
                    qR = BigInt(m);
                    qF = formatTokenAmount(m, decimals, 4); 
                    if (typeof price === 'number' && price > 0) {
                        const qN = Number(qR) / (10**decimals);
                        vF = formatCurrency(qN * price);
                    }
                }
            } catch(e) {
                console.error("Err proc BSC holder:", h?.owner_address, e);
            } 
            return {
                TokenHolderAddress: h?.owner_address || h?.address || h?.TokenHolderAddress || 'N/A',
                TokenHolderQuantity: h?.balance || h?.amount || h?.TokenHolderQuantity || '0',
                TokenHolderQuantityFormatted: qF,
                TokenHolderUsdValueFormatted: vF
            };
        });

        // 3c. 标准化 topTraders
        standardizedData.topTraders = birdeyeTopTraders.map(t => { 
            const tags = t?.tags || []; 
            const dT = tags.includes('sniper-bot') || tags.includes('arbitrage-bot') ? ['bot'] : tags; 
            const vU = t?.volume; 
            const vBU = t?.volumeBuy; 
            const vSU = t?.volumeSell; 
            const vTF = 'N/A'; 
            const vBTF = 'N/A'; 
            const vSTF = 'N/A'; 
            return {
                owner: t?.owner || 'N/A',
                trade: t?.trade ?? 0,
                tradeBuy: t?.tradeBuy ?? 0,
                tradeSell: t?.tradeSell ?? 0,
                tags: dT,
                volumeUsdFormatted: safeCurrencySuffix(vU),
                volumeBuyUsdFormatted: safeCurrencySuffix(vBU),
                volumeSellUsdFormatted: safeCurrencySuffix(vSU),
                volumeTokenFormatted: vTF,
                volumeBuyTokenFormatted: vBTF,
                volumeSellTokenFormatted: vSTF
            };
        });

        // 3d. 标准化 holderStats
        standardizedData.holderStats = { 
            totalHolders: moralisHolderStats?.totalHolders ?? null, 
            holderChange: moralisHolderStats?.holderChange ?? {}, 
            holderSupply: moralisHolderStats?.holderSupply ?? {}, 
            holderDistribution: moralisHolderStats?.holderDistribution ?? {}, 
            holdersByAcquisition: moralisHolderStats?.holdersByAcquisition ?? {} 
        };
        // TODO: Add calculation logic for distribution/supply% if needed

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