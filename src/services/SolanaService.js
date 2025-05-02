const axios = require('axios');
const {
    formatCurrency, safeCurrencySuffix, safeNumberSuffix, formatTokenAmount
    // 确保导入所有需要的 formatters
} = require('../utils/formatters');

/**
 * 从Birdeye API获取Solana代币元数据
 * @param {string} address - Solana代币地址
 * @returns {Promise<Object>} - 代币元数据
 */
async function _fetchSolanaTokenMetadata(address) {
    try {
        const response = await axios.get(`https://api.birdeye.so/defi/token_metadata`, {
            params: {
                address: address
            },
            headers: {
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000 // 30秒超时
        });
        return response.data.data;
    } catch (error) {
        console.error(`[SolanaService] Error fetching Solana token metadata for ${address}:`, error.message);
        throw error;
    }
}

/**
 * 从Birdeye API获取Solana市场数据
 * @param {string} address - Solana代币地址
 * @returns {Promise<Object>} - 市场数据
 */
async function _fetchSolanaMarketData(address) {
    try {
        const response = await axios.get(`https://api.birdeye.so/defi/token_market_data`, {
            params: {
                address: address
            },
            headers: {
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000 // 30秒超时
        });
        return response.data.data;
    } catch (error) {
        console.error(`[SolanaService] Error fetching Solana market data for ${address}:`, error.message);
        throw error;
    }
}

/**
 * 从Birdeye API获取Solana持有者信息
 * @param {string} address - Solana代币地址
 * @param {number} limit - 返回数量限制，默认100
 * @param {number} offset - 偏移量，默认0
 * @returns {Promise<Array>} - 持有者列表
 */
async function _fetchSolanaHolders(address, limit = 100, offset = 0) {
    try {
        const response = await axios.get(`https://api.birdeye.so/defi/token_holders`, {
            params: {
                address: address,
                limit: limit,
                offset: offset
            },
            headers: {
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000 // 30秒超时
        });
        return response.data.data.items || [];
    } catch (error) {
        console.error(`[SolanaService] Error fetching Solana holders for ${address}:`, error.message);
        throw error;
    }
}

/**
 * 从Birdeye API获取Solana顶级交易者数据
 * @param {string} address - Solana代币地址
 * @returns {Promise<Array>} - 顶级交易者列表
 */
async function _fetchSolanaTopTraders(address) {
    try {
        const response = await axios.get(`https://api.birdeye.so/defi/top_traders`, {
            params: {
                address: address,
                time_frame: '24h',
                limit: 10,
                offset: 0
            },
            headers: {
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000 // 30秒超时
        });
        return response.data.data.items || [];
    } catch (error) {
        console.error(`[SolanaService] Error fetching Solana top traders for ${address}:`, error.message);
        throw error;
    }
}

/**
 * 从Birdeye API获取Solana交易数据
 * @param {string} address - Solana代币地址
 * @returns {Promise<Object>} - 交易数据
 */
async function _fetchSolanaTradeData(address) {
    try {
        const response = await axios.get(`https://api.birdeye.so/defi/token_trade_data`, {
            params: {
                address: address
            },
            headers: {
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000 // 30秒超时
        });
        return response.data.data;
    } catch (error) {
        console.error(`[SolanaService] Error fetching Solana trade data for ${address}:`, error.message);
        throw error;
    }
}

/**
 * 获取并标准化给定 Solana 地址的完整代币数据包。
 * @param {string} address - Solana 代币地址。
 * @returns {Promise<object|null>} 标准化后的数据对象，如果出错则返回 null。
 */
async function getSolanaTokenDataBundle(address) {
    console.log(`[SolanaService] Getting data bundle for Solana address: ${address}`);
    const contractAddress = address;
    let rawData = {};
    let standardizedData = {};

    try {
        // 1. 并行获取所有 Solana 原始数据
        const results = await Promise.allSettled([
            _fetchSolanaTokenMetadata(contractAddress),      // Index 0
            _fetchSolanaMarketData(contractAddress),         // Index 1
            _fetchSolanaHolders(contractAddress, 100, 0),    // Index 2
            _fetchSolanaTopTraders(contractAddress),         // Index 3
            _fetchSolanaTradeData(contractAddress)           // Index 4
        ]);

        // --- 可选：添加详细日志记录 results ---
        console.log("[SolanaService] Raw API call results:", JSON.stringify(results, null, 2));

        // 2. 安全地提取原始数据
        const solanaMetadata = results[0].status === 'fulfilled' ? results[0].value : null;
        const solanaMarketData = results[1].status === 'fulfilled' ? results[1].value : null;
        let solanaHolders = []; const holderResult = results[2]; if (holderResult?.status === 'fulfilled' && holderResult.value) { const p = holderResult.value; if (Array.isArray(p)) solanaHolders = p; else console.warn("[SolanaService] Holders value not array:", holderResult.value); } else if (holderResult?.status === 'rejected') { console.error("[SolanaService] Holders rejected:", holderResult.reason); }
        let solanaTopTraders = []; const traderResult = results[3]; if (traderResult?.status === 'fulfilled' && traderResult.value) { const p = traderResult.value; if (Array.isArray(p)) solanaTopTraders = p; else console.warn("[SolanaService] Traders value not array:", traderResult.value); } else if (traderResult?.status === 'rejected') { console.error("[SolanaService] Traders rejected:", traderResult.reason); }
        const solanaTradeData = results[4].status === 'fulfilled' ? results[4].value : null;

        rawData = { solanaMetadata, solanaMarketData, solanaHolders, solanaTopTraders, solanaTradeData };
        console.log("[SolanaService] Raw Solana data extracted.");

        // 3. 实现完整的 Solana 数据标准化 (使用我们之前写的逻辑)
        standardizedData = {};

        // 3a. 标准化 tokenOverview
        const overview = { /* 初始化 */ }; const price = solanaTradeData?.price ?? solanaMarketData?.price; const decimals = solanaMetadata?.decimals ?? 0;
        overview.name = solanaMetadata?.name || 'N/A'; overview.symbol = solanaMetadata?.symbol || 'N/A'; overview.logoURI = solanaMetadata?.logo_uri || null;
        overview.price = price ?? 0; overview.priceFormatted = formatCurrency(price); overview.priceChange24h = solanaTradeData?.price_change_24h_percent ?? null;
        overview.liquidityFormatted = safeCurrencySuffix(solanaMarketData?.liquidity); overview.marketCap = solanaMarketData?.market_cap ?? 0; overview.marketCapFormatted = safeCurrencySuffix(solanaMarketData?.market_cap);
        overview.fdvFormatted = safeCurrencySuffix(solanaMarketData?.fdv); overview.circulatingSupply = solanaMarketData?.circulating_supply ?? 0; overview.circulatingSupplyFormatted = safeNumberSuffix(solanaMarketData?.circulating_supply);
        overview.explorerUrl = contractAddress ? `https://solscan.io/token/${contractAddress}` : null;
        standardizedData.tokenOverview = overview;

        // 3b. 标准化 top10Holders
        const topHoldersRaw = solanaHolders.slice(0, 10);
        standardizedData.top10Holders = topHoldersRaw.map(h => { /* ...映射/计算逻辑... */
            let qF='N/A',vF='N/A',qR=BigInt(0);try{const a=h?.owner||'N/A';const m=h?.amount||'0';if(a!=='N/A'&&!isNaN(decimals)){qR=BigInt(m);qF=formatTokenAmount(m,decimals,4);if(typeof price==='number'&&price>0){const qN=Number(qR)/(10**decimals);vF=formatCurrency(qN*price);}}}catch(e){console.error("Err proc SOL holder:",h?.owner,e);}return{TokenHolderAddress:h?.owner||'N/A',TokenHolderQuantity:h?.amount||'0',TokenHolderQuantityFormatted:qF,TokenHolderUsdValueFormatted:vF};
        });

        // 3c. 标准化 topTraders
        standardizedData.topTraders = solanaTopTraders.map(t => { /* ...映射/格式化逻辑... */
            const tags=t?.tags||[]; const dT=tags.includes('sniper-bot')||tags.includes('arbitrage-bot')?['bot']:tags; const vU=t?.volume; const vBU=t?.volumeBuy; const vSU=t?.volumeSell; const vTF='N/A'; const vBTF='N/A'; const vSTF='N/A'; return {owner:t?.owner||'N/A',trade:t?.trade??0,tradeBuy:t?.tradeBuy??0,tradeSell:t?.tradeSell??0,tags:dT,volumeUsdFormatted:safeCurrencySuffix(vU),volumeBuyUsdFormatted:safeCurrencySuffix(vBU),volumeSellUsdFormatted:safeCurrencySuffix(vSU),volumeTokenFormatted:vTF,volumeBuyTokenFormatted:vBTF,volumeSellTokenFormatted:vSTF};
        });

        // 3d. 标准化 holderStats
        const holderStats = { /* 初始化默认/空结构 */ };
        holderStats.totalHolders = solanaTradeData?.holder ?? null; holderStats.holderChange = {'5min':{change:null,changePercent:null},'1h':{change:null,changePercent:null},'6h':{change:null,changePercent:null},'24h':{change:null,changePercent:null},'3d':{change:null,changePercent:null},'7d':{change:null,changePercent:null},'30d':{change:null,changePercent:null}}; holderStats.holdersByAcquisition = {swap:null,transfer:null,airdrop:null}; holderStats.holderSupply = {top10:{supplyPercent:null},top25:{supplyPercent:null},top50:{supplyPercent:null},top100:{supplyPercent:null}}; holderStats.holderDistribution = {whales:0,dolphins:0,fish:0,shrimps:0};
        const totalSupply = rawData.solanaMarketData?.total_supply;
        if (solanaHolders.length > 0 && totalSupply && !isNaN(decimals)) { try { /* 计算 supply% */ const tsBI=BigInt(totalSupply);if(tsBI>0){const lim=[10,25,50,100];let cum=BigInt(0);for(let i=0;i<Math.min(solanaHolders.length,100);i++){cum+=BigInt(solanaHolders[i]?.amount||'0');const lI=lim.indexOf(i+1);if(lI!==-1){const l=lim[lI];const p=(cum*BigInt(10000))/tsBI;holderStats.holderSupply[`top${l}`].supplyPercent=Number(p)/100;}}} } catch (e) { console.error("Err calc SOL supply%:", e); } }
        if (solanaHolders.length > 0 && totalSupply && !isNaN(decimals)) { try { /* 计算 distribution */ const tsBI=BigInt(totalSupply);if(tsBI>0){const wT=tsBI/BigInt(100);const dT=tsBI/BigInt(1000);const fT=tsBI/BigInt(10000);solanaHolders.forEach(h=>{const hA=BigInt(h?.amount||'0');if(hA>wT)holderStats.holderDistribution.whales++;else if(hA>dT)holderStats.holderDistribution.dolphins++;else if(hA>fT)holderStats.holderDistribution.fish++;else if(hA>0)holderStats.holderDistribution.shrimps++;});}} catch (e) { console.error("Err calc SOL distribution:", e); } }
        standardizedData.holderStats = holderStats;

        // 3e. 标准化 tokenAnalytics
        const tokenAnalytics = { /* 初始化默认/空结构 */ totalBuyers:{}, totalSellers:{}, totalBuys:{}, totalSells:{}, totalBuyVolumeFormatted:{}, totalSellVolumeFormatted:{}, rawData:{} };
        if (solanaTradeData) { /* 映射 1h, 6h, 24h 数据 */ const mapTime = (suf) => solanaTradeData[`buy_${suf}`]??null; const mapTimeS = (suf) => solanaTradeData[`sell_${suf}`]??null; const mapVolB = (suf) => safeCurrencySuffix(solanaTradeData[`volume_buy_${suf}_usd`]); const mapVolS = (suf) => safeCurrencySuffix(solanaTradeData[`volume_sell_${suf}_usd`]); tokenAnalytics.totalBuyers = {'5m':null,'1h':mapTime('1h'),'6h':mapTime('6h'),'24h':mapTime('24h')}; tokenAnalytics.totalSellers = {'5m':null,'1h':mapTimeS('1h'),'6h':mapTimeS('6h'),'24h':mapTimeS('24h')}; tokenAnalytics.totalBuys = tokenAnalytics.totalBuyers; tokenAnalytics.totalSells = tokenAnalytics.totalSellers; tokenAnalytics.totalBuyVolumeFormatted = {'5m':'N/A','1h':mapVolB('1h'),'6h':mapVolB('6h'),'24h':mapVolB('24h')}; tokenAnalytics.totalSellVolumeFormatted = {'5m':'N/A','1h':mapVolS('1h'),'6h':mapVolS('6h'),'24h':mapVolS('24h')}; tokenAnalytics.rawData = solanaTradeData; }
        standardizedData.tokenAnalytics = tokenAnalytics;

        // 3f. 标准化 metadata
        standardizedData.metadata = { address: solanaMetadata?.address || contractAddress, decimals: decimals, name: overview.name, symbol: overview.symbol, totalSupply: solanaMarketData?.total_supply ?? null, fully_diluted_valuation: solanaMarketData?.fdv ?? null, market_cap_usd: overview.marketCap, explorerUrl: overview.explorerUrl, verified_contract: null };

        console.log("[SolanaService] Completed Solana data bundle standardization.");
        return standardizedData; // 返回最终标准化数据

    } catch (error) {
        console.error(`[SolanaService] Error in getSolanaTokenDataBundle for ${address}:`, error);
        return null; // 或返回包含错误信息的对象
    }
}

// 导出主函数
module.exports = {
    getSolanaTokenDataBundle
}; 