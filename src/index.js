// backend/index.js - FINAL Accelerated Test Version (Timeout/Handlers/Monitor disabled, Simple CORS)

// 确保在最开始就加载环境变量
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
console.log(`加载环境变量文件: ${envPath}`);
require('dotenv').config({ path: envPath });

// 引入 SSM 参数工具并初始化 API 密钥（优先从 SSM 读取）
const { initializeApiKeys } = require('./utils/ssm-params');

// 引入 serverless-http 库
const serverless = require('serverless-http');

// 检查关键环境变量
console.log('XAI_API_KEY 是否设置:', !!process.env.XAI_API_KEY);

const express = require('express');
const cors = require('cors');
const NodeCache = require("node-cache");

const dotenv = require('dotenv');
const { ethers } = require('ethers');

// 明确加载 .env 文件
const result = dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Environment variables loaded successfully from:', path.resolve(__dirname, '..', '.env'));
  // 打印关键环境变量（隐藏完整值）
  console.log('BSCSCAN_FREE_API_KEY:', process.env.BSCSCAN_FREE_API_KEY ? `...${process.env.BSCSCAN_FREE_API_KEY.slice(-5)}` : 'Not set');
  console.log('ETHERSCAN_FAMILY_PRO_KEY:', process.env.ETHERSCAN_FAMILY_PRO_KEY ? `...${process.env.ETHERSCAN_FAMILY_PRO_KEY.slice(-5)}` : 'Not set');
  console.log('BIRDEYE_API_KEY:', process.env.BIRDEYE_API_KEY ? `...${process.env.BIRDEYE_API_KEY.slice(-5)}` : 'Not set');
  console.log('MORALIS_API_KEY:', process.env.MORALIS_API_KEY ? `...${process.env.MORALIS_API_KEY.slice(-5)}` : 'Not set');
  console.log('XAI_API_KEY:', process.env.XAI_API_KEY ? `...${process.env.XAI_API_KEY.slice(-5)}` : 'Not set');
}

// Import formatters
const { 
  formatTimestamp, 
  formatTokenAmount, 
  formatLargeNumber, 
  formatCurrency, 
  formatNumberSuffix,
  formatCurrencySuffix,
  safeCurrencySuffix,
  safeNumberSuffix
} = require('./utils/formatters');

// Import AI analysis service
const { 
  generateAnalysis, 
  generateGrokAnalysis, 
  generateBasicAnalysis
} = require('./services/aiAnalysisService');

// Import Chain Services
const BscService = require('./services/BscService');
const SolanaService = require('./services/SolanaService');
// Ensure both services are correctly imported
const { getBscTokenDataBundle } = require('./services/BscService');
const { getSolanaTokenDataBundle } = require('./services/SolanaService');

// 检查formatCurrencySuffix是否正确导入
console.log('formatCurrencySuffix imported successfully:', !!formatCurrencySuffix);
console.log('formatCurrencySuffix type:', typeof formatCurrencySuffix);

const app = express();

// 配置中间件
app.use(express.json());

// --- CORS Configuration ---
/* // 注释掉原始定义
const allowedOrigins = [
  'http://localhost:3000', // 允许本地开发前端访问
  // 未来部署到 Vercel 后，可能需要添加生产环境 URL
  // 例如: process.env.FRONTEND_URL || 'https://your-vercel-url.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    // 允许列表中的源或无源请求 (如服务器间调用、curl)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // 允许的 HTTP 方法
  allowedHeaders: ['Content-Type', 'Authorization'], // 允许前端发送的请求头
  credentials: true // 如果你的 API 需要处理 cookies 或授权头，设为 true
};
*/

// --- Apply CORS Middleware ---
// app.use(cors(corsOptions)); // 注释掉旧行
app.use(cors()); // 使用简单的 CORS 配置

// 创建缓存实例，默认 TTL 为 120 秒，每 60 秒检查一次过期条目
const myCache = new NodeCache({ stdTTL: 120, checkperiod: 60 }); 
console.log('Node-cache instance created with 120s TTL.');

// --- Global Error Handlers ---
/* 
process.on('unhandledRejection', (reason, promise) => {
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('!!! UNHANDLED PROMISE REJECTION DETECTED !!!');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  // It's often recommended to exit gracefully after an unhandled rejection
  // process.exit(1); // Consider adding this for production stability
});

process.on('uncaughtException', (error) => {
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('!!! UNCAUGHT EXCEPTION DETECTED !!!');
  console.error('Error:', error);
  console.error('Error Stack:', error.stack);
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  // It's critical to exit after an uncaught exception
  process.exit(1); // For stability, exit the process
});

// 添加额外的进程恢复机制
process.on('SIGTERM', () => {
  console.log('接收到SIGTERM信号，准备优雅退出...');
  // 允许服务器完成现有连接
  setTimeout(() => {
    console.log('优雅退出完成');
    process.exit(0);
  }, 1000);
});
*/

// 监控内存使用
/*
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  console.log(`内存使用: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`);
  
  // 如果内存使用超过1GB，则发出警告
  if (memoryUsage.rss > 1000 * 1024 * 1024) {
    console.warn('警告: 内存使用超过1GB');
  }
}, 60000); // 每60秒检查一次
*/

// 在API路由中添加超时保护
/*
app.use((req, res, next) => {
  // 为每个请求设置30秒超时
  req.setTimeout(30000, () => {
    console.error(`请求超时: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        error: '请求处理超时',
        detail: '服务器处理请求时间过长，请稍后再试'
      });
    }
  });
  next();
});
*/

// Root route
app.get('/', (req, res) => {
  res.status(200).send('Backend OK');
});

// BSCScan test route

// Birdeye test route
app.get('/api/test-birdeye', async (req, res) => {
  console.log(`Received request for /api/test-birdeye`);
  try {
    // 由于birdeyeService已被移除，返回未实现信息
    res.status(501).json({ 
      success: false, 
      error: 'Service unavailable', 
      details: 'birdeyeService has been removed, this endpoint is no longer available' 
    });
  } catch (error) {
     console.error("Unexpected error in /api/test-birdeye route:", error);
     res.status(500).json({ success: false, error: 'Internal server error in test route', details: error.message });
  }
});

// 帮助函数：检测地址类型（BSC或Solana）
function detectChainType(address) {
  if (!address) {
    console.error('[detectChainType] Invalid address provided:', address);
    // 如果地址无效，默认返回BSC类型
    return { chainType: 'bsc', normalizedAddress: address || '' };
  }
  
  // 用于检查的小写版本，但不会直接修改原始地址
  const lowercaseAddress = address.toLowerCase();
  console.log(`[detectChainType] Analyzing address: ${address}`);
  
  // 如果地址以0x开头，则为BSC（以太坊兼容链）
  if (lowercaseAddress.startsWith('0x')) {
    console.log(`[detectChainType] Detected BSC address pattern (0x prefix)`);
    return { chainType: 'bsc', normalizedAddress: lowercaseAddress }; // BSC地址可以使用小写
  } 
  
  // 判断是否符合Solana地址格式: base58编码的字符串
  // Solana地址通常是32-44个字符的base58编码字符串
  // 基本验证：长度在32-44范围内且只包含base58字符集
  const solanaAddressPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (solanaAddressPattern.test(address)) { // 注意：这里使用原始地址进行测试
    console.log(`[detectChainType] Detected Solana address pattern (base58 format)`);
    return { chainType: 'solana', normalizedAddress: address }; // 保留Solana地址原始大小写
  }
  
  // 如果不符合已知模式，默认假定为Solana地址，保留原始大小写
  console.warn(`[detectChainType] Address format not recognized, defaulting to Solana with original case`);
  return { chainType: 'solana', normalizedAddress: address }; // 保留原始大小写
}

// Token data route - get token data from Moralis
app.get('/api/token-data/:chain/:address', async (req, res) => {
    // --- Start: Replacement logic for the handler ---
    try {
        // 1. 添加日志以打印请求详情
        console.log('[Index Handler] Received request details:', JSON.stringify({
            params: req.params,
            query: req.query,
            headers: req.headers,
            path: req.path,
            originalUrl: req.originalUrl
        }, null, 2));

        const { address } = req.params;
        const { chain: requestedChain } = req.params; // 记录用户请求的链，但优先使用自动检测结果
        const { analyze: analyzeQuery, lang: langQuery } = req.query;
        const analyze = analyzeQuery === 'true'; // Convert to boolean
        const lang = langQuery || 'en'; // Default language

        // 2. 添加日志打印提取的参数
        console.log('[Index Handler] Extracted chain:', requestedChain, 'Address:', address);

        // --- 添加链检测 ---
        const { chainType: detectedChain, normalizedAddress } = detectChainType(address);
        console.log(`[API Handler V2] Detected chain: ${detectedChain} for address: ${address} (analyze=${analyze}, lang=${lang})`);

        // 当用户指定的链与检测到的链不同时输出警告
        if (requestedChain && requestedChain !== detectedChain) {
          console.warn(`[API Handler V2] Chain type mismatch! User requested: ${requestedChain}, but detected: ${detectedChain}`);
        }
        // --- 链检测结束 ---

        // --- 更新缓存键以包含检测到的链 ---
        const baseCacheKey = `baseTokenData:${detectedChain}:${normalizedAddress}`;

        let baseData = null; // Use 'any' or your BaseTokenData type
        let source = 'api'; // Assume fresh fetch initially

        // --- Step 1: Get BASE Data (Cache or Fetch) ---
        console.log(`[API Handler V2] Cache disabled - Fetching fresh base data...`);
        console.log(`[API Handler V2] Fetching fresh base data for ${detectedChain}...`);
        console.log(`[Index Handler] Calling solanaService.getTokenDataBundle for address: ${normalizedAddress}`);
        
        // 添加API密钥末尾显示以确认有效性
        console.log(`[Index Handler] API Key ending with: ...${process.env.BIRDEYE_API_KEY.slice(-6)}`);
        // 添加请求头日志
        console.log(`[Index Handler] Request headers:`, JSON.stringify(req.headers, null, 2));
        // 添加Node.js版本日志和环境信息
        console.log(`[Index Handler] Node.js version: ${process.version}`);
        console.log(`[Index Handler] Environment: ${process.env.STAGE || 'dev'}`);
        
        // --- 清晰地显示我们即将调用的服务和地址 ---
        console.log(`[API Handler V2] Calling SolanaService for ${normalizedAddress}`);
        console.log(`[Index Handler] Solana service call - Time: ${new Date().toISOString()}`);
        
        if (detectedChain === 'solana') {
            try {
                baseData = await getSolanaTokenDataBundle(normalizedAddress);
                
                if (!baseData) {
                    console.error(`[API Handler V2] SolanaService returned null or undefined data for ${normalizedAddress}`);
                    return res.status(404).json({
                        success: false,
                        errors: [{
                            code: 'SOLANA_DATA_NOT_FOUND',
                            message: `No data found for Solana address: ${address}`,
                            details: { address, normalizedAddress }
                        }]
                    });
                }
            } catch (solanaError) {
                console.error(`[Index Handler] Solana service call failed:`, solanaError);
                return res.status(500).json({
                    success: false,
                    errors: [{
                        code: 'SOLANA_SERVICE_ERROR',
                        message: `Error fetching data from Solana service: ${solanaError.message}`,
                        details: { address, normalizedAddress }
                    }]
                });
            }
        } else if (detectedChain === 'bsc') {
            try {
                console.log(`[API Handler V2] Calling BscService for ${normalizedAddress}`);
                baseData = await getBscTokenDataBundle(normalizedAddress);
                
                if (!baseData) {
                    console.error(`[API Handler V2] BscService returned null or undefined data for ${normalizedAddress}`);
                    return res.status(404).json({
                        success: false,
                        errors: [{
                            code: 'BSC_DATA_NOT_FOUND',
                            message: `No data found for BSC address: ${address}`,
                            details: { address, normalizedAddress }
                        }]
                    });
                }
            } catch (bscError) {
                console.error(`[Index Handler] BSC service call failed:`, bscError);
                return res.status(500).json({
                    success: false,
                    errors: [{
                        code: 'BSC_SERVICE_ERROR',
                        message: `Error fetching data from BSC service: ${bscError.message}`,
                        details: { address, normalizedAddress }
                    }]
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                errors: [{
                    code: 'UNSUPPORTED_CHAIN',
                    message: `Unsupported chain type: ${detectedChain}`,
                    details: { requestedChain, detectedChain, address }
                }]
            });
        }

        // If we got here, we have valid baseData
        console.log(`[API Handler V2] Base data (${detectedChain}) fetched successfully`);
        
        // Prepare API response with baseData
        const apiResponse = {
            success: true,
            data: baseData,
            meta: {
                source,
                chain: detectedChain,
                address: normalizedAddress,
                normalizedAddress,
                timestamp: new Date().toISOString()
            }
        };

        // --- Step 3: Conditional AI Analysis (ALWAYS check 'analyze' flag AFTER getting baseData) ---
        if (analyze) {
            console.log(`[API Handler V2] Analyze flag set to true, attempting AI analysis for ${detectedChain}:${normalizedAddress} (lang=${lang})`);
            
            try {
                // 先生成基础分析 - 这是所有链共用的
                console.log('[API Handler V2] Generating basic AI Analysis...');
                console.log("DEBUG INSTRUCTION 1 (index.js): topTraders data BEFORE calling generateBasicAnalysis:", JSON.stringify(baseData.topTraders, null, 2));
                const aiResult = await generateBasicAnalysis(baseData, lang);

                if (aiResult && aiResult.success) {
                    // Add AI analysis result to the response object
                    apiResponse.data.aiAnalysis = {
                        basicAnalysis: aiResult.analysis
                    };
                    console.log('[API Handler V2] AI Analysis successfully added to response');
                    // Add detailed logging
                    console.log('[API Handler V2] AI Analysis length:', aiResult.analysis ? aiResult.analysis.length : 0);
                    console.log('[API Handler V2] AI Analysis first 100 chars:', aiResult.analysis ? aiResult.analysis.substring(0, 100) : 'N/A');
                    console.log('[API Handler V2] Final apiResponse.data.aiAnalysis structure:', JSON.stringify(apiResponse.data.aiAnalysis, null, 2));
                } else {
                    const errorMessage = aiResult ? aiResult.error : 'Unknown AI analysis failure';
                    console.error('[API Handler V2] AI Analysis Generation Failed:', errorMessage);
                    apiResponse.data.aiAnalysis = { 
                        basicAnalysis: `Error: ${errorMessage}` 
                    };
                }
            } catch (aiError) {
                console.error('[API Handler V2] Error during AI Analysis generation process:', aiError);
                apiResponse.data.aiAnalysis = { 
                    basicAnalysis: `Error: Failed to generate AI analysis` 
                };
            }
        } else {
            console.log(`[API Handler V2] Analyze flag not set, skipping AI analysis`);
        }

        // --- Step 4: Send final response ---
        console.log(`[API Handler V2] Sending final response. Source: ${source}, Chain: ${detectedChain}`);
        // Add success: true explicitly here
        return res.json(apiResponse);

    } catch (error) {
        // General error handler for the entire request processing
        console.error('[API Handler V2] Unhandled error in token-data handler:', error);
        // Ensure success: false is sent on unhandled errors
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error processing request.',
            details: error.message
        });
    }
    // --- End: Replacement logic for the handler ---
});

// Token analytics route - get trading analytics data from Moralis
app.get('/api/token-analytics/:chain/:address', async (req, res) => {
  const { chain, address } = req.params;
  console.log(`\n=== Received token analytics request for chain: ${chain}, address: ${address} ===`);
  
  // 使用相同的链检测逻辑
  const { chainType: detectedChain, normalizedAddress } = detectChainType(address);
  console.log(`[API Handler] Detected chain for analytics: ${detectedChain} for address: ${address}`);
  
  // 当用户指定的链与检测到的链不同时输出警告
  if (chain && chain !== detectedChain) {
    console.warn(`[API Handler] Analytics chain type mismatch! User requested: ${chain}, but detected: ${detectedChain}`);
  }
  
  const contractAddress = normalizedAddress;
  const cacheKey = `tokenAnalytics:${detectedChain}:${contractAddress}`;
  
  // 注释掉缓存读取和检查
  // const cachedData = myCache.get(cacheKey);
  // if (cachedData) {
  //   console.log(`✅ Cache hit for key: ${cacheKey}`);
  //   return res.json(cachedData);
  // }

  console.log(`Cache disabled - Fetching fresh data...`);
  try {
    console.log('Calling Moralis service for token analytics data...');
    const result = await getMoralisTokenAnalytics(contractAddress);
    
    if (!result.success || !result.analytics) {
      console.log(`❌ Failed to fetch token analytics for ${contractAddress}: ${result.error}`);
      return res.status(404).json({ 
        success: false, 
        errors: [{ type: 'TokenAnalytics', message: 'Failed to fetch token analytics', details: result.error }]
      });
    }
    
    // 处理原始分析数据
    const rawData = result.analytics;
    console.log('Successfully received raw analytics data. Fields:', Object.keys(rawData));
    
    // 格式化交易量数据
    const formatVolume = (value) => {
      if (value === undefined || value === null) return 'N/A';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    };
    
    // 创建响应对象
    const response = {
      success: true,
      data: {
        totalBuyers: {
          '5m': rawData.totalBuyers?.['5m']?.toString() || 'N/A',
          '1h': rawData.totalBuyers?.['1h']?.toString() || 'N/A',
          '6h': rawData.totalBuyers?.['6h']?.toString() || 'N/A',
          '24h': rawData.totalBuyers?.['24h']?.toString() || 'N/A'
        },
        totalSellers: {
          '5m': rawData.totalSellers?.['5m']?.toString() || 'N/A',
          '1h': rawData.totalSellers?.['1h']?.toString() || 'N/A',
          '6h': rawData.totalSellers?.['6h']?.toString() || 'N/A',
          '24h': rawData.totalSellers?.['24h']?.toString() || 'N/A'
        },
        totalBuys: {
          '5m': rawData.totalBuys?.['5m']?.toString() || 'N/A',
          '1h': rawData.totalBuys?.['1h']?.toString() || 'N/A',
          '6h': rawData.totalBuys?.['6h']?.toString() || 'N/A',
          '24h': rawData.totalBuys?.['24h']?.toString() || 'N/A'
        },
        totalSells: {
          '5m': rawData.totalSells?.['5m']?.toString() || 'N/A',
          '1h': rawData.totalSellers?.['1h']?.toString() || 'N/A',
          '6h': rawData.totalSellers?.['6h']?.toString() || 'N/A',
          '24h': rawData.totalSellers?.['24h']?.toString() || 'N/A'
        },
        totalBuyVolumeFormatted: {
          '5m': formatVolume(rawData.totalBuyVolume?.['5m']),
          '1h': formatVolume(rawData.totalBuyVolume?.['1h']),
          '6h': formatVolume(rawData.totalBuyVolume?.['6h']),
          '24h': formatVolume(rawData.totalBuyVolume?.['24h'])
        },
        totalSellVolumeFormatted: {
          '5m': formatVolume(rawData.totalSellVolume?.['5m']),
          '1h': formatVolume(rawData.totalSellVolume?.['1h']),
          '6h': formatVolume(rawData.totalSellVolume?.['6h']),
          '24h': formatVolume(rawData.totalSellVolume?.['24h'])
        },
        rawData: rawData
      },
      chain: detectedChain // 添加链信息到响应中
    };
    
    // 注释掉缓存设置
    // console.log(`Setting cache for key: ${cacheKey}`);
    // myCache.set(cacheKey, response, 1800);
    
    return res.json(response);
  } catch (error) {
    console.error(`❌ Unexpected error in /api/token-analytics/${contractAddress} route:`, error);
    return res.status(500).json({ 
      success: false, 
      errors: [{ type: 'Server', message: 'Internal server error', details: error.message }]
    });
  }
});

// 创建处理程序函数
const handler = async (event, context) => {
  // 在 Lambda 环境中初始化 API 密钥，从 SSM Parameter Store 获取
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    await initializeApiKeys();
    console.log('Running in Lambda environment, API keys initialized from SSM');
  }
  
  // 将请求传递给 serverless-http 包装的应用
  const serverlessHandler = serverless(app);
  return serverlessHandler(event, context);
};

// 导出处理程序
module.exports.handler = handler; 