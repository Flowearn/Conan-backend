# Conan - Meme 代币链上数据与 AI 分析平台

## 1. 项目概述 (Project Overview)

Conan 旨在成为一个先进的数据平台，其**最终核心目标**是利用 AI 模型（如 Grok）对 Meme 代币进行深入、综合的分析。为了实现这一目标，平台首先需要高效地聚合、处理来自不同区块链（当前支持 BSC 和 Solana，未来将扩展到其他链）的链上数据。

平台通过后端服务调用第三方 API（主要是 Moralis 和 Birdeye）获取代币的元数据、价格、市值、流动性、持有者统计、交易者信息等，进行标准化处理后，一方面通过 API 接口提供给前端进行数据展示，**更重要的是，将这些结构化的数据准备好，作为输入提供给 AI 模型进行分析**。

后端已成功实现 BSC 和 Solana 链的数据聚合与标准化，可以稳定获取并处理完整的代币数据，为进一步AI分析功能优化和多链扩展奠定了坚实基础。

## 2. 技术栈 (Tech Stack)

* **后端 (Backend - `conan-backend` repo):**
    * **语言:** JavaScript (Node.js v18.x)
    * **框架:** Express.js
    * **API 调用:** Axios
    * **部署:** Serverless Framework (v3.x) 部署至 AWS Lambda + API Gateway
    * **配置管理:** 本地使用 `.env` 文件, 部署环境使用 AWS SSM Parameter Store (区域: `ap-southeast-1`)
    * **缓存:** node-cache (内存缓存)
    * **核心库:** `serverless-http`, `axios`, `node-cache`, `cors`, `dotenv`
* **前端 (Frontend - `conan-frontend` repo):**
    * **语言:** TypeScript
    * **框架:** Next.js (^14.x), React (^18.x) (App Router)
    * **UI:** Tailwind CSS
    * **国际化:** next-intl
* **主要外部 API:**
    * Moralis API (BSC链数据)
    * Birdeye API (Solana链数据及交易者信息)
    * Grok API (XAI) (用于核心 AI 分析功能)
* **版本控制:** Git, GitHub
* **开发工具:** VS Code / Cursor, npm

## 3. 项目结构 (Project Structure)

本项目采用前后端分离架构，拥有独立的 Git 仓库。

* **后端 (`Flowearn/conan-backend`):**
    * `src/`: 核心源代码
        * `index.js`: Express 应用入口, API 路由定义 ( `/api/token-data/:chain/:address` )，支持自动链类型检测。
        * `services/`: 包含各区块链数据处理及 AI 分析逻辑。
            * `BscService.js`: 负责处理 BSC 链的数据获取和标准化，通过内部定义的 `_fetch...` 辅助函数直接调用 Moralis/Birdeye API，不依赖其他服务文件。
            * `SolanaService.js`: 负责处理 Solana 链的数据获取和标准化，支持Birdeye API数据整合。
            * `aiAnalysisService.js`: 负责与 Grok API 交互，接收标准化数据并返回 AI 分析结果的逻辑。
        * `utils/`: 通用工具函数。
            * `formatters.js`: 数据格式化函数 (如货币、数字后缀)。
            * `ssm-params.js`: 加载环境变量或 SSM 参数的简化逻辑。
    * `serverless.yml`: Serverless Framework 配置文件，定义 AWS 资源和部署设置。
    * `package.json`: Node.js 项目依赖。
    * `README.md`: 本文档。
    * **(建议)** `.env.example`: 环境变量模板文件。
* **前端 (`Flowearn/conan-frontend`):** (标准 Next.js 项目结构)

## 4. 安装与设置 (Setup & Installation)

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
        XAI_API_KEY=your_xai_grok_api_key
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

## 5. 本地运行 (Running Locally)

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

## 6. API 端点 (API Endpoints)

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
              "basicAnalysis": "详细的 AI 分析结果..." 
            }  // 仅当请求包含 analyze=true 时
          },
          "source": "api", // 或 "cache"、"api+ai"、"cache+ai"，指示数据来源
          "chain": "bsc" // 或 "solana"，指示检测到的链类型
        }
        ```
    * **失败响应:** 可能返回错误状态码和错误信息 JSON。

## 7. 部署 (Deployment)

* 部署通过 Serverless Framework 完成。
* **前提:**
    * 已安装并配置 AWS CLI。
    * 在 AWS SSM Parameter Store (`ap-southeast-1` 区域) 中已存储必要的 API 密钥。
* **命令:**
    * 在 `conan-backend` 目录下运行：
        ```bash
        serverless deploy --stage prod # (或其他 stage)
        ```
    * 部署成功后，Serverless Framework 会输出 API Gateway 的 URL。需要将此 URL 更新到前端的环境变量中（用于生产环境）。

* **当前部署状态:**
    * 该服务使用 Serverless Framework 已成功部署到 AWS Lambda (`ap-southeast-1` 区域)
    * **环境:**
        * **Dev 环境:** `https://3du1z9vqkg.execute-api.ap-southeast-1.amazonaws.com/` (基于 `dev` 分支)
        * **Prod 环境:** `https://885tg68kdg.execute-api.ap-southeast-1.amazonaws.com/` (基于 `master` 分支)
    * 所有最新修复和重构均已成功部署到两个环境中，包括Solana链支持和自动链检测功能

## 8. 关键架构与逻辑 (Key Architecture & Logic)

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
  * 支持 Birdeye API 提供的特有时间维度 ('30m', '1h', '2h', '4h', '8h', '24h') 处理持有者变化数据。
* **缓存机制:**
  * 使用 `node-cache` 对基础数据进行内存缓存，缓存键格式为 `baseTokenData:${detectedChain}:${address}`。
  * 缓存策略已优化，明确只缓存基础代币数据，避免旧的 AI 分析结果污染缓存。
* **AI 分析流程:**
  * 当请求参数包含 `analyze=true` 时，`aiAnalysisService.js` 会接收基础数据，调用 Grok API，生成并返回分析结果。
  * AI 分析在获取基础数据后进行，无论基础数据是来自缓存还是新获取的。
  * 分析结果作为 `aiAnalysis` 字段添加到响应中，但不存储在缓存中。
  * 支持中英文两种语言的 AI 分析，通过 `lang` 参数指定（默认为英文）。

## 9. 最新更新 (Latest Updates - 2025年5月)

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

### 数据处理逻辑优化
* ✅ 实现了特定指标数据的精炼处理逻辑，使前端展示更加简洁和符合预期：
  * 对于"Unique Wallets"（独立钱包数）、"Buy Count"（买入计数）和"Sell Count"（卖出计数）三个指标的时间序列数据（30m, 1h, 2h, 4h, 8h, 24h）进行了特殊处理：
    * 当这些指标的原始数值小于1000时，将其转换为纯整数（移除小数部分）后再发送给前端
    * 当这些指标的原始数值大于等于1000，或原始数据本身已是带K/M/B等缩写单位的字符串（如"1.7K"）时，保持其从API获取时的原始字符串表示或纯数字形式不变
  * 这一优化确保计数类数据在小数据量时以整数形式提供（更精确），大数据量时保持简洁单位表示（更易读），同时满足前端展示和后续AI分析对数据简洁性的要求

### 问题修复 (Bug Fixes)
* ✅ 修复了 `aiAnalysisService.js` 中处理预格式化字符串 `priceChange24h` 时的 `TypeError`。
* ✅ 设置了 AI 分析函数的默认语言（当请求中缺少 `lang` 参数时）为 `'en'`。
* ✅ 加强了错误处理以防止在各种边缘情况下出现服务中断，包括基础数据获取失败和 AI 分析过程中的错误。
* ✅ 修复了对 API 响应结构不一致的处理，确保前端接收到格式统一的数据。
* ✅ 修复了 `SolanaService.js` 中的变量引用和命名问题，提高了代码质量和可维护性。

### 日志记录增强
* ✅ 添加了详细的诊断日志，使用 `[API Handler V2]`、`[SolanaService]` 等前缀进行分类。
* ✅ 日志记录了整个请求处理流程，包括链检测结果、缓存命中/未命中、基础数据获取、AI 分析触发、响应发送等步骤。
* ✅ 这些日志被有意保留在代码中，以备未来可能的调试需求，特别是在迁移 AI 提供商或处理新类型的代币数据时。

### 部署状态
* ✅ 所有最新功能和修复已成功部署到 Dev 和 Prod 环境。
* ✅ 多链支持（BSC和Solana）已在两个环境中经过全面测试并正常工作。
* ✅ 自动链检测功能已上线并稳定运行。

### Solana 数据获取问题最终诊断与解决 (更新于 2025-05-06 后续)

**问题现象:**
此前，后端应用在尝试获取 Solana Token (`6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN`) 数据时，即使切换到 `public-api.birdeye.so` 并使用了正确的路径和 Headers，应用调用时仍无法获取完整数据（API 返回 200 OK 但 `data` 字段为 `null` 或 `{}`），尽管直接使用 `curl` 测试有时能成功。

**【最终根本原因】:**
问题的根源在于：在将 Solana Token 地址传递给 `SolanaService.js` 或进行 Birdeye API 调用之前，应用程序的**某处代码（推测在 `index.js` 处理路由参数或 `SolanaService.js` 入口处）错误地对地址字符串执行了 `.toLowerCase()` 操作**。由于 **Solana 地址是大小写敏感的**，这导致传递给 Birdeye API 的地址实际上是无效的，Birdeye 无法匹配到正确的代币，因此返回了空的数据负载（`data: null` 或 `data: {}`）。

**【解决方案】:**
**定位并移除了**对传入的 Solana 地址执行 `.toLowerCase()` 的代码逻辑，确保将从 URL 路径参数中获取的、保持了原始大小写的 Solana 地址，直接传递给 `SolanaService.js` 和后续的 Birdeye API 调用。

**当前状态:**
* 此 **Solana 数据获取问题已通过上述修正得到解决**。后端现在能够使用 `public-api.birdeye.so`、正确的路径和 Headers，稳定地获取并处理 Solana 代币的可用数据（根据项目决定，不包含 holder supply/distribution 的计算细节）。
* **代码配置提醒:**
    * 获取 Birdeye 数据的逻辑当前可能仍处于**顺序执行 (Sequential)** 模式（为调试历史遗留）。**后续应评估**是否需要改回**并发执行 (`Promise.allSettled`)** 以优化性能。
    * 后端**缓存 (`node-cache`) 可能仍处于禁用状态**（为调试历史遗留）。在确认部署和运行稳定后，应**重新启用**缓存机制。
    * `SolanaService.js` 中为调试添加的打印原始响应日志 (`console.log('--- RAW Birdeye ...')`) 应被**移除**。
* **项目待办:** AI 服务切换 (Grok -> Gemini)、开发 Token Analytics UI (前端)、代码清理（移除所有调试日志）等。

## 10. 待办事项/未来工作 (To-Do / Future Work)

* **核心功能:**
    * ✅ (已完成) `BscService.js` 重构与优化，使其能够独立获取完整数据。
    * ✅ (已完成) 确保 `tokenAnalytics` 和 `metadata` 正确包含在 BSC 数据响应中。
    * ✅ (已完成) 修复 `holderStats` 计算。
    * ✅ (已完成) 集成 Price API 并正确处理价格和价格变化。
    * ✅ (已完成) 修复 `topTraders` 标准化。
    * ✅ (已完成) 实现 Birdeye Top Traders 的稳定获取与标准化（BSC部分）。
    * ✅ (已完成) 实现 `aiAnalysisService.js` 与 Grok API 的完整集成。
    * ✅ (已完成) 重构 API 处理器，优化缓存策略并修复 AI 分析触发逻辑。
    * ✅ (已完成) 完成 `SolanaService.js` 的数据获取和标准化逻辑。
    * ✅ (已完成) 实现自动链检测功能。
    * ✅ (已完成) 前端开发与后端数据对接。
    * ✅ (已完成) 部署测试并优化性能。
* **优化与扩展:**
    * 添加更多区块链支持 (如 Base)。
    * 前端 UI/UX 优化，更好地展示数据和 AI 分析。
    * 添加更健壮的错误处理和日志记录。
    * 考虑更持久化的缓存或数据库方案（如果 API 调用量大或需要历史数据）。
    * 完善单元测试和集成测试。
    * 优化 AI 分析提示模板，提高分析质量和准确性。