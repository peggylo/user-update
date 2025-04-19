# 資源狀態批量更新工具

這是一個用於通過REST API批量更新資源狀態的JavaScript工具。適用於系統管理員需要高效處理多個資源狀態變更的場景。

## 功能特點

- 批量處理多個資源
- 智能檢測，跳過已有目標狀態的資源
- 錯誤重試機制
- 多語言支持
- 詳細操作日誌

## 配置

通過環境變量完全自定義所有設置，無需修改代碼即可調整行為。

## 使用方法

1. 設置必要的環境變量
2. 自定義配置參數
3. 執行腳本啟動批量更新

### Chrome控制台使用方法

本工具也可以在Chrome瀏覽器的開發者控制台中使用：

1. 訪問目標系統網站並登入
2. 按F12或右鍵選擇「檢查」打開開發者工具
3. 切換到「控制台」標籤
4. 複製並貼上腳本內容
5. 設置必要的配置參數
6. 取消註釋最後一行並執行

## 環境變量

設置關鍵環境變量以自定義行為：

- API_BASE_URL - API基礎URL
- RESOURCE_ENDPOINT - 資源端點
- AUTH_TOKEN - 認證令牌
- UI_LANGUAGE - 界面語言(en/zh_TW)
- STATUS_FIELDS - 狀態字段名稱列表

## 安全考慮

- 使用環境變量存儲所有敏感信息
- 採用抽象標識符而非真實資源ID
- 避免在共享代碼中包含API密鑰

---

# Resource Status Batch Update Tool

A JavaScript tool for batch updating resource statuses via REST APIs. Designed for system administrators who need to efficiently manage status changes across multiple resources.

## Features

- Batch processing of multiple resources
- Smart detection to skip resources already in target state
- Error retry mechanism
- Multi-language support
- Detailed operation logs

## Configuration

Fully customizable through environment variables without code modification.

## Usage

1. Set required environment variables
2. Customize configuration parameters
3. Execute the script to start batch update

### Chrome Console Usage

This tool can also be used in Chrome browser's developer console:

1. Visit the target system website and log in
2. Press F12 or right-click and select "Inspect" to open developer tools
3. Switch to the "Console" tab
4. Copy and paste the script content
5. Set the necessary configuration parameters
6. Uncomment the last line and execute

## Environment Variables

Set key environment variables to customize behavior:

- API_BASE_URL - Base API URL
- RESOURCE_ENDPOINT - Resource endpoint
- AUTH_TOKEN - Authentication token
- UI_LANGUAGE - Interface language (en/zh_TW)
- STATUS_FIELDS - List of status field names

## Security Considerations

- Store all sensitive information in environment variables
- Use abstract identifiers instead of real resource IDs
- Avoid including API keys in shared code
