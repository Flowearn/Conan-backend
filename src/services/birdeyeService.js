const axios = require('axios');
// dotenv should be configured in index.js

const apiKey = process.env.BIRDEYE_API_KEY;
const birdeyeApiBaseUrl = 'https://public-api.birdeye.so'; 

async function testBirdeyeConnection() {
  console.log('Attempting to test Birdeye connection...');
  if (!apiKey) {
    const errorMsg = 'Birdeye API Key not found in environment variables.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    // 使用一个已知的、流动性好的代币地址进行测试，例如 BSC 上的 WBNB
    const endpoint = '/defi/price';
    const testTokenAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'; // WBNB 
    console.log(`Making Birdeye API call to: ${endpoint}?address=${testTokenAddress}`);

    const response = await axios.get(`${birdeyeApiBaseUrl}${endpoint}`, {
      headers: {
        'X-API-KEY': apiKey, // Birdeye 要求 Key 在 Header 'X-API-KEY' 中
        'Accept': 'application/json',
        'x-chain': 'bsc' // 通过 HTTP 头部指定区块链
      },
      params: {
        address: testTokenAddress
      },
      timeout: 30000 // 30 秒超时
    });

    console.log('Received response from Birdeye API:', response.data); 

    // Birdeye 成功响应通常包含 data 对象且有 value 字段
    if (response.data && response.data.data && typeof response.data.data.value !== 'undefined') {
       console.log('Birdeye API connection successful.');
       return { 
          success: true, 
          message: 'Birdeye API connection successful!', 
          data: response.data.data // 返回价格信息等
       }; 
    } else {
      // 处理 Birdeye 可能返回的错误或空数据
      const errorDetail = response.data?.message || JSON.stringify(response.data) || 'Unknown Birdeye API error format';
      console.error('Birdeye API returned an error or unexpected data:', errorDetail);
       return { 
          success: false, 
          error: 'Birdeye API Error', 
          details: errorDetail
       };
    }
  } catch (error) {
     // 处理网络或请求错误
     let errorDetails = error.message;
     let statusCode = null;
     if (error.response) {
        errorDetails += ` | Status: ${error.response.status} | Data: ${JSON.stringify(error.response.data)}`;
        statusCode = error.response.status; // 比如 401 (Unauthorized), 403 (Forbidden), 429 (Rate Limit)
     } else if (error.request) {
        errorDetails += ' | No response received from Birdeye API.';
     }
     console.error('Error connecting to Birdeye API:', errorDetails);
     return { 
        success: false, 
        error: 'Network or other error connecting to Birdeye', 
        details: errorDetails,
        statusCode: statusCode 
     };
  }
}

/**
 * 获取特定代币的详细数据
 * @param {string} contractAddress - 代币合约地址
 * @returns {Promise<Object>} 包含代币详细数据的对象
 */
async function getBirdeyeTokenData(contractAddress) {
  console.log(`\n=== Getting Birdeye token data for contract: ${contractAddress} ===`);
  console.log('Using Birdeye API Key (last 5 chars):', apiKey ? '...' + apiKey.slice(-5) : 'Not Found');
  
  // 尝试首先测试连接
  try {
    console.log('Testing Birdeye connection...');
    const testResult = await testBirdeyeConnection();
    console.log('Birdeye connection test result:', testResult.success ? 'Success' : 'Failed', testResult.details || '');
  } catch (testError) {
    console.error('Error testing Birdeye connection:', testError.message);
  }
  
  if (!apiKey) {
    const errorMsg = 'Birdeye API Key not found in environment variables.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    console.log(`Making Birdeye API calls to multiple endpoints for comprehensive data...`);
    
    // 尝试使用token_price端点获取价格数据
    console.log(`1. Calling price endpoint...`);
    const priceResponse = await axios.get(`${birdeyeApiBaseUrl}/defi/token_price`, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
        'x-chain': 'bsc'
      },
      params: {
        address: contractAddress
      },
      timeout: 15000
    });
    
    console.log(`Price endpoint response status:`, priceResponse.status);
    console.log(`Price endpoint response data:`, JSON.stringify(priceResponse.data, null, 2));
    
    // 继续执行主API调用
    console.log(`2. Calling main token_data endpoint...`);
    // 使用 token_overview 端点获取更详细的代币数据
    const endpoint = '/defi/token_overview';
    
    // 将合约地址转换为全小写
    // const lowerCaseAddress = contractAddress.toLowerCase();
    console.log(`Making Birdeye API call to: ${endpoint}?address=${contractAddress}`);

    const response = await axios.get(`${birdeyeApiBaseUrl}${endpoint}`, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
        'x-chain': 'bsc' // 指定BSC区块链
      },
      params: {
        address: contractAddress // 使用原始地址，不转换为小写
      },
      timeout: 30000 // 30 秒超时
    });

    console.log('Received token data response from Birdeye API:', JSON.stringify(response.data).substring(0, 500) + '...');

    // 检查响应是否成功
    if (response.data && response.data.success === true && response.data.data) {
      const overviewData = response.data.data;
      
      // 提取关键信息 - 注意：字段名基于常见API实践的推测，可能需要根据实际响应调整
      const tokenData = {
        symbol: overviewData.symbol,
        name: overviewData.name,
        logoURI: overviewData.logoURI,
        decimals: overviewData.decimals,
        price: overviewData.price,
        liquidity: overviewData.liquidity,
        volume24h: overviewData.v24hUSD, // 假设24小时交易量字段名
        priceChange24h: overviewData.priceChange24hPercent, // 假设24小时价格变化百分比字段名
        marketCap: overviewData.mc, // 假设市值字段名
        lastTradeUnixTime: overviewData.lastTradeUnixTime,
        holders: overviewData.holders,
        fdv: overviewData.fdv, // 完全稀释估值
        totalSupply: overviewData.totalSupply
      };

      console.log('Successfully parsed token overview data for:', tokenData.name || contractAddress);
      return { 
        success: true, 
        tokenData: tokenData
      };
    } else {
      // 处理 Birdeye 可能返回的错误或空数据
      const errorDetail = response.data?.message || 
                         (response.data ? JSON.stringify(response.data) : 'No data returned') || 
                         'Unknown Birdeye API error format';
      console.error('Birdeye API token_overview endpoint returned an error or unexpected data:', errorDetail);
      return { 
        success: false, 
        error: 'Birdeye Data Not Found or API Error', 
        details: errorDetail
      };
    }
  } catch (error) {
    // 处理网络或请求错误
    let errorDetails = error.message;
    let statusCode = null;
    if (error.response) {
      errorDetails += ` | Status: ${error.response.status} | Data: ${JSON.stringify(error.response.data)}`;
      statusCode = error.response.status;
      
      // 特别处理401错误，这可能表示API键没有访问此端点的权限
      if (error.response.status === 401) {
        console.error('API key may not have sufficient permissions to access the token_overview endpoint');
        errorDetails += ' | Note: This endpoint may require a higher API access tier';
      }
    } else if (error.request) {
      errorDetails += ' | No response received from Birdeye API token_overview endpoint.';
    }
    console.error('Error connecting to Birdeye API token_overview endpoint:', errorDetails);
    return { 
      success: false, 
      error: 'Network or other error connecting to Birdeye token_overview endpoint', 
      details: errorDetails,
      statusCode: statusCode 
    };
  }
}

/**
 * 获取特定代币的安全数据
 * @param {string} contractAddress - 代币合约地址
 * @returns {Promise<Object>} 包含代币安全数据的对象
 */
async function getBirdeyeTokenSecurity(contractAddress) {
  console.log(`Attempting to get Birdeye token security data for: ${contractAddress}`);
  if (!apiKey) {
    const errorMsg = 'Birdeye API Key not found in environment variables.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const endpoint = '/defi/token_security';
    // 转换合约地址为小写
    // const lowerCaseAddress = contractAddress.toLowerCase();
    console.log(`Making Birdeye API call to: ${endpoint}?address=${contractAddress}`);

    const response = await axios.get(`${birdeyeApiBaseUrl}${endpoint}`, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
        'x-chain': 'bsc' // 指定BSC区块链
      },
      params: {
        address: contractAddress // 使用原始地址，不转换为小写
      },
      timeout: 30000 // 30 秒超时
    });

    console.log('Received token security data response from Birdeye API:', JSON.stringify(response.data).substring(0, 500) + '...');

    // 检查响应是否成功
    if (response.data && response.data.success === true && response.data.data) {
      const securityData = response.data.data;
      
      // 提取安全相关字段 - 具体字段名可能需要根据实际响应调整
      const extractedSecurityData = {
        is_honeypot: securityData.is_honeypot,
        buyTax: securityData.buyTax,
        sellTax: securityData.sellTax,
        cannotSellAll: securityData.cannotSellAll,
        ownerRenounced: securityData.ownerRenounced,
        // 添加其他可能的安全相关字段
        slippage: securityData.slippage,
        riskScore: securityData.riskScore,
        transferTax: securityData.transferTax,
        holderAnalysis: securityData.holderAnalysis,
        creatorAddress: securityData.creatorAddress,
        contractVerified: securityData.contractVerified,
        mintable: securityData.mintable
      };

      console.log('Successfully parsed token security data for contract:', contractAddress);
      return { 
        success: true, 
        securityData: extractedSecurityData
      };
    } else {
      // 处理 Birdeye 可能返回的错误或空数据
      const errorDetail = response.data?.message || 
                         (response.data ? JSON.stringify(response.data) : 'No data returned') || 
                         'Unknown Birdeye API error format';
      console.error('Birdeye API token_security endpoint returned an error or unexpected data:', errorDetail);
      return { 
        success: false, 
        error: 'Birdeye Security Data Not Available or API Error', 
        details: errorDetail
      };
    }
  } catch (error) {
    // 处理网络或请求错误
    let errorDetails = error.message;
    let statusCode = null;
    if (error.response) {
      errorDetails += ` | Status: ${error.response.status} | Data: ${JSON.stringify(error.response.data)}`;
      statusCode = error.response.status;
      
      // 特别处理401错误，这可能表示API键没有访问此端点的权限
      if (error.response.status === 401) {
        console.error('API key may not have sufficient permissions to access the token_security endpoint');
        errorDetails += ' | Note: This endpoint may require a higher API access tier';
      }
    } else if (error.request) {
      errorDetails += ' | No response received from Birdeye API token_security endpoint.';
    }
    console.error('Error connecting to Birdeye API token_security endpoint:', errorDetails);
    return { 
      success: false, 
      error: 'Network or other error connecting to Birdeye token_security endpoint', 
      details: errorDetails,
      statusCode: statusCode 
    };
  }
}

/**
 * 获取Birdeye API的代币持有者数据
 * @param {string} contractAddress - 代币合约地址
 * @param {number} limit - 每页结果数量，1-100之间
 * @param {number} offset - 跳过的记录数，0-10000之间
 * @returns {Promise<Object>} - 持有者数据
 */
async function getBirdeyeTokenHolders(contractAddress, limit = 100, offset = 0) {
  try {
    console.log(`Getting Birdeye token holders for contract: ${contractAddress}`);
    
    if (!apiKey) {
      const errorMsg = 'Birdeye API Key not found in environment variables.';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // 使用正确的API端点路径
    const endpoint = '/defi/v3/token/holder';
    console.log(`Trying Birdeye endpoint: ${endpoint}`);
    
    const response = await axios.get(`${birdeyeApiBaseUrl}${endpoint}`, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
        'x-chain': 'bsc' // 通过HTTP头部指定区块链
      },
      params: {
        address: contractAddress,
        offset: offset,
        limit: limit
      },
      timeout: 30000 // 30秒超时
    });
    
    console.log(`Birdeye token holders response status: ${response.status}`);
    
    // 检查响应是否有效
    if (response.status === 200 && response.data) {
      console.log('Successfully retrieved Birdeye token holders data');
      return { 
        success: true, 
        holders: response.data.data || response.data
      };
    } else {
      console.error('Birdeye returned an unexpected response format');
      return {
        success: false,
        error: 'Birdeye Holder Data Error',
        details: 'Unexpected response format from Birdeye API'
      };
    }
  } catch (error) {
    console.error('Error fetching Birdeye token holders:', error.message);
    
    let errorDetails = error.message;
    let errorType = 'Birdeye Holder Data Error';
    
    if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data;
      
      errorDetails = `Request failed with status code ${status} | Status: ${status} | Data: ${JSON.stringify(responseData)}`;
      
      // 针对特定状态码提供更明确的错误消息
      if (status === 401 || status === 403) {
        errorType = 'Birdeye API Permission Error';
        errorDetails += ' | Note: Token Holder List API may require a higher API access tier (Starter Package or above)';
      } else if (status === 404) {
        errorType = 'Birdeye API Feature Unavailable';
        errorDetails += ' | Note: Token Holder List API may not be available for BSC chain or requires a higher API access tier';
      }
      
      console.error(`${errorType}: ${errorDetails}`);
      return { 
        success: false, 
        error: errorType, 
        details: errorDetails
      };
    } else if (error.request) {
      console.error('No response received from Birdeye API');
      return { 
        success: false, 
        error: 'Birdeye API Connection Error', 
        details: 'No response received from Birdeye API'
      };
    } else {
      return { 
        success: false, 
        error: errorType, 
        details: errorDetails
      };
    }
  }
}

/**
 * Get top traders for a token from Birdeye
 * @param {string} contractAddress - The contract address of the token
 * @param {string} timeFrame - Time frame for the data (default: '24h')
 * @param {number} limit - Number of traders to return (default: 10)
 * @param {number} offset - Offset for pagination (default: 0)
 * @param {string} sortBy - Field to sort by (default: 'volume')
 * @param {string} sortType - Sort direction (default: 'desc')
 * @returns {Promise<Object>} - Success status and top traders data or error
 */
async function getBirdeyeTopTraders(contractAddress, timeFrame = '24h', limit = 10, offset = 0, sortBy = 'volume', sortType = 'desc') {
  console.log(`Getting Birdeye top traders for contract: ${contractAddress}`);
  if (!apiKey) {
    const errorMsg = 'Birdeye API Key not found in environment variables.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    console.log(`Making Birdeye API call for top traders: ${contractAddress}`);
    console.log('Using Birdeye Key (last 5 chars):', apiKey ? '...' + apiKey.slice(-5) : 'Not Found');
    
    const response = await axios.get(`${birdeyeApiBaseUrl}/defi/v2/tokens/top_traders`, {
      params: {
        address: contractAddress,
        time_frame: timeFrame,
        limit: limit,
        offset: offset,
        sort_by: sortBy,
        sort_type: sortType
      },
      headers: {
        'X-API-KEY': apiKey,
        'x-chain': 'bsc'
      },
      timeout: 30000
    });

    console.log('Received Birdeye top traders response:', response.data);
    // 添加更详细的日志
    console.log('Birdeye getTopTraders raw response:', JSON.stringify(response.data, null, 2));

    if (response.data.success === true && Array.isArray(response.data.data.items)) {
      return {
        success: true,
        topTraders: response.data.data.items
      };
    } else {
      return {
        success: false,
        error: 'Invalid response format',
        details: 'Response data does not contain valid items array'
      };
    }
  } catch (error) {
    console.error('Birdeye Top Traders API Error:', error.message);
    if (error.response) {
      return {
        success: false,
        error: 'Birdeye API Error',
        details: error.response.data.message || error.message
      };
    }
    return {
      success: false,
      error: 'Network Error',
      details: error.message
    };
  }
}

async function getBirdeyeTokenOverview(contractAddress) {
  console.log(`\n=== Getting Birdeye token overview for contract: ${contractAddress} ===`);
  console.log('Using Birdeye API Key (last 5 chars):', apiKey ? '...' + apiKey.slice(-5) : 'Not Found');
  
  if (!apiKey) {
    const errorMsg = 'Birdeye API Key not found in environment variables.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    // 尝试使用token_price端点获取价格数据
    console.log(`1. First trying Birdeye token_price endpoint...`);
    let priceData = null;
    try {
      const priceResponse = await axios.get(`${birdeyeApiBaseUrl}/defi/token_price`, {
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
          'x-chain': 'bsc'
        },
        params: {
          address: contractAddress
        },
        timeout: 15000
      });
      
      console.log(`Price endpoint response status:`, priceResponse.status);
      if (priceResponse.data && priceResponse.data.success && priceResponse.data.data) {
        console.log('Price endpoint returned data:', JSON.stringify(priceResponse.data.data, null, 2));
        priceData = priceResponse.data.data;
      }
    } catch (priceError) {
      console.error('Error fetching from price endpoint:', priceError.message);
    }

    console.log(`2. Now trying Birdeye token_overview endpoint...`);
    const response = await axios.get(`${birdeyeApiBaseUrl}/defi/token_overview`, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
        'x-chain': 'bsc'
      },
      params: {
        address: contractAddress
      },
      timeout: 30000 // 增加超时时间到30秒
    });

    console.log(`Birdeye API response status code: ${response.status}`);
    console.log(`Birdeye API response success field: ${response.data?.success}`);
    
    if (response.data && response.data.success === true && response.data.data) {
      console.log('Birdeye overview data fields:', Object.keys(response.data.data));
      console.log('Overview contains price data?', response.data.data.price !== undefined);
      if (response.data.data.price !== undefined) {
        console.log('Overview price value:', response.data.data.price);
      }
      
      // 如果token_price端点有价格数据但overview没有，则合并数据
      if (priceData && priceData.price && (!response.data.data.price || response.data.data.price === 0)) {
        console.log('Using price data from token_price endpoint as overview price is missing or zero');
        response.data.data.price = priceData.price;
        response.data.data.priceChange24h = priceData.priceChange24h || 0;
      }
      
      return {
        success: true,
        data: response.data.data
      };
    } else {
      // 如果overview失败但有价格数据，返回简化数据
      if (priceData && priceData.price) {
        console.log('Using fallback price data from token_price endpoint');
        return {
          success: true,
          data: {
            price: priceData.price,
            priceChange24h: priceData.priceChange24h || 0,
            name: priceData.name || '',
            symbol: priceData.symbol || '',
            // 其他数据填充默认值
            liquidity: 0,
            volume24h: 0
          }
        };
      }
      
      const errorDetail = response.data?.message || 
          (response.data ? JSON.stringify(response.data).substring(0, 200) : 'No data returned');
      console.error('Birdeye API returned unsuccessful response:', errorDetail);
      return { 
        success: false, 
        error: 'Invalid or empty response from Birdeye', 
        details: errorDetail
      };
    }
  } catch (error) {
    console.error('=== ERROR CONNECTING TO BIRDEYE API ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Status code:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('!!! AUTHENTICATION ERROR: API KEY MIGHT BE INVALID OR EXPIRED !!!');
      } else if (error.response.status === 403) {
        console.error('!!! FORBIDDEN: NO PERMISSION TO ACCESS THIS RESOURCE !!!');
      } else if (error.response.status === 429) {
        console.error('!!! RATE LIMIT EXCEEDED: TOO MANY REQUESTS !!!');
      }
    } else if (error.request) {
      console.error('!!! NO RESPONSE RECEIVED FROM SERVER !!!');
    }
    
    return { 
      success: false, 
      error: 'Network or API error', 
      details: error.message
    };
  }
}

module.exports = { 
  testBirdeyeConnection,
  getBirdeyeTokenData,
  getBirdeyeTokenSecurity,
  getBirdeyeTokenHolders,
  getBirdeyeTopTraders,
  getBirdeyeTokenOverview
}; 