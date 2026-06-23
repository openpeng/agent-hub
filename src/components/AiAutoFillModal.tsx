import { useCallback, useEffect, useState } from 'react';
import { X, Sparkles, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { generateAgentConfig, checkBridgeHealth } from '../services/agentRuntimeApi';
import { sanitizeAIConfig } from '../utils/aiFillMapper';
import type { AgentConfig } from '../types';
import './AiAutoFillModal.css';

interface AiAutoFillModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (config: Partial<AgentConfig>) => void;
}

const QUICK_TEMPLATES = [
  { label: '代码审查', prompt: '帮我创建一个代码审查 Agent，能分析 Pull Request 中的代码变更，检测潜在问题，并给出改进建议' },
  { label: '文档生成', prompt: '帮我创建一个文档生成 Agent，能从代码中自动提取注释和类型信息，生成 API 文档和使用指南' },
  { label: '数据分析', prompt: '帮我创建一个数据分析 Agent，能读取 CSV/Excel 数据文件，进行统计分析，生成可视化图表和报告' },
  { label: '客服助手', prompt: '帮我创建一个智能客服 Agent，能回答常见问题，查询订单状态，处理退换货请求' },
  { label: '测试编写', prompt: '帮我创建一个测试编写 Agent，能分析源代码自动生成单元测试，支持 Jest/Vitest 框架' },
  { label: '翻译助手', prompt: '帮我创建一个翻译助手 Agent，支持中英日韩多语言互译，能保持技术术语的一致性' },
];

export default function AiAutoFillModal({ open, onClose, onApply }: AiAutoFillModalProps) {
  const [userRequest, setUserRequest] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<Partial<AgentConfig> | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bridgeAvailable, setBridgeAvailable] = useState<boolean | null>(null);

  // 检查 Bridge 服务
  useEffect(() => {
    if (open) {
      checkBridgeHealth().then(setBridgeAvailable);
    }
  }, [open]);

  // 生成配置
  const handleGenerate = useCallback(async () => {
    if (!userRequest.trim()) return;
    setGenerating(true);
    setError(null);
    setGeneratedConfig(null);
    setRawResponse(null);

    try {
      const result = await generateAgentConfig(userRequest.trim());
      if (result.success && result.config) {
        const sanitized = sanitizeAIConfig(result.config);
        setGeneratedConfig(sanitized);
      } else {
        setRawResponse(result.rawText || null);
        setError(result.error || 'AI 未能生成有效配置');
      }
    } catch (err: any) {
      setError(err.message || '生成失败，请检查 Bridge 服务是否启动');
    } finally {
      setGenerating(false);
    }
  }, [userRequest]);

  // 应用配置
  const handleApply = () => {
    if (!generatedConfig) return;
    onApply(generatedConfig);
    onClose();
  };

  // 重新生成
  const handleRegenerate = () => {
    setGeneratedConfig(null);
    setRawResponse(null);
    setError(null);
  };

  // 快捷模板
  const handleTemplateClick = (prompt: string) => {
    setUserRequest(prompt);
    setGeneratedConfig(null);
    setRawResponse(null);
    setError(null);
  };

  if (!open) return null;

  return (
    <div className="ai-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ai-modal">
        <div className="ai-modal-header">
          <h2><Sparkles size={18} className="ai-icon" /> AI 智能填写</h2>
          <button className="ai-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="ai-modal-body">
          {/* Bridge 不可用 */}
          {bridgeAvailable === false && (
            <div className="ai-unavailable">
              <div className="ai-unavailable-icon">🔌</div>
              <div className="ai-unavailable-text">AI 服务未启动</div>
              <div className="ai-unavailable-hint">请先启动 agent-bridge 服务: cd agent-bridge && npm run dev</div>
            </div>
          )}

          {bridgeAvailable !== false && (
            <>
              {/* 输入区域 */}
              <div className="ai-input-section">
                <div className="ai-input-label">描述你想创建的 Agent</div>
                <textarea
                  className="ai-input-textarea"
                  placeholder="例如：帮我创建一个代码审查 Agent，能分析 PR 并给出改进建议..."
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  rows={4}
                />
              </div>

              {/* 快捷模板 */}
              <div className="ai-templates">
                <div className="ai-templates-label">快捷模板</div>
                <div className="ai-template-grid">
                  {QUICK_TEMPLATES.map(t => (
                    <button
                      key={t.label}
                      className="ai-template-btn"
                      onClick={() => handleTemplateClick(t.prompt)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 生成按钮 */}
              <button
                className="ai-generate-btn"
                onClick={handleGenerate}
                disabled={!userRequest.trim() || generating}
              >
                {generating ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    正在生成...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    AI 生成配置
                  </>
                )}
              </button>

              {/* 加载动画 */}
              {generating && (
                <div className="ai-generating">
                  <div className="ai-generating-dots">
                    <div className="ai-generating-dot" />
                    <div className="ai-generating-dot" />
                    <div className="ai-generating-dot" />
                  </div>
                  <div className="ai-generating-text">AI 正在分析需求并生成配置...</div>
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="ai-error" style={{ marginTop: '1rem' }}>
                  <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  {error}
                  {rawResponse && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>
                      AI 原始返回: {rawResponse.substring(0, 200)}...
                    </div>
                  )}
                </div>
              )}

              {/* 预览结果 */}
              {generatedConfig && (
                <>
                  <div className="ai-divider">生成结果预览</div>
                  <div className="ai-preview-section">
                    <div className="ai-preview-title">
                      <Check size={16} style={{ color: '#34d399' }} />
                      配置已生成
                    </div>
                    <div className="ai-preview-grid">
                      <div className="ai-preview-item">
                        <span className="ai-preview-label">名称</span>
                        <span className="ai-preview-value">{generatedConfig.name || '-'}</span>
                      </div>
                      <div className="ai-preview-item">
                        <span className="ai-preview-label">图标</span>
                        <span className="ai-preview-value icon-large">{generatedConfig.icon || '🤖'}</span>
                      </div>
                      <div className="ai-preview-item full-width">
                        <span className="ai-preview-label">简介</span>
                        <span className="ai-preview-value">{generatedConfig.description?.summary || '-'}</span>
                      </div>
                      <div className="ai-preview-item">
                        <span className="ai-preview-label">分类</span>
                        <div className="ai-preview-tags">
                          {generatedConfig.categories?.map(c => (
                            <span key={c} className="ai-preview-tag">{c}</span>
                          ))}
                        </div>
                      </div>
                      <div className="ai-preview-item">
                        <span className="ai-preview-label">Skills</span>
                        <span className="ai-preview-value">{generatedConfig.skills?.length || 0} 个</span>
                      </div>
                      <div className="ai-preview-item">
                        <span className="ai-preview-label">MCP 工具</span>
                        <span className="ai-preview-value">{generatedConfig.mcpTools?.length || 0} 个</span>
                      </div>
                      <div className="ai-preview-item full-width">
                        <span className="ai-preview-label">欢迎语</span>
                        <span className="ai-preview-value">{generatedConfig.welcomeMessage || '-'}</span>
                      </div>
                      {(generatedConfig.sampleInputs?.length || 0) > 0 && (
                        <div className="ai-preview-item full-width">
                          <span className="ai-preview-label">输入示例</span>
                          <div className="ai-preview-list">
                            {generatedConfig.sampleInputs!.map((s, i) => (
                              <span key={i} className="ai-preview-list-item">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ai-preview-actions">
                      <button className="btn btn-ghost" onClick={handleRegenerate}>
                        <RefreshCw size={14} />
                        重新生成
                      </button>
                      <button className="btn btn-primary" onClick={handleApply}>
                        <Check size={14} />
                        应用到表单
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
