/**
 * Gemini API测试脚本
 * 运行方法: node Backend/src/test-gemini.js
 */

require('dotenv').config();
const { testGeminiConnection, generateGeminiAnalysis } = require('./services/aiAnalysisService');

// 测试步骤
async function runTests() {
  console.log('===== Gemini API 测试开始 =====');
  
  // 测试1: 验证连接
  console.log('\n测试1: 连接测试');
  try {
    const connectionTest = await testGeminiConnection();
    console.log('连接测试结果:', connectionTest.success ? '成功 ✓' : '失败 ✗');
    console.log('详情:', connectionTest.message || connectionTest.error);
    
    if (!connectionTest.success) {
      console.error('连接测试失败，中止后续测试');
      return;
    }
  } catch (err) {
    console.error('连接测试异常:', err);
    return;
  }
  
  // 测试2: 简单生成测试
  console.log('\n测试2: 内容生成测试');
  try {
    // 系统指令定义AI角色和行为
    const systemInstruction = `你是一位专业的AI技术顾问，擅长用简洁易懂的语言解释技术概念。回答要保持简短，只关注核心要点。`;
    
    const userPrompt = "用中文简要介绍一下Google Gemini模型的主要功能和特点，不超过100字。";
    console.log('系统指令:', systemInstruction.substring(0, 50) + '...');
    console.log('用户提示词:', userPrompt);
    
    const analysisResult = await generateGeminiAnalysis(systemInstruction, userPrompt);
    console.log('生成测试结果:', analysisResult.success ? '成功 ✓' : '失败 ✗');
    if (analysisResult.success) {
      console.log('生成内容:\n---------------------');
      console.log(analysisResult.analysis);
      console.log('---------------------');
    } else {
      console.error('生成失败:', analysisResult.error);
      console.error('详情:', analysisResult.details);
    }
  } catch (err) {
    console.error('生成测试异常:', err);
  }
  
  // 测试3: 兼容性测试 - 只传递一个参数
  console.log('\n测试3: 兼容性测试（单参数）');
  try {
    const singlePrompt = "使用中文简要说明加密货币市场的主要风险因素，不超过100字。";
    console.log('单一提示词:', singlePrompt);
    
    const compatResult = await generateGeminiAnalysis(singlePrompt);
    console.log('兼容性测试结果:', compatResult.success ? '成功 ✓' : '失败 ✗');
    if (compatResult.success) {
      console.log('生成内容:\n---------------------');
      console.log(compatResult.analysis);
      console.log('---------------------');
    } else {
      console.error('生成失败:', compatResult.error);
      console.error('详情:', compatResult.details);
    }
  } catch (err) {
    console.error('兼容性测试异常:', err);
  }
  
  // 测试4: 最简英文请求 (无特定系统指令)
  console.log('\n测试4: 最简英文请求');
  try {
    const simplestSystemInstruction = undefined; // 或者一个非常通用的英文系统指令，如 "You are a helpful assistant."
    const simplestUserPrompt = "What is 2 + 2?"; // 一个极其简单且通用的英文问题
    
    console.log('最简系统指令:', simplestSystemInstruction);
    console.log('最简用户提示词:', simplestUserPrompt);
    
    const simpleResult = await generateGeminiAnalysis(simplestSystemInstruction, simplestUserPrompt);
    console.log('最简英文请求结果:', simpleResult.success ? '成功 ✓' : '失败 ✗');
    if (simpleResult.success) {
      console.log('生成内容:\n---------------------');
      console.log(simpleResult.analysis);
      console.log('---------------------');
    } else {
      console.error('生成失败:', simpleResult.error);
      console.error('详情:', simpleResult.details);
    }
  } catch (err) {
    console.error('最简英文请求异常:', err);
  }
  
  console.log('\n===== Gemini API 测试完成 =====');
}

// 执行测试
runTests().catch(err => {
  console.error('测试执行错误:', err);
}); 