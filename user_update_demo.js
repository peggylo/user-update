// user_update_demo.js - 通用資源批量更新工具
// 這是一個示例模板，您需要根據實際系統API進行調整

// 配置參數
const config = {
  // 要處理的資源標識符列表
  resourceIdentifiers: [
    "RESOURCE_ID_1",  // 使用抽象標識符
    "RESOURCE_ID_2"   
  ],
  
  // 狀態映射 - 使用通用名稱隱藏實際狀態值
  statusMap: {
    active: "ACTIVE_RESOURCE",
    inactive: "INACTIVE_RESOURCE",
    pending: "PENDING_APPROVAL",
    blocked: "BLOCKED_RESOURCE"
  },
  
  // 可能的狀態字段名稱 - 從環境變量獲取或使用預設值
  get possibleStatusFields() {
    // 允許通過環境變量覆蓋
    return process.env.STATUS_FIELDS?.split(',') || [
      'status',
      'resourceStatus',
      'accountStatus',
      'state',
      'accessLevel'
    ];
  },
  
  // API端點配置 - 完全通過環境變量設置
  endpoints: {
    base: process.env.API_BASE_URL || "",
    resource: process.env.RESOURCE_ENDPOINT || "",
    query: process.env.QUERY_ENDPOINT || "",
    update: process.env.UPDATE_ENDPOINT || ""
  },
  
  // 查詢參數配置
  queryParams: {
    searchParam: process.env.SEARCH_QUERY_PARAM || "filter"
  },
  
  // 請求延遲範圍(毫秒) - 避免請求頻率過高
  minDelay: parseInt(process.env.MIN_DELAY) || 3000,
  maxDelay: parseInt(process.env.MAX_DELAY) || 7000,
  
  // 其他可配置選項
  options: {
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 2,
    useAuthHeader: process.env.USE_AUTH_HEADER !== "false",
    authType: process.env.AUTH_TYPE || "Bearer",
    logLevel: process.env.LOG_LEVEL || "info",
    language: process.env.UI_LANGUAGE || "zh_TW"
  },
  
  // 國際化字符串
  i18n: {
    en: {
      processing: "Processing",
      found: "Found resource ID",
      notFound: "Resource not found",
      status: "Status",
      resources: "Resources",
      alreadyHasStatus: "Resource already has target status",
      updateSuccess: "Successfully updated resource",
      updateFailed: "Update failed",
      retrying: "Retrying",
      waiting: "Waiting seconds before continuing",
      completed: "Processing completed! Success",
      failed: "Failed",
      startMessage: "Resource status batch update tool"
    },
    zh_TW: {
      processing: "開始處理",
      found: "找到資源ID",
      notFound: "未找到資源",
      status: "狀態",
      resources: "資源",
      alreadyHasStatus: "資源已是目標狀態，無需更新",
      updateSuccess: "成功更新資源",
      updateFailed: "更新失敗",
      retrying: "將在秒後重試",
      waiting: "等待秒後繼續",
      completed: "處理完成! 成功",
      failed: "失敗",
      startMessage: "資源狀態批量更新工具"
    }
  }
};

/**
 * 處理單個資源狀態更新
 * @param {string} identifier - 資源標識符
 * @return {Promise<boolean>} - 是否成功
 */
async function processResourceStatus(identifier) {
  try {
    logMsg("processing", `: ${identifier}`);
    
    // 步驟1: 查詢資源信息
    const resourceInfo = await getResourceInfo(identifier);
    if (!resourceInfo) return false;
    
    // 步驟2: 檢查當前狀態
    if (hasTargetStatus(resourceInfo)) {
      logMsg("alreadyHasStatus", `: ${identifier}`);
      return true;
    }
    
    // 步驟3: 更新資源狀態
    return await updateResourceStatus(resourceInfo);
    
  } catch (error) {
    log("error", `${getI18nString("processing")} ${identifier} ${getI18nString("updateFailed")}:`, error);
    return false;
  }
}

/**
 * 獲取資源信息
 * @param {string} identifier - 資源標識符
 * @return {Object|null} 資源信息或null
 */
async function getResourceInfo(identifier) {
  // 構建API請求URL - 使用環境變量定義的參數名
  const queryParam = encodeURIComponent(identifier);
  const paramName = config.queryParams.searchParam;
  const searchUrl = `${getApiUrl("resource")}?${paramName}=${queryParam}&limit=1`;
  
  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: generateHeaders(),
      signal: AbortSignal.timeout(config.options.requestTimeout)
    });
    
    if (!response.ok) {
      throw new Error(`${getI18nString("updateFailed")}: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 通用的響應格式 - 適應不同的API回應結構
    const items = data.items || data.data || data.resources || data.results || [];
    if (items.length === 0) {
      logMsg("notFound", `: ${identifier}`);
      return null;
    }
    
    const resourceInfo = items[0];
    
    // 獲取並顯示狀態，改進空值處理
    const currentStatus = getStatusValue(resourceInfo);
    // 對空值使用破折號代替"<空字串>"
    const statusDisplay = currentStatus || "–";
    
    log("info", `${getI18nString("found")}: ${resourceInfo.id}, ${getI18nString("status")}: ${statusDisplay}`);
    return resourceInfo;
  } catch (error) {
    log("error", `${getI18nString("updateFailed")}:`, error);
    return null;
  }
}

/**
 * 獲取資源狀態值
 * @param {Object} resourceInfo - 資源信息
 * @return {*} 狀態值
 */
function getStatusValue(resourceInfo) {
  // 使用配置的可能狀態字段列表進行檢查
  for (const field of config.possibleStatusFields) {
    if (field in resourceInfo && resourceInfo[field] !== undefined) {
      return resourceInfo[field];
    }
  }
  return null;
}

/**
 * 獲取目標狀態值
 * @return {string} 目標狀態值
 */
function getTargetStatus() {
  return config.statusMap.active || process.env.TARGET_STATUS || "ACTIVE";
}

/**
 * 檢查資源是否已有目標狀態
 * @param {Object} resourceInfo - 資源信息
 * @return {boolean} 是否已有目標狀態
 */
function hasTargetStatus(resourceInfo) {
  // 通用的字段名
  const currentStatus = getStatusValue(resourceInfo);
  if (!currentStatus) return false;
  
  const targetStatus = getTargetStatus();
  
  if (Array.isArray(currentStatus)) {
    return currentStatus.includes(targetStatus);
  }
  
  return currentStatus === targetStatus;
}

/**
 * 獲取API URL
 * @param {string} endpoint - 端點類型
 * @return {string} 完整URL
 */
function getApiUrl(endpoint) {
  return `${config.endpoints.base}${config.endpoints[endpoint] || ""}`;
}

/**
 * 生成請求標頭
 * @return {Object} 請求標頭
 */
function generateHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  // 根據配置添加認證頭
  if (config.options.useAuthHeader) {
    // 避免使用硬編碼令牌
    const token = process.env.AUTH_TOKEN || '';
    headers['Authorization'] = `${config.options.authType} ${token}`;
  }
  
  return headers;
}

/**
 * 獲取資源狀態字段名
 * @param {Object} resourceInfo - 資源信息
 * @return {string} 狀態字段名
 */
function getStatusFieldName(resourceInfo) {
  // 使用配置的可能狀態字段列表進行檢查
  for (const field of config.possibleStatusFields) {
    if (field in resourceInfo) {
      return field;
    }
  }
  return 'status'; // 預設
}

/**
 * 更新資源狀態
 * @param {Object} resourceInfo - 資源信息
 * @return {boolean} 是否更新成功
 */
async function updateResourceStatus(resourceInfo) {
  // 構建API URL
  const updateUrl = `${getApiUrl("resource")}/${resourceInfo.id}`;
  
  try {
    // 確定正確的狀態字段名
    const statusField = getStatusFieldName(resourceInfo);
    
    // 通用的數據結構 - 支持不同的API格式
    const updateData = {
      id: resourceInfo.id,
      // 使用動態狀態字段和值
      [statusField]: getTargetStatus(),
      // 其他可能需要保留的字段
      updatedAt: new Date().toISOString(),
      metadata: resourceInfo.metadata || {}
    };
    
    // 進行API請求
    const response = await fetch(updateUrl, {
      method: process.env.UPDATE_METHOD || 'PATCH',
      headers: generateHeaders(),
      body: JSON.stringify(updateData),
      signal: AbortSignal.timeout(config.options.requestTimeout)
    });
    
    if (!response.ok) {
      throw new Error(`${getI18nString("updateFailed")}: ${response.status}`);
    }
    
    logMsg("updateSuccess", ` ${resourceInfo.id} ${getI18nString("status")}: ${getTargetStatus()}`);
    return true;
  } catch (error) {
    error.retryCount = error.retryCount || 0;
    log("error", `${getI18nString("updateFailed")} (${error.retryCount + 1}/${config.options.maxRetries + 1}):`, error);
    
    // 添加重試邏輯
    if (error.retryCount < config.options.maxRetries) {
      error.retryCount += 1;
      const retryDelay = 1000 * error.retryCount;
      log("info", `${getI18nString("retrying")} ${retryDelay/1000}`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return await updateResourceStatus(resourceInfo);
    }
    
    return false;
  }
}

/**
 * 獲取國際化字符串
 * @param {string} key - 字符串鍵
 * @return {string} 本地化字符串
 */
function getI18nString(key) {
  const lang = config.options.language;
  return (config.i18n[lang] && config.i18n[lang][key]) || key;
}

/**
 * 記錄國際化消息
 * @param {string} msgKey - 消息鍵
 * @param {string} suffix - 附加文本
 */
function logMsg(msgKey, suffix = "") {
  log("info", getI18nString(msgKey) + suffix);
}

/**
 * 通用日誌函數
 * @param {string} level - 日誌級別
 * @param {string} message - 日誌消息
 * @param {*} [data] - 可選數據
 */
function log(level, message, data) {
  if (config.options.logLevel === 'error' && level !== 'error') return;
  if (config.options.logLevel === 'info' && level === 'debug') return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    console[level === 'error' ? 'error' : 'log'](`${prefix} ${message}`, data);
  } else {
    console[level === 'error' ? 'error' : 'log'](`${prefix} ${message}`);
  }
}

/**
 * 按順序處理所有資源
 */
async function processAllResources() {
  log("info", `${getI18nString("processing")} ${config.resourceIdentifiers.length}`);
  
  let successCount = 0;
  let failCount = 0;
  const results = [];
  
  for (const identifier of config.resourceIdentifiers) {
    const startTime = Date.now();
    const success = await processResourceStatus(identifier);
    const duration = Date.now() - startTime;
    
    results.push({
      identifier,
      success,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`
    });
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    if (config.resourceIdentifiers.indexOf(identifier) < config.resourceIdentifiers.length - 1) {
      // 添加隨機延遲，模擬人工操作
      const delay = config.minDelay + Math.floor(Math.random() * (config.maxDelay - config.minDelay));
      log("info", `${getI18nString("waiting")} ${delay/1000}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  log("info", `${getI18nString("completed")}: ${successCount}, ${getI18nString("failed")}: ${failCount}`);
  
  // 返回執行結果摘要
  return {
    total: config.resourceIdentifiers.length,
    success: successCount,
    failed: failCount,
    details: results
  };
}

// 開始執行
log("info", "========= " + getI18nString("startMessage") + " =========");
log("info", `${getI18nString("status")}: ${getTargetStatus()}`);
log("info", `${getI18nString("resources")}: ${config.resourceIdentifiers.join(', ')}`);
log("info", "======================================");
// const results = await processAllResources(); // 取消此行註釋以執行腳本
// console.log("執行結果摘要:", results);     // 顯示執行結果摘要 
