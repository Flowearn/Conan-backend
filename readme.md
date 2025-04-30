# Conan - Meme 代币链上数据与 AI 分析平台

## 1. 项目概述 (Project Overview)

Conan 旨在成为一个先进的数据平台，其**最终核心目标**是利用 AI 模型（如 Grok）对 Meme 代币进行深入、综合的分析。为了实现这一目标，平台首先需要高效地聚合、处理来自不同区块链（当前重点 BSC、后续 Solana 及其他）的链上数据。

平台通过后端服务调用第三方 API（主要是 Moralis 和 Birdeye）获取代币的元数据、价格、市值、流动性、持有者统计、交易者信息等，进行标准化处理后，一方面通过 API 接口提供给前端进行数据展示，**更重要的是，将这些结构化的数据准备好，作为输入提供给 AI 模型进行分析**。

后端已成功实现 BSC 链的数据聚合与标准化，可以稳定获取并处理完整的代币数据，为下一步 Solana 链集成和 AI 分析功能做好了基础。

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
    * Moralis API (多链数据)
    * Birdeye API (多链数据, 特别是交易者信息)
    * Grok API (XAI) (用于核心 AI 分析功能)
* **版本控制:** Git, GitHub
* **开发工具:** VS Code / Cursor, npm

## 3. 项目结构 (Project Structure)

本项目采用前后端分离架构，拥有独立的 Git 仓库。

* **后端 (`Flowearn/conan-backend`):**
    * `src/`: 核心源代码
        * `index.js`: Express 应用入口, API 路由定义 ( `/api/token-data/:chain/:address` )。
        * `services/`: 包含各区块链数据处理及 AI 分析逻辑。
            * `BscService.js`: 负责处理 BSC 链的数据获取和标准化，通过内部定义的 `_fetch...` 辅助函数直接调用 Moralis/Birdeye API，不依赖其他服务文件。
            * `SolanaService.js`: 负责处理 Solana 链的数据获取和标准化 (**当前不完整**)。
            * `AiAnalysisService.js`: 负责与 Grok API 交互，接收标准化数据并返回 AI 分析结果的逻辑。
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
        npx serverless offline start --httpPort 3003 --lambdaPort 3005
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
    * **:chain:** `bsc` 或 `solana`
    * **:address:** 代币的合约地址
    * **成功响应 (200 OK):**
        ```json
        {
          "success": true,
          "data": {
            "tokenOverview": { /* 代币基本信息、价格和市值数据 */ },
            "topTraders": [ /* 顶级交易者数据 */ ],
            "holderStats": { /* 持有者统计数据 */ },
            "tokenAnalytics": { /* 代币交易统计分析 */ },
            "metadata": { /* 代币元数据详情 */ }
            // "aiAnalysis": { /* ... */ } // (未来可能包含 AI 分析结果)
          },
          "source": "api" // 或 "cache"
        }
        ```
    * **失败响应:** 可能返回错误状态码和错误信息 JSON。

## 7. 部署 (Deployment)

* 部署通过 Serverless Framework 完成。
* **前提:**
    * 已安装并配置 AWS CLI。
    * 在 AWS SSM Parameter Store (`ap-southeast-1` 区域) 中已存储必要的 API 密钥。**(需要您确认):** `serverless.yml` 或 `ssm-params.js` 中期望的 SSM 参数名称具体是什么？ (例如 `/conan/prod/MORALIS_API_KEY` ?)
* **命令:**
    * 在 `conan-backend` 目录下运行：
        ```bash
        serverless deploy --stage prod # (或其他 stage)
        ```
    * 部署成功后，Serverless Framework 会输出 API Gateway 的 URL。需要将此 URL 更新到前端的环境变量中（用于生产环境）。

## 8. 关键架构与逻辑 (Key Architecture & Logic)

* 采用前后端分离模式。
* 后端 API (`index.js`) 根据 `:chain` 参数将请求分发给对应的 Service (`BscService.js`, `SolanaService.js`)。
* **BSC 数据处理流程:**
  * `BscService.js` 通过内部定义的 `_fetch...` 辅助函数（如 `_fetchMoralisMetadata`, `_fetchMoralisHolderStats`, `_fetchBirdeyeTopTraders` 等）直接使用 `axios` 调用外部 API。
  * 使用 `Promise.allSettled` 并发执行多个外部 API 调用，并处理各自的成功或失败状态。
  * 原始数据使用 `bsc_平台_数据类型` 格式的变量名进行存储（如 `bsc_moralis_metadata`, `bsc_birdeye_topTraders`）。
  * 获取原始数据后，进行标准化处理，形成统一的 `standardizedData` 结构，包含 `tokenOverview`, `topTraders`, `holderStats`, `tokenAnalytics`, `metadata` 等部分。
  * BSC 数据管道已完全构建成功并通过测试验证，能够稳定提供完整的标准化代币数据。
* **缓存机制:**
  * 使用 `node-cache` 对最终的 `standardizedData` 进行内存缓存，以减少重复请求的 API 调用。
* **AI 分析流程 (规划中):**
  * `AiAnalysisService.js` 将接收标准化数据，调用 Grok API，返回分析结果。
  * 分析结果可能直接整合到现有响应中，或通过单独的端点提供。

## 9. 待办事项/未来工作 (To-Do / Future Work)

* **核心功能:**
    * ✅ (已完成) `BscService.js` 重构与优化，使其能够独立获取完整数据。
    * ✅ (已完成) 确保 `tokenAnalytics` 和 `metadata` 正确包含在 BSC 数据响应中。
    * ✅ (已完成) 修复 `holderStats` 计算。
    * ✅ (已完成) 集成 Price API 并正确处理价格和价格变化。
    * ✅ (已完成) 修复 `topTraders` 标准化。
    * ✅ (已完成) 实现 Birdeye Top Traders 的稳定获取与标准化（BSC部分）。
    * 完成 `SolanaService.js` 的数据获取和标准化逻辑。
    * 实现 `AiAnalysisService.js` 与 Grok API 的完整集成。
    * 将 AI 分析结果整合到 `/api/token-data` 的响应中或提供单独的 AI 分析端点。
    * 前端开发与后端数据对接。
    * 部署测试并优化性能。
* **优化与扩展:**
    * 添加更多区块链支持 (如 Base)。
    * 前端 UI/UX 优化，更好地展示数据和 AI 分析。
    * 添加更健壮的错误处理和日志记录。
    * 考虑更持久化的缓存或数据库方案（如果 API 调用量大或需要历史数据）。
    * 完善单元测试和集成测试。