const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");

dotenv.config({ path: path.resolve(__dirname, '../', '.env') });

const grokApiKey = process.env.XAI_API_KEY;

console.log("=========================================");
console.log("Loading aiAnalysisService.js");
console.log("=========================================");

// 尝试的模型和API组合顺序
const API_CONFIGS = [
  {
    name: "X.AI API (grok models)",
    baseUrl: "https://api.x.ai/v1",
    models: ["grok-1.5-turbo", "grok-1", "grok-0", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
  }
];

/**
 * 使用可用的AI模型生成文本分析
 * @param {string} prompt - 发送给AI的提示
 * @returns {Promise<{success: boolean, analysis?: string, error?: string, details?: string}>}
 */
async function generateGrokAnalysis(prompt) {
  console.log('===== 开始 AI 分析 =====');
  console.log('API Key设置状态:', !!grokApiKey);

  if (!grokApiKey) {
    console.error('API密钥未设置!');
    return {
      success: false,
      error: 'API密钥未配置',
      details: '请在backend目录根目录下创建.env文件，并添加XAI_API_KEY=your_api_key'
    };
  }

  console.log(`Prompt长度: ${prompt.length} 字符`);
  console.log('Prompt前50个字符:', prompt.substring(0, 50));

  // 基本请求设置
  let lastError = null;
  let lastErrorDetails = null;

  // 遍历所有API配置
  for (const apiConfig of API_CONFIGS) {
    console.log(`尝试使用 ${apiConfig.name}...`);
    
    // 尝试获取可用模型列表
    let availableModels = [];
    try {
      console.log(`检索 ${apiConfig.baseUrl}/models 的可用模型...`);
      const modelsResponse = await axios.get(`${apiConfig.baseUrl}/models`, {
        headers: { 
          'Authorization': `Bearer ${grokApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (modelsResponse.data && Array.isArray(modelsResponse.data.data)) {
        availableModels = modelsResponse.data.data
          .map(model => typeof model === 'object' ? (model.id || model.name) : model)
          .filter(Boolean);
        
        console.log('检测到可用模型:', availableModels);
      } else {
        console.log('无法从API获取有效的模型列表，将使用预定义列表');
      }
    } catch (modelsError) {
      console.log(`获取 ${apiConfig.baseUrl}/models 模型列表失败:`, modelsError.message);
    }
    
    // 如果没有获取到有效的模型列表，使用预定义的列表
    if (!availableModels.length) {
      availableModels = apiConfig.models;
    }
    
    // 遍历该API配置支持的所有模型
    for (const modelName of availableModels) {
      // 使用带有重试的异步函数
      const result = await tryModelWithRetry(apiConfig.baseUrl, modelName, prompt, grokApiKey);
      if (result.success) {
        return result;
      } else {
        lastError = result.error;
        lastErrorDetails = result.details;
        console.log(`模型 ${modelName} 失败: ${result.error}`);
      }
    }
  }
  
  // 如果所有尝试都失败，返回最后一个错误
  return {
    success: false,
    error: lastError || 'All model attempts failed',
    details: lastErrorDetails || 'No additional error details available'
  };
}

/**
 * 尝试使用指定模型发送请求，包含重试逻辑
 */
async function tryModelWithRetry(baseUrl, modelName, prompt, apiKey, maxRetries = 2) {
  console.log(`尝试使用模型 ${modelName}...`);
  
  let lastError = null;
  let retryCount = 0;
  
  // Determine the language of the prompt by checking for English keywords
  const isEnglishPrompt = prompt.includes("in English") || prompt.includes("English") || prompt.includes("Please provide");
  console.log(`Detected prompt language: ${isEnglishPrompt ? 'English' : 'Chinese'}`);
  
  // Create an appropriate system message based on detected language
  const systemMessage = isEnglishPrompt
    ? `You are a professional cryptocurrency analyst specializing in analyzing crypto markets and on-chain data. Provide concise, data-focused analysis with clear professional insights. Get straight to the point without lengthy introductions. Your response must be in English.

Please ensure your analysis maintains internal consistency. If you identify significant risks based on \`topTraders\` data (such as extensive bot activity or potential manipulation), this finding should **constrain or negate** overly optimistic interpretations of other metrics like trader count when evaluating conclusive indicators such as 'community interest' or 'market sentiment'. **Prioritize** and highlight these identified key risk factors, avoiding contradictory conclusions across different parts of the analysis or in the final summary.`
    : `你是一位专业的加密货币分析师，擅长分析币圈和链上数据，并给出中肯的专业建议。分析时应注重数据，讲究专业性，输出内容简洁明了，易于理解。回答要直接切入主题，不需要冗长的引言，只需提供核心观点和结论。回答必须使用中文。

请确保你的分析保持内部一致性。如果你根据 \`topTraders\` 数据识别出了显著风险（例如大量机器人活动或潜在操纵），那么在评估整体'社区兴趣'或'市场情绪'等结论性指标时，这一发现应当**制约或否定**基于其他数据（如交易者数量）得出的过于乐观的解读。**优先考虑**并突出这些已识别的关键风险因素，避免在分析的不同部分或最终总结中出现自相矛盾的结论。`;
  
  while (retryCount <= maxRetries) {
    try {
      // 构建payload - 使用基本OpenAI兼容结构
      const payload = {
        model: modelName,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 600,
        stream: false
      };
      
      // X.AI可能使用不同的参数
      if (baseUrl.includes('x.ai')) {
        // 如果是X.AI API，可能有不同的参数结构
        payload.generationConfig = {
          temperature: 0.7,
          maxOutputTokens: 800 // 显著增加Token上限以容纳更长的社区分析和价格分析
        };
        delete payload.temperature;
        delete payload.max_tokens;
      }
      
      const requestConfig = {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 120秒超时
      };
      
      console.log(`[aiService] Preparing to call ${baseUrl}/chat/completions with model ${modelName}`);
      console.log('[aiService] Calling external AI API...');
      
      const response = await axios.post(`${baseUrl}/chat/completions`, payload, requestConfig);
      console.log('[aiService] External AI API call finished.');
      
      // 解析响应
      let responseText = '';
      
      // 尝试典型的OpenAI响应格式
      if (response.data.choices && response.data.choices[0]) {
        if (response.data.choices[0].message && response.data.choices[0].message.content) {
          responseText = response.data.choices[0].message.content;
        } else if (response.data.choices[0].text) {
          responseText = response.data.choices[0].text;
        }
      }
      
      // 处理可能的替代响应格式
      if (!responseText && response.data.output) {
        responseText = response.data.output;
      }
      
      if (!responseText) {
        console.log('警告: 无法从响应中提取文本内容，尝试记录完整响应以进行调试');
        console.log('响应结构:', JSON.stringify(response.data, null, 2));
        throw new Error('无法从API响应中提取文本内容');
      }
      
      console.log('成功从API获取响应!');
      console.log('响应预览:', responseText.substring(0, 50) + '...');
      
      return {
        success: true,
        analysis: responseText
      };
    } catch (error) {
      lastError = error;
      retryCount++;
      
      if (retryCount <= maxRetries) {
        console.log(`模型 ${modelName} 请求失败，重试 ${retryCount}/${maxRetries}...`);
        // 增加延迟，避免过快地重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      } else {
        console.log(`模型 ${modelName} 已达到最大重试次数(${maxRetries})，放弃`);
        
        let errorMessage = `调用模型 ${modelName} 失败`;
        let errorDetails = error.message || '未知错误';
        
        if (error.response) {
          errorMessage = `API错误 (HTTP ${error.response.status})`;
          errorDetails = JSON.stringify(error.response.data);
          console.error('API错误详情:', error.response.status, error.response.data);
        } else if (error.request) {
          errorMessage = '未收到API响应';
          errorDetails = '请求已发送但没有收到响应';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'API请求超时';
          errorDetails = '请求超时，可能是服务器负载过高';
        }
        
        return {
          success: false,
          error: errorMessage,
          details: errorDetails
        };
      }
    }
  }
  
  // 这里不应该到达，但以防万一
  return {
    success: false,
    error: '未知错误',
    details: '重试循环结束但没有返回结果'
  };
}

/**
 * 生成代币基本盘分析
 * @param {Object} tokenData - 所有代币相关数据
 * @param {string} lang - 请求的语言，默认为'zh'（中文）
 * @returns {Promise<{success: boolean, analysis?: string, error?: string, details?: string}>}
 */
async function generateBasicAnalysis(tokenData, lang = 'zh') {
  console.log(`[aiService] generateBasicAnalysis started. Lang:`, lang);
  
  // 提取所需数据
  const { tokenOverview, holderStats, metadata, tokenAnalytics, topTraders } = tokenData;
  
  if (!tokenOverview || !holderStats) {
    return {
      success: false,
      error: '缺少基本数据',
      details: '缺少必要的代币数据或持有者数据'
    };
  }
  
  // 构建英文版本的prompt
  const promptEN = `Please provide a concise (300-400 words) integrated basic analysis **in English** based on the following token data. Please merge insights from all aspects and do not list analysis points one by one.

### Token Core Info
- Name/Symbol: ${tokenOverview.name} (${tokenOverview.symbol})
- Price: ${tokenOverview.priceFormatted} (24h Change: ${tokenOverview.priceChange24h ?? 'N/A'})
- Circulating Supply: ${tokenOverview.circulatingSupplyFormatted}
- LP Liquidity: ${tokenOverview.liquidityFormatted ?? 'N/A'}
- Market Cap: ${tokenOverview.marketCapFormatted ?? 'N/A'}
- FDV: ${tokenOverview.fdvFormatted ?? 'N/A'}
- Possible Spam: ${metadata?.possible_spam ? 'Yes' : 'No'}
- Security Score: ${metadata?.security_score || 'Unknown'} (Verified Contract: ${metadata?.verified_contract ? 'Yes' : 'No'})

### Holder Analysis (from /holders endpoint)
- Total Holders: ${holderStats?.totalHolders || 'Unknown'}
- 30d Holder Change: ${holderStats?.holderChange?.['30d']?.changePercent || 0}%
- Top 10 Supply %: ${holderStats?.holderSupply?.top10?.supplyPercent || 'Unknown'}%
- Holder Distribution: Whales: ${holderStats?.holderDistribution?.whales || 0}, Shrimps: ${holderStats?.holderDistribution?.shrimps || 0}
- Main Acquisition: ${holderStats?.holdersByAcquisition ? 
    Object.entries(holderStats.holdersByAcquisition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([method, count]) => `${method}: ${count}`)
    .join(', ') : 'Unknown'}

### Trading Activity
- 24h Buyers/Sellers: ${tokenAnalytics?.totalBuyers?.['24h'] || 0} / ${tokenAnalytics?.totalSellers?.['24h'] || 0}
- 24h Buy/Sell Orders: ${tokenAnalytics?.totalBuys?.['24h'] || 0} / ${tokenAnalytics?.totalSells?.['24h'] || 0}
- Top Trader: ${topTraders?.[0] ? 
    `Trade Count: ${topTraders[0].trade}, Buy/Sell: ${topTraders[0].tradeBuy}/${topTraders[0].tradeSell}, ${
        topTraders[0].tags?.length ? 'Tags: ' + topTraders[0].tags.join(', ') : ''
    }` : 'No data'}

### Community Links
${metadata?.social_links ? Object.entries(metadata.social_links)
    .filter(([key, value]) => value && key !== 'moralis')
    .map(([key, value]) => `- ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
    .join('\n') : '- No community links data'}

Based on all the information above, provide an overall fundamental assessment **in English**. Focus on identifying the 1-2 most significant potential risks and 1-2 key opportunities by *connecting insights* from different data sections (e.g., holder concentration + trading data; security score + market cap). Justify these points clearly. Regarding community links, only note their presence and do not infer activity levels solely from them; correlate with holder/trader data cautiously if applicable. **Critically evaluate 'Trading Activity': consider the \`Top Trader\` tags. High transaction volume or counts dominated by bots (\`sniper-bot\`, \`bot\`) may indicate artificial liquidity or manipulation risk, NOT necessarily genuine market interest; explicitly correlate this finding with holder concentration or other risk factors.** Avoid simply summarizing each section and strive for insightful judgment based on the combined data.`;

  // 构建中文版本的prompt
  const promptZH = `请基于以下提供的代币数据，生成一段简洁（300-400字）、综合性的基本盘分析。请融合对各方面信息的考量，不要逐条罗列分析点。**请使用中文回答**。

### 代币核心信息
- 名称/符号: ${tokenOverview.name} (${tokenOverview.symbol})
- 价格: ${tokenOverview.priceFormatted} (24h 变化: ${tokenOverview.priceChange24h ?? 'N/A'})
- 流通供应量: ${tokenOverview.circulatingSupplyFormatted}
- LP 流动性: ${tokenOverview.liquidityFormatted ?? 'N/A'}
- 市值: ${tokenOverview.marketCapFormatted ?? 'N/A'}
- 完全稀释估值 (FDV): ${tokenOverview.fdvFormatted ?? 'N/A'}
- 可能为垃圾币: ${metadata?.possible_spam ? '是' : '否'}
- 安全评分: ${metadata?.security_score || '未知'} (合约已验证: ${metadata?.verified_contract ? '是' : '否'})

### 持有者分析 (来自 /holders 端点)
- 总持有者: ${holderStats?.totalHolders || '未知'}
- 30天持有者变化: ${holderStats?.holderChange?.['30d']?.changePercent || 0}%
- Top 10 持仓占比: ${holderStats?.holderSupply?.top10?.supplyPercent || '未知'}%
- 持有者分布: 鲸鱼: ${holderStats?.holderDistribution?.whales || 0}, 虾: ${holderStats?.holderDistribution?.shrimps || 0}
- 主要获取方式: ${holderStats?.holdersByAcquisition ? 
    Object.entries(holderStats.holdersByAcquisition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([method, count]) => `${method}: ${count}`)
    .join(', ') : '未知'}

### 交易分析
- 24h 买家/卖家数: ${tokenAnalytics?.totalBuyers?.['24h'] || 0} / ${tokenAnalytics?.totalSellers?.['24h'] || 0}
- 24h 买/卖次数: ${tokenAnalytics?.totalBuys?.['24h'] || 0} / ${tokenAnalytics?.totalSells?.['24h'] || 0}
- Top Trader: ${topTraders?.[0] ? 
    `交易次数: ${topTraders[0].trade}, 买/卖: ${topTraders[0].tradeBuy}/${topTraders[0].tradeSell}, ${
        topTraders[0].tags?.length ? '标签: ' + topTraders[0].tags.join(', ') : ''
    }` : '无数据'}

### 社区链接
${metadata?.social_links ? Object.entries(metadata.social_links)
    .filter(([key, value]) => value && key !== 'moralis')
    .map(([key, value]) => `- ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
    .join('\n') : '- 无社区链接数据'}

根据以上所有信息，请给出整体的基本面评估。**请用中文回答**。请着重于通过**关联不同维度的数据**（例如，结合持有者集中度与交易数据；结合安全评分与市值等）来识别 1-2 个最主要的**潜在风险**和 1-2 个**关键机会**，并清晰阐述判断依据。关于社区链接，仅需提及存在与否，**切勿**仅凭链接推断社区活跃度或情绪；如果适用，可谨慎地将持有者增长或交易者数量多作为社区兴趣的*间接*指标进行关联。**请批判性地评估'交易分析'数据：务必考虑 Top Trader 的标签（特别是 \`sniper-bot\`, \`bot\`）。由机器人主导的高频交易或大量的买卖次数，可能暗示人为流动性或操纵风险，而*不一定*代表真实的市场兴趣；请将此发现与持有者集中度或其他风险因素明确关联。**最终评估应避免简单罗列各部分结论，力求提供基于全局信息的、**有洞察力的判断**。`;

  // 根据请求的语言选择相应的prompt
  const finalPrompt = lang === 'en' ? promptEN : promptZH;
  console.log(`[aiService] Prompt prepared. Length: ${finalPrompt.length}, Language: ${lang}`);
  
  // 使用现有函数发送到Grok API
  try {
    console.log('[aiService] Calling external AI API via generateGrokAnalysis...');
    const result = await generateGrokAnalysis(finalPrompt);
    console.log('[aiService] External AI API call finished.');
    
    if (result.success) {
      console.log('[aiService] generateBasicAnalysis finished, returning successful result.');
      return result;
    } else {
      console.error('[aiService] generateBasicAnalysis finished with error:', result.error);
      return result;
    }
  } catch (error) {
    console.error('[aiService] ERROR during external AI API call:', error);
    throw error; // Re-throw after logging
  }
}

// Keep the deprecated alias for backward compatibility if needed, but point it to Grok
// function generateAnalysis(prompt, contextDataString = '') {
//   console.warn('使用已弃用的generateAnalysis函数。请直接使用generateGrokAnalysis。');
//   return generateGrokAnalysis(prompt); // ContextDataString is not used by Grok prompt structure here
// }

module.exports = {
  // generateAnalysis, // Deprecated alias removed
  generateGrokAnalysis,
  generateBasicAnalysis
};

console.log("=========================================");
console.log("Successfully exported functions from aiAnalysisService.js:");
console.log("- generateGrokAnalysis: ", typeof generateGrokAnalysis);
console.log("- generateBasicAnalysis: ", typeof generateBasicAnalysis);
console.log("=========================================");
