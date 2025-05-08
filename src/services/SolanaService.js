const axios = require('axios');
const {
    formatCurrency, safeCurrencySuffix, safeNumberSuffix, formatTokenAmount, formatPercentage, processCountValue
    // 确保导入所有需要的 formatters
} = require('../utils/formatters');

/**
 * 从Birdeye API获取Solana代币元数据
 * @param {string} address - Solana代币地址
 * @returns {Promise<Object>} - 代币元数据
 */
async function _fetchSolanaTokenMetadata(address) {
    try {
        const response = await axios.get('https://public-api.birdeye.so/defi/v3/token/meta-data/single', {
            params: {
                address: address
            },
            headers: {
                'Accept': 'application/json',
                'X-Chain': 'solana',
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000
        });
        
        console.log('--- RAW Birdeye Metadata Response Data (axios) ---:', JSON.stringify(response.data, null, 2));
        console.log(`[SolanaService] Metadata fetched successfully for ${address}`);
        
        return response.data?.data || {};
    } catch (error) {
        console.error(`[SolanaService] Error fetching Solana token metadata for ${address}:`, error.message);
        throw error;
    }
}

/**
 * 从Birdeye API获取Solana代币概览数据
 * @param {string} address - Solana代币地址
 * @returns {Promise<Object>} - 代币概览数据
 */
async function _fetchSolanaTokenOverview(address) {
    try {
        // 确保API密钥可用
        if (!process.env.BIRDEYE_API_KEY) {
            console.error('[SolanaService] BIRDEYE_API_KEY environment variable is not set');
            throw new Error('BIRDEYE_API_KEY is not set');
        }
        
        console.log(`[SolanaService] Using API key ending with: ${process.env.BIRDEYE_API_KEY.slice(-6)}`);
        
        const response = await axios.get('https://public-api.birdeye.so/defi/token_overview', {
            params: {
                address: address
            },
            headers: {
                'Accept': 'application/json',
                'X-Chain': 'solana',
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000
        });
        
        console.log('--- RAW Birdeye Overview Response Data (axios) ---:', JSON.stringify(response.data, null, 2));
        console.log(`[SolanaService] Token overview fetched successfully for ${address}`);
        
        return response.data?.data || {};
    } catch (error) {
        console.error(`[SolanaService] Error fetching Solana token overview for ${address}:`, error.message);
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
        const response = await axios.get('https://public-api.birdeye.so/defi/v3/token/market-data', {
            params: {
                address: address
            },
            headers: {
                'Accept': 'application/json',
                'X-Chain': 'solana',
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000
        });
        
        console.log('--- RAW Birdeye Market Response Data (axios) ---:', JSON.stringify(response.data, null, 2));
        console.log(`[SolanaService] Market data fetched successfully for ${address}`);
        
        return response.data?.data || {};
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
        const response = await axios.get('https://public-api.birdeye.so/defi/v3/token/holder', {
            params: {
                address: address,
                limit: limit,
                offset: offset
            },
            headers: {
                'Accept': 'application/json',
                'X-Chain': 'solana',
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000
        });
        
        console.log('--- RAW Birdeye Holders Response Data (axios) ---:', JSON.stringify(response.data, null, 2));
        console.log(`[SolanaService] Holders data fetched successfully for ${address}`);
        
        return response.data?.data?.items || [];
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
        const response = await axios.get('https://public-api.birdeye.so/defi/v2/tokens/top_traders', {
            params: {
                address: address,
                time_frame: '24h',
                limit: '10',
                offset: '0'
            },
            headers: {
                'Accept': 'application/json',
                'X-Chain': 'solana',
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000
        });
        
        console.log('--- RAW Solana Top Traders Response (axios) ---:', JSON.stringify(response.data, null, 2));
        console.log(`[SolanaService] Top traders data fetched successfully for ${address}`);
        
        return response.data?.data?.items || [];
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
        const response = await axios.get('https://public-api.birdeye.so/defi/v3/token/trade-data/single', {
            params: {
                address: address
            },
            headers: {
                'Accept': 'application/json',
                'X-Chain': 'solana',
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            },
            timeout: 30000
        });
        
        console.log('--- RAW Birdeye Trade Data Response (axios) ---:', JSON.stringify(response.data, null, 2));
        console.log(`[SolanaService] Trade data fetched successfully for ${address}`);
        
        return response.data?.data || {};
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
    let standardizedData = {};

    try {
        // 1. 声明用于存储各个 API 调用结果的变量，初始化为 null
        let solana_birdeye_metadata = null;
        let solana_birdeye_marketData = null;
        let solana_birdeye_holders = [];
        let solana_birdeye_topTraders = [];
        let solana_birdeye_tradeData = null;
        let solana_birdeye_overview = null;
        console.log('[SolanaService] Starting sequential data fetch...'); // 添加开始日志
        
        // 2. 按顺序依次调用各个 _fetch... 函数，每个都包裹在单独的 try...catch 块中
        
        // 获取代币元数据
        try {
            solana_birdeye_metadata = await _fetchSolanaTokenMetadata(contractAddress);
            console.log('[SolanaService] Metadata fetched successfully.');
        } catch (error) {
            console.error('[SolanaService] Sequential fetch for Metadata FAILED:', error.message);
            // 不重新抛出错误，让代码继续执行
        }
        
        // 获取市场数据
        try {
            solana_birdeye_marketData = await _fetchSolanaMarketData(contractAddress);
            console.log('[SolanaService] Market data fetched successfully.');
        } catch (error) {
            console.error('[SolanaService] Sequential fetch for Market data FAILED:', error.message);
        }
        
        // 获取持有者数据
        try {
            solana_birdeye_holders = await _fetchSolanaHolders(contractAddress, 100, 0);
            console.log('[SolanaService] Holders data fetched successfully.');
        } catch (error) {
            console.error('[SolanaService] Sequential fetch for Holders FAILED:', error.message);
            // 确保 holders 至少是空数组而不是 null
            solana_birdeye_holders = [];
        }
        
        // 获取顶级交易者数据
        try {
            solana_birdeye_topTraders = await _fetchSolanaTopTraders(contractAddress);
            console.log('[SolanaService] Top traders data fetched successfully.');
        } catch (error) {
            console.error('[SolanaService] Sequential fetch for Top traders FAILED:', error.message);
            // 确保 topTraders 至少是空数组而不是 null
            solana_birdeye_topTraders = [];
        }
        
        // 获取交易数据
        try {
            solana_birdeye_tradeData = await _fetchSolanaTradeData(contractAddress);
            console.log('[SolanaService] Trade data fetched successfully.');
        } catch (error) {
            console.error('[SolanaService] Sequential fetch for Trade data FAILED:', error.message);
        }
        
        // 获取代币概览数据
        try {
            solana_birdeye_overview = await _fetchSolanaTokenOverview(contractAddress);
            console.log('[SolanaService] Token overview fetched successfully.');
        } catch (error) {
            console.error('[SolanaService] Sequential fetch for Token overview FAILED:', error.message);
        }
        
        console.log("[SolanaService] Sequential data fetch completed.");

        // 3. 实现完整的 Solana 数据标准化 (使用我们之前写的逻辑)
        standardizedData = {};

        // 3a. 标准化 tokenOverview (V3 - Aligned with BSC, links moved to metadata)
        console.log("[SolanaService] Starting tokenOverview standardization...");
        
        // 修改: 检查源数据是否为空，如果为空则创建一个包含所有必要字段的默认值对象
        const overviewData = solana_birdeye_overview || {}; // 确保至少是空对象而不是null/undefined
        const metadata_raw = solana_birdeye_metadata || {}; // 确保至少是空对象而不是null/undefined
        const marketData = solana_birdeye_marketData || {}; // 确保至少是空对象而不是null/undefined
        
        // 检查数据有效性 - 如果两个数据源都为空或无效，则创建默认值对象并跳过复杂处理
        const isOverviewEmpty = !overviewData || Object.keys(overviewData).length === 0;
        const isMetadataEmpty = !metadata_raw || Object.keys(metadata_raw).length === 0;

        if (isOverviewEmpty && isMetadataEmpty) {
            console.error("[SolanaService] Cannot standardize tokenOverview: Both overviewData and metadata_raw are empty or null.");
            // 创建包含所有预期字段与默认值的完整结构体
            standardizedData.tokenOverview = {
                name: 'N/A',
                symbol: 'N/A',
                logoURI: null,
                decimals: 9, // Solana默认小数位数
                price: 0,
                priceFormatted: '$0.00',
                priceChange24h: 'N/A',
                liquidityFormatted: '$0',
                marketCap: 0,
                marketCapFormatted: '$0',
                fdvFormatted: '$0',
                circulatingSupply: 0,
                circulatingSupplyFormatted: '0',
                circulationRatio: null, // 添加流通比例字段，默认为null
                explorerUrl: null
            };
            console.log("[SolanaService] Created default tokenOverview structure with empty values.");
        } else {
            // 如果至少有一个数据源有效，则进行标准化处理
            const overview = {}; // 使用 any 或具体的 TokenOverview 类型

            // --- 基础信息 (优先 overview) ---
            overview.name = overviewData?.name ?? metadata_raw?.name ?? 'N/A';
            overview.symbol = overviewData?.symbol ?? metadata_raw?.symbol ?? 'N/A';
            overview.logoURI = overviewData?.logoURI ?? metadata_raw?.logo_uri ?? null;
            const decimals = parseInt(overviewData?.decimals?.toString() ?? metadata_raw?.decimals?.toString() ?? '9', 10); // 优先 overview, 默认 9
            overview.decimals = decimals; // 添加decimals到overview对象

            // --- 价格信息 (优先 overview) ---
            const price = overviewData?.price ?? 0; // overview 通常有最新价格
            overview.price = typeof price === 'number' && !isNaN(price) ? price : 0;
            overview.priceFormatted = formatCurrency(overview.price);

            // --- 价格变化 (格式化为 "X.XX%") ---
            const rawPriceChangeNum = overviewData?.priceChange24hPercent;
            let formattedPriceChange = 'N/A';
            if (typeof rawPriceChangeNum === 'number' && !isNaN(rawPriceChangeNum)) {
                formattedPriceChange = rawPriceChangeNum.toFixed(2) + '%';
            } else {
                // 只在确实有值但无法处理时警告，如果是 null 或 undefined 则不警告
                if (rawPriceChangeNum !== null && rawPriceChangeNum !== undefined) {
                   console.warn(`[SolanaService] Could not format priceChange24hPercent from overview: ${rawPriceChangeNum}`);
                }
            }
            overview.priceChange24h = formattedPriceChange;

            // --- 市场数据 (优先 overview) ---
            overview.liquidityFormatted = safeCurrencySuffix(overviewData?.liquidity);

            const rawMarketCap = overviewData?.marketCap;
            if (typeof rawMarketCap === 'number' && !isNaN(rawMarketCap)) {
                overview.marketCap = rawMarketCap;
                overview.marketCapFormatted = safeCurrencySuffix(rawMarketCap);
            } else if (typeof rawMarketCap === 'string' && rawMarketCap.trim() !== '' && !isNaN(parseFloat(rawMarketCap))) {
                 overview.marketCap = parseFloat(rawMarketCap);
                 overview.marketCapFormatted = safeCurrencySuffix(overview.marketCap);
            } else {
                // 不再警告，直接使用默认值
                overview.marketCap = 0;
                overview.marketCapFormatted = '$0';
            }

            overview.fdvFormatted = safeCurrencySuffix(overviewData?.fdv); // 完全稀释估值

            const rawCirculatingSupply = overviewData?.circulatingSupply;
             if (typeof rawCirculatingSupply === 'number' && !isNaN(rawCirculatingSupply)) {
                overview.circulatingSupply = rawCirculatingSupply;
                overview.circulatingSupplyFormatted = safeNumberSuffix(rawCirculatingSupply);
            } else if (typeof rawCirculatingSupply === 'string' && rawCirculatingSupply.trim() !== '' && !isNaN(parseFloat(rawCirculatingSupply))) {
                overview.circulatingSupply = parseFloat(rawCirculatingSupply);
                overview.circulatingSupplyFormatted = safeNumberSuffix(overview.circulatingSupply);
            } else {
                overview.circulatingSupply = 0;
                overview.circulatingSupplyFormatted = '0';
            }
            
            // 计算流通比例 (Circulation Ratio)
            let calculatedCirculationRatio = null; // 初始化为null
            
            // 尝试从marketData获取流通量和总供应量
            const numCirculatingSupply = parseFloat(marketData?.circulating_supply || '0');
            const numTotalSupply = parseFloat(marketData?.total_supply || '0');
            
            // 记录日志以便调试
            console.log(`[SolanaService] Calculating circulation ratio with: circulating_supply=${numCirculatingSupply}, total_supply=${numTotalSupply}`);
            
            if (!isNaN(numCirculatingSupply) && !isNaN(numTotalSupply) && numTotalSupply > 0) {
                calculatedCirculationRatio = Math.round((numCirculatingSupply / numTotalSupply) * 100);
                console.log(`[SolanaService] Calculated circulation ratio: ${calculatedCirculationRatio}%`);
            } else if (!isNaN(numCirculatingSupply) && numTotalSupply === 0 && numCirculatingSupply === 0) {
                // 特殊情况：如果流通量和总供应量均为0，暂定流通比例为0
                calculatedCirculationRatio = 0;
                console.log(`[SolanaService] Both circulating and total supply are 0, setting circulation ratio to 0%`);
            } else {
                console.log(`[SolanaService] Unable to calculate circulation ratio: invalid or missing supply data`);
            }
            
            // 添加流通比例到overview对象
            overview.circulationRatio = calculatedCirculationRatio;

            // --- Explorer URL (保留在 overview 下) ---
            const explorerBase = 'https://solscan.io/token/';
            // 优先使用 overview 或 metadata 中的 address，最后回退到函数入参 address
            const tokenAddrForExplorer = overviewData?.address ?? metadata_raw?.address ?? contractAddress;
            overview.explorerUrl = tokenAddrForExplorer ? `${explorerBase}${tokenAddrForExplorer}` : null;

            // --- Links 对象移至 metadata 标准化部分 ---

            // --- 赋值 ---
            standardizedData.tokenOverview = overview;
        }
        
        console.log("[SolanaService] Finished tokenOverview standardization.");
        // --- tokenOverview 标准化逻辑结束 (3a) ---

        // 3c. 标准化 topTraders (Logic copied from BscService.js as Birdeye source is the same)
        console.log("[SolanaService] Starting topTraders standardization..."); // 添加日志
        // 确保输入是数组，如果不是则默认为空数组
        const tradersInput = Array.isArray(solana_birdeye_topTraders) ? solana_birdeye_topTraders : [];
        if (!Array.isArray(solana_birdeye_topTraders)) {
             console.warn("[SolanaService] Raw topTraders data is not an array:", solana_birdeye_topTraders);
        }

        standardizedData.topTraders = tradersInput.map((trader) => {
            // 确保 safeCurrencySuffix 函数可用 (从 formatters 导入)
            const buyVolumeFormatted = typeof safeCurrencySuffix === 'function' ? safeCurrencySuffix(trader.volumeBuy) : trader.volumeBuy ?? null;
            const sellVolumeFormatted = typeof safeCurrencySuffix === 'function' ? safeCurrencySuffix(trader.volumeSell) : trader.volumeSell ?? null;
            const totalVolumeFormatted = typeof safeCurrencySuffix === 'function' ? safeCurrencySuffix(trader.volume) : trader.volume ?? null;

            // 对 trader 对象进行基本验证
            if (!trader || typeof trader !== 'object') {
                console.warn("[SolanaService] Invalid trader object found in topTraders array:", trader);
                return null; // 跳过无效条目或返回默认结构
            }

            return {
                // 使用 'owner' 字段作为地址
                address: trader.owner || 'N/A',
                // 添加 API 返回的 tags
                tags: trader.tags || [],
                // 组织 buy 相关数据
                buy: {
                    count: trader.tradeBuy ?? null, // 使用 'tradeBuy' 作为次数
                    amount: null, // API 未提供此数据
                    amountUSDFormatted: buyVolumeFormatted, // 使用 'volumeBuy' 格式化为 USD
                    price: null // API 未提供此数据
                },
                // 组织 sell 相关数据
                sell: {
                    count: trader.tradeSell ?? null, // 使用 'tradeSell' 作为次数
                    amount: null,
                    amountUSDFormatted: sellVolumeFormatted, // 使用 'volumeSell' 格式化为 USD
                    price: null
                },
                // 组织 total 相关数据
                total: {
                    // 优先使用 'trade' 字段，否则计算买卖总和
                    count: trader.trade ?? ((trader.tradeBuy ?? 0) + (trader.tradeSell ?? 0)),
                    amount: null,
                    amountUSDFormatted: totalVolumeFormatted // 使用 'volume' 格式化为 USD
                }
            };
        }).filter(trader => trader !== null); // 过滤掉 map 过程中可能产生的 null 值

        console.log("[SolanaService] Finished topTraders standardization. Count:", standardizedData.topTraders.length); // 添加日志
        // --- topTraders 标准化逻辑结束 (3c) ---

        // 3d. 生成 holderStats 数据 (V4 - Using Birdeye Overview Timeframes, Percent Change Only)
        console.log("[SolanaService] Starting holderStats standardization (Birdeye timeframes, % change only)...");
        
        // 使用前面已定义的变量，确保它是对象而非null
        // const overviewDataForStats = solana_birdeye_overview; // 旧版本代码

        // 创建默认的holderStats结构，包含所有必要字段的空值
        const holderStats = { // 使用 any 或具体的 HolderStats 类型
            totalHolders: null,
            holderChange: { // 新的时间维度结构
                '30m': { change: null, changePercent: null },
                '1h':  { change: null, changePercent: null },
                '2h':  { change: null, changePercent: null },
                '4h':  { change: null, changePercent: null },
                '8h':  { change: null, changePercent: null },
                '24h': { change: null, changePercent: null }
                // 不再包含 5min, 6h, 7d, 3d, 30d
            },
            // 其他部分保持为空或默认，因为 overview 不提供这些数据
            holderSupply: {},
            holderDistribution: {},
            holdersByAcquisition: {}
        };

        // 只有当overviewData有效时才尝试填充数据
        if (!isOverviewEmpty) {
            // 填充 totalHolders
            if (typeof overviewData.holder === 'number' && !isNaN(overviewData.holder)) {
                holderStats.totalHolders = overviewData.holder;
            } else if (overviewData.holder !== null && overviewData.holder !== undefined) {
                 console.warn(`[SolanaService] Invalid value for totalHolders from overview: ${overviewData.holder}`);
            }

            // 定义 Birdeye overview 中的 key 和我们新结构中的 key 的映射关系
            const timeMap = [
                { key: '30m', overviewKey: 'uniqueWallet30mChangePercent'},
                { key: '1h',  overviewKey: 'uniqueWallet1hChangePercent'},
                { key: '2h',  overviewKey: 'uniqueWallet2hChangePercent'},
                { key: '4h',  overviewKey: 'uniqueWallet4hChangePercent'},
                { key: '8h',  overviewKey: 'uniqueWallet8hChangePercent'},
                { key: '24h', overviewKey: 'uniqueWallet24hChangePercent'}
            ];

            // 遍历映射关系，填充 changePercent
            timeMap.forEach(map => {
                const percentVal = overviewData[map.overviewKey];
                // 确保我们的结构中有这个时间段的 key
                if (holderStats.holderChange.hasOwnProperty(map.key)) {
                    // 检查值是否有效数字
                    if (percentVal !== null && percentVal !== undefined && !isNaN(parseFloat(String(percentVal)))) {
                        holderStats.holderChange[map.key].changePercent = parseFloat(String(percentVal));
                    } else {
                        // 如果值无效或不存在，保留为 null
                        holderStats.holderChange[map.key].changePercent = null;
                        // 仅当值存在但无效时打印警告
                        if (percentVal !== null && percentVal !== undefined) {
                             console.warn(`[SolanaService] Invalid value for ${map.overviewKey}: ${percentVal}`);
                }
            }
                    // 绝对变化值 'change' 保持为 null
                    holderStats.holderChange[map.key].change = null;
                }
            });
        } else {
            console.warn("[SolanaService] overviewData is empty or null, using default empty holderStats structure.");
        }

        standardizedData.holderStats = holderStats;
        console.log("[SolanaService] Finished holderStats standardization (using overview data, Birdeye timeframes, % change only).");
        // --- holderStats 标准化逻辑结束 (3d) ---

        // 3e. 标准化 tokenAnalytics (using data from solana_birdeye_overview)
        console.log("[SolanaService] Starting tokenAnalytics standardization...");
        
        // 创建带有默认空值的完整tokenAnalytics结构，包含所有9类指标和6个时间段
        const tokenAnalytics = {
            // 1.价格变化百分比
            priceChangePercent: { 
                '30m': null, 
                '1h': null, 
                '2h': null, 
                '4h': null, 
                '8h': null, 
                '24h': null 
            },
            // 2.独立钱包数量
            uniqueWallets: { 
                '30m': null, 
                '1h': null, 
                '2h': null, 
                '4h': null, 
                '8h': null, 
                '24h': null 
            },
            // 3.独立钱包数量变化百分比
            uniqueWalletsChangePercent: { 
                '30m': null, 
                '1h': null, 
                '2h': null, 
                '4h': null, 
                '8h': null, 
                '24h': null 
            },
            // 4.买入次数
            buyCounts: { 
                '30m': null, 
                '1h': null, 
                '2h': null, 
                '4h': null, 
                '8h': null, 
                '24h': null 
            },
            // 5.卖出次数
            sellCounts: { 
                '30m': null, 
                '1h': null, 
                '2h': null, 
                '4h': null, 
                '8h': null, 
                '24h': null 
            },
            // 6.总交易次数变化百分比
            tradeCountChangePercent: { 
                '30m': null, 
                '1h': null, 
                '2h': null, 
                '4h': null, 
                '8h': null, 
                '24h': null 
            },
            // 7.买入量(USD)
            buyVolumeUSD: { 
                '30m': null, 
                '1h': null, 
                '2h': null, 
                '4h': null, 
                '8h': null, 
                '24h': null 
            },
            // 8.卖出量(USD)
            sellVolumeUSD: { 
                '30m': null, 
                '1h': null, 
                '2h': null, 
                '4h': null, 
                '8h': null, 
                '24h': null 
            },
            // 9.总交易量变化百分比
            volumeChangePercent: { 
                '30m': null, 
                '1h': null, 
                '2h': null, 
                '4h': null, 
                '8h': null, 
                '24h': null 
            }
        };

        // 只有当overviewData有效时才尝试填充数据
        if (!isOverviewEmpty) {
            const timeframes = ['30m', '1h', '2h', '4h', '8h', '24h']; // 定义所有需要的时间段

            timeframes.forEach(tf => {
                // Helper to safely get numeric value or null
                const getNum = (key) => {
                    const val = overviewData[key];
                    if (typeof val === 'number' && !isNaN(val)) return val;
                    if (typeof val === 'string' && val.trim() !== '' && !isNaN(parseFloat(val))) return parseFloat(val);
                    // Log only if value exists but is invalid, ignore null/undefined
                    if (val !== null && val !== undefined) {
                         console.warn(`[SolanaService] Invalid numeric value for ${key}: ${val}`);
                    }
                    return null;
                };

                // 1. 价格变化百分比 - 使用formatPercentage格式化
                tokenAnalytics.priceChangePercent[tf] = formatPercentage(getNum(`priceChange${tf}Percent`), 2);
                
                // 2. 独立钱包数量 - 使用processCountValue格式化，确保<1000的值为整数
                tokenAnalytics.uniqueWallets[tf] = processCountValue(getNum(`uniqueWallet${tf}`));
                
                // 3. 独立钱包数量变化百分比 - 使用formatPercentage格式化
                tokenAnalytics.uniqueWalletsChangePercent[tf] = formatPercentage(getNum(`uniqueWallet${tf}ChangePercent`), 2);
                
                // 4. 买入次数 - 使用processCountValue格式化，确保<1000的值为整数
                tokenAnalytics.buyCounts[tf] = processCountValue(getNum(`buy${tf}`));
                
                // 5. 卖出次数 - 使用processCountValue格式化，确保<1000的值为整数
                tokenAnalytics.sellCounts[tf] = processCountValue(getNum(`sell${tf}`));
                
                // 6. 总交易次数变化百分比 - 使用formatPercentage格式化
                tokenAnalytics.tradeCountChangePercent[tf] = formatPercentage(getNum(`trade${tf}ChangePercent`), 2);
                
                // 7. 买入量(USD) - 使用safeCurrencySuffix格式化
                tokenAnalytics.buyVolumeUSD[tf] = safeCurrencySuffix(getNum(`vBuy${tf}USD`), 1);
                
                // 8. 卖出量(USD) - 使用safeCurrencySuffix格式化
                tokenAnalytics.sellVolumeUSD[tf] = safeCurrencySuffix(getNum(`vSell${tf}USD`), 1);
                
                // 9. 总交易量变化百分比 - 使用formatPercentage格式化
                tokenAnalytics.volumeChangePercent[tf] = formatPercentage(getNum(`v${tf}ChangePercent`), 2);
            });
        } else {
            console.warn("[SolanaService] overviewData is empty or null, using default empty tokenAnalytics structure.");
        }

        standardizedData.tokenAnalytics = tokenAnalytics;
        console.log("[SolanaService] Finished tokenAnalytics standardization.");
        // --- tokenAnalytics 标准化逻辑结束 (3e) ---

        // 3f. 标准化 metadata (V3 - Aligned with BSC, includes links object)
        console.log("[SolanaService] Starting metadata standardization...");
        
        // 重用前面定义的变量，不再重新声明
        // isOverviewEmpty和isMetadataEmpty在tokenOverview标准化中已经声明过
        
        if (isOverviewEmpty && isMetadataEmpty) {
            console.error("[SolanaService] Cannot standardize metadata: Both overviewData and metadata_raw are empty or null.");
            // 创建包含所有预期字段与默认值的完整结构体
            standardizedData.metadata = {
                address: contractAddress, // 使用函数入参作为地址
                decimals: 9, // Solana默认小数位数
                name: 'N/A',
                symbol: 'N/A',
                fully_diluted_valuation: null,
                market_cap: null,
                circulating_supply: null,
                verified_contract: null,
                possible_spam: null,
                categories: [],
                links: {
                    twitter: null,
                    telegram: null
                },
                explorerUrl: contractAddress ? `https://solscan.io/token/${contractAddress}` : null
            };
            console.log("[SolanaService] Created default metadata structure with empty values.");
        } else {
            // 如果至少有一个数据源有效，则进行标准化处理
        const metadata_std = {}; // 使用 any 或具体 Metadata 类型
            
            // 移除对tokenOverview的依赖，直接从原始数据获取所需信息
            metadata_std.address = overviewData?.address ?? metadata_raw?.address ?? contractAddress;
            metadata_std.decimals = parseInt(overviewData?.decimals?.toString() ?? metadata_raw?.decimals?.toString() ?? '9', 10);
            metadata_std.name = overviewData?.name ?? metadata_raw?.name ?? 'N/A';
            metadata_std.symbol = overviewData?.symbol ?? metadata_raw?.symbol ?? 'N/A';
            
            metadata_std.fully_diluted_valuation = overviewData?.fdv?.toString() ?? null; // 来自 overview data
            metadata_std.market_cap = overviewData?.marketCap?.toString() ?? null; // 来自 overview data
            metadata_std.circulating_supply = overviewData?.circulatingSupply?.toString() ?? null; // 来自 overview data

            // Solana/Birdeye 可能不直接提供的字段，设为 null 或默认值，保持结构一致
            metadata_std.verified_contract = null;
            metadata_std.possible_spam = null;
            metadata_std.categories = []; // 默认为空数组

            // --- Links 对象 (放在 metadata 下，只含 twitter/telegram) ---
            metadata_std.links = {
                // 优先从 overview 的 extensions 获取 twitter，其次 metadata
                twitter: overviewData?.extensions?.twitter ?? metadata_raw?.extensions?.twitter ?? null,
                // telegram 尝试从两边获取，但 Birdeye 可能都为 null
                telegram: overviewData?.extensions?.telegram ?? metadata_raw?.extensions?.telegram ?? null
            };

            // Explorer URL - 直接构建而不依赖overview_std
            const explorerBase = 'https://solscan.io/token/';
            const tokenAddrForExplorer = overviewData?.address ?? metadata_raw?.address ?? contractAddress;
            metadata_std.explorerUrl = tokenAddrForExplorer ? `${explorerBase}${tokenAddrForExplorer}` : null;

        // --- 赋值 ---
        standardizedData.metadata = metadata_std;
        }
        
        console.log("[SolanaService] Finished metadata standardization.");
        // --- metadata 标准化逻辑结束 (3f) ---

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