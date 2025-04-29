const axios = require('axios');
const {
    formatCurrency, safeCurrencySuffix, safeNumberSuffix, formatTokenAmount
    // 导入所有需要的 formatters
} = require('../utils/formatters');

/**
 * 从Moralis API获取代币元数据
 * @param {string} address - BSC代币地址
 * @returns {Promise<Object>} - 代币元数据
 */
async function _fetchMoralisMetadata(address) {
    try {
        const response = await axios.get('https://deep-index.moralis.io/api/v2.2/erc20/metadata', {
            params: {
                chain: '0x38', // BSC链ID
                addresses: [address]
            },
            headers: {
                'X-API-Key': process.env.MORALIS_API_KEY
            },
            timeout: 30000 // 30秒超时
        });
        return response.data;
    } catch (error) {
        console.error(`[BscService] Error fetching Moralis metadata for ${address}:`, error.message);
        throw error;
    }
}

/**
 * 从Moralis API获取代币持有者统计信息
 * @param {string} address - BSC代币地址
 * @returns {Promise<Object>} - 持有者统计信息
 */
async function _fetchMoralisHolderStats(address) {
    try {
        const response = await axios.get(`https://deep-index.moralis.io/api/v2.2/erc20/${address}/holders`, {
            params: {
                chain: '0x38' // BSC链ID
            },
            headers: {
                'X-API-Key': process.env.MORALIS_API_KEY
            },
            timeout: 30000 // 30秒超时
        });
        return response.data;
    } catch (error) {
        console.error(`[BscService] Error fetching Moralis holder stats for ${address}:`, error.message);
        throw error;
    }
}

/**
 * 从Moralis API获取代币分析数据
 * @param {string} address - BSC代币地址
 * @returns {Promise<Object>} - 代币分析数据
 */
async function _fetchMoralisAnalytics(address) {
    try {
        const response = await axios.get(`https://deep-index.moralis.io/api/v2.2/tokens/${address}/analytics`, {
            params: {
                chain: 'bsc'
            },
            headers: {
                'X-API-Key': process.env.MORALIS_API_KEY
            },
            timeout: 30000 // 30秒超时
        });
        return response.data;
    } catch (error) {
        console.error(`[BscService] Error fetching Moralis analytics for ${address}:`, error.message);
        throw error;
    }
}

/**
 * 从Moralis API获取代币价格信息
 * @param {string} address - BSC代币地址
 * @returns {Promise<Object>} - 价格信息
 */
async function _fetchMoralisPrice(address) {
    const apiKey = process.env.MORALIS_API_KEY;
    if (!apiKey) {
        console.error("[BscService:_fetchMoralisPrice] Moralis API Key not found in environment variables.");
        return null; // 或者抛出错误
    }
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${address}/price`;
    console.log(`[BscService:_fetchMoralisPrice] Fetching price for ${address}`);
    try {
        const response = await axios.get(url, {
            headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' },
            params: {
                chain: 'bsc',
                include: 'percent_change' // 包含24小时变化率
            },
            timeout: 30000 // 30秒超时
        });
        console.log(`[BscService:_fetchMoralisPrice] Successfully fetched price for ${address}`);
        return response.data; // 直接返回数据部分
    } catch (error) {
        console.error(`[BscService:_fetchMoralisPrice] Error fetching Moralis price for ${address}:`, error.response?.status, error.message);
        return null; // 返回 null 或根据需要处理错误
    }
}

/**
 * 从Birdeye API获取代币的顶级交易者数据
 * @param {string} address - BSC代币地址
 * @param {string} time_frame - 时间范围，默认'24h'
 * @param {number} limit - 返回数量限制，默认10
 * @param {number} offset - 偏移量，默认0
 * @param {string} sort_by - 排序字段，默认'volume'
 * @param {string} sort_type - 排序方式，默认'desc'
 * @returns {Promise<Object>} - 顶级交易者数据
 */
async function _fetchBirdeyeTopTraders(address, time_frame = '24h', limit = 10, offset = 0, sort_by = 'volume', sort_type = 'desc') {
    const apiKey = process.env.BIRDEYE_API_KEY;
    if (!apiKey) {
        console.error("[BscService:_fetchBirdeyeTopTraders] Birdeye API Key not found.");
        return null;
    }
    const url = 'https://public-api.birdeye.so/defi/v2/tokens/top_traders'; // 使用 V2 URL
    console.log(`[BscService:_fetchBirdeyeTopTraders] Fetching top traders for ${address}`);
    try {
        const response = await axios.get(url, {
            headers: {
                'accept': 'application/json',
                'X-API-KEY': apiKey,
                'x-chain': 'bsc' // 明确指定 BSC 链
            },
            params: { // 将函数参数映射到 query params
                address: address,
                time_frame: time_frame,
                limit: limit,
                offset: offset,
                sort_by: sort_by,
                sort_type: sort_type
            },
            timeout: 30000 // 30秒超时
        });
        console.log(`[BscService:_fetchBirdeyeTopTraders] Successfully fetched top traders for ${address}`);
        return response.data; // 返回响应的数据部分
    } catch (error) {
        console.error(`[BscService:_fetchBirdeyeTopTraders] Error fetching Birdeye top traders for ${address}:`, error.response?.status, error.message);
        // 可以在这里记录更详细的错误，比如 error.response?.data
        if (error.response?.status === 521) {
             console.warn('[BscService:_fetchBirdeyeTopTraders] Birdeye server returned 521 (Web server is down). Returning empty list.');
        }
        return null; // 返回 null 或根据需要处理错误
    }
}

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
        console.log(`[BscService] [API:0] _fetchMoralisMetadata: ${contractAddress}`);
        console.log(`[BscService] [API:1] _fetchMoralisHolderStats: ${contractAddress}`);
        console.log(`[BscService] [API:2] _fetchBirdeyeTopTraders: ${contractAddress}, timeframe=24h, limit=10`);
        console.log(`[BscService] [API:3] _fetchMoralisAnalytics: ${contractAddress}`);
        console.log(`[BscService] [API:4] _fetchMoralisPrice: ${contractAddress}`);
        
        // 1. 并行获取所有原始数据
        const results = await Promise.allSettled([
            _fetchMoralisMetadata(contractAddress),       // 新 Index 0
            _fetchMoralisHolderStats(contractAddress),    // 新 Index 1
            _fetchBirdeyeTopTraders(contractAddress, '24h', 10), // 新 Index 2
            _fetchMoralisAnalytics(contractAddress),      // 新 Index 3
            _fetchMoralisPrice(contractAddress)           // 新 Index 4
        ]);
        console.log(`[HANG DEBUG] After Promise.allSettled`); // 3. API 调用后

        // --- 此处添加详细日志记录 results (可选，但推荐) ---
        console.log("[BscService] Raw API call results status & values:");
        results.forEach((result, index) => {
            console.log(`--- Result Index [${index}] ---`);
            console.log(`Status: ${result.status}`);
            if (result.status === 'fulfilled') {
                try {
                    // Log the fulfilled value, using JSON.stringify for complex objects
                    console.log(`Value:`, JSON.stringify(result.value, null, 2));
                } catch (e) {
                    // Fallback for non-JSON serializable values or circular structures
                    console.log(`Value (raw):`, result.value);
                }
            } else if (result.status === 'rejected') {
                // Log the reason for rejection
                console.error(`Reason:`, result.reason);
            }
            console.log(`---------------------------`);
        });

        console.log(`[HANG DEBUG] Before Robust Extraction`); // 4. 原始数据提取前
        // 2. 安全地提取原始数据 (使用健壮逻辑)
        
        // 提取 moralisMetadata (新 Index 0)
        const bsc_moralis_metadata = results[0].status === 'fulfilled' ? results[0].value?.[0] : null; // Metadata API 的 data 是一个数组
        console.log(`[BscService] [API:0] Extracted bsc_moralis_metadata:`, bsc_moralis_metadata ? 'Success' : 'Null');
        
        // 提取 moralisHolderStats (新 Index 1)
        const bsc_moralis_holderStats = results[1].status === 'fulfilled' ? results[1].value : null; // 假设 /holders API 的 data 直接是统计对象
        console.log(`[BscService] [API:1] Extracted bsc_moralis_holderStats:`, bsc_moralis_holderStats ? 'Success' : 'Null');

        // 提取 birdeyeTopTraders (新 Index 2)
        let bsc_birdeye_topTraders = []; // 默认空数组
        if (results[2].status === 'fulfilled' && results[2].value?.data?.items) { // 检查嵌套结构 data.items
             if (Array.isArray(results[2].value.data.items)) {
                 bsc_birdeye_topTraders = results[2].value.data.items;
                 console.log('[BscService] [API:2] Extracted Birdeye Top Traders: Success');
             } else {
                 // API 成功返回，但 data.items 不是数组
                 console.warn("[BscService] Birdeye traders value.data.items is not an array:", results[2].value);
             }
        } else if (results[2].status === 'rejected') {
            // API 调用失败 (例如之前的 521 错误)
            console.error("[BscService] Birdeye traders rejected:", results[2].reason?.message || results[2].reason);
        } else if (results[2].status === 'fulfilled') {
             // API 调用成功，但响应结构不符合预期 (没有 data.items)
             console.warn("[BscService] Birdeye traders fulfilled but data.items not found:", results[2].value);
        }

        // 提取 moralisAnalytics (新 Index 3)
        const bsc_moralis_analytics = results[3].status === 'fulfilled' ? results[3].value : null; // 假设 /analytics API 的 data 直接是分析对象
        console.log(`[BscService] [API:3] Extracted bsc_moralis_analytics:`, bsc_moralis_analytics ? 'Success' : 'Null');

        // 提取 moralisPriceData (新 Index 4)
        const bsc_moralis_priceData = results[4].status === 'fulfilled' ? results[4].value : null;
        if (results[4].status === 'fulfilled' && results[4].value) {
            console.log('[BscService] [API:4] Extracted bsc_moralis_priceData: Success');
        } else {
            console.warn('[BscService] [API:4] Failed to extract bsc_moralis_priceData:', results[4].reason || 'API call failed');
        }

        // 更新 rawData 对象
        rawData = {
            bsc_moralis_metadata,    // 新 Index 0
            bsc_moralis_holderStats, // 新 Index 1
            bsc_birdeye_topTraders,  // 新 Index 2
            bsc_moralis_analytics,   // 新 Index 3
            bsc_moralis_priceData    // 新 Index 4
        };
        console.log("[BscService] Raw BSC data extracted after precise fixes.");
        
        console.log(`[HANG DEBUG] Before Standardization Logic`); // 6. 标准化开始前
        // 3. 执行数据标准化
        standardizedData = {};

        console.log(`[HANG DEBUG] Before tokenOverview standardization`); // 7. tokenOverview 前
        // 3a. 标准化 tokenOverview
        const overview = {};
        const price = bsc_moralis_priceData?.usdPrice ?? 0; // 使用 Price API 的 usdPrice，失败则为 0
        const decimals = parseInt(bsc_moralis_metadata?.decimals ?? '18', 10);
        const circulatingSupply = bsc_moralis_metadata?.circulating_supply;
        
        overview.name = bsc_moralis_metadata?.name || 'N/A';
        overview.symbol = bsc_moralis_metadata?.symbol || 'N/A';
        overview.logoURI = bsc_moralis_metadata?.logo || null;
        overview.price = price ?? 0;
        overview.priceFormatted = formatCurrency(price);
        overview.priceChange24h = bsc_moralis_priceData?.['24hrPercentChange'] ?? null;
        overview.liquidityFormatted = safeCurrencySuffix(bsc_moralis_priceData?.pairTotalLiquidityUsd); // 尝试使用 Price API 中的流动性数据
        
        let marketCap = bsc_moralis_metadata?.market_cap; // 优先使用元数据自带的
        if ((!marketCap || marketCap === 'N/A') && circulatingSupply && typeof price === 'number' && price > 0 && !isNaN(decimals)) {
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
            overview.marketCap = marketCap ?? 0;
            overview.marketCapFormatted = safeCurrencySuffix(marketCap);
        } else if (marketCap && marketCap !== 'N/A') {
            overview.marketCap = parseFloat(marketCap) ?? 0; // 使用元数据中的值
            overview.marketCapFormatted = safeCurrencySuffix(overview.marketCap);
        } else {
            overview.marketCap = 0;
            overview.marketCapFormatted = '$0';
        }
        
        overview.fdvFormatted = safeCurrencySuffix(bsc_moralis_metadata?.fully_diluted_valuation);
        overview.circulatingSupply = circulatingSupply ?? 0;
        overview.circulatingSupplyFormatted = safeNumberSuffix(circulatingSupply);
        overview.explorerUrl = bsc_moralis_metadata?.address ? `https://bscscan.com/token/${bsc_moralis_metadata.address}` : null;
        
        standardizedData.tokenOverview = overview;
        console.log(`[HANG DEBUG] After tokenOverview standardization`); // 8. tokenOverview 后

        console.log("[HANG DEBUG] Before topTraders standardization");
        
        // 3c. 标准化 topTraders
        standardizedData.topTraders = bsc_birdeye_topTraders.map((trader) => {
            // 确保可以访问到 formatters.js 中的 safeCurrencySuffix 函数
            // 如果 safeCurrencySuffix 不可用，可以暂时移除格式化，只保留原始数值
            const buyVolumeFormatted = typeof safeCurrencySuffix === 'function' ? safeCurrencySuffix(trader.volumeBuy) : trader.volumeBuy ?? null;
            const sellVolumeFormatted = typeof safeCurrencySuffix === 'function' ? safeCurrencySuffix(trader.volumeSell) : trader.volumeSell ?? null;
            const totalVolumeFormatted = typeof safeCurrencySuffix === 'function' ? safeCurrencySuffix(trader.volume) : trader.volume ?? null;

            return {
                // 使用 'owner' 字段作为地址
                address: trader.owner || 'N/A',
                // 添加 API 返回的 tags
                tags: trader.tags || [],
                // 组织 buy 相关数据
                buy: {
                    // 使用 'tradeBuy' 字段作为次数
                    count: trader.tradeBuy ?? null,
                    // 使用 'volumeBuy' 字段作为 USD 金额 (格式化)
                    // 注意：API 不直接提供以代币计价的 amount 和 price
                    amount: null, // API 未提供此数据
                    amountUSDFormatted: buyVolumeFormatted,
                    price: null // API 未提供此数据
                },
                // 组织 sell 相关数据
                sell: {
                    // 使用 'tradeSell' 字段作为次数
                    count: trader.tradeSell ?? null,
                    // 使用 'volumeSell' 字段作为 USD 金额 (格式化)
                    amount: null, // API 未提供此数据
                    amountUSDFormatted: sellVolumeFormatted,
                    price: null // API 未提供此数据
                },
                // 组织 total 相关数据
                total: {
                    // 优先使用 API 返回的 'trade' 总数字段
                    count: trader.trade ?? ((trader.tradeBuy ?? 0) + (trader.tradeSell ?? 0)),
                    amount: null, // API 未提供此数据
                     // 优先使用 API 返回的 'volume' 总额字段 (格式化)
                    amountUSDFormatted: totalVolumeFormatted
                }
            };
        });
        console.log("[HANG DEBUG] After topTraders standardization");

        // 3d. 生成 holderStats 数据
        console.log('[BscService] Mapping holder stats from raw object:', JSON.stringify(bsc_moralis_holderStats, null, 2));
        standardizedData.holderStats = {
            // Use optional chaining (?.) and nullish coalescing (??) for safety
            totalHolders: bsc_moralis_holderStats?.totalHolders ?? null,
            holderChange: bsc_moralis_holderStats?.holderChange ?? { '5min':{change:null,changePercent:null},'1h':{change:null,changePercent:null},'6h':{change:null,changePercent:null},'24h':{change:null,changePercent:null},'3d':{change:null,changePercent:null},'7d':{change:null,changePercent:null},'30d':{change:null,changePercent:null} },
            holderSupply: bsc_moralis_holderStats?.holderSupply ?? { top10:{supplyPercent:null},top25:{supplyPercent:null},top50:{supplyPercent:null},top100:{supplyPercent:null} },
            holderDistribution: bsc_moralis_holderStats?.holderDistribution ?? { whales:0, dolphins:0, fish:0, shrimps:0, sharks: 0, octopus: 0, crabs: 0 },
            holdersByAcquisition: bsc_moralis_holderStats?.holdersByAcquisition ?? { swap:null, transfer:null, airdrop:null }
        };
        console.log('[BscService] Final standardized holderStats object after fix:', JSON.stringify(standardizedData.holderStats, null, 2));
        
        // 3e. 标准化 tokenAnalytics
        console.log("[HANG DEBUG] Before tokenAnalytics standardization");
        if (bsc_moralis_analytics) {
            standardizedData.tokenAnalytics = {
                totalBuyers: bsc_moralis_analytics.totalBuyers ?? {}, // 直接使用 API 返回的对象
                totalSellers: bsc_moralis_analytics.totalSellers ?? {}, // 直接使用 API 返回的对象
                totalBuys: bsc_moralis_analytics.totalBuys ?? {},       // 直接使用 API 返回的对象
                totalSells: bsc_moralis_analytics.totalSells ?? {},     // 直接使用 API 返回的对象
                totalBuyVolume: bsc_moralis_analytics.totalBuyVolume ?? {}, // 直接使用 API 返回的对象 (或用 safeCurrencySuffix 格式化)
                totalSellVolume: bsc_moralis_analytics.totalSellVolume ?? {},// 直接使用 API 返回的对象 (或用 safeCurrencySuffix 格式化)
                totalLiquidityUsd: bsc_moralis_analytics.totalLiquidityUsd ?? null, // 直接使用 API 返回的值
                totalFullyDilutedValuation: bsc_moralis_analytics.totalFullyDilutedValuation ?? null // 直接使用 API 返回的值
                // 可以添加格式化后的字段，例如：
                // totalBuyVolumeFormatted: safeCurrencySuffix(bsc_moralis_analytics.totalBuyVolume?.['24h']), // 示例：格式化24h购买量
                // totalSellVolumeFormatted: safeCurrencySuffix(bsc_moralis_analytics.totalSellVolume?.['24h']), // 示例：格式化24h卖出量
            };
            console.log("[BscService] Successfully standardized tokenAnalytics");
        } else {
            standardizedData.tokenAnalytics = {}; // 如果 analytics 数据为空，则返回空对象
            console.warn("[BscService] bsc_moralis_analytics data was null, skipping standardization.");
        }
        console.log("[HANG DEBUG] After tokenAnalytics standardization");

        // 3f. 标准化 metadata
        console.log("[HANG DEBUG] Before metadata standardization");
        if (bsc_moralis_metadata) {
            standardizedData.metadata = {
                address: bsc_moralis_metadata.address || contractAddress,
                decimals: parseInt(bsc_moralis_metadata.decimals ?? '18', 10),
                name: bsc_moralis_metadata.name || 'N/A',
                symbol: bsc_moralis_metadata.symbol || 'N/A',
                totalSupply: bsc_moralis_metadata.total_supply ?? null,
                fully_diluted_valuation: bsc_moralis_metadata.fully_diluted_valuation ?? null,
                market_cap: bsc_moralis_metadata.market_cap ?? null, // 使用 metadata 中的 market_cap
                circulating_supply: bsc_moralis_metadata.circulating_supply ?? null,
                verified_contract: bsc_moralis_metadata.verified_contract ?? null,
                possible_spam: bsc_moralis_metadata.possible_spam ?? null,
                categories: bsc_moralis_metadata.categories ?? [],
                links: bsc_moralis_metadata.links ?? {}, // 直接使用 API 返回的 links 对象
                explorerUrl: bsc_moralis_metadata.address ? `https://bscscan.com/token/${bsc_moralis_metadata.address}` : null // 从 metadata 地址生成
            };
            console.log("[BscService] Successfully standardized metadata");
        } else {
            standardizedData.metadata = {}; // 如果 metadata 数据为空，则返回空对象
            console.warn("[BscService] bsc_moralis_metadata data was null, skipping standardization.");
        }
        console.log("[HANG DEBUG] After metadata standardization");
        
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
