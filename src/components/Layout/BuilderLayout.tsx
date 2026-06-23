import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Globe } from 'lucide-react';
import StepSidebar from './StepSidebar';
import PreviewPanel from './PreviewPanel';
import { useAgentStore } from '../../store/useAgentStore';
import './BuilderLayout.css';

interface BuilderLayoutProps {
  children: React.ReactNode;
}

export default function BuilderLayout({ children }: BuilderLayoutProps) {
  const [showPreview, setShowPreview] = useState(true);
  const agent = useAgentStore((s) => s.agent);
  const location = useLocation();
  const navigate = useNavigate();

  const isMarketPage = location.pathname === '/market';

  return (
    <div className="builder-layout">
      <header className="builder-header">
        <div className="header-left">
          <button
            className="brand-btn"
            onClick={() => navigate('/')}
            title="返回首页"
          >
            <h1 className="header-title">AgentHub</h1>
          </button>
          {agent.name && !isMarketPage && <span className="header-agent-name">{agent.name}</span>}
        </div>
        <div className="header-right">
          <button
            className="btn btn-ghost"
            onClick={() => navigate(isMarketPage ? '/' : '/market')}
          >
            <Globe size={16} />
            {isMarketPage ? '返回 AgentHub' : 'Agent 市场'}
          </button>
          {!isMarketPage && (
            <button className="btn btn-ghost" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? '隐藏预览' : '显示预览'}
            </button>
          )}
        </div>
      </header>
      <div className="builder-body">
        {!isMarketPage && <StepSidebar />}
        <main className={`builder-main ${isMarketPage ? 'market-main' : ''}`}>{children}</main>
        {!isMarketPage && showPreview && <PreviewPanel />}
      </div>
    </div>
  );
}
