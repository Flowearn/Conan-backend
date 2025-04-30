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
        return null;
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
        return response.data;
    } catch (error) {
        console.error(`[BscService:_fetchMoralisPrice] Error fetching Moralis price for ${address}:`, error.response?.status, error.message);
        return null;
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
    const url = 'https://public-api.birdeye.so/defi/v2/tokens/top_traders';
    console.log(`[BscService:_fetchBirdeyeTopTraders] Fetching top traders for ${address}`);
    try {
        const response = await axios.get(url, {
            headers: {
                'accept': 'application/json',
                'X-API-KEY': apiKey,
                'x-chain': 'bsc'
            },
            params: {
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
        return response.data;
    } catch (error) {
        console.error(`[BscService:_fetchBirdeyeTopTraders] Error fetching Birdeye top traders for ${address}:`, error.response?.status, error.message);
        if (error.response?.status === 521) {
             console.warn('[BscService:_fetchBirdeyeTopTraders] Birdeye server returned 521 (Web server is down). Returning empty list.');
        }
        return null;
    }
}

/**
 * 获取并标准化给定 BSC 地址的完整代币数据包。
 * @param {string} address - BSC 代币地址 (e.g., 0x...)
 * @returns {Promise<object|null>} 标准化后的数据对象，如果出错则返回 null。
 */
async function getBscTokenDataBundle(address) {
    console.log(`[BscService] Getting data bundle for BSC address: ${address}`);
    const contractAddress = address;
    let rawData = {};
    let standardizedData = {};

    try {
        console.log('[BscService] Calling Moralis/Birdeye APIs...');
        
        // 1. 并行获取所有原始数据
        const results = await Promise.allSettled([
            _fetchMoralisMetadata(contractAddress),       // 新 Index 0
            _fetchMoralisHolderStats(contractAddress),    // 新 Index 1
            _fetchBirdeyeTopTraders(contractAddress, '24h', 10), // 新 Index 2
            _fetchMoralisAnalytics(contractAddress),      // 新 Index 3
            _fetchMoralisPrice(contractAddress)           // 新 Index 4
        ]);

        // 2. 安全地提取原始数据
        
        // 提取 moralisMetadata (新 Index 0)
        const bsc_moralis_metadata = results[0].status === 'fulfilled' ? results[0].value?.[0] : null;
        
        // 提取 moralisHolderStats (新 Index 1)
        const bsc_moralis_holderStats = results[1].status === 'fulfilled' ? results[1].value : null;

        // 提取 birdeyeTopTraders (新 Index 2)
        let bsc_birdeye_topTraders = [];
        if (results[2].status === 'fulfilled' && results[2].value?.data?.items) {
             if (Array.isArray(results[2].value.data.items)) {
                 bsc_birdeye_topTraders = results[2].value.data.items;
                 console.log('[BscService] Extracted Birdeye Top Traders: Success');
             } else {
                 console.warn("[BscService] Birdeye traders value.data.items is not an array:", results[2].value);
             }
        } else if (results[2].status === 'rejected') {
            console.error("[BscService] Birdeye traders rejected:", results[2].reason?.message || results[2].reason);
        } else if (results[2].status === 'fulfilled') {
             console.warn("[BscService] Birdeye traders fulfilled but data.items not found:", results[2].value);
        }

        // 提取 moralisAnalytics (新 Index 3)
        const bsc_moralis_analytics = results[3].status === 'fulfilled' ? results[3].value : null;

        // 提取 moralisPriceData (新 Index 4)
        const bsc_moralis_priceData = results[4].status === 'fulfilled' ? results[4].value : null;
        if (results[4].status === 'rejected') {
            console.warn('[BscService] Failed to extract bsc_moralis_priceData:', results[4].reason || 'API call failed');
        }

        // 更新 rawData 对象
        rawData = {
            bsc_moralis_metadata,
            bsc_moralis_holderStats,
            bsc_birdeye_topTraders,
            bsc_moralis_analytics,
            bsc_moralis_priceData
        };
        
        // 3. 执行数据标准化
        standardizedData = {};

        // 3a. 标准化 tokenOverview
        const overview = {};
        const price = bsc_moralis_priceData?.usdPrice ?? 0;
        const decimals = parseInt(bsc_moralis_metadata?.decimals ?? '18', 10);
        const circulatingSupply = bsc_moralis_metadata?.circulating_supply;
        
        overview.name = bsc_moralis_metadata?.name || 'N/A';
        overview.symbol = bsc_moralis_metadata?.symbol || 'N/A';
        overview.logoURI = bsc_moralis_metadata?.logo || null;
        overview.price = price ?? 0;
        overview.priceFormatted = formatCurrency(price);
        
        // 在 // 3a. 标准化 tokenOverview 代码块内部，替换原来的 overview.priceChange24h 赋值逻辑
        const rawPriceChange = bsc_moralis_priceData?.['24hrPercentChange']; // 从价格数据获取原始值 (注意 key 可能带 %)
        let formattedPriceChange = 'N/A'; // 默认值

        // 检查原始值是否存在
        if (rawPriceChange !== null && rawPriceChange !== undefined) {
            // 尝试将原始值（可能是字符串）转换为数字
            const changeNumber = parseFloat(rawPriceChange);
            // 检查转换是否成功
            if (!isNaN(changeNumber)) {
                // Moralis API 已经返回百分比值，不需要再乘以100
                console.log(`[DEBUG priceChange24h] Raw: ${rawPriceChange}, Parsed: ${changeNumber}`);
                formattedPriceChange = changeNumber.toFixed(2) + '%';
            } else {
                // 如果无法解析为数字，记录警告
                console.warn(`[BscService] Could not parse priceChange24h from raw value: ${rawPriceChange}`);
                // formattedPriceChange 保持 'N/A'
            }
        }

        // 将格式化后的字符串赋值给 overview 对象
        overview.priceChange24h = formattedPriceChange;
        
        overview.liquidityFormatted = safeCurrencySuffix(bsc_moralis_priceData?.pairTotalLiquidityUsd);
        
        let marketCap = bsc_moralis_metadata?.market_cap;
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
            overview.marketCap = parseFloat(marketCap) ?? 0;
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

        // 3d. 生成 holderStats 数据
        standardizedData.holderStats = {
            totalHolders: bsc_moralis_holderStats?.totalHolders ?? null,
            holderChange: bsc_moralis_holderStats?.holderChange ?? { '5min':{change:null,changePercent:null},'1h':{change:null,changePercent:null},'6h':{change:null,changePercent:null},'24h':{change:null,changePercent:null},'3d':{change:null,changePercent:null},'7d':{change:null,changePercent:null},'30d':{change:null,changePercent:null} },
            holderSupply: bsc_moralis_holderStats?.holderSupply ?? { top10:{supplyPercent:null},top25:{supplyPercent:null},top50:{supplyPercent:null},top100:{supplyPercent:null} },
            holderDistribution: bsc_moralis_holderStats?.holderDistribution ?? { whales:0, dolphins:0, fish:0, shrimps:0, sharks: 0, octopus: 0, crabs: 0 },
            holdersByAcquisition: bsc_moralis_holderStats?.holdersByAcquisition ?? { swap:null, transfer:null, airdrop:null }
        };
        
        // 3e. 标准化 tokenAnalytics
        if (bsc_moralis_analytics) {
            standardizedData.tokenAnalytics = {
                totalBuyers: bsc_moralis_analytics.totalBuyers ?? {},
                totalSellers: bsc_moralis_analytics.totalSellers ?? {},
                totalBuys: bsc_moralis_analytics.totalBuys ?? {},
                totalSells: bsc_moralis_analytics.totalSells ?? {},
                totalBuyVolume: bsc_moralis_analytics.totalBuyVolume ?? {},
                totalSellVolume: bsc_moralis_analytics.totalSellVolume ?? {},
                totalLiquidityUsd: bsc_moralis_analytics.totalLiquidityUsd ?? null,
                totalFullyDilutedValuation: bsc_moralis_analytics.totalFullyDilutedValuation ?? null
            };
        } else {
            standardizedData.tokenAnalytics = {};
            console.warn("[BscService] bsc_moralis_analytics data was null, skipping standardization.");
        }

        // 3f. 标准化 metadata
        if (bsc_moralis_metadata) {
            standardizedData.metadata = {
                address: bsc_moralis_metadata.address || contractAddress,
                decimals: parseInt(bsc_moralis_metadata.decimals ?? '18', 10),
                name: bsc_moralis_metadata.name || 'N/A',
                symbol: bsc_moralis_metadata.symbol || 'N/A',
                totalSupply: bsc_moralis_metadata.total_supply ?? null,
                fully_diluted_valuation: bsc_moralis_metadata.fully_diluted_valuation ?? null,
                market_cap: bsc_moralis_metadata.market_cap ?? null,
                circulating_supply: bsc_moralis_metadata.circulating_supply ?? null,
                verified_contract: bsc_moralis_metadata.verified_contract ?? null,
                possible_spam: bsc_moralis_metadata.possible_spam ?? null,
                categories: bsc_moralis_metadata.categories ?? [],
                links: bsc_moralis_metadata.links ?? {},
                explorerUrl: bsc_moralis_metadata.address ? `https://bscscan.com/token/${bsc_moralis_metadata.address}` : null
            };
        } else {
            standardizedData.metadata = {};
            console.warn("[BscService] bsc_moralis_metadata data was null, skipping standardization.");
        }
        
        // Return the standardized data object
        console.log(`[BscService] Completed data processing for ${address}`);
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
