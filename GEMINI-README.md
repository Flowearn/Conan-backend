# Grok到Gemini AI分析服务迁移指南

## 迁移概述

本项目已将AI分析服务从Grok API迁移到Google Gemini 2.5 Pro Preview API。迁移包含以下主要变更：

1. 添加了Google Generative AI SDK依赖
2. 完全重构了AI分析实现，但保持了API接口兼容性
3. 增强了错误处理和日志记录
4. 添加了专门的连接测试工具

## 设置步骤

### 1. 安装依赖

已添加Google Generative AI SDK依赖：

```bash
npm install @google/generative-ai@0.24.1
```

### 2. 环境变量配置

在项目根目录或`Backend`目录的`.env`文件中添加Gemini API密钥：

```
GEMINI_API_KEY=your_gemini_api_key_here
```

获取API密钥的方法：
1. 访问[Google AI Studio](https://makersuite.google.com/)
2. 注册或登录Google账户
3. 在API密钥部分生成新的API密钥

### 3. 测试API连接

可以使用测试脚本验证API连接和功能：

```bash
node src/test-gemini.js
```

## 代码变更说明

### 主要变更文件

- `src/services/aiAnalysisService.js`：重构后的AI服务实现
- `src/test-gemini.js`：新增的测试脚本

### 兼容性保证

为保证向后兼容性，保留了与原来相同的函数名：

- `generateBasicAnalysis(tokenData, lang)`：生成代币基本面分析
- `generateGrokAnalysis(prompt)`：现在内部调用Gemini API，但接口保持不变

### 新增函数

- `generateGeminiAnalysis(prompt)`：直接调用Gemini API
- `testGeminiConnection()`：测试API连接的工具函数

## 模型与配置

当前使用的模型是`gemini-2.5-pro-preview`，这是Google最新的大型多模态模型。主要配置：

- 温度：0.7（保持适当的创造性）
- 最大输出令牌：800（足够生成详细分析）
- 安全设置：调整为允许分析加密货币内容

## 日志记录

服务实现中包含详细的日志记录：

- API调用和响应状态
- 提示词长度和预览
- 模型初始化状态
- 错误详情和处理流程

## 可能的问题与解决方法

1. **API密钥不正确**：确保在`.env`文件中设置了正确的`GEMINI_API_KEY`
2. **模型访问受限**：确认您的Google账户有权访问Gemini 2.5 Pro Preview
3. **提示词安全过滤**：如果分析内容被过滤，检查是否包含违反Google安全政策的内容
4. **响应超时**：增大请求超时阈值，或拆分过大的提示词

## 维护与更新

Google可能会不断更新其模型和API，需要定期检查：

1. 新模型版本发布（可能需要更新模型ID）
2. SDK更新（建议定期更新SDK版本）
3. API限制变更（配额、速率限制等可能变化）

如有问题，请参考[Google Generative AI文档](https://ai.google.dev/docs)。 