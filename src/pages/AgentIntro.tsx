import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Tag,
  BookOpen,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Image,
  Download,
  Sparkles,
} from 'lucide-react';
import { useAgentStore } from '../store/useAgentStore';
import MarketImportModal from '../components/MarketImportModal';
import AiAutoFillModal from '../components/AiAutoFillModal';
import type { AgentConfig } from '../types';
import './AgentIntro.css';

// 预设分类列表
const PRESET_CATEGORIES = ['办公效率', '数据分析', '内容创作', '开发工具', '客户服务', '教育学习'];

// 预设图标列表
const PRESET_ICONS = [
  { emoji: '🤖', label: '机器人' },
  { emoji: '📊', label: '数据分析' },
  { emoji: '✍️', label: '写作' },
  { emoji: '🔍', label: '搜索' },
  { emoji: '💬', label: '对话' },
  { emoji: '🛠️', label: '工具' },
  { emoji: '🎨', label: '创意' },
  { emoji: '📋', label: '管理' },
];

export default function AgentIntro() {
  const navigate = useNavigate();
  const { agent, updateAgent, setStepCompleted, setLastSaved, importFromMarket, fillFromAI } = useAgentStore();

  // 弹窗状态
  const [showMarketImport, setShowMarketImport] = useState(false);
  const [showAiFill, setShowAiFill] = useState(false);

  // 自动保存状态
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 监听 QuickStart 页面的 custom event
  useEffect(() => {
    const handleOpenMarketImport = () => setShowMarketImport(true);
    const handleOpenAiFill = () => setShowAiFill(true);
    window.addEventListener('open-market-import', handleOpenMarketImport);
    window.addEventListener('open-ai-fill', handleOpenAiFill);
    return () => {
      window.removeEventListener('open-market-import', handleOpenMarketImport);
      window.removeEventListener('open-ai-fill', handleOpenAiFill);
    };
  }, []);

  // 触发自动保存效果
  const triggerAutoSave = useCallback(() => {
    setSaveStatus('saving');
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      const now = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSaved(now);
      setSaveStatus('saved');
    }, 600);
  }, [setLastSaved]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // --- 市场导入回调 ---
  const handleMarketImport = useCallback((config: Partial<AgentConfig>) => {
    importFromMarket(config);
    setShowMarketImport(false);
    triggerAutoSave();
  }, [importFromMarket, triggerAutoSave]);

  // --- AI 填写回调 ---
  const handleAiFillApply = useCallback((config: Partial<AgentConfig>) => {
    fillFromAI(config);
    setShowAiFill(false);
    triggerAutoSave();
  }, [fillFromAI, triggerAutoSave]);

  // --- 基础信息变更 ---
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAgent({ name: e.target.value });
    triggerAutoSave();
  };

  const handleVersionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAgent({ version: e.target.value });
    triggerAutoSave();
  };

  const handleDeveloperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAgent({ developer: e.target.value });
    triggerAutoSave();
  };

  // --- 图标配置 ---
  const handleIconUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAgent({ icon: e.target.value });
    triggerAutoSave();
  };

  const handlePresetIconSelect = (emoji: string) => {
    updateAgent({ icon: emoji });
    triggerAutoSave();
  };

  // --- 描述配置 ---
  const handleSummaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAgent({ description: { ...agent.description, summary: e.target.value } });
    triggerAutoSave();
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateAgent({ description: { ...agent.description, detail: e.target.value } });
    triggerAutoSave();
  };

  // --- 使用示例（动态添加/删除） ---
  const handleExampleChange = (index: number, value: string) => {
    const newExamples = [...agent.description.examples];
    newExamples[index] = value;
    updateAgent({ description: { ...agent.description, examples: newExamples } });
    triggerAutoSave();
  };

  const handleAddExample = () => {
    updateAgent({
      description: { ...agent.description, examples: [...agent.description.examples, ''] },
    });
    triggerAutoSave();
  };

  const handleRemoveExample = (index: number) => {
    const newExamples = agent.description.examples.filter((_, i) => i !== index);
    updateAgent({ description: { ...agent.description, examples: newExamples } });
    triggerAutoSave();
  };

  // --- 分类标签（多选） ---
  const handleCategoryToggle = (category: string) => {
    const current = agent.categories;
    const isSelected = current.includes(category);
    const newCategories = isSelected
      ? current.filter((c) => c !== category)
      : [...current, category];
    updateAgent({ categories: newCategories });
    triggerAutoSave();
  };

  // --- 交互配置 ---
  const handleWelcomeMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateAgent({ welcomeMessage: e.target.value });
    triggerAutoSave();
  };

  // --- 默认输入示例（动态添加/删除） ---
  const handleSampleInputChange = (index: number, value: string) => {
    const newInputs = [...agent.sampleInputs];
    newInputs[index] = value;
    updateAgent({ sampleInputs: newInputs });
    triggerAutoSave();
  };

  const handleAddSampleInput = () => {
    updateAgent({ sampleInputs: [...agent.sampleInputs, ''] });
    triggerAutoSave();
  };

  const handleRemoveSampleInput = (index: number) => {
    const newInputs = agent.sampleInputs.filter((_, i) => i !== index);
    updateAgent({ sampleInputs: newInputs });
    triggerAutoSave();
  };

  // --- 下一步 ---
  const handleNext = () => {
    setStepCompleted('intro', true);
    navigate('/skills');
  };

  return (
    <div className="intro-page">
      {/* 快捷操作栏 */}
      <div className="quick-actions" style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <button
          className="btn btn-outline"
          onClick={() => setShowMarketImport(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Download size={16} />
          从市场导入
        </button>
        <button
          className="btn btn-outline"
          onClick={() => setShowAiFill(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#a78bfa', color: '#a78bfa' }}
        >
          <Sparkles size={16} />
          AI 智能填写
        </button>
      </div>

      {/* 弹窗 */}
      {showMarketImport && (
        <MarketImportModal
          open={showMarketImport}
          onClose={() => setShowMarketImport(false)}
          onImport={handleMarketImport}
        />
      )}
      {showAiFill && (
        <AiAutoFillModal
          open={showAiFill}
          onClose={() => setShowAiFill(false)}
          onApply={handleAiFillApply}
        />
      )}

      {/* ===== 1. 基础信息 ===== */}
      <div className="form-section">
        <div className="form-section-title">
          <User size={18} className="section-icon" />
          基础信息
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Agent 名称</label>
            <input
              type="text"
              className="form-input"
              placeholder="请输入Agent名称"
              value={agent.name}
              onChange={handleNameChange}
            />
            <div className="form-hint">为你的Agent取一个简洁明了的名称</div>
          </div>
          <div className="form-group">
            <label className="form-label">版本号</label>
            <input
              type="text"
              className="form-input"
              placeholder="例如 1.0.0"
              value={agent.version}
              onChange={handleVersionChange}
            />
            <div className="form-hint">遵循语义化版本号规范</div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">开发者名称</label>
          <input
            type="text"
            className="form-input"
            placeholder="请输入开发者/团队名称"
            value={agent.developer}
            onChange={handleDeveloperChange}
          />
        </div>
      </div>

      {/* ===== 2. 图标配置 ===== */}
      <div className="form-section">
        <div className="form-section-title">
          <Image size={18} className="section-icon" />
          图标配置
        </div>

        <div className="icon-url-section">
          <label className="form-label">图标URL</label>
          <div className="icon-url-row">
            <input
              type="text"
              className="form-input"
              placeholder="输入图标URL，或从下方预设中选择"
              value={agent.icon.startsWith('http') ? agent.icon : ''}
              onChange={handleIconUrlChange}
            />
            <div className="icon-preview">
              {agent.icon ? (
                agent.icon.startsWith('http') ? (
                  <img src={agent.icon} alt="图标" />
                ) : (
                  <span>{agent.icon}</span>
                )
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>无</span>
              )}
            </div>
          </div>
          <div className="form-hint">支持输入图片URL或选择下方预设图标</div>
        </div>

        <label className="form-label">预设图标</label>
        <div className="icon-selector">
          {PRESET_ICONS.map((item) => (
            <div
              key={item.emoji}
              className={`icon-option ${agent.icon === item.emoji ? 'selected' : ''}`}
              onClick={() => handlePresetIconSelect(item.emoji)}
              title={item.label}
            >
              <span className="icon-emoji">{item.emoji}</span>
              <span className="icon-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 3. 描述配置 ===== */}
      <div className="form-section">
        <div className="form-section-title">
          <BookOpen size={18} className="section-icon" />
          描述配置
        </div>

        <div className="form-group">
          <label className="form-label">一句话简介</label>
          <input
            type="text"
            className="form-input"
            placeholder="用一句话描述你的Agent能做什么"
            value={agent.description.summary}
            onChange={handleSummaryChange}
          />
          <div className="form-hint">简洁明了地概括Agent的核心能力</div>
        </div>

        <div className="form-group">
          <label className="form-label">详细描述</label>
          <textarea
            className="form-input"
            placeholder="详细描述Agent的功能、适用场景、使用方式等"
            value={agent.description.detail}
            onChange={handleDetailChange}
            rows={4}
          />
        </div>

        <div className="form-group">
          <label className="form-label">使用示例</label>
          <div className="example-list">
            {agent.description.examples.map((example, index) => (
              <div className="example-item" key={index}>
                <span className="example-index">{index + 1}.</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`示例 ${index + 1}：例如"帮我分析这份报告"`}
                  value={example}
                  onChange={(e) => handleExampleChange(index, e.target.value)}
                />
                <button
                  className="btn btn-ghost btn-sm btn-remove"
                  onClick={() => handleRemoveExample(index)}
                  title="删除示例"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className="add-btn" onClick={handleAddExample}>
            <Plus size={14} />
            添加示例
          </button>
        </div>
      </div>

      {/* ===== 4. 分类标签 ===== */}
      <div className="form-section">
        <div className="form-section-title">
          <Tag size={18} className="section-icon" />
          分类标签
        </div>
        <div className="form-hint" style={{ marginBottom: '0.5rem' }}>
          选择适合的分类，帮助用户快速找到你的Agent（可多选）
        </div>
        <div className="tag-selector">
          {PRESET_CATEGORIES.map((category) => (
            <div
              key={category}
              className={`tag-option ${agent.categories.includes(category) ? 'selected' : ''}`}
              onClick={() => handleCategoryToggle(category)}
            >
              {category}
            </div>
          ))}
        </div>
      </div>

      {/* ===== 5. 交互配置 ===== */}
      <div className="form-section">
        <div className="form-section-title">
          <MessageSquare size={18} className="section-icon" />
          交互配置
        </div>

        <div className="form-group">
          <label className="form-label">欢迎语</label>
          <textarea
            className="form-input"
            placeholder="用户打开对话时显示的欢迎消息"
            value={agent.welcomeMessage}
            onChange={handleWelcomeMessageChange}
            rows={3}
          />
          <div className="form-hint">设置Agent与用户打招呼时的第一句话</div>
        </div>

        <div className="form-group">
          <label className="form-label">默认输入示例</label>
          <div className="example-list">
            {agent.sampleInputs.map((input, index) => (
              <div className="example-item" key={index}>
                <span className="example-index">{index + 1}.</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`输入示例 ${index + 1}：例如"今天天气怎么样"`}
                  value={input}
                  onChange={(e) => handleSampleInputChange(index, e.target.value)}
                />
                <button
                  className="btn btn-ghost btn-sm btn-remove"
                  onClick={() => handleRemoveSampleInput(index)}
                  title="删除示例"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className="add-btn" onClick={handleAddSampleInput}>
            <Plus size={14} />
            添加输入示例
          </button>
          <div className="form-hint">为用户提供一些可以快速开始的输入建议</div>
        </div>
      </div>

      {/* ===== 6. 底部操作栏 ===== */}
      <div className="action-bar">
        <div className="action-bar-left">
          {/* 上一步按钮（在第一步，禁用） */}
          <button className="btn" disabled>
            <ChevronLeft size={16} />
            上一步
          </button>

          {/* 自动保存状态提示 */}
          <div className={`auto-save ${saveStatus === 'saving' ? 'saving' : ''}`}>
            <span className="save-dot" />
            {saveStatus === 'saving' && '保存中...'}
            {saveStatus === 'saved' && '已自动保存'}
            {saveStatus === 'idle' && '未保存'}
          </div>
        </div>

        <div className="action-bar-right">
          <button className="btn btn-primary" onClick={handleNext}>
            下一步
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
