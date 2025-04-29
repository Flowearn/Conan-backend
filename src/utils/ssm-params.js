/**
 * 初始化 API 密钥
 * 在本地开发环境中，这个函数实际上不会从 AWS SSM 获取参数
 * 而是依赖于 .env 文件中的环境变量
 */
async function initializeApiKeys() {
    // 在本地开发环境中，我们只需要验证关键的环境变量是否存在
    const requiredKeys = [
        'BIRDEYE_API_KEY',
        'MORALIS_API_KEY',
        'XAI_API_KEY'
    ];

    const missingKeys = requiredKeys.filter(key => !process.env[key]);
    
    if (missingKeys.length > 0) {
        console.warn('Warning: Missing required API keys in environment:', missingKeys.join(', '));
    } else {
        console.log('All required API keys found in environment variables');
    }

    // 返回 true 表示初始化完成
    return true;
}

module.exports = {
    initializeApiKeys
}; 