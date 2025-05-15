# Conan - Meme 代币链上数据与 AI 分析平台

## 1. 项目概述 (Project Overview)

Conan 旨在成为一个先进的数据平台，其**最终核心目标**是利用 AI 模型对 Meme 代币进行深入、综合的分析。为了实现这一目标，平台首先需要高效地聚合、处理来自不同区块链（当前支持 BSC 和 Solana，未来将扩展到其他链）的链上数据。

后端服务的核心功能是获取、处理、**完全格式化**代币数据，并为前端和 **Gemini AI 分析服务**提供高质量输入。这些数据经过标准化处理后，一方面通过 API 接口提供给前端进行数据展示，**更重要的是，将这些结构化的数据准备好，作为输入提供给 Google Gemini AI 模型进行深度分析**。

后端已成功实现 BSC 和 Solana 链的数据聚合与标准化，可以稳定获取并处理完整的代币数据，为进一步AI分析功能优化和多链扩展奠定了坚实基础。

## 2. 核心数据处理流程与原则

* **数据源:** 主要为 Birdeye API (`/token_overview` 等)和Moralis API，提供原始的链上数据。
* **数据标准化:** 从API获取原始数据后，进行结构化处理，确保不同链的数据格式一致。
* **后端完全格式化:** 后端服务负责将所有数值型数据（价格、金额、数量、百分比等）预先格式化为最终的显示字符串（例如 `"$1.2M"`, `"-5.83%"`, `"1.5K"`, `"N/A"`）。这些预格式化的字符串直接提供给前端和AI服务，消费端无需再进行格式化处理。
* **`tokenAnalytics` 对象:** 作为核心的数据输出结构之一，其叶子节点的 `value` 属性存储预格式化字符串，同时包含 `actualTimeframe` 属性来指明数据的真实时间来源，确保前端显示的时间标签精确反映数据的实际来源。
* **动态时间维度处理:** 针对特定时间槽（如6h、12h）实现了回退逻辑（如6h->4h, 12h->8h），当首选时间维度数据不可用时，系统会回退到次选时间维度数据，并通过 `actualTimeframe` 字段准确记录实际使用的数据源时间。

## 3. AI 分析服务集成

* **当前 AI 模型:** 当前使用的是 **Google Gemini 2.5 Pro Preview** (具体模型ID为 `gemini-2.5-pro-preview-05-06`)，已从之前的 Grok 模型成功迁移。
* **API 调用方式:** 通过 Google 官方的 `@google/generative-ai` Node.js 客户端库进行调用。
* **System Instruction:** 为 Gemini 模型设计了详细的、区分中英文的 System Instruction，用于设定 AI 的角色、分析准则、输出风格和行为约束。这些指令在调用模型时通过 `getGenerativeModel` 的 `systemInstruction` 参数传递，包含：
  * 市值评估标准 (针对 Meme 代币)
  * 活动数据分析指导 (跨六个时间维度)
  * 风险和机会识别方法
  * 顶级交易者摘要评估准则
  * 输出格式和长度要求 (150-200字左右)
* **User Prompt 构建:**
  * User Prompt 包含了从 `tokenData` (包括 `tokenOverview`, `tokenAnalytics` 等) 中提取的、已由后端预格式化的详细代币数据。
  * 为了优化 token 消耗和分析质量，"Top Traders" 的详细列表已从 User Prompt 中移除，改为提供**聚合统计摘要信息**，包括总交易额、总交易次数、机器人数量和买卖比例。
  * User Prompt 的指令部分已被精简，核心分析方法论和约束已移至 System Instruction。
  * User Prompt 中已添加对时间框架缩写（1m, 2h 等）和百分比变化定义的解释，以辅助 AI 理解。
* **Token 使用追踪:** `generateGeminiAnalysis` 和 `generateBasicAnalysis` 函数会在成功返回的结果中包含 `usageMetadata` 对象，以便追踪 token 消耗。
* **主要服务文件:** `src/services/aiAnalysisService.js` 包含所有与 Gemini API 交互和 Prompt 构建的核心逻辑。
* **模型配置优化:** 为提高效率，已将 `maxOutputTokens` 从 81920 降低至 8192，同时确保足够生成 150-200 字的分析结果。

## 4. 技术栈 (Tech Stack)

* **后端 (Backend - `conan-backend` repo):**
    * **语言:** JavaScript (Node.js v18.x)
    * **框架:** Express.js
    * **API 调用:** Axios
    * **部署:** Serverless Framework (v3.x) 部署至 AWS Lambda + API Gateway
    * **配置管理:** 本地使用 `.env` 文件, 部署环境使用 AWS SSM Parameter Store (区域: `ap-southeast-1`)
    * **缓存:** node-cache (内存缓存)
    * **核心库:** `serverless-http`, `axios`, `node-cache`, `cors`, `dotenv`, `@google/generative-ai`
* **前端 (Frontend - `conan-frontend` repo):**
    * **语言:** TypeScript
    * **框架:** Next.js (^14.x), React (^18.x) (App Router)
    * **UI:** Tailwind CSS
    * **国际化:** next-intl
* **主要外部 API:**
    * Moralis API (BSC链数据)
    * Birdeye API (Solana链数据及交易者信息)
    * Google Gemini API (用于核心 AI 分析功能)
* **版本控制:** Git, GitHub
* **开发工具:** VS Code / Cursor, npm

## 5. 项目结构 (Project Structure)

本项目采用前后端分离架构，拥有独立的 Git 仓库。

* **后端 (`Flowearn/conan-backend`):**
    * `src/`: 核心源代码
        * `index.js`: Express 应用入口, API 路由定义 ( `/api/token-data/:chain/:address` )，支持自动链类型检测。
        * `services/`: 包含各区块链数据处理及 AI 分析逻辑。
            * `BscService.js`: 负责处理 BSC 链的数据获取和标准化，通过内部定义的 `_fetch...` 辅助函数直接调用 Moralis/Birdeye API，不依赖其他服务文件。
            * `SolanaService.js`: 负责处理 Solana 链的数据获取和标准化，支持Birdeye API数据整合。
            * `aiAnalysisService.js`: 负责与 Gemini API 交互，接收标准化数据并返回 AI 分析结果的逻辑。
        * `utils/`: 通用工具函数。
            * `formatters.js`: 数据格式化函数 (如货币、数字后缀)。
            * `ssm-params.js`: 加载环境变量或 SSM 参数的简化逻辑。
    * `serverless.yml`: Serverless Framework 配置文件，定义 AWS 资源和部署设置。
    * `package.json`: Node.js 项目依赖。
    * `test-gemini.js`: 测试脚本，用于验证 Gemini API 的基本连接和内容生成功能。
    * `README.md`: 本文档。
    * **(建议)** `.env.example`: 环境变量模板文件。
* **前端 (`Flowearn/conan-frontend`):** (标准 Next.js 项目结构)

## 6. 安装与设置 (Setup & Installation)

**前提:**

* Node.js (v18.x 或兼容版本)
* npm
* Git
* AWS CLI (用于部署，并已配置好 AWS 访问凭证)
* (可选) Serverless Framework CLI (`npm install -g serverless`)

**步骤:**

1.  **克隆仓库:**
    ```bash
    git clone https://github.com/Flowearn/conan-backend.git
    git clone https://github.com/Flowearn/conan-frontend.git
    ```
2.  **安装后端依赖:**
    ```bash
    cd conan-backend
    npm install
    ```
3.  **配置后端环境变量:**
    * 在 `conan-backend` 目录下创建一个 `.env` 文件。
    * 添加以下必要的 API 密钥：
        ```dotenv
        # 需要从各平台获取 API Key
        MORALIS_API_KEY=your_moralis_api_key
        BIRDEYE_API_KEY=your_birdeye_api_key
        GEMINI_API_KEY=your_gemini_api_key  # 从 Google AI Studio 获取
        ```
    * **(建议)** 创建一个 `.env.example` 文件，包含上述 Key 的名称（值可以为空），方便其他人配置。

4.  **安装前端依赖:**
    ```bash
    cd ../conan-frontend
    npm install
    ```
5.  **配置前端环境变量:**
    * 在 `conan-frontend` 目录下创建一个 `.env.local` 文件。
    * 添加后端 API 地址：
        ```dotenv
        NEXT_PUBLIC_API_BASE_URL=http://localhost:3003 # 本地开发指向 Serverless Offline 端口
        ```

## 7. 本地运行 (Running Locally)

1.  **启动后端:**
    * 确保在 `conan-backend` 目录下。
    * 运行 Serverless Offline:
        ```bash
        npx serverless offline start --httpPort 3003
        ```
    * 如遇端口冲突，尝试指定 Lambda 端口：
        ```bash
        npx serverless offline start --httpPort 3002 --lambdaPort 3005
        ```
    * 后端 API 服务将在 `http://localhost:3003` 上可用。

2.  **启动前端:**
    * 确保在 `conan-frontend` 目录下。
    * 运行 Next.js 开发服务器：
        ```bash
        npm run dev
        ```
    * 前端应用通常在 `http://localhost:3000` 上可用。

## 8. API 端点 (API Endpoints)

* **`GET /api/token-data/:chain/:address`**
    * **:chain:** `bsc` 或 `solana`（注意：现在支持自动链检测，系统会根据地址格式自动判断是BSC还是Solana）
    * **:address:** 代币的合约地址
    * **查询参数:**
        * **analyze:** 设置为 `true` 时触发 AI 分析
        * **lang:** 指定 AI 分析的语言，可选值为 `en`（英语）或 `zh`（中文），默认为 `en`
    * **成功响应 (200 OK):**
        ```json
        {
          "success": true,
          "data": {
            "tokenOverview": { /* 代币基本信息、价格和市值数据 */ },
            "topTraders": [ /* 顶级交易者数据 */ ],
            "holderStats": { /* 持有者统计数据 */ },
            "tokenAnalytics": { /* 代币交易统计分析 */ },
            "metadata": { /* 代币元数据详情 */ },
            "aiAnalysis": { 
              "basicAnalysis": "详细的 AI 分析结果...",
              "usageMetadata": { /* Token 使用信息 */ }
            }  // 仅当请求包含 analyze=true 时
          },
          "source": "api", // 或 "cache"、"api+ai"、"cache+ai"，指示数据来源
          "chain": "bsc" // 或 "solana"，指示检测到的链类型
        }
        ```
    * **失败响应:** 可能返回错误状态码和错误信息 JSON。

## 9. 部署 (Deployment)

* 部署通过 Serverless Framework 完成。
* **前提:**
    * 已安装并配置 AWS CLI。
    * 在 AWS SSM Parameter Store (`ap-southeast-1` 区域) 中已存储必要的 API 密钥。
* **命令:**
    * 在 `conan-backend` 目录下运行：
        ```bash
        serverless deploy --stage prod # (或其他 stage)
        ```
    * 或指定区域部署：
        ```bash
        sls deploy -s [dev|prod] -r ap-southeast-1
        ```
    * 部署成功后，Serverless Framework 会输出 API Gateway 的 URL。需要将此 URL 更新到前端的环境变量中（用于生产环境）。

* **当前部署状态:**
    * 该服务使用 Serverless Framework 已成功部署到 AWS Lambda (`ap-southeast-1` 区域)
    * **环境:**
        * **Dev 环境:** `https://3du1z9vqkg.execute-api.ap-southeast-1.amazonaws.com/` (基于 `dev` 分支)
        * **Prod 环境:** `https://885tg68kdg.execute-api.ap-southeast-1.amazonaws.com/` (基于 `master` 分支)
    * 所有最新修复和重构均已成功部署到两个环境中，包括Solana链支持、自动链检测功能和Gemini AI集成

## 10. 关键架构与逻辑 (Key Architecture & Logic)

* 采用前后端分离模式。
* 后端 API (`index.js`) 会自动检测地址格式以判断链类型，将请求分发给对应的 Service (`BscService.js`, `SolanaService.js`)。
* **BSC 数据处理流程:**
  * `BscService.js` 通过内部定义的 `_fetch...` 辅助函数（如 `_fetchMoralisMetadata`, `_fetchMoralisHolderStats`, `_fetchBirdeyeTopTraders` 等）直接使用 `axios` 调用外部 API。
  * 使用 `Promise.allSettled` 并发执行多个外部 API 调用，并处理各自的成功或失败状态。
  * 原始数据使用 `bsc_平台_数据类型` 格式的变量名进行存储（如 `bsc_moralis_metadata`, `bsc_birdeye_topTraders`）。
  * 获取原始数据后，进行标准化处理，形成统一的 `standardizedData` 结构。
* **Solana 数据处理流程:**
  * `SolanaService.js` 同样使用内部定义的 `_fetch...` 辅助函数调用 Birdeye API。
  * 数据获取和标准化流程与 BSC 类似，但专门针对 Solana 链特有的数据结构进行了调整。
  * 支持多种时间维度（标准时间维度：1m, 30m, 2h, 6h, 12h, 24h）数据收集，并实现了动态时间维度逻辑，确保在首选时间维度不可用时回退到备选时间维度，同时通过 `actualTimeframe` 字段准确记录数据的真实来源。
* **缓存机制:**
  * 使用 `node-cache` 对基础数据进行内存缓存，缓存键格式为 `baseTokenData:${detectedChain}:${address}`。
  * 缓存策略已优化，明确只缓存基础代币数据，避免旧的 AI 分析结果污染缓存。
* **AI 分析流程:**
  * 当请求参数包含 `analyze=true` 时，`aiAnalysisService.js` 会接收基础数据，调用 Gemini API，生成并返回分析结果。
  * AI 分析在获取基础数据后进行，无论基础数据是来自缓存还是新获取的。
  * 分析结果作为 `aiAnalysis` 字段添加到响应中，但不存储在缓存中。
  * 支持中英文两种语言的 AI 分析，通过 `lang` 参数指定。
  * 调用 Gemini API 时的关键配置：
    * 设置 `maxOutputTokens` 为 8192，确保生成完整响应
    * HTTP 超时设置为 60 秒
    * 使用 `systemInstruction` 参数设置分析指南和行为约束
    * 在 Lambda 函数本身设置了足够长的超时时间（通常为 120 秒或更长）

## 11. 最新更新 (Latest Updates - 2025年5月)

### AI 分析模型迁移与优化
* ✅ **从 Grok 迁移到 Gemini:** 成功将 AI 分析模型从 Grok 迁移到 Google Gemini 2.5 Pro Preview (模型ID: `gemini-2.5-pro-preview-05-06`)。
* ✅ **System Instruction 优化:** 为 Gemini 设计了详细的、区分中英文的 System Instruction，系统地指导 AI 的分析过程，并传递给模型更多专业背景知识和行为约束。
* ✅ **Top Traders 数据摘要:** 将之前的详细 Top Traders 列表替换为聚合统计摘要，显著减少输入 token 消耗，同时保留关键信号。
* ✅ **时间框架说明:** 在 User Prompt 中添加了时间框架缩写和百分比变化定义的解释，帮助 AI 更准确地理解和分析数据。
* ✅ **Token 使用追踪:** 添加了 `usageMetadata` 对象到返回结果中，以便追踪和优化 token 消耗。
* ✅ **提高输出质量:** 通过精心设计的 System Instruction 和 User Prompt，显著提高了分析的质量、相关性和一致性。
* ✅ **优化输出长度:** 将分析输出长度从100-150字调整为150-200字，同时将 `maxOutputTokens` 从 81920 降低至 8192，提高处理效率。
* ✅ **安全评分泛化:** 在提示中对安全评分的引用已泛化，以适应不同数据源可能提供的评分格式。

### 数据处理和标准化优化
* ✅ **后端完全格式化**: 成功实现了所有数值型数据（价格、金额、数量、百分比等）在后端的预格式化，直接提供给前端和AI服务的是最终显示格式的字符串，无需前端再进行格式化处理。
* ✅ **完善动态时间维度机制**: 修正了`SolanaService.js`中的`actualTimeframe`赋值逻辑，确保它准确反映动态回退时的数据来源。无论是使用首选时间维度（如6h）还是回退到备选时间维度（如4h），`actualTimeframe`字段都能准确记录实际数据来源。
* ✅ **统一数据类型**: 解决了前端与后端数据类型不匹配问题，规范了所有`value`字段为字符串类型，确保前端展示的一致性和准确性。
* ✅ **一致性处理**: 实现了跨链数据的标准化处理，确保BSC和Solana链数据在结构上保持一致，便于前端统一展示。
* ✅ **数值格式化优化**: 对交易量、持有者数量等数值进行了智能格式化处理:
  * 自动判断应使用完整数值(小于1000)还是简化表示(K, M, B等)
  * 针对不同数据类型采用适当精度，如价格使用最多8位小数，百分比使用2位小数

### API 处理器重构与多链支持
* ✅ 添加了自动链检测功能，系统能够根据地址格式（以"0x"开头为BSC，否则为Solana）自动判断链类型。
* ✅ 完成了 `SolanaService.js` 的数据获取和标准化逻辑，实现了对 Solana 代币的完全支持。
* ✅ 优化了变量命名，使用更一致的 `solana_birdeye_*` 格式命名约定，提高代码可读性。
* ✅ 实现了统一的数据结构，使不同链的数据格式保持一致，便于前端展示和AI分析。
* ✅ 改进了路由逻辑，在 `/api/token-data/:chain/:address` 端点中实现了链自动检测和分发。

### 缓存策略优化
* ✅ 改进了缓存机制，明确只缓存基础代币数据，使用 `baseTokenData:${detectedChain}:${address}` 格式的缓存键。
* ✅ 避免了旧的 AI 分析结果污染缓存的问题，每次请求时根据 `analyze` 参数动态生成分析结果。
* ✅ 基础数据与 AI 分析结果的分离使系统更加灵活，能更好地适应不同的请求需求。

### 问题修复 (Bug Fixes)
* ✅ 修复了`SolanaService.js`中`dynamicTimeFrames`处理循环内的结构问题，确保`actualTimeframe`赋值逻辑正确应用于所有指标。
* ✅ 修复了Solana链的`actualTimeframe`回退逻辑，确保UI显示的时间标签准确反映数据的实际来源时间。
* ✅ 统一了`TimeFrameValueObj`接口的`value`字段类型定义，解决了前端类型不匹配问题。
* ✅ 修复了顶级交易者数据(`topTraders`)处理中的问题，确保交易金额和交易次数正确显示。
* ✅ 解决了AI分析服务在处理特定结构数据(如嵌套的时间序列数据)时的兼容性问题。
* ✅ 修复了 `aiAnalysisService.js` 中处理预格式化字符串 `priceChange24h` 时的 `TypeError`。
* ✅ 设置了 AI 分析函数的默认语言（当请求中缺少 `lang` 参数时）为 `'zh'`。
* ✅ 加强了错误处理以防止在各种边缘情况下出现服务中断，包括基础数据获取失败和 AI 分析过程中的错误。

### 日志记录增强
* ✅ 添加了详细的诊断日志，使用 `[API Handler V2]`、`[SolanaService]` 等前缀进行分类。
* ✅ 日志记录了整个请求处理流程，包括链检测结果、缓存命中/未命中、基础数据获取、AI 分析触发、响应发送等步骤。
* ✅ 这些日志被有意保留在代码中，以备未来可能的调试需求，特别是在迁移 AI 提供商或处理新类型的代币数据时。

### 部署状态
* ✅ 所有最新功能和修复已成功部署到 Dev 和 Prod 环境。
* ✅ 多链支持（BSC和Solana）和 Gemini AI 集成已在两个环境中经过全面测试并正常工作。