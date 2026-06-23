import { useAgentStore } from '../../store/useAgentStore';
import { Puzzle, Wrench, Star, Download, Tag } from 'lucide-react';
import './PreviewPanel.css';

export default function PreviewPanel() {
  const agent = useAgentStore((s) => s.agent);

  return (
    <aside className="preview-panel">
      <div className="preview-header">
        <h3>实时预览</h3>
        <span className="preview-badge">市场卡片</span>
      </div>
      <div className="preview-content">
        {/* Agent卡片预览 */}
        <div className="agent-card-preview">
          <div className="agent-card-icon">
            {agent.icon ? (
              <span className="agent-card-emoji">{agent.icon}</span>
            ) : (
              <div className="agent-icon-placeholder">AI</div>
            )}
          </div>
          <div className="agent-card-info">
            <h4 className="agent-card-name">{agent.name || '未命名 Agent'}</h4>
            <p className="agent-card-version">v{agent.version}</p>
            <p className="agent-card-summary">
              {agent.description.summary || '点击左侧"Agent 介绍"开始配置...'}
            </p>
            {agent.categories.length > 0 && (
              <div className="agent-card-tags">
                {agent.categories.map((cat) => (
                  <span key={cat} className="tag"><Tag size={12} />{cat}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Skills列表 */}
        <div className="preview-section">
          <h5><Puzzle size={14} /> Skills ({agent.skills.length})</h5>
          {agent.skills.length > 0 ? (
            <ul className="preview-list">
              {agent.skills.map((skill) => (
                <li key={skill.skillId}>
                  <span className="preview-item-name">{skill.name}</span>
                  <span className="preview-item-version">v{skill.version}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="preview-empty">暂未选择 Skill</p>
          )}
        </div>

        {/* MCP工具列表 */}
        <div className="preview-section">
          <h5><Wrench size={14} /> MCP 工具 ({agent.mcpTools.length})</h5>
          {agent.mcpTools.length > 0 ? (
            <ul className="preview-list">
              {agent.mcpTools.map((tool) => (
                <li key={tool.toolId}>
                  <span className="preview-item-name">{tool.name}</span>
                  <span className={`preview-item-status ${tool.isConnected ? 'connected' : ''}`}>
                    {tool.isConnected ? '已连接' : '未连接'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="preview-empty">暂未配置 MCP 工具</p>
          )}
        </div>

        {/* 统计 */}
        <div className="preview-stats">
          <div className="stat"><Star size={14} /><span>0</span></div>
          <div className="stat"><Download size={14} /><span>0</span></div>
        </div>
      </div>
    </aside>
  );
}
