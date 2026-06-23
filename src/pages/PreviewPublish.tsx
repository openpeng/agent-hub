import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Send,
  Trash2,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Bot,
  User,
  Sparkles,
  FileText,
  Tag,
  Wrench,
  RotateCcw,
  Globe,
  Lock,
  Users,
  Check,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAgentStore } from '../store/useAgentStore';
import { buildAgentPackage } from '../utils/packageBuilder';
import { registerSkill, registerMcpServer, uploadMarketAgent } from '../services/marketApi';
import type { PreviewMessage } from '../types';
import './PreviewPublish.css';

/* ============================================================
 *  校验项类型
 * ============================================================ */
interface ValidationItem {
  key: string;
  label: string;
  passed: boolean;
}

/* ============================================================
 *  模拟AI回复逻辑
 * ============================================================ */
function generateMockReply(input: string, agentName: string): string {
  // 根据输入关键词返回不同的模拟回复
  if (input.includes('你好') || input.includes('hi') || input.includes('hello')) {
    return `你好！我是${agentName}，很高兴为你服务。有什么我可以帮你的吗？`;
  }
  if (input.includes('帮助') || input.includes('help')) {
    return `我可以帮你处理以下任务：文档写作、数据分析、内容创作等。请告诉我你需要什么帮助。`;
  }
  if (input.includes('技能') || input.includes('skill')) {
    return `我当前配置了以下技能，可以为你提供专业服务。你可以随时向我提问，我会尽力给出最好的回答。`;
  }
  if (input.includes('谢谢') || input.includes('thanks')) {
    return `不客气！如果还有其他问题，随时可以问我。祝你使用愉快！`;
  }
  if (input.includes('再见') || input.includes('bye')) {
    return `再见！期待下次为你服务。祝你有美好的一天！`;
  }
  // 默认回复
  return `收到你的消息："${input}"。作为${agentName}，我会尽力帮助你完成这个任务。`;
}

/* ============================================================
 *  预览与发布页面主组件
 * ============================================================ */
export default function PreviewPublish() {
  const navigate = useNavigate();
  const {
    agent,
    previewMessages,
    addPreviewMessage,
    clearPreviewMessages,
    updateAgent,
    setStepCompleted,
    resetAgent,
  } = useAgentStore();

  // ---- 本地状态 ----
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [publishNote, setPublishNote] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'team'>('public');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // 真实发布流程状态
  const [publishStep, setPublishStep] = useState<
    'idle' | 'packaging' | 'skills-register' | 'mcp-register' | 'agent-upload' | 'done' | 'error'
  >('idle');
  const [publishErrors, setPublishErrors] = useState<Array<{ step: string; message: string; isWarning: boolean }>>([]);
  const [publishResultId, setPublishResultId] = useState<string | null>(null);
  const [marketUrl, setMarketUrl] = useState<string>(
    () => localStorage.getItem('agent_builder_market_url') || import.meta.env.VITE_MARKET_URL || 'http://localhost:8321'
  );

  // ---- Refs ----
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- 配置校验 ----
  const validationItems: ValidationItem[] = useMemo(() => {
    const items: ValidationItem[] = [
      {
        key: 'name',
        label: 'Agent名称已填写',
        passed: agent.name.trim().length > 0,
      },
      {
        key: 'description',
        label: '描述信息已填写',
        passed:
          agent.description.summary.trim().length > 0 ||
          agent.description.detail.trim().length > 0,
      },
    ];

    // MCP 工具已连接：仅当配置了 MCP 工具时才要求
    if (agent.mcpTools.length > 0) {
      items.push({
        key: 'mcp',
        label: 'MCP工具已连接',
        passed: agent.mcpTools.every((t) => t.isConnected),
      });
    }

    return items;
  }, [agent.name, agent.description.summary, agent.description.detail, agent.mcpTools]);

  const allValidationPassed = useMemo(
    () => validationItems.every((item) => item.passed),
    [validationItems]
  );

  const passCount = useMemo(
    () => validationItems.filter((item) => item.passed).length,
    [validationItems]
  );

  // ---- 页面加载时标记步骤完成 ----
  useEffect(() => {
    setStepCompleted('preview-publish', true);
  }, [setStepCompleted]);

  // ---- 初始化：添加欢迎语 ----
  useEffect(() => {
    if (previewMessages.length === 0 && agent.welcomeMessage) {
      addPreviewMessage({
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: agent.welcomeMessage,
        timestamp: new Date().toISOString(),
      });
    }
    // 仅在首次加载时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 消息列表自动滚动到底部 ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [previewMessages, isTyping]);

  // ---- 发送消息 ----
  const handleSendMessage = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping) return;

    // 添加用户消息
    const userMessage: PreviewMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    addPreviewMessage(userMessage);
    setInputValue('');

    // 模拟AI回复（延迟1-2秒）
    setIsTyping(true);
    const delay = 1000 + Math.random() * 1000;
    setTimeout(() => {
      const reply = generateMockReply(trimmed, agent.name || 'AI助手');
      const assistantMessage: PreviewMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };
      addPreviewMessage(assistantMessage);
      setIsTyping(false);
    }, delay);
  }, [inputValue, isTyping, agent.name, addPreviewMessage]);

  // ---- 回车发送 ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // ---- 清空对话 ----
  const handleClearChat = useCallback(() => {
    clearPreviewMessages();
    // 重新添加欢迎语
    if (agent.welcomeMessage) {
      addPreviewMessage({
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: agent.welcomeMessage,
        timestamp: new Date().toISOString(),
      });
    }
    inputRef.current?.focus();
  }, [clearPreviewMessages, agent.welcomeMessage, addPreviewMessage]);

  // ---- 真实发布操作 ----
  const handlePublish = useCallback(async () => {
    if (!allValidationPassed || isPublishing) return;
    setIsPublishing(true);
    setPublishErrors([]);
    setPublishStep('packaging');

    try {
      // Step 1: 序列化 + 打包
      const { blob: packageBlob } = await buildAgentPackage(agent);
      setPublishStep('skills-register');

      // Step 2: 独立注册 Skills（并行，失败不阻塞）
      if (agent.skills.length > 0) {
        const skillResults = await Promise.allSettled(
          agent.skills.map((skill) =>
            registerSkill(
              {
                id: `${agent.name}/${skill.name}`,
                original_name: skill.name || skill.skillId,
                display_name: skill.name,
                description: skill.description || '',
                version: skill.version || '1.0.0',
                category: skill.category || '',
              },
              marketUrl
            )
          )
        );
        skillResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            setPublishErrors((prev) => [
              ...prev,
              {
                step: `Skill: ${agent.skills[index]?.name}`,
                message: String(result.reason?.message || result.reason),
                isWarning: true,
              },
            ]);
          }
        });
      }

      // Step 3: 独立注册 MCP Servers（并行，失败不阻塞）
      setPublishStep('mcp-register');
      if (agent.mcpTools.length > 0) {
        const mcpResults = await Promise.allSettled(
          agent.mcpTools.map((tool) => {
            const config = tool.config || {};
            return registerMcpServer(
              {
                id: `${agent.name}/${tool.name}`,
                original_name: tool.name || tool.toolId,
                description: tool.description || '',
                command: typeof config.command === 'string' ? config.command : '',
                args: Array.isArray(config.args) ? config.args : [],
                required_env:
                  typeof config.env === 'object' && config.env !== null
                    ? Object.keys(config.env)
                    : [],
              },
              marketUrl
            );
          })
        );
        mcpResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            setPublishErrors((prev) => [
              ...prev,
              {
                step: `MCP: ${agent.mcpTools[index]?.name}`,
                message: String(result.reason?.message || result.reason),
                isWarning: true,
              },
            ]);
          }
        });
      }

      // Step 4: 上传 Agent 包
      setPublishStep('agent-upload');
      const file = new File([packageBlob], `${agent.name || 'agent'}.tar.gz`, {
        type: 'application/gzip',
      });
      const uploadResult = await uploadMarketAgent(file, false, marketUrl);

      setPublishStep('done');
      setPublishResultId(uploadResult.id);
      updateAgent({ status: 'published' });
      setIsPublishing(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      setPublishStep('error');
      setPublishErrors((prev) => [
        ...prev,
        {
          step: 'Agent 上传',
          message: String(err.message || err),
          isWarning: false,
        },
      ]);
      setIsPublishing(false);
      updateAgent({ status: 'draft' }); // rollback status
    }
  }, [allValidationPassed, isPublishing, agent, marketUrl, updateAgent]);

  // ---- 重置配置 ----
  const handleReset = useCallback(() => {
    resetAgent();
    navigate('/intro');
  }, [resetAgent, navigate]);

  // ---- 关闭成功弹窗 ----
  const handleCloseModal = useCallback(() => {
    setShowSuccessModal(false);
  }, []);

  // ---- 上一步导航 ----
  const handlePrev = useCallback(() => {
    navigate('/mcp-tools');
  }, [navigate]);

  // ---- 格式化时间 ----
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="preview-page">
      {/* ===== 左列：校验面板 + 对话预览 ===== */}
      <div className="preview-page-left">
        {/* ---- 配置校验面板 ---- */}
        <div className="validation-panel">
          <div className="validation-panel-title">
            <ShieldCheck size={18} className="panel-icon" />
            配置校验
          </div>

          {/* 校验结果摘要 */}
          <div
            className={`validation-summary ${
              allValidationPassed ? 'all-pass' : 'has-fail'
            }`}
          >
            <CheckCircle size={14} />
            {allValidationPassed
              ? `全部通过 (${passCount}/${validationItems.length})，可以发布`
              : `已通过 ${passCount}/${validationItems.length} 项，请完善未通过的配置`}
          </div>

          {/* 校验项列表 */}
          <div className="validation-list">
            {validationItems.map((item) => (
              <div key={item.key} className={`validation-item ${item.passed ? 'pass' : 'fail'}`}>
                <div className="vi-icon">
                  {item.passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                </div>
                <span className="vi-label">{item.label}</span>
                <span className="vi-status">
                  {item.passed ? '通过' : '未通过'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- 对话预览/沙箱测试 ---- */}
        <div className="chat-preview">
          {/* 对话头部 */}
          <div className="chat-preview-header">
            <div className="chat-preview-header-left">
              <span className="chat-agent-icon">
                {agent.icon || <Bot size={20} />}
              </span>
              <span>沙箱测试</span>
              <span className="chat-agent-name">
                {agent.name || '未命名Agent'}
              </span>
            </div>
            <button className="chat-clear-btn" onClick={handleClearChat}>
              <Trash2 size={12} />
              清空对话
            </button>
          </div>

          {/* 消息列表 */}
          <div className="chat-messages">
            {previewMessages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.role}`}>
                <div className="chat-message-avatar">
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div>
                  <div className="chat-message-bubble">{msg.content}</div>
                  <div className="chat-message-time">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ))}

            {/* 正在输入指示器 */}
            {isTyping && (
              <div className="chat-message assistant">
                <div className="chat-message-avatar">
                  <Bot size={16} />
                </div>
                <div className="typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 输入栏 */}
          <div className="chat-input-bar">
            <input
              ref={inputRef}
              type="text"
              placeholder="输入消息测试Agent回复..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
            />
            <button
              className="chat-send-btn"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              title="发送消息"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== 右列：配置摘要 + 发布操作 ===== */}
      <div className="preview-page-right">
        {/* ---- Agent配置摘要 ---- */}
        <div className="config-summary">
          <div className="config-summary-title">
            <FileText size={18} className="panel-icon" />
            配置摘要
          </div>

          {/* 基础信息 */}
          <div className="summary-section">
            <div className="summary-section-title">基础信息</div>
            <div className="summary-row">
              <span className="summary-label">名称</span>
              <span className={`summary-value ${!agent.name ? 'empty' : ''}`}>
                {agent.name || '未填写'}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">版本</span>
              <span className="summary-value">{agent.version}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">开发者</span>
              <span className={`summary-value ${!agent.developer ? 'empty' : ''}`}>
                {agent.developer || '未填写'}
              </span>
            </div>
          </div>

          {/* 描述摘要 */}
          <div className="summary-section">
            <div className="summary-section-title">描述</div>
            {agent.description.summary ? (
              <div className="summary-row">
                <span className="summary-value">{agent.description.summary}</span>
              </div>
            ) : agent.description.detail ? (
              <div className="summary-row">
                <span
                  className="summary-value"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {agent.description.detail}
                </span>
              </div>
            ) : (
              <div className="summary-empty">未填写描述信息</div>
            )}
          </div>

          {/* 已选Skills列表 */}
          <div className="summary-section">
            <div className="summary-section-title">
              <Sparkles size={12} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              已选Skills ({agent.skills.length})
            </div>
            {agent.skills.length > 0 ? (
              <div className="summary-skill-list">
                {agent.skills.map((skill) => (
                  <div key={skill.skillId} className="summary-skill-item">
                    <span className="skill-icon">{skill.icon}</span>
                    <span className="skill-name">{skill.name}</span>
                    <span className="skill-version">v{skill.version}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="summary-empty">未选择任何Skill</div>
            )}
          </div>

          {/* 已配置MCP工具列表 */}
          <div className="summary-section">
            <div className="summary-section-title">
              <Wrench size={12} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              已配置MCP工具 ({agent.mcpTools.length})
            </div>
            {agent.mcpTools.length > 0 ? (
              <div className="summary-mcp-list">
                {agent.mcpTools.map((tool) => (
                  <div key={tool.toolId} className="summary-mcp-item">
                    <span className="mcp-icon">{tool.icon}</span>
                    <span className="mcp-name">{tool.name}</span>
                    <span
                      className={`mcp-status ${
                        tool.isConnected ? 'connected' : 'disconnected'
                      }`}
                    >
                      {tool.isConnected ? '已连接' : '未连接'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="summary-empty">未配置任何MCP工具</div>
            )}
          </div>

          {/* 分类标签 */}
          <div className="summary-section">
            <div className="summary-section-title">
              <Tag size={12} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              分类标签
            </div>
            {agent.categories.length > 0 ? (
              <div className="summary-tags">
                {agent.categories.map((cat) => (
                  <span key={cat} className="summary-tag">
                    {cat}
                  </span>
                ))}
              </div>
            ) : (
              <div className="summary-empty">未选择分类标签</div>
            )}
          </div>
        </div>

        {/* ---- 发布操作区 ---- */}
        <div className="publish-section">
          <div className="publish-section-title">
            <Eye size={18} className="panel-icon" />
            发布设置
          </div>

          {/* 发布说明 */}
          <div className="publish-note-group">
            <label className="publish-note-label">发布说明</label>
            <textarea
              className="publish-note-textarea"
              placeholder="描述本次发布的更新内容、新功能等..."
              value={publishNote}
              onChange={(e) => setPublishNote(e.target.value)}
            />
          </div>

          {/* Market 服务地址 */}
          <div className="publish-note-group">
            <label className="publish-note-label">
              <Globe size={12} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              Market 地址
            </label>
            <input
              type="text"
              className="publish-note-textarea"
              style={{ height: '2.4rem', minHeight: '2.4rem' }}
              placeholder="http://localhost:8321"
              value={marketUrl}
              onChange={(e) => {
                setMarketUrl(e.target.value);
                localStorage.setItem('agent_builder_market_url', e.target.value);
              }}
            />
          </div>

          {/* 可见范围 */}
          <div className="visibility-options">
            <label className="visibility-options-label">可见范围</label>
            <div className="visibility-options-list">
              <div
                className={`visibility-option ${visibility === 'public' ? 'selected' : ''}`}
                onClick={() => setVisibility('public')}
              >
                <input type="radio" name="visibility" checked={visibility === 'public'} readOnly />
                <div className="visibility-radio-dot" />
                <Globe size={14} />
                公开
              </div>
              <div
                className={`visibility-option ${visibility === 'private' ? 'selected' : ''}`}
                onClick={() => setVisibility('private')}
              >
                <input type="radio" name="visibility" checked={visibility === 'private'} readOnly />
                <div className="visibility-radio-dot" />
                <Lock size={14} />
                私有
              </div>
              <div
                className={`visibility-option ${visibility === 'team' ? 'selected' : ''}`}
                onClick={() => setVisibility('team')}
              >
                <input type="radio" name="visibility" checked={visibility === 'team'} readOnly />
                <div className="visibility-radio-dot" />
                <Users size={14} />
                团队
              </div>
            </div>
          </div>

          {/* 发布进度 */}
          {isPublishing && (
            <div className="publish-progress">
              <div className="publish-progress-steps">
                <div className={`pp-step ${publishStep === 'packaging' ? 'active' : publishStep !== 'idle' ? 'done' : ''}`}>
                  {publishStep !== 'packaging' && publishStep !== 'idle' && publishStep !== 'error' ? <CheckCircle size={14} /> : <Loader2 size={14} className={publishStep === 'packaging' ? 'spinning' : ''} />}
                  <span>打包</span>
                </div>
                <div className="pp-divider" />
                <div className={`pp-step ${publishStep === 'skills-register' ? 'active' : publishStep !== 'idle' && publishStep !== 'packaging' && publishStep !== 'error' ? 'done' : ''}`}>
                  {publishStep !== 'skills-register' && publishStep !== 'idle' && publishStep !== 'packaging' && publishStep !== 'error' ? <CheckCircle size={14} /> : <Loader2 size={14} className={publishStep === 'skills-register' ? 'spinning' : ''} />}
                  <span>Skills</span>
                </div>
                <div className="pp-divider" />
                <div className={`pp-step ${publishStep === 'mcp-register' ? 'active' : publishStep !== 'idle' && publishStep !== 'packaging' && publishStep !== 'skills-register' && publishStep !== 'error' ? 'done' : ''}`}>
                  {publishStep !== 'mcp-register' && publishStep !== 'idle' && publishStep !== 'packaging' && publishStep !== 'skills-register' && publishStep !== 'error' ? <CheckCircle size={14} /> : <Loader2 size={14} className={publishStep === 'mcp-register' ? 'spinning' : ''} />}
                  <span>MCP</span>
                </div>
                <div className="pp-divider" />
                <div className={`pp-step ${publishStep === 'agent-upload' ? 'active' : publishStep === 'done' ? 'done' : ''}`}>
                  {publishStep === 'done' ? <CheckCircle size={14} /> : <Loader2 size={14} className={publishStep === 'agent-upload' ? 'spinning' : ''} />}
                  <span>Agent</span>
                </div>
              </div>
            </div>
          )}

          {/* 发布错误/警告 */}
          {publishErrors.length > 0 && (
            <div className="publish-errors">
              {publishErrors.map((err, index) => (
                <div key={index} className={`publish-error-item ${err.isWarning ? 'warning' : 'error'}`}>
                  <AlertCircle size={12} style={{ marginRight: '0.3rem', flexShrink: 0 }} />
                  <span>
                    {err.step && <strong>{err.step}: </strong>}
                    {err.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 发布操作按钮 */}
          <div className="publish-actions">
            <button
              className="publish-btn primary"
              onClick={handlePublish}
              disabled={!allValidationPassed || isPublishing}
            >
              {isPublishing ? (
                <>
                  <span className="spinner" />
                  发布中...
                </>
              ) : (
                <>
                  <Check size={16} />
                  发布Agent
                </>
              )}
            </button>
            <button className="publish-btn reset" onClick={handleReset}>
              <RotateCcw size={16} />
              重置配置
            </button>
          </div>
        </div>
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
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            {allValidationPassed ? (
              <span style={{ color: 'var(--success)' }}>
                <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
                校验通过，可以发布
              </span>
            ) : (
              <span style={{ color: 'var(--danger)' }}>
                <XCircle size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
                请完善配置后再发布
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ===== 发布成功弹窗 ===== */}
      {showSuccessModal && (
        <div className="success-modal-overlay" onClick={handleCloseModal}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal-icon">
              <CheckCircle size={32} />
            </div>
            <div className="success-modal-title">发布成功</div>
            <div className="success-modal-desc">
              你的Agent「{agent.name || '未命名'}」已成功发布！
              {publishResultId && (
                <>
                  <br />
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>ID: {publishResultId}</span>
                </>
              )}
              {publishErrors.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', textAlign: 'left', color: '#d97706' }}>
                  <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: '0.2rem' }} />
                  部分 Skill/MCP 注册出现问题（不影响 Agent 使用）
                </div>
              )}
              <br />
              现在其他人可以通过市场发现并使用它。
            </div>
            <div className="success-modal-actions">
              <button className="modal-btn ghost" onClick={handleCloseModal}>
                继续编辑
              </button>
              <button className="modal-btn primary" onClick={handleReset}>
                创建新Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
