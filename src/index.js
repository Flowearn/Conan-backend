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

// Token data route - get token data from Moralis
app.get('/api/token-data/:chain/:address', async (req, res) => {
    // --- Start: Replacement logic for the handler ---
    try {
        const { chain, address } = req.params;
        // Use different names for query params to avoid potential scope issues if 'lang'/'analyze' used elsewhere
        const { analyze: analyzeQuery, lang: langQuery } = req.query;
        const analyze = analyzeQuery === 'true'; // Convert to boolean
        const lang = langQuery || 'en'; // Default language

        console.log(`[API Handler V2] Request received: ${chain} - ${address} (analyze=${analyze}, lang=${lang})`);

        const lowerCaseChain = chain.toLowerCase();
        const lowerCaseAddress = address.toLowerCase();
        // --- Use a dedicated cache key for BASE data ONLY ---
        const baseCacheKey = `baseTokenData:${lowerCaseChain}:${lowerCaseAddress}`;

        let baseData = null; // Use 'any' or your BaseTokenData type
        let source = 'api'; // Assume fresh fetch initially

        // --- Step 1: Get BASE Data (Cache or Fetch) ---
        baseData = myCache.get(baseCacheKey);
        if (baseData) {
            console.log(`[API Handler V2] Base data cache hit for ${baseCacheKey}`);
            source = 'cache';
        } else {
            console.log(`[API Handler V2] Base data cache miss for ${baseCacheKey}. Fetching fresh base data...`);
            try {
                // Fetch base data based on chain type
                if (lowerCaseChain === 'bsc') {
                    baseData = await BscService.getBscTokenDataBundle(lowerCaseAddress);
                } else if (lowerCaseChain === 'solana') {
                    baseData = await SolanaService.getSolanaTokenDataBundle(lowerCaseAddress);
                } else {
                    // Unsupported chain
                    console.warn(`[API Handler V2] Unsupported chain requested: ${lowerCaseChain}`);
                    return res.status(400).json({ success: false, error: `Unsupported chain: ${lowerCaseChain}` });
                }

                if (baseData && Object.keys(baseData).length > 0) { // Check if fetch was successful
                     // --- Cache ONLY the fetched BASE data ---
                    myCache.set(baseCacheKey, baseData);
                    console.log(`[API Handler V2] Base data fetched and cached for ${baseCacheKey}`);
                } else {
                    console.log(`[API Handler V2] Failed to fetch base data or fetched data is empty for ${baseCacheKey}`);
                    // Set baseData to null if fetch failed to prevent proceeding
                    baseData = null;
                }
            } catch (fetchError) {
                console.error('[API Handler V2] Error fetching base data:', fetchError);
                baseData = null; // Ensure baseData is null on fetch error
            }
        }

        // Handle case where base data couldn't be obtained
        if (!baseData) {
            // Use return here to exit the function cleanly
            return res.status(404).json({ success: false, message: 'Token base data not found or failed to fetch.' });
        }

        // --- Step 2: Prepare Response Data (Start with a DEEP COPY of base data) ---
        // Use deep copy to avoid modifying the cached object if AI analysis adds fields
        let responseData = JSON.parse(JSON.stringify(baseData));

        // --- Step 3: Conditional AI Analysis (ALWAYS check 'analyze' flag AFTER getting baseData) ---
        if (analyze) {
            console.log(`[API Handler V2] Generating AI analysis (using data from ${source}). Lang: ${lang}`);
            console.log('[index.js V2] Calling generateBasicAnalysis...'); // Keep V2 logs distinct
            try {
                // Ensure generateBasicAnalysis is imported/available
                // Pass necessary BASE data (or deep copy) to the function
                const aiResult = await generateBasicAnalysis(baseData, lang); // Pass original baseData or responseData
                console.log('[index.js V2] generateBasicAnalysis returned.');

                if (aiResult && aiResult.success) {
                    // Add AI analysis result to the response object
                    responseData.aiAnalysis = {
                        basicAnalysis: aiResult.analysis
                    };
                    console.log('[API Handler V2] AI analysis generated and merged successfully.');
                    source += '+ai'; // Update source info
                } else {
                    const errorMessage = aiResult ? aiResult.error : 'Unknown AI analysis failure';
                    console.error('[API Handler V2] AI Analysis Generation Failed:', errorMessage);
                    responseData.aiAnalysis = { 
                        basicAnalysis: `Error: ${errorMessage}` 
                    };
                }
            } catch (aiError) {
                console.error('[API Handler V2] Error during AI Analysis generation process:', aiError);
                responseData.aiAnalysis = { 
                    basicAnalysis: `Error: Failed to generate AI analysis` 
                };
            }
        } else {
             console.log('[API Handler V2] AI analysis not requested.');
        }

        // --- Step 4: Send final response ---
        console.log(`[API Handler V2] Sending final response. Source: ${source}`);
        // Add success: true explicitly here
        return res.json({ success: true, data: responseData, source: source });

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
  
  const contractAddress = address.toLowerCase();
  const cacheKey = `tokenAnalytics:${chain}:${contractAddress}`;
  const cachedData = myCache.get(cacheKey);

  if (cachedData) {
    console.log(`✅ Cache hit for key: ${cacheKey}`);
    return res.json(cachedData);
  }

  console.log(`Cache miss for key: ${cacheKey}. Fetching fresh data...`);
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
      }
    };
    
    // 设置缓存 (30分钟)
    console.log(`Setting cache for key: ${cacheKey}`);
    myCache.set(cacheKey, response, 1800);
    
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