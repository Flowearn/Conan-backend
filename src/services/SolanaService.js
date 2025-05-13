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
        
        // 新增日志：打印原始Birdeye Token Overview响应
        console.log("========== RAW Birdeye Token Overview/Price Response for " + address + " START ==========");
        console.log(JSON.stringify(response?.data, null, 2));
        console.log("========== RAW Birdeye Token Overview/Price Response for " + address + " END ==========");
        
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
        
        // 新增日志：打印原始Birdeye Market Data响应
        console.log("========== RAW Birdeye Market Data Response for " + address + " START ==========");
        console.log(JSON.stringify(response?.data, null, 2));
        console.log("========== RAW Birdeye Market Data Response for " + address + " END ==========");
        
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
        
        // 新增日志：打印原始Birdeye Top Traders响应
        console.log("========== RAW Birdeye Top Traders Response for " + address + " START ==========");
        console.log(JSON.stringify(response?.data, null, 2));
        console.log("========== RAW Birdeye Top Traders Response for " + address + " END ==========");
        
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
            
            if (!isNaN(numCirculatingSupply) && !isNaN(numTotalSupply) && numTotalSupply > 0) {
                calculatedCirculationRatio = Math.round((numCirculatingSupply / numTotalSupply) * 100);
            } else if (!isNaN(numCirculatingSupply) && numTotalSupply === 0 && numCirculatingSupply === 0) {
                // 特殊情况：如果流通量和总供应量均为0，暂定流通比例为0
                calculatedCirculationRatio = 0;
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

        // 3c. 标准化 topTraders (Logic copied from BscService.js as Birdeye source is the same)
        if (!Array.isArray(solana_birdeye_topTraders)) {
             console.warn("[SolanaService] Raw topTraders data is not an array:", solana_birdeye_topTraders);
            standardizedData.topTraders = []; // 确保至少是空数组
        } else {
            // 实际数据处理逻辑
            const standardizedTopTraders = [];
            
            for (const trader of solana_birdeye_topTraders) {
                // 确保 trader 是有效对象 (健壮性检查)
            if (!trader || typeof trader !== 'object') {
                console.warn("[SolanaService] Invalid trader object found in topTraders array:", trader);
                    continue; // 跳过无效数据
                }
                
                // 打印当前处理的trader对象，用于调试
                console.log('[SolanaService] Processing trader:', JSON.stringify(trader, null, 2));
                
                // 尝试创建标准化对象
                try {
                    // 使用Birdeye API实际返回的字段名，处理扁平结构
                    const standardizedTrader = {
                        // 使用'owner'字段作为地址 (Birdeye API命名)
                        address: trader.owner || trader.address || 'N/A',
                        
                        // 总计数据
                        total: {
                            // 总数量字段在API中不存在，设为null
                            amount: null,
                            // 总交易量USD
                            amountUSD: parseFloat(trader.volume) || 0,
                            // 格式化USD金额
                            amountUSDFormatted: safeCurrencySuffix(trader.volume) || '$0',
                            // 总交易次数
                            count: parseInt(trader.trade) || 0
                        },
                        
                        // 买入数据
                buy: {
                            // 买入数量字段在API中不存在，设为null
                            amount: null,
                            // 买入交易量USD
                            amountUSD: parseFloat(trader.volumeBuy) || 0,
                            // 格式化买入USD金额
                            amountUSDFormatted: safeCurrencySuffix(trader.volumeBuy) || '$0',
                            // 买入次数
                            count: parseInt(trader.tradeBuy) || 0
                        },
                        
                        // 卖出数据
                sell: {
                            // 卖出数量字段在API中不存在，设为null
                    amount: null,
                            // 卖出交易量USD
                            amountUSD: parseFloat(trader.volumeSell) || 0,
                            // 格式化卖出USD金额
                            amountUSDFormatted: safeCurrencySuffix(trader.volumeSell) || '$0',
                            // 卖出次数
                            count: parseInt(trader.tradeSell) || 0
                        },
                        
                        // 标签
                        tags: Array.isArray(trader.tags) ? trader.tags : []
                    };
                    
                    standardizedTopTraders.push(standardizedTrader);
                } catch (e) {
                    console.error(`Error standardizing trader data: ${e.message}`);
                    // 跳过出错的条目但继续处理其他条目
                }
            }
            
            standardizedData.topTraders = standardizedTopTraders;
        }

        // 3d. 标准化 holderStats (轻量级版本 - 只有 % 变化, 时间跨度: 4h, 30m, etc.)
        if (isOverviewEmpty) {
            console.warn("[SolanaService] overviewData is empty or null, using default empty holderStats structure.");
            // 创建默认空的 holderStats 结构
            standardizedData.holderStats = {
                totalHolders: 0,
                holderChange: {},
                holderSupply: {},
                holderDistribution: {},
                holdersByAcquisition: {}
            };
        } else {
            const holderStats = {
                totalHolders: 0,
                holderChange: {},
            holderSupply: {},
            holderDistribution: {},
            holdersByAcquisition: {}
        };

            // 从 overview 中提取总持有者数量
            if (typeof overviewData.holder === 'number' && !isNaN(overviewData.holder)) {
                holderStats.totalHolders = overviewData.holder;
            } else if (typeof overviewData.holder === 'string' && !isNaN(parseInt(overviewData.holder, 10))) {
                holderStats.totalHolders = parseInt(overviewData.holder, 10);
            } else {
                 console.warn(`[SolanaService] Invalid value for totalHolders from overview: ${overviewData.holder}`);
                holderStats.totalHolders = 0;
            }
            
            // 在处理前先打印完整的overviewData供调试
            console.log("[SolanaService] Raw overviewData for holderStats:", JSON.stringify(overviewData, null, 2));
            
            // 标准化 Birdeye 时间维度: 30m, 1h, 2h, 4h, 24h 的持有者变化百分比
            // 检查 Birdeye API 实际返回的字段，根据实际字段调整映射
            // 尝试常见的不同命名方式
            const possibleHolderChangeKeys = [
                { finalKey: '30m', patterns: ['holderPctChange30m', 'holderChange30mPercent', 'holder30mChangePercent', 'holderChangePercent30m'] },
                { finalKey: '1h', patterns: ['holderPctChange1h', 'holderChange1hPercent', 'holder1hChangePercent', 'holderChangePercent1h'] },
                { finalKey: '2h', patterns: ['holderPctChange2h', 'holderChange2hPercent', 'holder2hChangePercent', 'holderChangePercent2h'] },
                { finalKey: '4h', patterns: ['holderPctChange4h', 'holderChange4hPercent', 'holder4hChangePercent', 'holderChangePercent4h'] },
                { finalKey: '24h', patterns: ['holderPctChange24h', 'holderChange24hPercent', 'holder24hChangePercent', 'holderChangePercent24h'] }
            ];
            
            // 处理每个时间范围
            possibleHolderChangeKeys.forEach(keyMapping => {
                // 初始化该时间段的对象
                holderStats.holderChange[keyMapping.finalKey] = {
                    count: null,           // Solana Birdeye 不提供该数据，置空
                    countFormatted: 'N/A', // Solana Birdeye 不提供该数据，置空
                    changePercent: null    // 将尝试从下面的任一字段中获取
                };
                
                // 尝试所有可能的字段名
                let found = false;
                for (const pattern of keyMapping.patterns) {
                    const percentVal = overviewData[pattern];
                    
                    // 如果找到有效值，则处理并停止查找
                    if (percentVal !== undefined) {
                        found = true;
                        
                        // 尝试转换为数字并赋值给 changePercent
                        if (typeof percentVal === 'number' && !isNaN(percentVal)) {
                            holderStats.holderChange[keyMapping.finalKey].changePercent = percentVal;
                        } else if (typeof percentVal === 'string' && !isNaN(parseFloat(percentVal))) {
                            holderStats.holderChange[keyMapping.finalKey].changePercent = parseFloat(percentVal);
                        } else if (percentVal !== null && percentVal !== undefined && percentVal !== '') {
                            console.warn(`[SolanaService] Invalid value for ${pattern}: ${percentVal}`);
                        }
                        
                        // 找到有效字段后不再查找其他可能的字段名
                        break;
                    }
                }
            });
            
            // 打印最终处理结果
            console.log("[SolanaService] Final holderStats:", JSON.stringify(holderStats, null, 2));
            
            standardizedData.holderStats = holderStats;
        }

        // 3e. 标准化 tokenAnalytics 数据 (统一时间维度: 1m, 30m, 2h, 6h, 12h, 24h)
        if (isOverviewEmpty) {
            console.warn("[SolanaService] overviewData is empty or null, using default empty tokenAnalytics structure.");
            // 创建默认空的 tokenAnalytics 结构
            standardizedData.tokenAnalytics = {
                priceChangePercent: {},
                uniqueWallets: {},
                uniqueWalletsChangePercent: {},
                buyCounts: {},
                sellCounts: {},
                tradeCountChangePercent: {},
                volumeChangePercent: {},
                totalBuys: { '24h': null },
                totalSells: { '24h': null },
                totalBuyers: { '24h': null },
                totalSellers: { '24h': null },
                buyVolumeUSD: {},
                sellVolumeUSD: {}
            };
        } else {
            const tokenAnalytics = {
                priceChangePercent: {},
                uniqueWallets: {},
                uniqueWalletsChangePercent: {},
                buyCounts: {},
                sellCounts: {},
                tradeCountChangePercent: {},
                volumeChangePercent: {},
                totalBuys: { '24h': null },
                totalSells: { '24h': null },
                totalBuyers: { '24h': null },
                totalSellers: { '24h': null },
                buyVolumeUSD: {},
                sellVolumeUSD: {}
            };
            
            // 在处理前先打印完整的overviewData供调试
            console.log("[SolanaService] Raw overviewData for tokenAnalytics:", JSON.stringify(overviewData, null, 2));
            
            // 更新为新的标准时间维度: 1m, 30m, 2h, 6h, 12h, 24h
            // 保留原始时间维度数组，用于字段映射定义
            const timeFrames = ['1m', '30m', '2h', '6h', '12h', '24h']; 
            
            // 新增：扩展时间维度数组，包括备选维度
            const allTimeFrames = ['1m', '30m', '2h', '4h', '6h', '8h', '12h', '24h'];
            
            // 新增：固定和动态维度的定义
            const fixedTimeFrames = ['1m', '30m', '2h', '24h'];
            const dynamicTimeFrames = [
                { primary: '6h', fallback: '4h' },
                { primary: '12h', fallback: '8h' }
            ];
            
            // 打印原始数据中包含这些时间维度的所有键
            for (const timeFrame of allTimeFrames) {
                const keysWithTimeFrame = Object.keys(overviewData).filter(key => 
                    key.toLowerCase().includes(timeFrame.toLowerCase())
                );
                if (keysWithTimeFrame.length > 0) {
                    console.log(`[SolanaService] Keys containing ${timeFrame} in overviewData:`, keysWithTimeFrame);
                }
            }
            
            // 导入所需的格式化函数
            const { formatPercentageForAI, safeNumberSuffix, safeCurrencySuffix } = require('../utils/formatters');
            
            // 定义辅助函数来处理百分比值 - 修改为返回格式化字符串
            const processPercentageValue = (val, suffix, fieldName) => {
                console.log(`[SolanaService] Processing ${fieldName}.${suffix}: ${val}, type: ${typeof val}`);
                
                // 如果值为null、undefined或空字符串，则返回"N/A"
                if (val === null || val === undefined || val === '') {
                    console.log(`[SolanaService] ${fieldName}.${suffix} is null/undefined/empty`);
                    return 'N/A';
                }
                
                // 如果已经是格式化的百分比字符串，验证后直接返回
                if (typeof val === 'string' && val.endsWith('%')) {
                    // 验证是否为有效数字+%的格式
                    const numPart = val.replace('%', '');
                    const isValidNum = !isNaN(parseFloat(numPart));
                    if (isValidNum) {
                        console.log(`[SolanaService] ${fieldName}.${suffix} already formatted: ${val}`);
                        return val;
                    }
                }
                
                // 数值型和字符串型处理
                let numericValue;
                if (typeof val === 'string') {
                    // 移除千分位分隔符和百分号
                    const cleanStr = val.replace(/[,%]/g, '');
                    numericValue = parseFloat(cleanStr);
                } else {
                    numericValue = val;
                }
                
                // 检查是否为有效数字
                if (typeof numericValue !== 'number' || isNaN(numericValue)) {
                    console.log(`[SolanaService] ${fieldName}.${suffix} invalid after parsing: ${val} → ${numericValue}`);
                    return 'N/A';
                }
                
                console.log(`[SolanaService] ${fieldName}.${suffix} formatting: ${val} → ${numericValue.toFixed(2)}%`);
                
                // 使用formatPercentageForAI将数值格式化为百分比字符串
                return formatPercentageForAI(numericValue, 2);
            };

            // 定义辅助函数来处理整数计数 - 修改为返回格式化字符串
            const processCountValue = (val, suffix, fieldName) => {
                console.log(`[SolanaService] Processing ${fieldName}.${suffix}: ${val}, type: ${typeof val}`);
                
                if (val === null || val === undefined || val === '') {
                    return 'N/A'; // 直接返回"N/A"字符串
                }
                
                // 处理数值型
                if (typeof val === 'number' && !isNaN(val)) {
                    const absValue = Math.max(0, val);
                    if (absValue === 0) {
                        return '0'; // 零值返回"0"字符串
                    }
                    return safeNumberSuffix(absValue); // 使用safeNumberSuffix格式化
                }
                
                // 处理字符串型
                if (typeof val === 'string') {
                    // 检查是否已经是带K/M/B/T的格式化字符串
                    if (/^[0-9,.]+[KMBTkmbt]$/.test(val.trim())) {
                        return val; // 已经是格式化字符串则直接返回
                    }
                    
                    // 尝试解析为数字
                    const cleanVal = val.replace(/[^0-9.-]/g, '');
                    if (cleanVal !== '') {
                        const parsedValue = parseFloat(cleanVal);
                        if (!isNaN(parsedValue)) {
                            const absValue = Math.max(0, parsedValue);
                            if (absValue === 0) {
                                return '0'; // 零值返回"0"字符串
                            }
                            return safeNumberSuffix(absValue); // 使用safeNumberSuffix格式化
                        }
                    }
                }
                
                return 'N/A'; // 默认返回"N/A"
            };

            // 定义辅助函数来处理USD金额 - 修改为返回格式化字符串
            const processUsdValue = (val, suffix, fieldName) => {
                console.log(`[SolanaService] Processing ${fieldName}.${suffix}: ${val}, type: ${typeof val}`);
                
                if (val === null || val === undefined || val === '') {
                    return 'N/A'; // 直接返回"N/A"字符串
                }
                
                // 纯数字字符串转换为数字
                let numValue = val;
                if (typeof val === 'string') {
                    // 检查是否已经是格式化的USD字符串
                    if (/^\$[0-9,.]+[KMBTkmbt]?$/.test(val.trim())) {
                        return val; // 已经是格式化字符串则直接返回
                    }
                    
                    const parsedValue = parseFloat(val);
                    if (isNaN(parsedValue)) {
                        return 'N/A';
                    }
                    numValue = parsedValue;
                }
                
                // 确保金额为非负数
                if (typeof numValue === 'number' && !isNaN(numValue)) {
                    const absValue = Math.max(0, numValue);
                    if (absValue === 0) {
                        return '$0'; // 零值返回"$0"字符串
                    }
                    return safeCurrencySuffix(absValue); // 使用safeCurrencySuffix格式化
                }
                
                return 'N/A'; // 默认返回"N/A"
            };

            // 修正字段映射，使用正确的Birdeye字段名格式
            // 注意：suffixes仍然保留原始的6个时间维度，但处理循环中会考虑备用维度
            const fieldMappings = [
                // 价格变化百分比 - Birdeye实际字段: priceChange1mPercent, priceChange30mPercent等
                {
                    target: 'priceChangePercent',
                    getKey: (suffix) => `priceChange${suffix}Percent`,
                    suffixes: timeFrames,
                    processor: (val, suffix) => processPercentageValue(val, suffix, 'priceChangePercent')
                },
                // 独立钱包数量 - Birdeye实际字段: uniqueWallet1m, uniqueWallet30m等
                {
                    target: 'uniqueWallets',
                    getKey: (suffix) => `uniqueWallet${suffix}`,
                    suffixes: timeFrames,
                    processor: (val, suffix) => processCountValue(val, suffix, 'uniqueWallets')
                },
                // 独立钱包数量变化百分比 - Birdeye实际字段: uniqueWallet1mChangePercent, uniqueWallet30mChangePercent等
                {
                    target: 'uniqueWalletsChangePercent',
                    getKey: (suffix) => `uniqueWallet${suffix}ChangePercent`,
                    suffixes: timeFrames,
                    processor: (val, suffix) => processPercentageValue(val, suffix, 'uniqueWalletsChangePercent')
                },
                // 买入次数 - Birdeye实际字段: buy1m, buy30m等
                {
                    target: 'buyCounts',
                    getKey: (suffix) => `buy${suffix}`,
                    suffixes: timeFrames,
                    processor: (val, suffix) => processCountValue(val, suffix, 'buyCounts')
                },
                // 卖出次数 - Birdeye实际字段: sell1m, sell30m等
                {
                    target: 'sellCounts',
                    getKey: (suffix) => `sell${suffix}`,
                    suffixes: timeFrames,
                    processor: (val, suffix) => processCountValue(val, suffix, 'sellCounts')
                },
                // 总买入量 (USD) - Birdeye实际字段: vBuy1mUSD, vBuy30mUSD等
                {
                    target: 'buyVolumeUSD',
                    getKey: (suffix) => `vBuy${suffix}USD`,
                    suffixes: timeFrames,
                    processor: (val, suffix) => processUsdValue(val, suffix, 'buyVolumeUSD')
                },
                // 总卖出量 (USD) - Birdeye实际字段: vSell1mUSD, vSell30mUSD等
                {
                    target: 'sellVolumeUSD',
                    getKey: (suffix) => `vSell${suffix}USD`,
                    suffixes: timeFrames,
                    processor: (val, suffix) => processUsdValue(val, suffix, 'sellVolumeUSD')
                },
                // 交易数量变化百分比 - Birdeye实际字段: trade1mChangePercent, trade30mChangePercent等
                {
                    target: 'tradeCountChangePercent',
                    getKey: (suffix) => `trade${suffix}ChangePercent`,
                    suffixes: timeFrames,
                    processor: (val, suffix) => processPercentageValue(val, suffix, 'tradeCountChangePercent')
                },
                // 交易量变化百分比 - Birdeye实际字段: v1mChangePercent, v30mChangePercent等
                {
                    target: 'volumeChangePercent',
                    getKey: (suffix) => `v${suffix}ChangePercent`,
                    suffixes: timeFrames,
                    processor: (val, suffix) => processPercentageValue(val, suffix, 'volumeChangePercent')
                }
            ];
            
            // 处理每个映射 - 使用新的动态时间维度逻辑
            for (const mapping of fieldMappings) {
                // 确保目标字段在tokenAnalytics中初始化
                if (!tokenAnalytics[mapping.target]) {
                    console.warn(`[SolanaService] Target field "${mapping.target}" missing in tokenAnalytics object`);
                    tokenAnalytics[mapping.target] = {};
                }
                
                // 处理固定时间维度 (1m, 30m, 2h, 24h)
                for (const suffix of fixedTimeFrames) {
                    const exact_key = mapping.getKey(suffix);
                    console.log(`[SolanaService] [${mapping.target}] Looking for fixed dimension ${suffix} data with key '${exact_key}'`);
                    const fieldExists = exact_key in overviewData;
                    let processedVal = null;
                    if (fieldExists) {
                        const val = overviewData[exact_key];
                        console.log(`[SolanaService] [${mapping.target}] Found value for '${exact_key}': ${val}, type: ${typeof val}`);
                        try {
                            processedVal = mapping.processor(val, suffix);
                            console.log(`[SolanaService] [${mapping.target}] Processed ${suffix} result: ${processedVal}`);
                        } catch (e) {
                            console.warn(`[SolanaService] Error processing ${mapping.target}.${suffix} with key ${exact_key}: ${e.message}, value: ${val}`);
                            processedVal = null;
                        }
                    } else {
                        console.log(`[SolanaService] [${mapping.target}] Field '${exact_key}' does not exist in overviewData`);
                    }
                    // 新结构：始终写入对象
                    tokenAnalytics[mapping.target][suffix] = { value: processedVal, actualTimeframe: suffix };
                }
                
                // 处理动态时间维度
                for (const dynamicDimension of dynamicTimeFrames) {
                    const { primary, fallback } = dynamicDimension;
                    const primary_key = mapping.getKey(primary);
                    
                    // 添加专门的日志，用于所有字段类型的详细调试
                    console.log(`[SolanaService] [${mapping.target}] ======== DIMENSION DEBUG: ${primary} ========`);
                    console.log(`[SolanaService] [${mapping.target}] Constructed primary key: '${primary_key}'`);
                    console.log(`[SolanaService] [${mapping.target}] Checking if '${primary_key}' exists in overviewData: ${primary_key in overviewData}`);
                    
                    // 记录原始数据源中当前字段的所有可用时间维度
                    const availableTimeframeSuffixes = Object.keys(overviewData)
                        .filter(key => key.startsWith(mapping.getKey('').replace(/[0-9]+[a-zA-Z]+$/, '')))
                        .map(key => {
                            // 提取时间维度后缀 (如从 "priceChange6hPercent" 提取 "6h")
                            const match = key.match(/([0-9]+[a-zA-Z]+)/);
                            return match ? match[1] : null;
                        })
                        .filter(Boolean);
                    
                    console.log(`[SolanaService] [${mapping.target}] Available timeframes in data: ${availableTimeframeSuffixes.join(', ') || 'NONE'}`);
                    
                    if (primary_key in overviewData) {
                        console.log(`[SolanaService] [${mapping.target}] Value for '${primary_key}' in overviewData: ${overviewData[primary_key]}`);
                    }
                    
                    // 重置默认值
                    let finalValue = null;
                    let usedDimension = primary; // 默认使用primary
                    
                    // 尝试使用primary数据
                    if (primary_key in overviewData) {
                        try {
                            const primaryVal = overviewData[primary_key];
                            console.log(`[SolanaService] [${mapping.target}] Found primary value for '${primary_key}': ${primaryVal}, type: ${typeof primaryVal}`);
                            finalValue = mapping.processor(primaryVal, primary);
                            // 规则A: 如果使用了primary_key值，usedDimension必须为primary
                            usedDimension = primary;
                            console.log(`[SolanaService] [${mapping.target}] Processed primary value '${primaryVal}' with result: ${finalValue}`);
                        } catch (e) {
                            console.warn(`[SolanaService] Error processing primary dimension ${mapping.target}.${primary} with key ${primary_key}: ${e.message}`);
                            finalValue = null;
                            // 由于处理失败，保持usedDimension为primary但尝试fallback
                        }
                    }
                    
                    // 如果primary数据不存在或处理失败，尝试使用fallback数据
                    if (finalValue === null || finalValue === 'N/A') {
                        console.log(`[SolanaService] [${mapping.target}] Primary data unavailable or processing failed, trying fallback`);
                        const fallback_key = mapping.getKey(fallback);
                        
                        console.log(`[SolanaService] [${mapping.target}] Constructed fallback key: '${fallback_key}'`);
                        console.log(`[SolanaService] [${mapping.target}] Checking if '${fallback_key}' exists in overviewData: ${fallback_key in overviewData}`);
                        
                        if (fallback_key in overviewData) {
                            console.log(`[SolanaService] [${mapping.target}] Value for '${fallback_key}' in overviewData: ${overviewData[fallback_key]}`);
                        
                            try {
                                const fallbackVal = overviewData[fallback_key];
                                console.log(`[SolanaService] [${mapping.target}] Found fallback value for '${fallback_key}': ${fallbackVal}, type: ${typeof fallbackVal}`);
                                const processedFallbackValue = mapping.processor(fallbackVal, fallback);
                                
                                // 规则B: 只有当fallback处理成功并得到有效值时，才改变finalValue和usedDimension
                                if (processedFallbackValue !== null && processedFallbackValue !== 'N/A') {
                                    finalValue = processedFallbackValue;
                                    usedDimension = fallback; // 使用fallback数据时，actualTimeframe为fallback
                                    console.log(`[SolanaService] [${mapping.target}] Successfully processed fallback value: ${fallbackVal} → ${finalValue}`);
                                } else {
                                    console.log(`[SolanaService] [${mapping.target}] Fallback processing failed or returned 'N/A'`);
                                    // 规则C: 如果fallback也失败，保持usedDimension为primary
                                }
                            } catch (e) {
                                console.warn(`[SolanaService] Error processing fallback dimension ${mapping.target}.${fallback} with key ${fallback_key}: ${e.message}`);
                                // 规则C: 处理异常时，保持usedDimension为primary
                                // finalValue和usedDimension保持不变
                            }
                        } else {
                            console.log(`[SolanaService] [${mapping.target}] Fallback field '${fallback_key}' also does not exist in overviewData`);
                            // 规则C: 当fallback数据也不存在时，保持usedDimension为primary
                            // finalValue和usedDimension保持不变
                        }
                    } else {
                        // 规则A: 如果成功使用了primary_key的数据，确保usedDimension为primary
                        // 这里再次确认usedDimension为primary，以防在上述代码路径中有任何未预期的修改
                        usedDimension = primary;
                        console.log(`[SolanaService] [${mapping.target}] Successfully used primary data, ensuring actualTimeframe=${primary}`);
                    }
                    
                    // 新结构：始终写入对象，actualTimeframe为实际用到的维度
                    tokenAnalytics[mapping.target][primary] = { value: finalValue, actualTimeframe: usedDimension };
                    
                    console.log(`[SolanaService] [${mapping.target}] Final result for ${primary}: value=${finalValue}, actualTimeframe=${usedDimension}`);
                    console.log(`[SolanaService] [${mapping.target}] ======== END DIMENSION DEBUG ========`);
                    
                    if (usedDimension === fallback) {
                        console.log(`[SolanaService] [${mapping.target}] Using ${fallback} data for ${primary} due to missing primary data`);
                    } else if (usedDimension === primary) {
                        console.log(`[SolanaService] [${mapping.target}] Using ${primary} data as expected`);
                    } else {
                        console.log(`[SolanaService] [${mapping.target}] No data available for ${primary} or ${fallback}`);
                    }
                }
            }
            
            // 额外处理24小时总体指标 (面向前端 dashboard 展示)
            console.log(`[SolanaService] 24h metrics raw values: \n                buy24h: ${overviewData.buy24h} (${typeof overviewData.buy24h}), \n                sell24h: ${overviewData.sell24h} (${typeof overviewData.sell24h})\n            `);
            
            // 使用精确的Birdeye字段名，确保一律使用processCountValue处理
            if (overviewData.buy24h !== undefined) {
                // 明确记录处理前后值
                const rawBuy24h = overviewData.buy24h;
                const processedBuy24h = processCountValue(rawBuy24h, '24h', 'totalBuys');
                console.log(`[SolanaService] Processed buy24h: ${rawBuy24h} (${typeof rawBuy24h}) → ${processedBuy24h}`);
                tokenAnalytics.totalBuys = { '24h': processedBuy24h };
            } else {
                console.log(`[SolanaService] buy24h field missing in overviewData`);
                tokenAnalytics.totalBuys = { '24h': 'N/A' };
            }
            
            if (overviewData.sell24h !== undefined) {
                // 明确记录处理前后值
                const rawSell24h = overviewData.sell24h;
                const processedSell24h = processCountValue(rawSell24h, '24h', 'totalSells');
                console.log(`[SolanaService] Processed sell24h: ${rawSell24h} (${typeof rawSell24h}) → ${processedSell24h}`);
                tokenAnalytics.totalSells = { '24h': processedSell24h };
            } else {
                console.log(`[SolanaService] sell24h field missing in overviewData`);
                tokenAnalytics.totalSells = { '24h': 'N/A' };
            }
            
            // 处理买家卖家数据字段
            if (overviewData.uniqueBuyer24h !== undefined) {
                // 明确记录处理前后值
                const rawUniqueBuyer24h = overviewData.uniqueBuyer24h;
                const processedUniqueBuyer24h = processCountValue(rawUniqueBuyer24h, '24h', 'totalBuyers');
                console.log(`[SolanaService] Processed uniqueBuyer24h: ${rawUniqueBuyer24h} (${typeof rawUniqueBuyer24h}) → ${processedUniqueBuyer24h}`);
                tokenAnalytics.totalBuyers = { '24h': processedUniqueBuyer24h };
            } else {
                console.log(`[SolanaService] uniqueBuyer24h field missing in overviewData`);
                tokenAnalytics.totalBuyers = { '24h': 'N/A' };
            }
            
            if (overviewData.uniqueSeller24h !== undefined) {
                // 明确记录处理前后值
                const rawUniqueSeller24h = overviewData.uniqueSeller24h;
                const processedUniqueSeller24h = processCountValue(rawUniqueSeller24h, '24h', 'totalSellers');
                console.log(`[SolanaService] Processed uniqueSeller24h: ${rawUniqueSeller24h} (${typeof rawUniqueSeller24h}) → ${processedUniqueSeller24h}`);
                tokenAnalytics.totalSellers = { '24h': processedUniqueSeller24h };
            } else {
                console.log(`[SolanaService] uniqueSeller24h field missing in overviewData`);
                tokenAnalytics.totalSellers = { '24h': 'N/A' };
            }
            
            // 新结构日志输出
            console.log("[SolanaService] Final tokenAnalytics:", JSON.stringify(tokenAnalytics, null, 2));
            standardizedData.tokenAnalytics = tokenAnalytics;
        }

        // 3f. 标准化 metadata 数据
        if (isOverviewEmpty && isMetadataEmpty) {
            console.error("[SolanaService] Cannot standardize metadata: Both overviewData and metadata_raw are empty or null.");
            // 创建默认空的 metadata 结构
            standardizedData.metadata = {
                verified_contract: false,
                security_score: null,
                possible_spam: false,
                social_links: {}
            };
        } else {
            // 使用 TypeScript 的注释可选，但有助于理解数据结构
            // interface StandardizedMetadata {
            //   verified_contract: boolean;
            //   security_score: number | null;
            //   possible_spam: boolean;
            //   social_links: { [key: string]: string };
            // }
            const metadata = {
                verified_contract: false,
                security_score: null,
                possible_spam: false,
                social_links: {}
            };
            
            console.log("[SolanaService] Created default metadata structure with empty values.");
            
            // 提取安全信息 (目前 Solana Birdeye 提供的数据有限)
            // 安全评分 - 直接使用 Birdeye metadata_raw 中的 security_score 字段
            if (metadata_raw && typeof metadata_raw.security_score === 'number' && !isNaN(metadata_raw.security_score)) {
                metadata.security_score = metadata_raw.security_score;
            }
            
            // 可能是垃圾币 - 目前没有直接来源，可添加规则后进行设置
            // 例如可以使用安全评分低于30的作为垃圾币标识
            if (metadata.security_score !== null && metadata.security_score < 30) {
                metadata.possible_spam = true;
            }
            
            // 合约已验证 - Solana无需直接映射该字段，设为 true 即可
            metadata.verified_contract = metadata_raw?.verified || false; // 如果Birdeye提供了验证状态，则使用它
            
            // 社交链接
            // 收集可能存在的社交媒体链接 (从 metadata_raw 中)
            if (metadata_raw) {
                // 处理网站
                if (metadata_raw.website && typeof metadata_raw.website === 'string') {
                    metadata.social_links.website = metadata_raw.website;
                }
                
                // 处理Twitter
                if (metadata_raw.twitter && typeof metadata_raw.twitter === 'string') {
                    metadata.social_links.twitter = metadata_raw.twitter;
                }
                
                // 处理Telegram
                if (metadata_raw.telegram && typeof metadata_raw.telegram === 'string') {
                    metadata.social_links.telegram = metadata_raw.telegram;
                }
                
                // 处理Discord
                if (metadata_raw.discord && typeof metadata_raw.discord === 'string') {
                    metadata.social_links.discord = metadata_raw.discord;
                }
            }
            
            standardizedData.metadata = metadata;
        }

        // 设置链标识
        standardizedData.chain = 'solana';
        
        // 新增日志：打印组合后的standardizedData结构
        console.log("========== SolanaService standardizedData (tokenDataBundle) ==========");
        console.log(JSON.stringify(standardizedData, null, 2));

        console.log("[SolanaService] Completed Solana data bundle standardization.");

        return standardizedData;
    } catch (error) {
        console.error(`[SolanaService] Error in getSolanaTokenDataBundle for ${address}:`, error);
        throw error;
    }
}

// 导出主函数
module.exports = {
    getSolanaTokenDataBundle
}; 