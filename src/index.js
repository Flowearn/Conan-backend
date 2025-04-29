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
// Import Birdeye service
const { 
  testBirdeyeConnection, 
  getBirdeyeTopTraders,
  // 导入Solana相关函数
  getSolanaTokenMetadataFromBirdeye,
  getSolanaMarketData,
  getSolanaHolders,
  getSolanaTopTraders,
  getSolanaTradeData
} = require('./services/birdeyeService');
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
const { 
  getMoralisTokenOwners, 
  getMoralisTokenHolderStats, 
  getMoralisTokenData, 
  // getMoralisPairOhlcv, // 价格图表功能已被移除
  getMoralisTokenAnalytics,
  getMoralisTokenMetadata,
  getMoralisTokenHolders
} = require('./services/moralisService');
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
    const result = await testBirdeyeConnection();
    // 根据服务层返回的 success 状态决定响应码
    if (result.success) {
       res.json(result);
    } else {
       res.status(result.statusCode || 500).json(result); 
    }
  } catch (error) {
     // 处理路由本身的意外错误
     console.error("Unexpected error in /api/test-birdeye route:", error);
     res.status(500).json({ success: false, error: 'Internal server error in test route', details: error.message });
  }
});

// Token data route - get token data from Moralis
app.get('/api/token-data/:chain/:address', async (req, res) => {
  const { chain, address } = req.params;
  const lowerCaseChain = chain.toLowerCase();
  const cacheKey = `tokenData:${lowerCaseChain}:${address}`;
  let responseData = null;

  console.log(`[API Handler] Request received: ${lowerCaseChain} - ${address}`);

  // --- 检查缓存 ---
  const cachedData = myCache.get(cacheKey);
  if (cachedData) {
    console.log(`[API Handler] Cache hit for ${cacheKey}`);
    return res.json({ success: true, data: cachedData, source: 'cache' });
  }
  console.log(`[API Handler] Cache miss for ${cacheKey}. Fetching fresh data...`);

  try {
    if (lowerCaseChain === 'bsc') {
      // --- 调用 BSC Service ---
      responseData = await BscService.getBscTokenDataBundle(address);
      // ------------------------
    } else if (lowerCaseChain === 'solana') {
      // --- 调用 Solana Service ---
      responseData = await SolanaService.getSolanaTokenDataBundle(address);
      // --------------------------
    } else {
      // 不支持的链
      console.warn(`[API Handler] Unsupported chain requested: ${lowerCaseChain}`);
      return res.status(400).json({ error: `Unsupported chain: ${lowerCaseChain}` });
    }

    // --- 处理 Service 返回结果 ---
    if (responseData) {
      console.log(`[API Handler] Data bundle retrieved successfully for ${lowerCaseChain}:${address}`);
      
      // --- 缓存标准化后的数据 ---
      console.log(`[API Handler] Setting cache for ${cacheKey}`);
      myCache.set(cacheKey, responseData);
      
      // **重要:** 通常我们将最终数据包装在一个 data 字段中返回给前端
      return res.json({ success: true, data: responseData, source: 'api' });
    } else {
      // 如果 Service 返回 null，表示内部出错或未找到数据
      console.log(`[API Handler] Service returned null for ${lowerCaseChain}:${address}. Sending 404.`);
      return res.status(404).json({ error: 'Data not found or internal service error.' });
    }
    // ------------------------

  } catch (error) {
    // 捕获调用 Service 过程中可能发生的意外错误
    console.error(`[API Handler] Unexpected error for ${lowerCaseChain}:${address}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
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