import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAgentStore } from '../store/useAgentStore';
import MarketImportModal from '../components/MarketImportModal';
import AiAutoFillModal from '../components/AiAutoFillModal';
import type { AgentConfig } from '../types';
import './QuickStart.css';

export default function QuickStart() {
  const navigate = useNavigate();
  const { agent, resetAgent, importFromMarket, fillFromAI } = useAgentStore();

  // Modal states
  const [showMarketImport, setShowMarketImport] = useState(false);
  const [showAiFill, setShowAiFill] = useState(false);

  const handleManualCreate = () => {
    resetAgent();
    navigate('/intro');
  };

  // --- Market import callback ---
  const handleMarketImport = useCallback((config: Partial<AgentConfig>) => {
    importFromMarket(config);
    setShowMarketImport(false);
    navigate('/intro');
  }, [importFromMarket, navigate]);

  // --- AI fill callback ---
  const handleAiFillApply = useCallback((config: Partial<AgentConfig>) => {
    fillFromAI(config);
    setShowAiFill(false);
    navigate('/intro');
  }, [fillFromAI, navigate]);

  return (
    <div className="quickstart-page">
      <div className="quickstart-header">
        <h1>创建新的 Agent</h1>
        <p>选择一种方式开始构建你的 AI Agent</p>
      </div>

      <div className="quickstart-methods">
        {/* 从市场导入 */}
        <div className="quickstart-card" onClick={() => setShowMarketImport(true)}>
          <span className="quickstart-card-badge recommend">推荐</span>
          <div className="quickstart-card-icon">📥</div>
          <div className="quickstart-card-title">从市场导入</div>
          <div className="quickstart-card-desc">搜索市场中的已有 Agent，导入其配置并在此基础上修改</div>
          <div className="quickstart-card-action">
            开始 <ChevronRight size={14} />
          </div>
        </div>

        {/* AI 智能填写 */}
        <div className="quickstart-card ai-card" onClick={() => setShowAiFill(true)}>
          <span className="quickstart-card-badge smart">智能</span>
          <div className="quickstart-card-icon">✨</div>
          <div className="quickstart-card-title">AI 智能填写</div>
          <div className="quickstart-card-desc">描述你想要的 Agent，AI 自动生成完整配置</div>
          <div className="quickstart-card-action">
            开始 <ChevronRight size={14} />
          </div>
        </div>

        {/* 手动创建 */}
        <div className="quickstart-card" onClick={handleManualCreate}>
          <div className="quickstart-card-icon">✏️</div>
          <div className="quickstart-card-title">手动创建</div>
          <div className="quickstart-card-desc">从零开始手动填写所有配置项，完全自定义</div>
          <div className="quickstart-card-action">
            开始 <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* 最近编辑 */}
      {agent.name && (
        <div className="quickstart-recent">
          <div className="quickstart-recent-title">当前编辑</div>
          <div className="quickstart-recent-list">
            <div className="quickstart-recent-item" onClick={() => navigate('/intro')}>
              <div className="quickstart-recent-icon">{agent.icon || '🤖'}</div>
              <div className="quickstart-recent-info">
                <div className="quickstart-recent-name">{agent.name}</div>
                <div className="quickstart-recent-meta">v{agent.version} · {agent.developer || '未知开发者'}</div>
              </div>
              <span className={`quickstart-recent-status ${agent.status}`}>
                {agent.status === 'published' ? '已发布' : '草稿'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
    </div>
  );
}
