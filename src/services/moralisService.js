const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const NodeCache = require('node-cache');

// Initialize cache with a standard TTL (e.g., 5 minutes = 300 seconds)
const moralisCache = new NodeCache({ stdTTL: 300 });

// Correct API Base URL using v2.2 as confirmed by user
const moralisBaseUrl = 'https://deep-index.moralis.io/api/v2.2';
const moralisApiKey = process.env.MORALIS_API_KEY;

if (!moralisApiKey) {
  console.error('MORALIS_API_KEY is not set in environment variables');
  process.exit(1);
}

// 添加全局超时配置，确保API调用不会永久挂起
const API_TIMEOUT = 15000; // 15秒
const CACHE_DEFAULT_TTL = 300; // 5分钟

// 添加指数退避重试函数
async function retryWithExponentialBackoff(fn, maxRetries = 2, initialDelay = 500) {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries || 
          (error.response && (error.response.status === 400 || error.response.status === 401))) {
        // 对于400错误（客户端错误）和401错误（认证错误）不进行重试
        throw error;
      }
      
      // 计算退避时间 (500ms, 1000ms, ...)
      const delay = initialDelay * Math.pow(2, retries);
      console.log(`[重试] 等待${delay}ms后重试请求，尝试次数: ${retries + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
}

/**
 * 获取代币完整数据信息
 * @param {string} contractAddress - 代币合约地址
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function getMoralisTokenData(contractAddress) {
  console.log(`\n=== Getting Moralis token data for contract: ${contractAddress} ===`);
  console.log('Using Moralis API Key (last 5 chars):', moralisApiKey ? '...' + moralisApiKey.slice(-5) : 'Not Found');
  
  // 尝试从缓存中获取数据
  const cacheKey = `moralis:tokenData:${contractAddress}`;
  const cachedData = moralisCache.get(cacheKey);
  if (cachedData) {
    console.log(`[缓存] 使用缓存的Moralis代币数据: ${cacheKey}`);
    console.log('[缓存] 检查缓存的价格:', cachedData.data?.usdPrice);
    console.log('[缓存] 检查缓存的流动性:', cachedData.data?.pairTotalLiquidityUsd);
    return cachedData;
  }
  
  if (!moralisApiKey) {
    const errorMsg = 'Moralis API Key not found in environment variables.';
    console.error(errorMsg);
    return { 
      success: false, 
      error: errorMsg,
      data: {
        usdPrice: 0,
        priceChange24h: 0,
        decimals: 18,
        tokenSymbol: 'ERROR',
        tokenName: '无效API密钥',
        pairAddress: null,
        pairTotalLiquidityUsd: 0
      }
    };
  }

  try {
    // 规范化和验证地址
    if (!contractAddress || typeof contractAddress !== 'string' || contractAddress.length < 10) {
      console.error(`[错误] 无效的合约地址: ${contractAddress}`);
      return { 
        success: false, 
        error: '无效的合约地址',
        // 返回最小数据集，即使错误也能让前端显示
        data: {
          usdPrice: 0,
          priceChange24h: 0,
          decimals: 18,
          tokenSymbol: 'ERROR',
          tokenName: '无效地址',
          pairAddress: null,
          pairTotalLiquidityUsd: 0
        }
      };
    }
    
    // Normalize contract address
    const normalizedAddress = contractAddress.toLowerCase().trim();
    console.log(`[请求] 使用规范化的合约地址: ${normalizedAddress}`);
    
    // Attempt to get token price
    console.log(`[请求] 发起Moralis token price API调用...`);
    console.log(`[URL] ${moralisBaseUrl}/erc20/${normalizedAddress}/price`);
    console.log(`[参数] chain=bsc (BSC主网)`);
    
    // Set timeout and headers
    const requestConfig = {
      headers: {
        'X-API-Key': moralisApiKey,
        'Accept': 'application/json'
      },
      params: {
        chain: 'bsc' // 也可以尝试 '0x38' 或 'binance-smart-chain'
      },
      timeout: API_TIMEOUT // 使用全局超时配置
    };
    
    console.log(`[请求配置] ${JSON.stringify(requestConfig, null, 2).replace(moralisApiKey, '***API_KEY***')}`);
    
    const startTime = Date.now();
    console.log(`[计时] API请求开始时间: ${new Date(startTime).toISOString()}`);
    
    const response = await axios.get(`${moralisBaseUrl}/erc20/${normalizedAddress}/price`, requestConfig);
    
    const endTime = Date.now();
    console.log(`[计时] API请求结束时间: ${new Date(endTime).toISOString()}`);
    console.log(`[计时] 请求耗时: ${endTime - startTime}ms`);

    console.log(`[响应] Moralis API状态码: ${response.status}`);
    
    // 显式检查response对象是否存在以及是否是对象
    if (!response || typeof response !== 'object') {
      console.error('[错误] Moralis API返回空响应或非对象响应');
      return { 
        success: false, 
        error: 'Moralis API返回无效响应',
        data: {
          usdPrice: 0,
          priceChange24h: 0,
          decimals: 18,
          tokenSymbol: '错误',
          tokenName: 'API错误',
          pairAddress: null,
          pairTotalLiquidityUsd: 0
        }
      };
    }
    
    // 检查响应是否成功
    if (response.status !== 200) {
      console.error(`[错误] Moralis API返回非成功状态码: ${response.status}`);
      return { 
        success: false, 
        error: `API返回状态码: ${response.status}`,
        data: {
          usdPrice: 0,
          priceChange24h: 0,
          decimals: 18,
          tokenSymbol: '错误',
          tokenName: `API错误: ${response.status}`,
          pairAddress: null,
          pairTotalLiquidityUsd: 0
        }
      };
    }
    
    // 现在记录完整的响应数据
    console.log(`[响应] 完整Moralis API响应:`, JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
    if (response.status === 200 && response.data) {
      console.log('[响应] Moralis价格数据字段:', Object.keys(response.data));
      
      // 更详细的价格数据检查
      if (response.data.usdPrice !== undefined) {
        console.log('[数据] USD价格:', response.data.usdPrice);
        
        // Validate price is a number
        const price = parseFloat(response.data.usdPrice);
        if (isNaN(price)) {
          console.warn(`[警告] 价格解析为NaN: "${response.data.usdPrice}"`);
        } else if (price === 0) {
          console.warn(`[警告] 价格为零`);
        } else {
          console.log(`[数据] 有效的价格数据: ${price}`);
        }
      } else {
        console.warn('[警告] Moralis响应中不包含usdPrice字段');
      }

      // 更详细的流动性检查
      if (response.data.pairReserveUSD !== undefined) {
        console.log('[数据] 流动性数据原始值:', response.data.pairReserveUSD);
        
        const liquidity = parseFloat(response.data.pairReserveUSD);
        if (isNaN(liquidity)) {
          console.warn(`[警告] 流动性解析为NaN: "${response.data.pairReserveUSD}"`);
        } else if (liquidity === 0) {
          console.warn(`[警告] 流动性为零`);
        } else {
          console.log(`[数据] 有效的流动性数据: ${liquidity}`);
        }
      } else {
        console.warn('[警告] Moralis响应中不包含pairReserveUSD字段');
      }
      
      // 其他数据日志
      console.log('[数据] 从响应中获取的交易对地址:', response.data.pairAddress || '未提供');
      console.log('[数据] 代币名称:', response.data.tokenName || '未提供');
      console.log('[数据] 代币符号:', response.data.tokenSymbol || '未提供');
      console.log('[数据] 24小时价格变化百分比:', response.data.usdPrice24hrPercentChange || '未提供');
      
      // Validate decimals
      let tokenDecimals = response.data.tokenDecimals || 18;
      if (typeof tokenDecimals === 'string') {
        tokenDecimals = parseInt(tokenDecimals, 10);
        if (isNaN(tokenDecimals)) {
          console.warn(`[警告] 代币小数位解析为NaN，使用默认值18`);
          tokenDecimals = 18;
        }
      }
      
      // Prepare result object with validation and safe handling
      const result = {
        success: true,
        data: {
          usdPrice: typeof response.data.usdPrice === 'number' ? response.data.usdPrice : 
                   (typeof response.data.usdPrice === 'string' ? parseFloat(response.data.usdPrice) : 0),
          priceChange24h: typeof response.data.usdPrice24hrPercentChange === 'number' ? response.data.usdPrice24hrPercentChange : 
                                    (typeof response.data.usdPrice24hrPercentChange === 'string' ? parseFloat(response.data.usdPrice24hrPercentChange) : 0),
          decimals: tokenDecimals,
          tokenSymbol: response.data.tokenSymbol || 'UNKNOWN',
          tokenName: response.data.tokenName || 'Unknown Token',
          tokenLogo: response.data.tokenLogo || null,
          pairAddress: response.data.pairAddress || null,
          pairTotalLiquidityUsd: typeof response.data.pairReserveUSD === 'number' ? response.data.pairReserveUSD : 
                                (typeof response.data.pairReserveUSD === 'string' ? parseFloat(response.data.pairReserveUSD) : 0)
        }
      };
      
      // 添加详细的日志确认处理后的数据
      console.log('[结果] 处理后的Moralis价格数据:');
      console.log('  - usdPrice:', result.data.usdPrice);
      console.log('  - priceChange24h:', result.data.priceChange24h);
      console.log('  - decimals:', result.data.decimals);
      console.log('  - tokenSymbol:', result.data.tokenSymbol);
      console.log('  - tokenName:', result.data.tokenName);
      console.log('  - pairAddress:', result.data.pairAddress);
      console.log('  - pairTotalLiquidityUsd:', result.data.pairTotalLiquidityUsd);
      
      // Cache the result
      moralisCache.set(cacheKey, result);
      console.log(`[缓存] 缓存Moralis代币数据: ${cacheKey}`);
      
      return result;
    } else {
      console.error('[错误] 意外的Moralis价格API响应:', response.status, typeof response.data);
      
      // 提供默认数据以便前端显示
      return {
        success: false,
        error: '从Moralis获取的响应无效或为空',
        details: JSON.stringify(response.data || {}).substring(0, 200),
        data: {
          usdPrice: 0,
          priceChange24h: 0,
          decimals: 18,
          tokenSymbol: 'ERROR',
          tokenName: '数据错误',
          pairAddress: null,
          pairTotalLiquidityUsd: 0
        }
      };
    }
  } catch (error) {
    console.error('=== ERROR CONNECTING TO MORALIS API ===');
    console.error('[错误类型]:', error.name);
    console.error('[错误消息]:', error.message);
    
    let errorDetails = '未知错误';
    
    // 提供详细的错误信息
    if (error.response) {
      // 服务器响应了请求，但状态码不是2xx
      console.error(`[API错误] 状态码: ${error.response.status}`);
      console.error('[API响应]:', JSON.stringify(error.response.data).substring(0, 200));
      
      errorDetails = `API错误 ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      
      // 对于401错误特殊处理
      if (error.response.status === 401) {
        errorDetails = 'API Key 认证失败，请检查Moralis API密钥是否有效';
        console.error('[认证错误] API密钥可能无效或过期，需要更新密钥');
      }
      // 对于429错误特殊处理
      else if (error.response.status === 429) {
        errorDetails = 'API调用次数超限，请稍后重试';
        console.error('[速率限制] 已超过Moralis API的调用限制，需要等待或升级计划');
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error('[网络错误] 请求已发出但未收到响应');
      errorDetails = '网络连接超时或无法连接Moralis服务器';
    }
    
    // 提供默认数据以便前端显示
    return {
      success: false,
      error: errorDetails,
      data: {
        usdPrice: 0,
        priceChange24h: 0,
        decimals: 18,
        tokenSymbol: 'ERROR',
        tokenName: error.response?.status === 401 ? 'API密钥错误' : '连接错误',
        pairAddress: null,
        pairTotalLiquidityUsd: 0
      }
    };
  }
}

/**
 * 获取交易对OHLCV数据（K线数据）
 * 注意：此功能已被移除，不再支持显示价格图表
 * @param {string} pairAddress - 交易对合约地址
 * @param {string} timeframe - 时间框架，如"1d"、"4h"、"1h"、"10min"
 * @param {number} limit - 返回的数据点数量
 * @returns {Promise<{success: boolean, ohlcvData?: Array, error?: string}>}
 */
async function getMoralisPairOhlcv(pairAddress, timeframe = '1d', limit = 40) {
  // 此功能已被移除，返回一个错误提示
  console.log(`OHLCV chart functionality has been removed`);
  return {
    success: false,
    error: "Price chart functionality has been removed from the application"
  };
  
  /* 原代码已注释掉
  try {
    if (!pairAddress) {
      throw new Error('Pair address is required');
    }

    // 计算日期范围：当前日期到41天前
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 41); // 往前推41天

    // 格式化日期为ISO字符串
    const fromDateStr = fromDate.toISOString();
    const toDateStr = toDate.toISOString();

    console.log(`Date range for OHLCV: from ${fromDateStr} to ${toDateStr}`);

    const url = `${moralisBaseUrl}/pairs/${pairAddress}/ohlcv`;
    console.log(`Fetching pair OHLCV data from Moralis for timeframe ${timeframe}:`, url);
    console.log(`Full parameters: chain=bsc, timeframe=${timeframe}, limit=${limit}, fromDate=${fromDateStr}, toDate=${toDateStr}`);

    const response = await axios.get(url, {
      params: {
        chain: 'bsc',
        timeframe: timeframe,
        limit: limit,
        fromDate: fromDateStr,
        toDate: toDateStr
      },
      headers: {
        'Accept': 'application/json',
        'X-API-Key': moralisApiKey
      }
    });

    // 记录原始响应以便调试
    console.log(`Raw Moralis OHLCV response for ${timeframe}:`, JSON.stringify(response.data));

    // 检查响应格式
    let ohlcvData;
    if (Array.isArray(response.data)) {
      // 直接是数组格式
      ohlcvData = response.data;
    } else if (response.data && Array.isArray(response.data.result)) {
      // 包含在result字段中
      ohlcvData = response.data.result;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      // 包含在data字段中
      ohlcvData = response.data.data;
    } else {
      console.error(`Unexpected OHLCV response structure for ${timeframe}:`, response.data);
      throw new Error(`Invalid response format from Moralis API for OHLCV data: ${JSON.stringify(response.data)}`);
    }

    console.log(`Moralis OHLCV data for timeframe ${timeframe} received:`, ohlcvData.length, 'data points');
    
    return {
      success: true,
      ohlcvData: ohlcvData
    };
  } catch (error) {
    console.error(`Moralis OHLCV error (${timeframe}):`, error.response?.data || error.message);
    if (error.response?.status) {
      console.error(`Status code: ${error.response.status}`);
    }
    if (error.response?.headers) {
      console.error(`Response headers:`, error.response.headers);
    }
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
  */
}

/**
 * 获取代币持有者列表
 * @param {string} contractAddress - 代币合约地址
 * @param {number} limit - 获取的持有者数量上限，默认100
 * @returns {Promise<{success: boolean, owners?: Array, error?: string}>}
 */
async function getMoralisTokenOwners(contractAddress, limit = 100) {
  try {
    if (!contractAddress) {
      console.error('[错误] 获取持有者失败：合约地址为空');
      return { success: false, error: '合约地址为空', owners: [] };
    }

    // 检查是否有缓存
    const cacheKey = `moralis:owners:${contractAddress}:${limit}`;
    const cachedData = moralisCache.get(cacheKey);
    if (cachedData) {
      console.log(`[缓存] 使用缓存的代币持有者数据: ${cacheKey}`);
      return cachedData;
    }

    // 规范化合约地址
    const normalizedAddress = contractAddress.toLowerCase().trim();
    
    // 使用token持有者的专用端点
    const url = `${moralisBaseUrl}/erc20/${normalizedAddress}/owners`;
    console.log(`\n=== Getting token owners for contract: ${normalizedAddress} ===`);
    console.log('[请求] 从Moralis获取代币持有者 (已更正API端点):', url);
    console.log('[请求] 使用Moralis API密钥 (最后5个字符):', moralisApiKey ? '...' + moralisApiKey.slice(-5) : '未找到');

    // 准备请求参数，确保limit是合理的数字
    const safeLimit = typeof limit === 'number' && !isNaN(limit) && limit > 0 ? limit : 100;
    const params = {
      chain: 'bsc',
      limit: safeLimit
    };
    console.log('[请求] 参数:', params);

    // 计时开始
    const startTime = Date.now();
    console.log(`[计时] 请求开始时间: ${new Date().toISOString()}`);
    
    // 设置超时和重试
    const config = {
      params: params,
      headers: {
        'Accept': 'application/json',
        'X-API-Key': moralisApiKey
      },
      timeout: API_TIMEOUT // 使用全局超时配置
    };
    
    const response = await axios.get(url, config);
    
    // 计时结束
    const endTime = Date.now();
    console.log(`[计时] 请求结束时间: ${new Date().toISOString()}`);
    console.log(`[计时] 请求耗时: ${endTime - startTime}ms`);

    console.log(`[响应] Moralis代币持有者API状态码: ${response.status}`);
    console.log('[响应] 数据类型:', typeof response.data);
    
    // 验证响应
    if (!response || !response.data) {
      console.error('[错误] Moralis API返回空响应');
      const errorResult = { success: false, error: 'API返回空响应', owners: [] };
      moralisCache.set(cacheKey, errorResult, 60); // 短期缓存错误结果
      return errorResult;
    }
    
    if (typeof response.data === 'object') {
      console.log('[响应] 响应数据键:', Object.keys(response.data));
      if (response.data.result) {
        console.log('[响应] 在result字段中找到数据，长度:', Array.isArray(response.data.result) ? response.data.result.length : '不是数组');
      }
    }
    
    // 获取result数组
    let owners = [];
    if (response.data && Array.isArray(response.data.result)) {
      owners = response.data.result;
      console.log(`[数据] 从Moralis API成功获取 ${owners.length} 个持有者`);
      
      // 验证持有者列表
      if (owners.length === 0) {
        console.warn('[警告] Moralis返回空持有者数组。这对活跃代币来说不太正常。');
      } else if (owners.length < 10) {
        console.warn(`[警告] Moralis仅返回 ${owners.length} 个持有者，少于预期。`);
      }
      
      // 记录样本数据
      if (owners.length > 0) {
        console.log('[数据] 第一个持有者样本:', JSON.stringify(owners[0], null, 2));
      }
      
      // 检查返回数据结构，适配不同版本的API返回格式
      // 新版API返回 address 和 balance
      // 老版API返回 owner_address 和 balance 
      const hasNewFormat = owners[0] && owners[0].address !== undefined;
      const hasOldFormat = owners[0] && owners[0].owner_address !== undefined;
      
      console.log(`[数据] API格式检测: 新格式(address): ${hasNewFormat}, 老格式(owner_address): ${hasOldFormat}`);
      
      if (!hasNewFormat && !hasOldFormat) {
        console.error('[错误] 无法识别的API响应格式，无法提取地址');
        console.error('[样本]', JSON.stringify(owners[0] || {}, null, 2));
        const errorResult = { success: false, error: '无法识别的API响应格式', owners: [] };
        moralisCache.set(cacheKey, errorResult, 60);
        return errorResult;
      }
      
      // 转换为我们应用期望的格式 - 统一使用TokenHolderAddress和TokenHolderQuantity
      const formattedOwners = owners.map(owner => {
        // 根据API返回格式选择正确的字段名
        const address = hasNewFormat ? owner.address : (hasOldFormat ? owner.owner_address : null);
        const balance = owner.balance || '0';
        
        // 验证地址格式
        if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
          console.warn(`[警告] 发现无效地址: ${address}，将被跳过`);
          return null;
        }
        
        return {
          TokenHolderAddress: address,
          TokenHolderQuantity: balance,
          // 这些字段将在后端index.js中进一步处理和格式化
          // 但这里预先初始化以确保它们存在
          TokenHolderQuantityFormatted: null,
          TokenHolderUsdValueFormatted: null
        };
      }).filter(owner => owner !== null); // 过滤掉无效条目
      
      console.log(`[处理] 已格式化 ${formattedOwners.length} 个持有者，统一字段名称`);
      
      // 最终验证
      if (formattedOwners.length === 0 && owners.length > 0) {
        console.error('[错误] 所有持有者数据格式无效，无法处理');
        const errorResult = { success: false, error: '持有者数据格式无效', owners: [] };
        moralisCache.set(cacheKey, errorResult, 60);
        return errorResult;
      }
      
      if (formattedOwners.length > 0) {
        console.log('[数据] 第一个格式化后的持有者:', JSON.stringify(formattedOwners[0], null, 2));
        
        // 缓存成功结果
        const successResult = { success: true, owners: formattedOwners };
        moralisCache.set(cacheKey, successResult, CACHE_DEFAULT_TTL); // 使用全局超时配置
        return successResult;
      } else {
        // 空数组但成功的情况
        const emptyResult = { success: true, owners: [] };
        moralisCache.set(cacheKey, emptyResult, CACHE_DEFAULT_TTL);
        return emptyResult;
      }
    } else {
      console.error('[错误] 响应中未找到有效的result数组:', JSON.stringify(response.data).substring(0, 200));
      const errorResult = { success: false, error: '响应格式无效: 缺少result数组', owners: [] };
      moralisCache.set(cacheKey, errorResult, 60);
      return errorResult;
    }
  } catch (error) {
    console.error('[错误] 获取代币持有者失败:', error.message);
    
    // 增强错误日志
    if (error.response) {
      console.error(`[API错误] (${error.response.status}):`, error.response.data);
      
      // 检查特定错误码
      if (error.response.status === 400) {
        console.error('[错误原因] 可能是无效的合约地址或错误的链参数。');
      } else if (error.response.status === 429) {
        console.error('[错误原因] 超出速率限制。考虑升级您的Moralis计划或添加速率限制。');
      } else if (error.response.status === 401) {
        console.error('[错误原因] 认证错误，API密钥可能无效。');
      }
    } else if (error.request) {
      console.error('[错误原因] 未收到API响应:', error.request);
    }
    
    // 记录完整错误堆栈
    if (error.stack) {
      console.error('[错误堆栈]', error.stack);
    }
    
    // 创建详细的错误响应
    const errorResponse = { 
      success: false, 
      error: error.message,
      status: error.response?.status,
      type: error.code || error.name,
      owners: [] // 确保即使错误也返回空数组而不是undefined
    };
    
    // 短期缓存错误
    moralisCache.set(`moralis:owners:${contractAddress}:${limit}`, errorResponse, 60);
    
    return errorResponse;
  }
}

/**
 * 获取代币持有者统计信息
 * @param {string} contractAddress - 代币合约地址
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
async function getMoralisTokenHolderStats(contractAddress) {
  try {
    if (!contractAddress) {
      throw new Error('Contract address is required');
    }

    // 首先获取token持有者，从中可以计算出持有者统计信息
    const holdersData = await getMoralisTokenOwners(contractAddress, 100);
    
    if (!holdersData.success || !holdersData.owners || holdersData.owners.length === 0) {
      console.error(`获取持有者统计失败: ${holdersData.error || '未返回持有者数据'}`);
      throw new Error('Failed to fetch token holders: ' + (holdersData.error || 'No holders returned'));
    }
    
    console.log(`\n=== Calculating token holder stats for contract: ${contractAddress} ===`);
    console.log(`Using ${holdersData.owners.length} holders for statistics calculation`);
    
    // 计算holder统计数据
    const holders = holdersData.owners;
    const totalHolders = holders.length;
    console.log(`Total holders count: ${totalHolders}`);
    
    // 检查holders数组
    console.log(`First 3 holders data sample:`);
    holders.slice(0, 3).forEach((holder, index) => {
      console.log(`Holder ${index + 1}:`, {
        address: holder.TokenHolderAddress, 
        quantity: holder.TokenHolderQuantity,
        quantityFormatted: holder.TokenHolderQuantityFormatted
      });
    });
    
    // 1. 首先计算总供应量
    let totalSupply = 0n;
    holders.forEach(holder => {
      // 确保将数量转换为数字
      const quantity = typeof holder.TokenHolderQuantity === 'string' 
        ? BigInt(holder.TokenHolderQuantity) 
        : BigInt(0);
      
      totalSupply += quantity;
    });
    
    console.log(`Calculated total supply from holders: ${totalSupply.toString()}`);
    
    // 2. 计算持仓百分比
    let holdersWithPercentage = holders.map(holder => {
      const quantity = typeof holder.TokenHolderQuantity === 'string' 
        ? BigInt(holder.TokenHolderQuantity) 
        : BigInt(0);
      
      // 安全计算百分比，避免除以零错误
      const percentage = totalSupply > 0n 
        ? Number(quantity * 10000n / totalSupply) / 100 
        : 0;
      
      return {
        ...holder,
        TokenHolderPercentage: percentage
      };
    });
    
    console.log('Holders with percentage calculation added. First 3 samples:');
    holdersWithPercentage.slice(0, 3).forEach((holder, index) => {
      console.log(`Holder ${index + 1} percentage:`, holder.TokenHolderPercentage.toFixed(2) + '%');
    });
    
    // 排序持有者按持有量从大到小
    holdersWithPercentage.sort((a, b) => {
      const aQty = typeof a.TokenHolderQuantity === 'string' ? BigInt(a.TokenHolderQuantity) : BigInt(0);
      const bQty = typeof b.TokenHolderQuantity === 'string' ? BigInt(b.TokenHolderQuantity) : BigInt(0);
      return aQty > bQty ? -1 : aQty < bQty ? 1 : 0;
    });
    
    console.log('Holders sorted by quantity (largest first). New top 3:');
    holdersWithPercentage.slice(0, 3).forEach((holder, index) => {
      console.log(`Top ${index + 1}:`, {
        address: holder.TokenHolderAddress,
        percentage: holder.TokenHolderPercentage.toFixed(2) + '%'
      });
    });
    
    // 计算持仓分布
    const holderDistribution = [
      { range: "1-10", count: 0 },
      { range: "11-50", count: 0 },
      { range: "51-100", count: 0 },
      { range: "101-500", count: 0 },
      { range: "501-1000", count: 0 },
      { range: "1000+", count: 0 }
    ];
    
    // 计算持仓集中度
    // 计算 top10, top50, top100 持有百分比
    const top10Percentage = holdersWithPercentage.slice(0, Math.min(10, holdersWithPercentage.length))
      .reduce((sum, h) => sum + h.TokenHolderPercentage, 0);
    
    const top50Percentage = holdersWithPercentage.slice(0, Math.min(50, holdersWithPercentage.length))
      .reduce((sum, h) => sum + h.TokenHolderPercentage, 0);
    
    const top100Percentage = holdersWithPercentage.slice(0, Math.min(100, holdersWithPercentage.length))
      .reduce((sum, h) => sum + h.TokenHolderPercentage, 0);
    
    console.log(`Top holders percentage calculations:`);
    console.log(`- Top 10 holders hold: ${top10Percentage.toFixed(2)}% of supply`);
    console.log(`- Top 50 holders hold: ${top50Percentage.toFixed(2)}% of supply`);
    console.log(`- Top 100 holders hold: ${top100Percentage.toFixed(2)}% of supply`);
    
    const holderSupply = [
      { type: "Top 10", percentage: top10Percentage.toFixed(2) },
      { type: "Top 50", percentage: top50Percentage.toFixed(2) },
      { type: "Top 100", percentage: top100Percentage.toFixed(2) }
    ];
    
    // 构建前端期望格式的结构
    const statsData = {
      totalHolders,
      holderDistribution,
      holderSupply: {
        total: 100, // 总供应量百分比为 100%
        top10: top10Percentage,
        top50: top50Percentage,
        top100: top100Percentage,
        // 再加入前端期望的格式
        top10Percentage: top10Percentage.toFixed(2) + '%',
        top50Percentage: top50Percentage.toFixed(2) + '%',
        top100Percentage: top100Percentage.toFixed(2) + '%'
      }
    };
    
    console.log('Generated holder stats:', JSON.stringify(statsData, null, 2));
    
    return {
      success: true,
      stats: statsData
    };
  } catch (error) {
    console.error('Moralis token holder stats error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取代币分析数据
 * @param {string} contractAddress - 代币合约地址
 * @returns {Promise<{success: boolean, analytics?: object, error?: string}>}
 */
async function getMoralisTokenAnalytics(contractAddress) {
  console.log(`\n=== Getting Moralis token analytics for contract: ${contractAddress} ===`);
  console.log('Using Moralis API Key (last 5 chars):', moralisApiKey ? '...' + moralisApiKey.slice(-5) : 'Not Found');
  
  // 验证和规范化合约地址
  if (!contractAddress || typeof contractAddress !== 'string' || contractAddress.length < 10) {
    console.error(`[错误] 无效的合约地址: ${contractAddress}`);
    return { 
      success: false, 
      error: '无效的合约地址',
      analytics: {
        totalBuyers: { '24h': 0 },
        totalSellers: { '24h': 0 },
        totalBuys: { '24h': 0 },
        totalSells: { '24h': 0 },
        totalBuyVolume: { '24h': 0 },
        totalSellVolume: { '24h': 0 }
      }
    };
  }
  
  // 验证API密钥
  if (!moralisApiKey) {
    console.error('[错误] Moralis API Key not found in environment variables.');
    return { success: false, error: 'Moralis API Key not valid', details: 'API key not configured' };
  }

  try {
    const normalizedAddress = contractAddress.toLowerCase().trim();
    const url = `${moralisBaseUrl}/tokens/${normalizedAddress}/analytics`;
    console.log(`[请求] Fetching token analytics from Moralis: ${url}`);
    
    const requestConfig = {
      params: {
        chain: 'bsc'
      },
      headers: {
        'Accept': 'application/json',
        'X-API-Key': moralisApiKey
      },
      timeout: API_TIMEOUT // 使用全局超时配置
    };
    
    console.log(`[请求配置] ${JSON.stringify(requestConfig, null, 2).replace(moralisApiKey, '***API_KEY***')}`);
    
    const startTime = Date.now();
    console.log(`[计时] API请求开始时间: ${new Date(startTime).toISOString()}`);
    
    const response = await axios.get(url, requestConfig);
    
    const endTime = Date.now();
    console.log(`[计时] API请求结束时间: ${new Date(endTime).toISOString()}`);
    console.log(`[计时] 请求耗时: ${endTime - startTime}ms`);
    
    console.log(`[响应] Moralis Analytics API状态码: ${response.status}`);
    
    if (response.status !== 200) {
      console.error(`[错误] 获取Analytics数据失败，状态码: ${response.status}`);
      return {
        success: false,
        error: `API返回非成功状态码: ${response.status}`
      };
    }
    
    if (!response.data) {
      console.error('[错误] Moralis Analytics API返回空数据');
      return {
        success: false,
        error: 'Invalid response format from Moralis API'
      };
    }
    
    // 日志输出部分响应数据以避免过大的日志
    console.log('[响应数据] 关键字段:', Object.keys(response.data));
    console.log('[响应数据] 24h总购买者:', response.data.totalBuyers?.['24h']);
    console.log('[响应数据] 24h总卖出者:', response.data.totalSellers?.['24h']);
    console.log('[响应数据] 总购买量:', response.data.totalBuyVolume?.['24h']);
    console.log('[响应数据] 总卖出量:', response.data.totalSellVolume?.['24h']);
    console.log('[响应数据] 总流动性USD:', response.data.totalLiquidityUsd);
    
    // 确保返回的数据格式正确
    if (!response.data.totalBuyers || !response.data.totalSellers) {
      console.warn('[警告] Analytics数据缺少关键字段，但仍将返回可用数据');
    }
    
    // 为确保前端不会因缺失字段而崩溃，添加默认值
    const safeResponse = {
      totalBuyers: response.data.totalBuyers || { '24h': 0 },
      totalSellers: response.data.totalSellers || { '24h': 0 },
      totalBuys: response.data.totalBuys || { '24h': 0 },
      totalSells: response.data.totalSells || { '24h': 0 },
      totalBuyVolume: response.data.totalBuyVolume || { '24h': 0 },
      totalSellVolume: response.data.totalSellVolume || { '24h': 0 },
      totalLiquidityUsd: response.data.totalLiquidityUsd || 0,
      // 保留原始数据以防需要更多字段
      ...response.data
    };
    
    console.log('[结果] 处理后的Analytics数据已准备好返回');

    return {
      success: true,
      analytics: safeResponse
    };
  } catch (error) {
    console.error('=== ERROR CONNECTING TO MORALIS ANALYTICS API ===');
    console.error('[错误类型]:', error.name);
    console.error('[错误消息]:', error.message);
    
    let errorDetails = '未知错误';
    
    if (error.response) {
      // 服务器响应了请求，但状态码不是2xx
      console.error(`[API错误] 状态码: ${error.response.status}`);
      console.error('[API响应]:', JSON.stringify(error.response.data).substring(0, 200));
      
      errorDetails = `API错误 ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      
      // 特殊处理401错误
      if (error.response.status === 401) {
        errorDetails = 'API Key 认证失败，请检查Moralis API密钥是否有效';
        console.error('[认证错误] API密钥可能无效或过期，需要更新密钥');
      }
      // 特殊处理429错误
      else if (error.response.status === 429) {
        errorDetails = 'API调用次数超限，请稍后重试';
        console.error('[速率限制] 已超过Moralis API的调用限制，需要等待或升级计划');
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error('[网络错误] 请求已发出但未收到响应');
      errorDetails = '网络连接超时或无法连接Moralis服务器';
    }
    
    // 创建安全的默认值确保前端不会崩溃
    const safeDefaultAnalytics = {
      totalBuyers: { '24h': 0 },
      totalSellers: { '24h': 0 },
      totalBuys: { '24h': 0 },
      totalSells: { '24h': 0 },
      totalBuyVolume: { '24h': 0 },
      totalSellVolume: { '24h': 0 },
      totalLiquidityUsd: 0
    };
    
    return {
      success: false,
      error: errorDetails,
      analytics: safeDefaultAnalytics // 即使有错误也返回安全默认值
    };
  }
}

/**
 * Fetches ERC20 token metadata from Moralis Deep Index API.
 * @param {string} contractAddress The token contract address.
 * @param {string} chain The chain name (e.g., 'bsc', 'eth'). Defaults to 'bsc'.
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function getMoralisTokenMetadata(contractAddress, chain = 'bsc') {
  console.log(`\n=== Getting Moralis token metadata for: ${contractAddress} ===`);
  // For common chain names, convert to hex chain IDs
  const chainIdMap = {
    'bsc': '0x38', // BSC Mainnet
    'eth': '0x1',   // Ethereum Mainnet
    'polygon': '0x89', // Polygon Mainnet
    // Add other chains as needed
  };
  const chainId = chainIdMap[chain.toLowerCase()] || chain; // Use mapped ID or original if not found
  
  const cacheKey = `tokenMetadata:${chainId}:${contractAddress}`;
  const cachedData = moralisCache.get(cacheKey);
  if (cachedData) {
    console.log(`✅ Cache hit for Moralis token metadata: ${cacheKey}`);
    console.log('Cached market_cap_usd:', cachedData.data?.market_cap_usd);
    console.log('Cached fully_diluted_valuation:', cachedData.data?.fully_diluted_valuation);
    console.log('Cached total_supply:', cachedData.data?.total_supply);
    console.log('Cached circulating_supply:', cachedData.data?.circulating_supply);
    return { success: true, data: cachedData };
  }
  console.log(`Cache miss for Moralis token metadata: ${cacheKey}. Fetching...`);

  // 创建默认元数据以备API调用失败时使用
  const defaultMetadata = {
    name: 'Unknown',
    symbol: 'UNKNOWN',
    decimals: 18,
    logo: null,
    logo_hash: null,
    thumbnail: null,
    block_number: null,
    validated: false,
    created_at: new Date().toISOString(),
    possible_spam: false,
    verified_contract: false,
    market_cap_usd: null,
    fully_diluted_valuation: null,
    total_supply: null,
    circulating_supply: null,
    security_score: null,
    social_links: null
  };

  if (!moralisApiKey) {
    console.error('[错误] Moralis API Key not found in environment variables.');
    return { 
      success: false, 
      error: "Moralis API key not configured",
      data: defaultMetadata
    };
  }
  
  if (!contractAddress) {
    console.error('[错误] 请求缺少合约地址');
    return { 
      success: false, 
      error: "Contract address is required",
      data: defaultMetadata
    };
  }

  // 规范化合约地址
  const normalizedAddress = contractAddress.toLowerCase().trim();
  console.log(`[请求] 使用规范化的合约地址: ${normalizedAddress}`);

  // Correct endpoint path and parameters based on SDK example logic
  const url = `${moralisBaseUrl}/erc20/metadata`; 
  const params = {
    chain: chainId,       // Use hex chain ID
    addresses: [normalizedAddress] // Pass address as an array
  };
  
  const options = {
    method: 'GET',
    params: params, // Pass parameters as query string params
    headers: {
      'accept': 'application/json',
      'X-API-Key': moralisApiKey
    },
    timeout: API_TIMEOUT // 使用全局超时配置
  };

  console.log(`[请求] Fetching Moralis token metadata from: ${url}`);
  console.log(`[参数] chain=${chainId}, addresses=[${normalizedAddress}]`);
  console.log(`[请求配置] ${JSON.stringify(options, null, 2).replace(moralisApiKey, '***API_KEY***')}`);

  try {
    const startTime = Date.now();
    console.log(`[计时] API请求开始时间: ${new Date(startTime).toISOString()}`);
    
    // Use axios.get with the options containing params
    const response = await axios.get(url, options); 
    
    const endTime = Date.now();
    console.log(`[计时] API请求结束时间: ${new Date(endTime).toISOString()}`);
    console.log(`[计时] 请求耗时: ${endTime - startTime}ms`);
    
    console.log(`[响应] Moralis Metadata API状态码: ${response.status}`);
    
    // 检查响应状态码
    if (response.status !== 200) {
      console.error(`[错误] Moralis metadata API返回非成功状态码: ${response.status}`);
      return { 
        success: false, 
        error: `API错误: ${response.status}`,
        data: defaultMetadata
      };
    }
    
    // The response data should be an ARRAY of metadata objects
    if (!Array.isArray(response.data)) {
      console.error(`[错误] Moralis metadata API未返回数组格式: ${typeof response.data}`);
      return { 
        success: false, 
        error: 'API返回了非数组格式',
        data: defaultMetadata
      };
    }
    
    // 检查数组是否为空
    if (response.data.length === 0) {
      console.warn(`⚠️ [警告] Moralis metadata API返回了空数组，可能是未找到代币元数据`);
      return { 
        success: false, 
        error: 'No metadata found for address',
        data: defaultMetadata
      };
    }
    
    console.log(`[成功] Successfully fetched Moralis token metadata array for ${normalizedAddress}`);
    
    // Extract the FIRST element as we requested only one address
    const metadata = response.data[0]; 
    
    // 检查第一个元素是否为对象
    if (typeof metadata !== 'object' || metadata === null) {
      console.error(`[错误] Moralis metadata API返回的数组第一个元素不是对象: ${typeof metadata}`);
      return { 
        success: false, 
        error: 'API返回的数据格式无效',
        data: defaultMetadata
      };
    }
    
    // --- Log the RAW metadata object BEFORE extraction ---
    console.log('Raw Moralis API response data (first element):', JSON.stringify(metadata, null, 2).substring(0, 500) + '...');
    
    // 更详细的关键字段日志
    console.log('[数据] name:', metadata?.name);
    console.log('[数据] symbol:', metadata?.symbol);
    console.log('[数据] Direct access to market_cap_usd:', metadata?.market_cap_usd);
    console.log('[数据] Direct access to market_cap_usd type:', typeof metadata?.market_cap_usd);
    console.log('[数据] Direct access to fully_diluted_valuation:', metadata?.fully_diluted_valuation);
    console.log('[数据] Direct access to fully_diluted_valuation type:', typeof metadata?.fully_diluted_valuation);
    console.log('[数据] Direct access to total_supply:', metadata?.total_supply);
    console.log('[数据] Direct access to total_supply type:', typeof metadata?.total_supply);
    console.log('[数据] Direct access to circulating_supply:', metadata?.circulating_supply);
    console.log('[数据] Direct access to circulating_supply type:', typeof metadata?.circulating_supply);
    
    // 警告日志但不影响成功状态
    if (metadata?.market_cap_usd === undefined || metadata?.market_cap_usd === null) {
      console.warn('⚠️ [警告] market_cap_usd is missing in Moralis metadata response');
    }
    
    if (metadata?.fully_diluted_valuation === undefined || metadata?.fully_diluted_valuation === null) {
      console.warn('⚠️ [警告] fully_diluted_valuation is missing in Moralis metadata response');
    }
    
    if (metadata?.total_supply === undefined || metadata?.total_supply === null) {
      console.warn('⚠️ [警告] total_supply is missing in Moralis metadata response');
    }
    
    if (metadata?.circulating_supply === undefined || metadata?.circulating_supply === null) {
      console.warn('⚠️ [警告] circulating_supply is missing in Moralis metadata response');
    }
    // --- End logging ---
    
    // 准备返回数据，确保安全类型处理
    const requiredData = {
        name: metadata.name || 'Unknown',
        symbol: metadata.symbol || 'UNKNOWN',
        decimals: typeof metadata.decimals === 'number' ? metadata.decimals : (
            typeof metadata.decimals === 'string' ? parseInt(metadata.decimals, 10) : 18
        ),
        logo: metadata.logo || null,
        logo_hash: metadata.logo_hash || null,
        thumbnail: metadata.thumbnail || null,
        block_number: metadata.block_number || null,
        validated: !!metadata.validated,
        created_at: metadata.created_at || new Date().toISOString(),
        possible_spam: !!metadata.possible_spam,
        verified_contract: !!metadata.verified_contract,
        market_cap_usd: metadata.market_cap_usd ? parseFloat(metadata.market_cap_usd) : null,
        fully_diluted_valuation: metadata.fully_diluted_valuation ? parseFloat(metadata.fully_diluted_valuation) : null,
        total_supply: metadata.total_supply || null,
        circulating_supply: metadata.circulating_supply || null,
        security_score: metadata.security_score || null, 
        social_links: metadata.links || null
    };
    
    // 更详细的日志确认处理后的数据
    console.log('[结果] 处理后的元数据:');
    console.log('  - name:', requiredData.name);
    console.log('  - symbol:', requiredData.symbol);
    console.log('  - market_cap_usd:', requiredData.market_cap_usd);
    console.log('  - fully_diluted_valuation:', requiredData.fully_diluted_valuation);
    console.log('  - total_supply:', requiredData.total_supply);
    console.log('  - circulating_supply:', requiredData.circulating_supply);
    console.log('  - verified_contract:', requiredData.verified_contract);
    
    // 缓存处理后的数据
    moralisCache.set(cacheKey, requiredData);
    console.log(`[缓存] 缓存Moralis代币元数据: ${cacheKey}`);
    
    return { success: true, data: requiredData };
  } catch (error) {
    console.error(`❌ [错误] Error fetching Moralis token metadata for ${contractAddress}:`, error.message);
    
    let errorMessage = 'Failed to fetch metadata';
    
    if (error.response) {
      console.error('[API错误] 状态码:', error.response.status);
      console.error('[API响应]:', JSON.stringify(error.response.data).substring(0, 200));
      
      errorMessage = `API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      
      // 特殊处理401错误
      if (error.response.status === 401) {
        errorMessage = 'API Key 认证失败，请检查Moralis API密钥是否有效';
        console.error('[认证错误] API密钥可能无效或过期，需要更新密钥');
      }
      // 特殊处理429错误
      else if (error.response.status === 429) {
        errorMessage = 'API调用次数超限，请稍后重试';
        console.error('[速率限制] 已超过Moralis API的调用限制，需要等待或升级计划');
      }
    } else if (error.request) {
      console.error('[网络错误] 请求已发出但未收到响应');
      errorMessage = 'No response from Moralis API (check network or timeout)';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      data: defaultMetadata // 返回默认数据，确保前端不会崩溃
    };
  }
}

async function getMoralisTokenHolders(contractAddress, chain = 'bsc') {
  console.log(`Fetching token holders statistics for contract: ${contractAddress} on chain: ${chain}`);
  
  // 检查参数
  if (!contractAddress) {
    console.error('Error: Contract address is required for fetching token holders');
    return { success: false, error: 'Contract address is required', data: null };
  }
  
  // 日志API密钥信息（只显示最后5个字符，保护密钥安全）
  const moralisApiKey = process.env.MORALIS_API_KEY;
  console.log(`Using Moralis API Key: ...${moralisApiKey?.slice(-5) || 'NOT SET'}`);
  
  if (!moralisApiKey) {
    console.error('Error: Moralis API Key not found in environment variables');
    return { success: false, error: 'Moralis API Key not configured', data: null };
  }
  
  // 使用正确的API v2.2基础URL
  const moralisBaseUrl = 'https://deep-index.moralis.io/api/v2.2';
  const endpointUrl = `${moralisBaseUrl}/erc20/${contractAddress}/holders`;
  console.log(`Fetching holders statistics from: ${endpointUrl}`);
  
  try {
    // 发起API请求
    const response = await axios.get(endpointUrl, {
      params: {
        chain: chain
      },
      headers: {
        'Accept': 'application/json',
        'X-API-Key': moralisApiKey
      },
      timeout: 15000 // 15秒超时
    });
    
    console.log(`Moralis /holders API response status: ${response.status}`);
    
    // 检查响应状态
    if (response.status === 200) {
      // 直接使用API返回的预计算统计数据，不进行额外计算
      console.log('Successfully retrieved pre-calculated holder statistics from Moralis API');
      
      // 记录返回的数据结构，帮助调试
      console.log('Response data structure keys:', Object.keys(response.data));
      
      // 记录一些关键的统计信息
      if (response.data.totalHolders) {
        console.log(`Total holders: ${response.data.totalHolders}`);
      }
      
      if (response.data.holderSupply?.top10?.supplyPercent) {
        console.log(`Top 10 holders percentage: ${response.data.holderSupply.top10.supplyPercent}%`);
      }
      
      // 直接返回API提供的数据结构
      return { 
        success: true, 
        data: response.data  // 不改变API返回的数据结构
      };
    } else {
      console.error(`Unexpected status code: ${response.status}`);
      return { 
        success: false, 
        error: `Unexpected status code: ${response.status}`,
        data: null
      };
    }
  } catch (error) {
    console.error('Error fetching token holders statistics:', error);
    let errorMessage = error.message || 'Unknown error fetching token holders statistics';
    
    // 处理特定的错误类型
    if (error.response) {
      console.error(`API错误状态码: ${error.response.status}`);
      console.error('错误详情:', error.response.data);
      errorMessage = `API Error (${error.response.status}): ${error.response.data?.message || 'Unknown API error'}`;
      
      // 特殊处理401错误
      if (error.response.status === 401) {
        errorMessage = 'API Key 认证失败，请检查Moralis API密钥是否有效';
        console.error('[认证错误] API密钥可能无效或过期，需要更新密钥');
      }
      // 特殊处理429错误
      else if (error.response.status === 429) {
        errorMessage = 'API调用次数超限，请稍后重试';
        console.error('[速率限制] 已超过Moralis API的调用限制，需要等待或升级计划');
      }
    } else if (error.request) {
      console.error('[网络错误] 请求已发出但未收到响应');
      errorMessage = 'No response from Moralis API (check network or timeout)';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      data: null
    };
  }
}

// 辅助函数 - 计算持有者分布
function calculateHolderDistribution(holders, totalSupply) {
  // 默认分布
  const distribution = {
    whales: 0,
    sharks: 0,
    dolphins: 0,
    fish: 0,
    octopus: 0,
    crab: 0,
    shrimps: 0
  };
  
  if (totalSupply === 0) return distribution;
  
  // 计算每个持有者的占比
  holders.forEach(holder => {
    const balance = parseFloat(holder.balance) || 0;
    const percentage = (balance / totalSupply) * 100;
    
    // 按占比分类
    if (percentage >= 5) {
      distribution.whales++; // 5%以上的持有者
    } else if (percentage >= 1) {
      distribution.sharks++; // 1-5%的持有者
    } else if (percentage >= 0.5) {
      distribution.dolphins++; // 0.5-1%的持有者
    } else if (percentage >= 0.1) {
      distribution.fish++; // 0.1-0.5%的持有者
    } else if (percentage >= 0.05) {
      distribution.octopus++; // 0.05-0.1%的持有者
    } else if (percentage >= 0.01) {
      distribution.crab++; // 0.01-0.05%的持有者
    } else {
      distribution.shrimps++; // 小于0.01%的持有者
    }
  });
  
  return distribution;
}

module.exports = {
  getMoralisTokenOwners,
  getMoralisTokenHolderStats,
  getMoralisTokenData,
  getMoralisTokenAnalytics,
  getMoralisTokenMetadata,
  getMoralisTokenHolders
}; 