const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { formatPercentageForAI } = require("../utils/formatters");

// 加载环境变量配置
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });

// 获取 Gemini API Key
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.error("CRITICAL: GEMINI_API_KEY is not set in environment variables. AI analysis will fail.");
}

// 初始化 GoogleGenerativeAI 实例
let genAI; 
if (geminiApiKey) {
  genAI = new GoogleGenerativeAI(geminiApiKey);
  console.log("[GeminiService] GoogleGenerativeAI client initialized.");
} else {
  console.warn("[GeminiService] GoogleGenerativeAI client not initialized due to missing API key. AI analysis will fail.");
}

console.log("=========================================");
console.log("Loading aiAnalysisService.js");
console.log("=========================================");

/**
 * 生成代币基本盘分析
 * @param {Object} tokenData - 所有代币相关数据
 * @param {string} lang - 请求的语言，默认为'zh'（中文）
 * @returns {Promise<{success: boolean, analysis?: string, error?: string, details?: string, usageMetadata?: object}>}
 */
async function generateBasicAnalysis(tokenData, lang = 'zh') {
  console.log(`[aiService] generateBasicAnalysis started. Lang:`, lang);
  
  // 提取所需数据
  const { tokenOverview, holderStats, metadata, tokenAnalytics, topTraders, chain } = tokenData;
  
  if (!tokenOverview) {
    return {
      success: false,
      error: '缺少基本数据',
      details: '缺少必要的代币数据'
    };
  }
  
  // 确定是否为Solana链
  const isSolana = chain === 'solana';
  console.log(`[aiService] Processing ${isSolana ? 'Solana' : chain} chain token`);
  
  // 所有标准时间维度: 1m, 30m, 2h, 6h, 12h, 24h
  const timeframes = ['1m', '30m', '2h', '6h', '12h', '24h'];
  
  // 提取价格变化百分比数据
  const priceChanges = {};
  if (tokenAnalytics?.priceChangePercent) {
    timeframes.forEach(tf => {
      // 直接使用预格式化的字符串，而不是再次格式化
      const dataPoint = tokenAnalytics.priceChangePercent[tf];
      if (dataPoint) {
        priceChanges[tf] = dataPoint.value || 'N/A';
      }
    });
  }
  
  // 提取交易量数据 (买入和卖出)
  const tradeVolumes = {};
  if (tokenAnalytics?.buyVolumeUSD && tokenAnalytics?.sellVolumeUSD) {
    timeframes.forEach(tf => {
      // 直接使用预格式化的字符串，而不是再次格式化
      const buyVol = tokenAnalytics.buyVolumeUSD[tf]?.value || 'N/A';
      const sellVol = tokenAnalytics.sellVolumeUSD[tf]?.value || 'N/A';
      if (buyVol !== 'N/A' || sellVol !== 'N/A') {
        tradeVolumes[tf] = { buy: buyVol, sell: sellVol };
      }
    });
  }
  
  // 提取钱包活动数据
  const walletActivity = {};
  if (tokenAnalytics?.uniqueWallets && tokenAnalytics?.uniqueWalletsChangePercent) {
    timeframes.forEach(tf => {
      // 直接使用预格式化的字符串，而不是再次格式化
      const count = tokenAnalytics.uniqueWallets[tf]?.value || 'N/A';
      const change = tokenAnalytics.uniqueWalletsChangePercent[tf]?.value || 'N/A';
      if (count !== 'N/A' || change !== 'N/A') {
        walletActivity[tf] = { count, change };
      }
    });
  }
  
  // 提取交易计数数据
  const tradeCounts = {};
  if (tokenAnalytics?.buyCounts && tokenAnalytics?.sellCounts) {
    timeframes.forEach(tf => {
      // 直接使用预格式化的字符串，而不是再次格式化
      const buys = tokenAnalytics.buyCounts[tf]?.value || 'N/A';
      const sells = tokenAnalytics.sellCounts[tf]?.value || 'N/A';
      if (buys !== 'N/A' || sells !== 'N/A') {
        tradeCounts[tf] = { buys, sells };
      }
    });
  }
  
  // 根据链类型准备持有者信息
  let holderInfoEN = '';
  let holderInfoZH = '';
  
  if (isSolana) {
    // 对于Solana链，总持有者数量已移至核心信息模块，此处不再单独生成持有者信息模块
    holderInfoEN = ''; // 设置为空字符串
    holderInfoZH = ''; // 设置为空字符串
  } else {
    // 对于其他链(如BSC)，包含完整的持有者统计信息
    holderInfoEN = `### Holder Analysis (from /holders endpoint)
- Total Holders: ${holderStats?.totalHolders || 'Unknown'}
- 30d Holder Change: ${holderStats?.holderChange?.['30d']?.changePercent || 0}%
- Top 10 Supply %: ${holderStats?.holderSupply?.top10?.supplyPercent || 'Unknown'}%
- Holder Distribution: Whales: ${holderStats?.holderDistribution?.whales || 0}, Shrimps: ${holderStats?.holderDistribution?.shrimps || 0}
- Main Acquisition: ${holderStats?.holdersByAcquisition ? 
    Object.entries(holderStats.holdersByAcquisition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([method, count]) => `${method}: ${count}`)
    .join(', ') : 'Unknown'}`;
    
    holderInfoZH = `### 持有者分析 (来自 /holders 端点)
- 总持有者: ${holderStats?.totalHolders || '未知'}
- 30天持有者变化: ${holderStats?.holderChange?.['30d']?.changePercent || 0}%
- Top 10 持仓占比: ${holderStats?.holderSupply?.top10?.supplyPercent || '未知'}%
- 持有者分布: 鲸鱼: ${holderStats?.holderDistribution?.whales || 0}, 虾: ${holderStats?.holderDistribution?.shrimps || 0}
- 主要获取方式: ${holderStats?.holdersByAcquisition ? 
    Object.entries(holderStats.holdersByAcquisition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([method, count]) => `${method}: ${count}`)
    .join(', ') : '未知'}`;
  }
  
  // 处理顶级交易者数据 (最多10名)
  let topTradersSummaryEN = '';
  let topTradersSummaryZH = '';
  
  // 帮助函数：检查标签是否包含bot关键词
  const isBotTag = (tags) => {
    if (!tags || !Array.isArray(tags)) return false;
    return tags.some(tag => 
      typeof tag === 'string' && 
      (tag.toLowerCase().includes('bot') || tag.toLowerCase().includes('sniper-bot'))
    );
  };
  
  if (topTraders) {
    // 确定要处理的交易者数组
    let tradersArray = [];
    
    // 处理可能的不同数据结构
    if (Array.isArray(topTraders)) {
      tradersArray = topTraders;
    } else if (topTraders.items && Array.isArray(topTraders.items)) {
      tradersArray = topTraders.items;
    }
    
    // 限制为最多10名交易者
    const limitedTraders = tradersArray.slice(0, 10);
    
    if (limitedTraders.length > 0) {
      // 计算聚合统计数据
      let top10TotalVolumeUSD = 0;
      let top10TradeCount = 0;
      let top10BotCount = 0;
      let totalBuyCount = 0;
      let totalSellCount = 0;
      
      limitedTraders.forEach(trader => {
        // 累加交易额 (处理格式化的金额字符串，如 $1,234.56)
        const amountStr = trader.total.amountUSDFormatted;
        if (amountStr) {
          const numericPart = amountStr.replace(/[^0-9.]/g, '');
          const amountValue = parseFloat(numericPart);
          if (!isNaN(amountValue)) {
            top10TotalVolumeUSD += amountValue;
          }
        }
        
        // 累加交易次数
        top10TradeCount += trader.total.count || 0;
        
        // 计算买入/卖出次数
        totalBuyCount += trader.buy.count || 0;
        totalSellCount += trader.sell.count || 0;
        
        // 统计机器人数量
        if (isBotTag(trader.tags)) {
          top10BotCount++;
        }
      });
      
      // 格式化交易额
      const formattedTotalVolume = `$${top10TotalVolumeUSD.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
      
      // 计算买卖比例 (处理除零情况)
      let buyToSellRatio = 'N/A';
      if (totalSellCount > 0) {
        buyToSellRatio = `${totalBuyCount} buys / ${totalSellCount} sells (${(totalBuyCount / totalSellCount).toFixed(2)} ratio)`;
      } else if (totalBuyCount > 0) {
        buyToSellRatio = `${totalBuyCount} buys / 0 sells`;
      }
      
      // 英文版顶级交易者聚合统计
      topTradersSummaryEN = `### Top Traders Summary (Top 10)
- Combined Total Volume (USD): ${formattedTotalVolume}
- Combined Total Trades: ${top10TradeCount.toLocaleString()}
- Identified Bots: ${top10BotCount} out of ${limitedTraders.length}
- Overall Buy/Sell Trade Ratio: ${buyToSellRatio}`;
      
      // 中文版顶级交易者聚合统计
      topTradersSummaryZH = `### 顶级交易者摘要 (前10名)
- 总交易额 (美元): ${formattedTotalVolume}
- 总交易次数: ${top10TradeCount.toLocaleString()}
- 机器人识别: ${limitedTraders.length}名交易者中有${top10BotCount}个机器人
- 总体买/卖交易比例: ${totalBuyCount} 买入 / ${totalSellCount} 卖出 ${totalSellCount > 0 ? `(比例 ${(totalBuyCount / totalSellCount).toFixed(2)})` : ''}`;
    } else {
      topTradersSummaryEN = `### Top Traders Summary\nNo significant top trader activity to summarize.`;
      topTradersSummaryZH = `### 顶级交易者摘要\n无显著的顶级交易者活动可供总结。`;
    }
  } else {
    topTradersSummaryEN = `### Top Traders Summary\nNo significant top trader activity to summarize.`;
    topTradersSummaryZH = `### 顶级交易者摘要\n无显著的顶级交易者活动可供总结。`;
  }
  
  // 为 Solana 链准备总持有者数量信息（英文版）
  const solanaHoldersTotalEN = isSolana ? `- Total Holders: ${holderStats?.totalHolders || 'Unknown'}` : '';
  
  // 为 Solana 链准备总持有者数量信息（中文版）
  const solanaHoldersTotalZH = isSolana ? `- 总持有者数量: ${holderStats?.totalHolders || '暂无数据'}` : '';
  
  // 定义系统指令 - 英文版
  const systemInstructionEN = `You are a professional cryptocurrency analyst specializing in analyzing crypto markets and on-chain data. Your primary goal is to provide a concise (around 150-200 words), data-driven, integrated basic analysis. Get straight to the point without lengthy introductions, focusing on a holistic assessment rather than a point-by-point listing. Your response must be in English.

Key Analytical Guidelines:
1.  Market Cap Evaluation (Meme Tokens):
    * < $100k USD: Extremely early, no established momentum.
    * $100k - $1M USD: Early stage, potential for significant growth.
    * $1M - $5M USD: Established interest; further growth depends on strong narratives, otherwise it might be a local top for purely speculative tokens.
    * $5M - $10M USD: Strong momentum and attention.
    * > $10M USD: Significant capital interest and out-of-circle potential, representing a relatively high point for an early-stage meme token.
2.  Activity Stats Analysis: Critically analyze trends across all six timeframes (1m, 30m, 2h, 6h, 12h, 24h) for Price Change %, Trade Volume, Wallet Activity, and Trade Counts. Evaluate trading fervor, capital flow, short-term momentum, and potential trend changes.

Note: All 'change %' figures provided for timeframes (e.g., price change %, wallet activity change %, etc.) represent a comparison to the immediately preceding period of the same duration (sequential, period-over-period change).

3.  Token Core Info Integration: Fully integrate data from Token Core Info (price, market cap, FDV, liquidity, circulating supply, total holders, etc.) to provide comprehensive background for your analysis.
4.  Risk & Opportunity Identification: Focus on identifying the 1-2 most significant potential risks and 1-2 key opportunities by *connecting insights* from different data sections (e.g., holder stats + trading data; token metrics and on-chain activity; circulation ratio + market cap/volume for supply-side risks). Justify these points clearly.
5.  Top Traders Summary Evaluation: Critically evaluate the 'Top Traders Summary'. Consider if the summary data (like total volume from top traders, identified bot count, buy/sell ratio) suggests concentrated activity, potential manipulation risk (e.g., high bot count), or genuine whale interest. This should not automatically equate to broad market interest.
6.  Internal Consistency: Ensure your analysis maintains internal consistency. If you identify significant risks based on data (e.g., high bot count in Top Traders Summary, or concerning FDV vs. Market Cap), this finding should constrain or negate overly optimistic interpretations of other metrics when evaluating conclusive indicators such as 'community interest' or 'market sentiment'. Prioritize and highlight these identified key risk factors.`;

  // 定义系统指令 - 中文版
  const systemInstructionZH = `你是一位专业的加密货币分析师，擅长分析币圈和链上数据，并给出中肯的专业建议。你的主要目标是提供一段简洁（150-200字左右）、数据驱动、综合性的基本盘分析。分析应直接切入主题，不需要冗长的引言，注重整体评估而非逐条罗列。回答必须使用中文。

核心分析准则：
1.  市值评估 (Meme代币)：
    * 低于10万美元：极早期，尚未形成势能。
    * 10万至100万美元：早期阶段，具有较大增长潜力。
    * 100万至500万美元：已获得一定关注，后续增长依赖强大叙事，否则对于纯炒作代币可能已是阶段性顶部。
    * 500万至1000万美元：显示出较强劲的势头和市场关注度。
    * 超过1000万美元：通常代表已有显著的资本关注和出圈潜力，对于早期Meme代币而言已达到一个相对较高的阶段性高点。
2.  活动数据分析 (Activity Stats)：批判性地分析所有六个时间维度（1m, 30m, 2h, 6h, 12h, 24h）的价格变化百分比、交易量、钱包活动和交易次数的变化趋势。据此评估代币的交易热度、资金流向、短期动能及潜在趋势变化。

注意：所有按时间段提供的"变化百分比"数据（如价格变化百分比、钱包活动变化百分比等）均表示与紧邻的前一个相同长度时间周期相比的环比变化。

3.  代币核心信息整合：在综合评估时，充分结合代币核心信息（Token Core Info）中的各项数据（如价格、市值、FDV、流动性、流通供应量、总持有者数量等），为你的分析提供全面的背景。
4.  风险与机遇识别：请着重于通过关联不同维度的数据（例如，结合持有者分析与交易数据；结合代币指标与链上活动；结合流通比例与市值/交易量评估供应侧风险）来识别 1-2 个最主要的潜在风险和 1-2 个关键机会，并清晰阐述判断依据。
5.  顶级交易者摘要评估：请批判性地评估'顶级交易者摘要'。考察摘要数据（如顶级交易者的总交易量、已识别的机器人数量、买卖比例）是否暗示了交易活动高度集中、潜在的市场操纵风险（例如，高机器人占比），或者仅仅是真实的大户兴趣。这不应自动等同于广泛的市场兴趣。
6.  内部一致性：请确保你的分析保持内部一致性。如果你根据数据识别出了显著风险（例如顶级交易者摘要中的高机器人占比，或令人担忧的FDV与市值比），那么在评估整体'社区兴趣'或'市场情绪'等结论性指标时，这一发现应当制约或否定基于其他数据得出的过于乐观的解读。优先考虑并突出这些已识别的关键风险因素。`;
  
  // 构建英文版本的prompt
  const promptEN = `Please analyze the following token data and provide your assessment:

### Token Core Info
- Name/Symbol: ${tokenOverview.name} (${tokenOverview.symbol})
- Price: ${tokenOverview.priceFormatted} (24h Change: ${tokenOverview.priceChange24h ?? 'N/A'})
- Circulating Supply: ${tokenOverview.circulatingSupplyFormatted}
${tokenOverview.circulationRatio !== null ? `- Circulation Ratio: ${tokenOverview.circulationRatio}%` : ''}
- LP Liquidity: ${tokenOverview.liquidityFormatted ?? 'N/A'}
- Market Cap: ${tokenOverview.marketCapFormatted ?? 'N/A'}
- FDV: ${tokenOverview.fdvFormatted ?? 'N/A'}
${solanaHoldersTotalEN ? `${solanaHoldersTotalEN}` : ''}
- Possible Spam: ${metadata?.possible_spam ? 'Yes' : 'No'}
- Security Score: ${metadata?.security_score || 'Unknown'}

${holderInfoEN}

${Object.keys(priceChanges).length > 0 ? `
### Price Change % by Timeframe
Note: "1m" = 1 minute, "30m" = 30 minutes, "2h" = 2 hours, "6h" = 6 hours, "12h" = 12 hours, "24h" = 24 hours
${Object.entries(priceChanges)
  .map(([tf, value]) => `- ${tf}: ${value}`)
  .join('\n')}` : ''}
${Object.keys(tradeVolumes).length > 0 ? `
### Trade Volume by Timeframe
${Object.entries(tradeVolumes)
  .map(([tf, { buy, sell }]) => `- ${tf}: Buy ${buy} / Sell ${sell}`)
  .join('\n')}` : ''}
${Object.keys(walletActivity).length > 0 ? `
### Wallet Activity by Timeframe
${Object.entries(walletActivity)
  .map(([tf, { count, change }]) => `- ${tf}: ${count || 'N/A'} wallets (${change || 'N/A'} change)`)
  .join('\n')}` : ''}
${Object.keys(tradeCounts).length > 0 ? `
### Trade Counts by Timeframe
${Object.entries(tradeCounts)
  .map(([tf, { buys, sells }]) => `- ${tf}: ${buys || 'N/A'} buys / ${sells || 'N/A'} sells`)
  .join('\n')}` : ''}

${topTradersSummaryEN}

Based on the data provided, and adhering to your established analytical guidelines, provide your assessment.`;

  // 构建中文版本的prompt
  const promptZH = `请分析以下代币数据并给出您的评估：

### 代币核心信息
- 名称/符号: ${tokenOverview.name} (${tokenOverview.symbol})
- 价格: ${tokenOverview.priceFormatted} (24h 变化: ${tokenOverview.priceChange24h ?? 'N/A'})
- 流通供应量: ${tokenOverview.circulatingSupplyFormatted}
${tokenOverview.circulationRatio !== null ? `- 流通比例: ${tokenOverview.circulationRatio}%` : ''}
- LP 流动性: ${tokenOverview.liquidityFormatted ?? 'N/A'}
- 市值: ${tokenOverview.marketCapFormatted ?? 'N/A'}
- 完全稀释估值 (FDV): ${tokenOverview.fdvFormatted ?? 'N/A'}
${solanaHoldersTotalZH ? `${solanaHoldersTotalZH}` : ''}
- 可能为垃圾币: ${metadata?.possible_spam ? '是' : '否'}
- 安全评分: ${metadata?.security_score || '未知'}

${holderInfoZH}

${Object.keys(priceChanges).length > 0 ? `
### 各时间段价格变化百分比
注意："1m" = 1分钟, "30m" = 30分钟, "2h" = 2小时, "6h" = 6小时, "12h" = 12小时, "24h" = 24小时
${Object.entries(priceChanges)
  .map(([tf, value]) => `- ${tf}: ${value}`)
  .join('\n')}` : ''}
${Object.keys(tradeVolumes).length > 0 ? `
### 各时间段交易量
${Object.entries(tradeVolumes)
  .map(([tf, { buy, sell }]) => `- ${tf}: 买入 ${buy} / 卖出 ${sell}`)
  .join('\n')}` : ''}
${Object.keys(walletActivity).length > 0 ? `
### 各时间段钱包活动
${Object.entries(walletActivity)
  .map(([tf, { count, change }]) => `- ${tf}: ${count || 'N/A'} 钱包数 (${change || 'N/A'} 变化)`)
  .join('\n')}` : ''}
${Object.keys(tradeCounts).length > 0 ? `
### 各时间段交易次数
${Object.entries(tradeCounts)
  .map(([tf, { buys, sells }]) => `- ${tf}: ${buys || 'N/A'} 买入 / ${sells || 'N/A'} 卖出`)
  .join('\n')}` : ''}

${topTradersSummaryZH}

请基于以上所有数据，并严格遵循您已知的分析准则，给出您的评估。`;

  // 根据请求的语言选择相应的system instruction和prompt
  const selectedSystemInstruction = lang === 'en' ? systemInstructionEN : systemInstructionZH;
  const selectedUserPrompt = lang === 'en' ? promptEN : promptZH;
  
  console.log(`[aiService] Preparing to call Gemini. Language: ${lang}`);
  
  // 安全地打印 System Instruction 的长度
  if (selectedSystemInstruction && typeof selectedSystemInstruction === 'string') {
    console.log(`[aiService] Selected System Instruction Length: ${selectedSystemInstruction.length}`);
  } else {
    console.log(`[aiService] Selected System Instruction is undefined, null, or not a string.`);
  }
  
  console.log(`[aiService] Selected User Prompt Length: ${selectedUserPrompt ? selectedUserPrompt.length : 0}`);

  // --- 打印完整的 System Instruction ---
  console.log("========== FULL SYSTEM INSTRUCTION FOR GEMINI (START) ==========");
  if (selectedSystemInstruction && typeof selectedSystemInstruction === 'string') {
    process.stdout.write(selectedSystemInstruction + '\n\n'); // 加两个换行符以作清晰分隔
  } else {
    process.stdout.write("System Instruction IS UNDEFINED OR EMPTY\n\n");
  }
  console.log("========== FULL SYSTEM INSTRUCTION FOR GEMINI (END) ==========");

  // --- 打印完整的 User Prompt (这部分用户反馈已能看到，保持即可) ---
  console.log("========== FULL USER PROMPT FOR GEMINI (START) ==========");
  if (selectedUserPrompt && typeof selectedUserPrompt === 'string') {
    process.stdout.write(selectedUserPrompt + '\n');
  } else {
    process.stdout.write("User Prompt IS UNDEFINED OR EMPTY\n");
  }
  console.log("========== FULL USER PROMPT FOR GEMINI (END) ==========");
  
  // 使用Gemini API，传递systemInstruction和userPrompt
  try {
    console.log('[aiService] Calling Gemini API via generateGeminiAnalysis...');
    const result = await generateGeminiAnalysis(selectedSystemInstruction, selectedUserPrompt);
    console.log('[aiService] Gemini API call finished.');
    
    if (result.success) {
      console.log('[aiService] generateBasicAnalysis finished, returning successful result.');
      console.log('[aiService] Final AI analysis length:', result.analysis ? result.analysis.length : 0);
      
      // 确保透传 usageMetadata
      return {
        success: true,
        analysis: result.analysis,
        usageMetadata: result.usageMetadata // 透传 usageMetadata
      };
    } else {
      console.error('[aiService] generateBasicAnalysis finished with error:', result.error);
      return result;
    }
  } catch (error) {
    console.error('[aiService] ERROR during Gemini API call:', error);
    throw error; // Re-throw after logging
  }
}

/**
 * 兼容性函数 - 旧版Grok API函数的别名，现在转向使用Gemini
 * 这个函数保持旧的函数签名不变，但内部实现已迁移到Gemini API
 * @param {string} prompt - 发送给AI的提示
 * @returns {Promise<{success: boolean, analysis?: string, error?: string, details?: string, usageMetadata?: object}>}
 */
async function generateGrokAnalysis(prompt) {
  console.log('[aiService] 兼容性调用: generateGrokAnalysis 已重定向到 generateGeminiAnalysis');
  
  // 确定提示语言，默认使用英文系统指令
  const isEnglishPrompt = prompt.includes("in English") || prompt.includes("English") || prompt.includes("Please provide");
  
  // 创建基于检测语言的系统消息
  const systemInstruction = isEnglishPrompt
    ? `You are a professional cryptocurrency analyst specializing in analyzing crypto markets and on-chain data. Provide concise, data-focused analysis with clear professional insights. Get straight to the point without lengthy introductions. Your response must be in English.

Please ensure your analysis maintains internal consistency. If you identify significant risks based on \`topTraders\` data (such as extensive bot activity or potential manipulation), this finding should **constrain or negate** overly optimistic interpretations of other metrics like trader count when evaluating conclusive indicators such as 'community interest' or 'market sentiment'. **Prioritize** and highlight these identified key risk factors, avoiding contradictory conclusions across different parts of the analysis or in the final summary.`
    : `你是一位专业的加密货币分析师，擅长分析币圈和链上数据，并给出中肯的专业建议。分析时应注重数据，讲究专业性，输出内容简洁明了，易于理解。回答要直接切入主题，不需要冗长的引言，只需提供核心观点和结论。回答必须使用中文。

请确保你的分析保持内部一致性。如果你根据 \`topTraders\` 数据识别出了显著风险（例如大量机器人活动或潜在操纵），那么在评估整体'社区兴趣'或'市场情绪'等结论性指标时，这一发现应当**制约或否定**基于其他数据（如交易者数量）得出的过于乐观的解读。**优先考虑**并突出这些已识别的关键风险因素，避免在分析的不同部分或最终总结中出现自相矛盾的结论。`;
  
  // 调用generateGeminiAnalysis，传递systemInstruction和用户提示
  // 返回结果中将包含 usageMetadata
  return generateGeminiAnalysis(systemInstruction, prompt);
}

// Keep the deprecated alias for backward compatibility if needed, but point it to Grok
// function generateAnalysis(prompt, contextDataString = '') {
//   console.warn('使用已弃用的generateAnalysis函数。请直接使用generateGrokAnalysis。');
//   return generateGrokAnalysis(prompt); // ContextDataString is not used by Grok prompt structure here
// }

/**
 * 测试Gemini API连接
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function testGeminiConnection() {
  console.log('[GeminiService] Testing Gemini API connection...');
  
  if (!genAI || !geminiApiKey) {
    return {
      success: false,
      error: 'API密钥未设置或AI客户端未初始化',
      message: '请在.env文件中设置GEMINI_API_KEY'
    };
  }
  
  const geminiModelNameForTest = "gemini-2.5-pro-preview-05-06";
  
  try {
    // 为测试获取一个配置好的模型实例
    const testModel = genAI.getGenerativeModel({
      model: geminiModelNameForTest,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 50,
      },
      httpOptions: {
        timeout: 60000
      }
    });
    
    const prompt = "Hello, this is a connection test. Please respond with 'Connection successful!' if you can process this request.";
    
    const result = await testModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('[GeminiService] Connection test successful.');
    
    return {
      success: true,
      message: 'Gemini API连接成功'
    };
  } catch (error) {
    console.error('[GeminiService] Connection test failed:', error);
    
    return {
      success: false,
      error: '连接测试失败',
      message: error.message || '未知错误'
    };
  }
}

/**
 * 使用Gemini API生成文本分析
 * @param {string} systemInstruction - 系统指令，定义AI的角色和行为准则
 * @param {string} userPrompt - 用户提示，包含具体的分析请求和数据
 * @returns {Promise<{success: boolean, analysis?: string, error?: string, details?: string, usageMetadata?: object}>}
 */
async function generateGeminiAnalysis(systemInstruction, userPrompt) {
  console.log('===== 开始 Gemini AI 分析 =====');
  console.log('API Key设置状态:', !!geminiApiKey);
  
  if (!genAI || !geminiApiKey) {
    console.error('Gemini AI client 未初始化 (API Key 可能缺失)!');
    return {
      success: false,
      error: 'Gemini API密钥未配置或客户端未初始化',
      details: '请在backend目录根目录下创建.env文件，并添加GEMINI_API_KEY=your_api_key'
    };
  }
  
  // 如果只提供了一个参数，那么它被视为用户提示
  if (userPrompt === undefined) {
    userPrompt = systemInstruction;
    systemInstruction = undefined;
  }
  
  // 保留简短的提示信息
  console.log(`User Prompt长度: ${userPrompt.length} 字符`);
  
  const geminiModelName = "gemini-2.5-pro-preview-05-06";
  
  try {
    console.log('[GeminiService] 发送请求到Gemini API...');
    
    // 在调用时动态配置模型，特别是 systemInstruction
    const modelInstance = genAI.getGenerativeModel({
      model: geminiModelName,
      systemInstruction: systemInstruction, // 直接传递 systemInstruction 字符串
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
      // 设置较长的超时时间 (60秒)
      httpOptions: {
        timeout: 60000 // 60秒超时
      }
    });
    
    console.log(`[GeminiService] 使用模型: ${geminiModelName}`);
    
    // 添加详细请求Payload日志
    console.log("========== Gemini API Request Payload Detail START ==========");
    console.log("Model Used (configured in getGenerativeModel):", geminiModelName);
    console.log("System Instruction (configured in getGenerativeModel - first 200 chars):", systemInstruction ? systemInstruction.substring(0, 200) + '...' : "N/A");
    // 注释掉打印User Prompt预览的日志
    // console.log("User Prompt (passed to generateContent - first 500 chars):", userPrompt ? userPrompt.substring(0, 500) + '...' : "N/A");
    console.log("Full User Prompt Length (chars):", userPrompt ? userPrompt.length : 0);
    
    const modelConfigForLog = {
      model: geminiModelName,
      systemInstruction_length: systemInstruction ? systemInstruction.length : 0,
      safetySettings_from_code: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      generationConfig_from_code: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
      httpOptions_from_code: { timeout: 60000 }
    };
    console.log("Model Configuration Used:", JSON.stringify(modelConfigForLog, null, 2));
    console.log("========== Gemini API Request Payload Detail END ==========");
    
    // 调用Gemini API - 现在只传递 userPrompt
    const result = await modelInstance.generateContent(userPrompt);
    const response = await result.response;
    
    if (!response) {
      console.error('[GeminiService] CRITICAL: Response object is undefined after result.response. This should not happen if API call was successful.');
      return { success: false, error: "Gemini API response object is undefined.", details: "result.response was undefined." };
    }
    
    // 保留完成原因日志，这对调试很有用
    const finishReason = response.candidates && response.candidates[0] ? response.candidates[0].finishReason : "N/A";
    console.log('[GeminiService] Finish Reason:', finishReason);
    
    // 仅在有提示反馈时记录提示反馈
    if (response.promptFeedback) {
      console.log('[GeminiService] Prompt Feedback available, reason:', response.promptFeedback.blockReason || 'N/A');
    }
    
    const text = response.text();
    const usageMetadata = response.usageMetadata || null; // 获取 usageMetadata
    
    console.log('[GeminiService] Token Usage:', JSON.stringify(usageMetadata, null, 2));
    
    console.log('成功从Gemini API获取响应!');
    console.log('响应预览:', text.substring(0, 50) + '...');
    console.log('AI响应完整长度:', text.length);
    
    return {
      success: true,
      analysis: text,
      usageMetadata: usageMetadata // 添加 usageMetadata 到返回对象中
    };
    
  } catch (error) {
    console.error('[GeminiService] Gemini API调用失败:', error);
    
    let errorMessage = 'Gemini API调用失败';
    let errorDetails = error.message || '未知错误';
    
    // 检查特定类型的错误
    if (error.message && error.message.includes('safety')) {
      errorMessage = 'Gemini安全过滤触发';
      errorDetails = '提示内容可能触发了Gemini的内容安全过滤';
    } else if (error.message && error.message.includes('rate limit')) {
      errorMessage = 'Gemini API限流';
      errorDetails = '已达到API调用限制，请稍后再试';
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Gemini API请求超时';
      errorDetails = '请求超时，可能是服务器负载过高';
    }
    
    return {
      success: false,
      error: errorMessage,
      details: errorDetails
    };
  }
}

module.exports = {
  // generateAnalysis, // Deprecated alias removed
  generateGrokAnalysis,
  generateBasicAnalysis,
  generateGeminiAnalysis,
  testGeminiConnection
};

console.log("=========================================");
console.log("Successfully exported functions from aiAnalysisService.js:");
console.log("- generateGrokAnalysis: ", typeof generateGrokAnalysis);
console.log("- generateBasicAnalysis: ", typeof generateBasicAnalysis);
console.log("- generateGeminiAnalysis: ", typeof generateGeminiAnalysis);
console.log("- testGeminiConnection: ", typeof testGeminiConnection);
console.log("=========================================");
