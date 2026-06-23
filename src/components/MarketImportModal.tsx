import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Search, Star, Download, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import {
  searchMarketAgents,
  getMarketAgentDetail,
  checkMarketHealth,
} from '../services/marketApi';
import { mapMarketAgentToConfig } from '../utils/marketMapper';
import type { MarketAgentListItem, MarketAgentDetail } from '../services/marketApi';
import type { AgentConfig } from '../types';
import './MarketImportModal.css';

interface MarketImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (config: Partial<AgentConfig>) => void;
}

const CATEGORIES = ['全部', '办公效率', '数据分析', '内容创作', '开发工具', '客户服务', '教育学习'];

const CATEGORY_API_MAP: Record<string, string> = {
  '办公效率': 'general',
  '数据分析': 'data_analysis',
  '内容创作': 'content_creation',
  '开发工具': 'development',
  '客户服务': 'ai_chat',
  '教育学习': 'other',
};

export default function MarketImportModal({ open, onClose, onImport }: MarketImportModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [results, setResults] = useState<MarketAgentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState<MarketAgentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketAvailable, setMarketAvailable] = useState<boolean | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 10;

  // 检查市场服务是否可用
  useEffect(() => {
    if (open) {
      checkMarketHealth().then((status) => setMarketAvailable(!!status));
    }
  }, [open]);

  // 搜索函数
  const doSearch = useCallback(async (query: string, category: string, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page: pageNum, page_size: pageSize, sort: 'rating', order: 'desc' };
      if (query.trim()) params.q = query.trim();
      if (category !== '全部') {
        const apiCat = CATEGORY_API_MAP[category];
        if (apiCat) params.category = apiCat;
      }
      const result = await searchMarketAgents(params);
      setResults(result.items || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err.message || '搜索失败');
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // 搜索防抖
  useEffect(() => {
    if (!open) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      setSelectedAgent(null);
      doSearch(searchQuery, selectedCategory, 1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, selectedCategory, open, doSearch]);

  // 分类切换
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
    setSelectedAgent(null);
  };

  // 选择 Agent 查看详情
  const handleSelectAgent = async (agent: MarketAgentListItem) => {
    setDetailLoading(true);
    try {
      const detail = await getMarketAgentDetail(agent.id);
      setSelectedAgent(detail);
    } catch (err: any) {
      setError(err.message || '获取详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 导入
  const handleImport = () => {
    if (!selectedAgent) return;
    const config = mapMarketAgentToConfig(selectedAgent);
    onImport(config);
    onClose();
  };

  // 翻页
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedAgent(null);
    doSearch(searchQuery, selectedCategory, newPage);
  };

  if (!open) return null;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="market-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="market-modal">
        <div className="market-modal-header">
          <h2><Download size={18} /> 从市场导入 Agent</h2>
          <button className="market-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="market-modal-body">
          {/* 市场不可用 */}
          {marketAvailable === false && (
            <div className="market-status">
              <div className="market-status-icon">🔌</div>
              <div className="market-status-text">市场服务未启动</div>
              <div className="market-status-hint">请先启动 agent-market 服务 (python -m src.market.server)</div>
            </div>
          )}

          {/* 市场可用 */}
          {marketAvailable !== false && (
            <>
              {/* 搜索栏 */}
              <div className="market-search-bar">
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    className="market-search-input"
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="搜索Agent名称或描述..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* 分类过滤 */}
              <div className="market-category-filter">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`market-category-tag ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* 错误提示 */}
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* 结果区域 */}
              <div className="market-results-area">
                {/* 列表 */}
                <div className="market-results-list">
                  {loading ? (
                    <div className="market-loading">
                      <div className="market-spinner" />
                      搜索中...
                    </div>
                  ) : results.length === 0 ? (
                    <div className="market-status">
                      <div className="market-status-icon">🔍</div>
                      <div className="market-status-text">未找到匹配的 Agent</div>
                      <div className="market-status-hint">尝试其他关键词或分类</div>
                    </div>
                  ) : (
                    results.map(agent => (
                      <div
                        key={agent.id}
                        className={`market-agent-card ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                        onClick={() => handleSelectAgent(agent)}
                      >
                        <div className="market-agent-card-header">
                          <span className="market-agent-card-name">{agent.display_name}</span>
                          <span className="market-agent-card-version">v{agent.version}</span>
                        </div>
                        <div className="market-agent-card-desc">{agent.description}</div>
                        <div className="market-agent-card-meta">
                          <span><Star size={12} /> {agent.rating.toFixed(1)}</span>
                          <span><Download size={12} /> {agent.download_count}</span>
                          <span>{agent.category}</span>
                        </div>
                      </div>
                    ))
                  )}

                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className="market-pagination">
                      <button disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                        <ChevronLeft size={14} />
                      </button>
                      <span className="market-pagination-info">{page} / {totalPages} (共{total}个)</span>
                      <button disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 详情面板 */}
                <div className={`market-detail-panel ${!selectedAgent ? 'empty' : ''}`}>
                  {!selectedAgent ? (
                    detailLoading ? (
                      <div className="market-loading">
                        <div className="market-spinner" />
                        加载详情...
                      </div>
                    ) : (
                      '← 点击左侧 Agent 查看详情'
                    )
                  ) : (
                    <>
                      <div className="market-detail-name">{selectedAgent.display_name}</div>
                      <div className="market-detail-version">v{selectedAgent.version} · {selectedAgent.author || '未知作者'}</div>
                      <div className="market-detail-desc">{selectedAgent.readme || selectedAgent.description}</div>
                      <div className="market-detail-info">
                        <div className="market-detail-info-item">
                          <span className="market-detail-info-label">分类:</span>
                          <span>{selectedAgent.category}</span>
                        </div>
                        <div className="market-detail-info-item">
                          <span className="market-detail-info-label">评分:</span>
                          <span>{selectedAgent.rating.toFixed(1)}</span>
                        </div>
                        <div className="market-detail-info-item">
                          <span className="market-detail-info-label">下载:</span>
                          <span>{selectedAgent.download_count} 次</span>
                        </div>
                        <div className="market-detail-info-item">
                          <span className="market-detail-info-label">标签:</span>
                          <div className="market-detail-tags">
                            {selectedAgent.tags?.map(tag => (
                              <span key={tag} className="market-detail-tag">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="market-detail-actions">
                        <button className="btn btn-primary" onClick={handleImport}>
                          <Download size={14} />
                          导入此 Agent
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
