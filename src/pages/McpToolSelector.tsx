import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Star,
  Check,
  Trash2,
  Settings,
  X,
  Zap,
  Shield,
} from 'lucide-react';
import { mockMcpTools, mcpToolCategories } from '../data/mockMcpTools';
import { listMarketMcpServers } from '../services/marketApi';
import type { MarketMcpServerItem } from '../services/marketApi';
import { useAgentStore } from '../store/useAgentStore';
import type { McpTool, ConfigField } from '../types';
import './McpToolSelector.css';

/* ============================================================
 *  Toast 提示组件
 * ============================================================ */
interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error';
}

function Toast({ toast, onClose }: { toast: ToastData; onClose: (id: string) => void }) {
  // 3秒后自动关闭
  setTimeout(() => onClose(toast.id), 3000);

  return (
    <div className={`toast ${toast.type}`}>
      {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
      {toast.message}
    </div>
  );
}

/* ============================================================
 *  配置面板组件 - 根据configFields动态渲染配置表单
 * ============================================================ */
interface ConfigPanelProps {
  tool: McpTool;
  config: Record<string, any>;
  permissions: string[];
  testingId: string | null;
  onConfigChange: (key: string, value: any) => void;
  onPermissionToggle: (perm: string) => void;
  onTestConnection: (toolId: string) => void;
  onRemove: (toolId: string) => void;
}

function ConfigPanel({
  tool,
  config,
  permissions,
  testingId,
  onConfigChange,
  onPermissionToggle,
  onTestConnection,
  onRemove,
}: ConfigPanelProps) {
  const isTesting = testingId === tool.id;

  return (
    <div className="tool-config-panel">
      <div className="tool-config-panel-title">工具配置</div>

      {/* 动态渲染配置字段 */}
      {tool.configFields.map((field: ConfigField) => (
        <div className="tool-config-field" key={field.key}>
          <label className="tool-config-label">
            {field.label}
            {field.required && <span className="tool-config-required">*</span>}
          </label>
          <div className="tool-config-hint">{field.description}</div>

          {/* string 类型 */}
          {field.type === 'string' && (
            <input
              type="text"
              className="tool-config-input"
              placeholder={field.placeholder || field.description}
              value={config[field.key] ?? field.default ?? ''}
              onChange={(e) => onConfigChange(field.key, e.target.value)}
            />
          )}

          {/* number 类型 */}
          {field.type === 'number' && (
            <input
              type="number"
              className="tool-config-input"
              placeholder={field.placeholder || field.description}
              value={config[field.key] ?? field.default ?? 0}
              onChange={(e) => onConfigChange(field.key, Number(e.target.value))}
            />
          )}

          {/* boolean 类型 - 开关 */}
          {field.type === 'boolean' && (
            <div className="tool-config-toggle">
              <div
                className={`toggle-switch ${config[field.key] ?? field.default ? 'active' : ''}`}
                onClick={() =>
                  onConfigChange(field.key, !(config[field.key] ?? field.default))
                }
              />
              <span className="toggle-label">
                {config[field.key] ?? field.default ? '已开启' : '已关闭'}
              </span>
            </div>
          )}

          {/* select 类型 */}
          {field.type === 'select' && field.options && (
            <select
              className="tool-config-input"
              value={config[field.key] ?? field.default ?? ''}
              onChange={(e) => onConfigChange(field.key, e.target.value)}
            >
              {field.options.map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {/* password 类型 */}
          {field.type === 'password' && (
            <input
              type="password"
              className="tool-config-input"
              placeholder={field.placeholder || '请输入密码'}
              value={config[field.key] ?? field.default ?? ''}
              onChange={(e) => onConfigChange(field.key, e.target.value)}
            />
          )}
        </div>
      ))}

      {/* 权限选择器 */}
      <div className="permission-selector">
        <div className="permission-selector-title">
          <Shield size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
          权限配置
        </div>
        <div className="permission-tags">
          {tool.permissions.map((perm: string) => (
            <div
              key={perm}
              className={`permission-tag ${permissions.includes(perm) ? 'active' : ''}`}
              onClick={() => onPermissionToggle(perm)}
            >
              {perm}
            </div>
          ))}
        </div>
      </div>

      {/* 底部操作：测试连接 + 移除 */}
      <div className="tool-config-footer">
        <button
          className="test-btn"
          disabled={isTesting}
          onClick={() => onTestConnection(tool.id)}
        >
          {isTesting ? (
            <>
              <span className="spinner" />
              测试中...
            </>
          ) : (
            <>
              <Zap size={14} />
              测试连接
            </>
          )}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onRemove(tool.id)}
          title="移除工具"
        >
          <Trash2 size={14} />
          移除
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 *  MCP工具选择页面主组件
 * ============================================================ */
export default function McpToolSelector() {
  const navigate = useNavigate();
  const {
    agent,
    addMcpTool,
    removeMcpTool,
    updateMcpTool,
    setStepCompleted,
  } = useAgentStore();

  // 本地状态：搜索关键词、分类过滤、展开的配置面板、测试连接状态、Toast提示
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Market API: fetch MCP servers list (ref guards against Strict Mode double-fire)
  const mcpFetchedRef = useRef(false);
  const [marketMcpList, setMarketMcpList] = useState<MarketMcpServerItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);

  useEffect(() => {
    if (mcpFetchedRef.current) return;
    mcpFetchedRef.current = true;
    setMarketLoading(true);
    listMarketMcpServers({ page_size: 100 })
      .then((result) => setMarketMcpList(result.servers || []))
      .catch(() => setMarketMcpList([]))
      .finally(() => setMarketLoading(false));
  }, []);

  // Merge market data with mock data: mock provides rich config/permissions
  const availableMcpTools = useMemo<McpTool[]>(() => {
    if (marketMcpList.length === 0) return mockMcpTools;
    return marketMcpList.map((ms) => {
      const mock = mockMcpTools.find((m) => m.id === ms.id);
      if (mock) return mock;
      // Create minimal McpTool from market data
      return {
        id: ms.id,
        name: ms.original_name,
        description: ms.description,
        icon: '🔧',
        category: '工具',
        author: '',
        downloads: 0,
        rating: 0,
        configFields: [],
        permissions: [],
        status: 'active' as const,
      } as McpTool;
    });
  }, [marketMcpList]);

  // ---- 计算属性：已添加的MCP工具ID集合 ----
  const addedToolIds = useMemo(
    () => new Set(agent.mcpTools.map((t) => t.toolId)),
    [agent.mcpTools]
  );

  // ---- 计算属性：过滤后的工具列表 ----
  const filteredTools = useMemo(() => {
    return availableMcpTools.filter((tool) => {
      // 分类过滤
      const categoryMatch =
        activeCategory === '全部' || tool.category === activeCategory;

      // 搜索过滤（匹配名称和描述）
      const query = searchQuery.toLowerCase().trim();
      const searchMatch =
        !query ||
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query);

      return categoryMatch && searchMatch;
    });
  }, [searchQuery, activeCategory]);

  // ---- 添加/移除MCP工具 ----
  const handleToggleTool = useCallback(
    (tool: McpTool) => {
      if (addedToolIds.has(tool.id)) {
        // 已添加 -> 移除
        removeMcpTool(tool.id);
        if (expandedToolId === tool.id) {
          setExpandedToolId(null);
        }
      } else {
        // 未添加 -> 构建默认配置并添加
        const defaultConfig: Record<string, any> = {};
        tool.configFields.forEach((f) => {
          defaultConfig[f.key] = f.default;
        });

        addMcpTool({
          toolId: tool.id,
          name: tool.name,
          description: tool.description,
          icon: tool.icon,
          category: tool.category,
          config: defaultConfig,
          permissions: [...tool.permissions],
          isConnected: false,
        });
      }
    },
    [addedToolIds, removeMcpTool, addMcpTool, expandedToolId]
  );

  // ---- 展开/收起配置面板 ----
  const handleToggleExpand = useCallback((toolId: string) => {
    setExpandedToolId((prev) => (prev === toolId ? null : toolId));
  }, []);

  // ---- 配置字段变更 ----
  const handleConfigChange = useCallback(
    (toolId: string, key: string, value: any) => {
      const toolRef = agent.mcpTools.find((t) => t.toolId === toolId);
      if (!toolRef) return;

      const newConfig = { ...toolRef.config, [key]: value };
      updateMcpTool(toolId, { config: newConfig });
    },
    [agent.mcpTools, updateMcpTool]
  );

  // ---- 权限切换 ----
  const handlePermissionToggle = useCallback(
    (toolId: string, perm: string) => {
      const toolRef = agent.mcpTools.find((t) => t.toolId === toolId);
      if (!toolRef) return;

      const newPermissions = toolRef.permissions.includes(perm)
        ? toolRef.permissions.filter((p) => p !== perm)
        : [...toolRef.permissions, perm];

      updateMcpTool(toolId, { permissions: newPermissions });
    },
    [agent.mcpTools, updateMcpTool]
  );

  // ---- 测试连接（模拟：2秒后返回成功） ----
  const handleTestConnection = useCallback(
    (toolId: string) => {
      setTestingId(toolId);

      setTimeout(() => {
        // 模拟连接成功
        updateMcpTool(toolId, { isConnected: true });
        setTestingId(null);

        // 显示成功Toast
        const toastId = `toast-${Date.now()}`;
        setToasts((prev) => [
          ...prev,
          { id: toastId, message: '连接测试成功', type: 'success' },
        ]);
      }, 2000);
    },
    [updateMcpTool]
  );

  // ---- 移除Toast ----
  const handleRemoveToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ---- 导航：上一步 / 下一步 ----
  const handlePrev = () => navigate('/skills');
  const handleNext = () => {
    setStepCompleted('mcp-tools', true);
    navigate('/preview-publish');
  };

  // ---- 格式化下载量 ----
  const formatDownloads = (num: number): string => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}w`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return String(num);
  };

  return (
    <div className="mcp-page">
      {/* ===== 左侧：MCP工具浏览器 ===== */}
      <div className="mcp-browser">
        {/* 搜索框 */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="搜索MCP工具名称或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 分类过滤标签栏 */}
        <div className="filter-bar">
          <div
            className={`filter-tag ${activeCategory === '全部' ? 'active' : ''}`}
            onClick={() => setActiveCategory('全部')}
          >
            全部
            <span className="filter-count">{availableMcpTools.length}</span>
          </div>
          {mcpToolCategories.map((cat) => (
            <div
              key={cat.id}
              className={`filter-tag ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon} {cat.label}
              <span className="filter-count">{cat.count}</span>
            </div>
          ))}
        </div>

        {/* 工具卡片网格（2列） */}
        {marketLoading ? (
          <div className="empty-state">
            <div className="spinner" style={{ marginBottom: 12 }} />
            <div className="empty-state-text">正在从市场加载 MCP 工具...</div>
          </div>
        ) : (
          <div className="mcp-grid">
            {filteredTools.map((tool) => {
            const isAdded = addedToolIds.has(tool.id);
            // 获取已配置工具的连接状态
            const configuredTool = agent.mcpTools.find((t) => t.toolId === tool.id);
            const isConnected = configuredTool?.isConnected ?? false;

            return (
              <div
                key={tool.id}
                className={`mcp-card ${isAdded ? 'added' : ''}`}
                onClick={() => handleToggleTool(tool)}
              >
                {/* 选中勾选标记 */}
                <div className="mcp-card-check">
                  <Check size={14} />
                </div>

                {/* 卡片头部 */}
                <div className="mcp-card-header">
                  <div className="mcp-card-header-left">
                    <span className="mcp-card-icon">{tool.icon}</span>
                    <div>
                      <div className="mcp-card-name">{tool.name}</div>
                    </div>
                  </div>
                  {/* 分类标签 */}
                  <span className="mcp-card-category">{tool.category}</span>
                </div>

                {/* 连接状态指示 */}
                {isAdded && (
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span
                      className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}
                    >
                      <span className="connection-status-dot" />
                      {isConnected ? '已连接' : '未连接'}
                    </span>
                  </div>
                )}

                {/* 卡片内容 */}
                <div className="mcp-card-body">
                  <div className="mcp-card-desc">{tool.description}</div>
                </div>

                {/* 卡片底部：下载量、评分 */}
                <div className="mcp-card-footer">
                  <div className="mcp-card-stat">
                    <Download size={14} />
                    <span className="stat-value">{formatDownloads(tool.downloads)}</span>
                  </div>
                  <div className="mcp-card-stat">
                    <Star size={14} />
                    <span className="stat-value">{tool.rating}</span>
                  </div>
                  <div className="mcp-card-stat">
                    {isAdded ? (
                      <span style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 500 }}>
                        已添加
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                        点击添加
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}

        {/* 空搜索结果 */}
        {!marketLoading && filteredTools.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">
              未找到匹配的MCP工具，请尝试其他搜索关键词
            </div>
          </div>
        )}
      </div>

      {/* ===== 右侧：已配置工具列表 ===== */}
      <div className="configured-tools">
        <div className="configured-tools-title">
          已配置工具
          <span className="configured-tools-count">{agent.mcpTools.length}</span>
        </div>

        {agent.mcpTools.length === 0 ? (
          <div className="configured-empty">
            <div className="configured-empty-icon">🔧</div>
            <div className="configured-empty-text">
              还未添加任何MCP工具
              <br />
              从左侧浏览并点击卡片添加
            </div>
          </div>
        ) : (
          agent.mcpTools.map((toolRef) => {
            // 从availableMcpTools中找到完整的工具数据
            const fullTool = availableMcpTools.find((t) => t.id === toolRef.toolId);
            if (!fullTool) return null;

            const isExpanded = expandedToolId === toolRef.toolId;

            return (
              <div key={toolRef.toolId} className="configured-tool-item">
                {/* 项头部：图标 + 信息 + 操作 */}
                <div className="configured-tool-item-header">
                  <span className="configured-tool-icon">{toolRef.icon}</span>
                  <div className="configured-tool-info">
                    <div className="configured-tool-name">{toolRef.name}</div>
                    <div className="configured-tool-category">
                      {toolRef.category}
                      <span
                        className={`connection-status ${toolRef.isConnected ? 'connected' : 'disconnected'}`}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        <span className="connection-status-dot" />
                        {toolRef.isConnected ? '已连接' : '未连接'}
                      </span>
                    </div>
                  </div>
                  <div className="configured-tool-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleToggleExpand(toolRef.toolId)}
                      title={isExpanded ? '收起配置' : '展开配置'}
                    >
                      {isExpanded ? <X size={14} /> : <Settings size={14} />}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        removeMcpTool(toolRef.toolId);
                        if (expandedToolId === toolRef.toolId) {
                          setExpandedToolId(null);
                        }
                      }}
                      title="移除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 配置面板（展开时显示） */}
                {isExpanded && (
                  <ConfigPanel
                    tool={fullTool}
                    config={toolRef.config}
                  permissions={toolRef.permissions}
                  testingId={testingId}
                    onConfigChange={(key, value) =>
                      handleConfigChange(toolRef.toolId, key, value)
                    }
                    onPermissionToggle={(perm) =>
                      handlePermissionToggle(toolRef.toolId, perm)
                    }
                    onTestConnection={handleTestConnection}
                    onRemove={removeMcpTool}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ===== 底部操作栏 ===== */}
      <div className="action-bar">
        <div className="action-bar-left">
          <button className="btn" onClick={handlePrev}>
            <ChevronLeft size={16} />
            上一步
          </button>
        </div>

        <div className="action-bar-right">
          <span className="mcp-count-hint">
            已配置 <strong>{agent.mcpTools.length}</strong> 个MCP工具
          </span>
          <button className="btn btn-primary" onClick={handleNext}>
            下一步
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ===== Toast 提示消息 ===== */}
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={handleRemoveToast} />
      ))}
    </div>
  );
}
