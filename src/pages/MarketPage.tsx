import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Star,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Upload,
  Trash2,
  X,
  Package,
  Server,
  Key,
  Sparkles,
  Wrench,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Copy,
} from 'lucide-react';
import {
  searchMarketAgents,
  getMarketAgentDetail,
  getMarketAgentRatings,
  submitMarketRating,
  deleteMarketAgent,
  uploadMarketAgent,
  searchMarketTeams,
  getMarketTeamDetail,
  getMarketTeamRatings,
  submitMarketTeamRating,
  deleteMarketTeam,
  uploadMarketTeam,
  searchMarketWorkflows,
  getMarketWorkflowDetail,
  getMarketWorkflowRatings,
  submitMarketWorkflowRating,
  deleteMarketWorkflow,
  uploadMarketWorkflow,
  checkMarketHealth,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  listMarketSkills,
  listMarketMcpServers,
} from '../services/marketApi';
import { mapMarketAgentToConfig } from '../utils/marketMapper';
import { getHeaders } from '../services/marketApi';
import { extractAgentJsonFromTarGz } from '../utils/tarGzParser';
import { useAgentStore } from '../store/useAgentStore';
import type {
  MarketAgentListItem,
  MarketAgentDetail,
  MarketTeamListItem,
  MarketTeamDetail,
  MarketWorkflowListItem,
  MarketWorkflowDetail,
  RatingsResult,
  ApiKeyItem,
  HealthStatus,
  UploadResult,
  MarketSkillItem,
  MarketMcpServerItem,
} from '../services/marketApi';
import './MarketPage.css';

const CATEGORIES = ['全部', 'general', 'browser', 'data_analysis', 'content_creation', 'development', 'ai_chat', 'utility', 'other'];
const TYPES = [
  { value: '', label: '全部类型' },
  { value: 'agent', label: 'Agent' },
  { value: 'skill', label: 'Skill' },
  { value: 'workflow', label: 'Workflow' },
];
const SORTS = [
  { value: 'downloads', label: '下载量' },
  { value: 'rating', label: '评分' },
  { value: 'created', label: '创建时间' },
  { value: 'name', label: '名称' },
];

export default function MarketPage() {
  const navigate = useNavigate();
  const { importFromMarket } = useAgentStore();

  // ---- Tab state ----
  const [activeTab, setActiveTab] = useState<'market' | 'upload' | 'keys' | 'skills' | 'mcp-servers'>('market');

  // ---- Entity type selector: agent / team / workflow ----
  const [activeEntity, setActiveEntity] = useState<'agent' | 'team' | 'workflow'>('agent');

  // ---- Market tab state ----
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSort, setSelectedSort] = useState('downloads');
  const [selectedOrder, setSelectedOrder] = useState<'asc' | 'desc'>('desc');
  const [results, setResults] = useState<(MarketAgentListItem | MarketTeamListItem | MarketWorkflowListItem)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState<MarketAgentDetail | MarketTeamDetail | MarketWorkflowDetail | null>(null);
  const [ratings, setRatings] = useState<RatingsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketStatus, setMarketStatus] = useState<HealthStatus | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skillsSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mcpSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 12;

  // ---- Upload tab state ----
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForce, setUploadForce] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadZoneRef = useRef<HTMLDivElement>(null);

  // ---- Keys tab state ----
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keyOwner, setKeyOwner] = useState('');
  const [keyRole, setKeyRole] = useState('publisher');
  const [keysError, setKeysError] = useState<string | null>(null);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);

  // ---- Skills & MCP tabs state ----
  const [skillsList, setSkillsList] = useState<MarketSkillItem[]>([]);
  const [skillsTotal, setSkillsTotal] = useState(0);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [skillsSearch, setSkillsSearch] = useState('');

  const [mcpList, setMcpList] = useState<MarketMcpServerItem[]>([]);
  const [mcpTotal, setMcpTotal] = useState(0);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [mcpSearch, setMcpSearch] = useState('');

  // ---- Rating state ----
  const [pendingScore, setPendingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // ---- Toast state ----
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ---- Check market health ----
  useEffect(() => {
    checkMarketHealth().then((status) => {
      setMarketStatus(status);
    });
    const interval = setInterval(() => {
      checkMarketHealth().then(setMarketStatus);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ---- Search function ----
  const doSearch = useCallback(async (query: string, category: string, type: string, sort: string, order: string, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page: pageNum, page_size: pageSize, sort, order };
      if (query.trim()) params.q = query.trim();
      if (category !== '全部') params.category = category;
      if (type) params.type = type;

      let result: { items: any[]; total: number };
      if (activeEntity === 'team') {
        result = await searchMarketTeams(params);
      } else if (activeEntity === 'workflow') {
        result = await searchMarketWorkflows(params);
      } else {
        result = await searchMarketAgents(params);
      }
      setResults(result.items || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err.message || '搜索失败');
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeEntity]);

  // ---- Reset filters ----
  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('全部');
    setSelectedType('');
    setSelectedSort('downloads');
    setSelectedOrder('desc');
    setPage(1);
  }, []);

  // ---- Search debounce ----
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      setSelectedAgent(null);
      doSearch(searchQuery, selectedCategory, selectedType, selectedSort, selectedOrder, 1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, selectedCategory, selectedType, selectedSort, selectedOrder, activeEntity, doSearch]);

  // ---- Load detail ----
  const handleSelectAgent = async (item: MarketAgentListItem | MarketTeamListItem | MarketWorkflowListItem) => {
    setDetailLoading(true);
    setPendingScore(0);
    setRatingComment('');
    try {
      let detail: MarketAgentDetail | MarketTeamDetail | MarketWorkflowDetail;
      let ratingsData: RatingsResult;
      if (activeEntity === 'team') {
        [detail, ratingsData] = await Promise.all([
          getMarketTeamDetail(item.id),
          getMarketTeamRatings(item.id),
        ]);
      } else if (activeEntity === 'workflow') {
        [detail, ratingsData] = await Promise.all([
          getMarketWorkflowDetail(item.id),
          getMarketWorkflowRatings(item.id),
        ]);
      } else {
        [detail, ratingsData] = await Promise.all([
          getMarketAgentDetail(item.id),
          getMarketAgentRatings(item.id),
        ]);
      }
      setSelectedAgent(detail);
      setRatings(ratingsData);
    } catch (err: any) {
      setError(err.message || '获取详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // ---- Import to builder ----
  const handleImport = async () => {
    if (!selectedAgent) return;

    let detail = { ...selectedAgent };

    if (!detail.json_content || detail.json_content === '{}') {
      try {
        const marketUrl = import.meta.env.VITE_MARKET_URL || 'http://localhost:8321';
        const entityPath = activeEntity === 'team' ? 'teams' : activeEntity === 'workflow' ? 'workflows' : 'agents';
        const downloadUrl = `${marketUrl}/api/v1/${entityPath}/${encodeURIComponent(detail.id)}/download`;
        const resp = await fetch(downloadUrl, { headers: getHeaders() });
        if (resp.ok) {
          const blob = await resp.blob();
          const agentJson = await extractAgentJsonFromTarGz(blob);
          if (agentJson) {
            detail = { ...detail, json_content: JSON.stringify(agentJson) };
          }
        }
      } catch {
        // 下载失败则使用已有数据
      }
    }

    const config = mapMarketAgentToConfig(detail);
    importFromMarket(config);
    const entityLabel = activeEntity === 'team' ? 'Team' : activeEntity === 'workflow' ? 'Workflow' : 'Agent';
    showToast(`已导入${entityLabel}「${detail.display_name}」，前往编辑`, 'success');
    setTimeout(() => navigate('/intro'), 800);
  };

  // ---- Pagination ----
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedAgent(null);
    doSearch(searchQuery, selectedCategory, selectedType, selectedSort, selectedOrder, newPage);
  };

  // ---- Upload handlers ----
  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      let result: UploadResult;
      if (activeEntity === 'team') {
        result = await uploadMarketTeam(uploadFile, uploadForce);
      } else if (activeEntity === 'workflow') {
        result = await uploadMarketWorkflow(uploadFile, uploadForce);
      } else {
        result = await uploadMarketAgent(uploadFile, uploadForce);
      }
      setUploadResult(`上传成功！ID: ${result.id}, 版本: ${result.version}`);
      const label = activeEntity === 'team' ? 'Team' : activeEntity === 'workflow' ? 'Workflow' : 'Agent';
      showToast(`${label} 上传成功`, 'success');
      setUploadFile(null);
    } catch (err: any) {
      setUploadError(err.message || '上传失败');
      showToast(err.message || '上传失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ---- Drag & drop ----
  useEffect(() => {
    const zone = uploadZoneRef.current;
    if (!zone) return;
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); zone.classList.add('drag'); };
    const handleDragLeave = () => zone.classList.remove('drag');
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      zone.classList.remove('drag');
      if (e.dataTransfer?.files.length) handleFileSelect(e.dataTransfer.files[0]);
    };
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('dragleave', handleDragLeave);
    zone.addEventListener('drop', handleDrop);
    return () => {
      zone.removeEventListener('dragover', handleDragOver);
      zone.removeEventListener('dragleave', handleDragLeave);
      zone.removeEventListener('drop', handleDrop);
    };
  }, []);

  // ---- API Keys ----
  const loadApiKeys = useCallback(async () => {
    setKeysLoading(true);
    setKeysError(null);
    try {
      const keys = await listApiKeys();
      setApiKeys(keys);
    } catch (err: any) {
      setKeysError(err.message || '获取失败');
      setApiKeys([]);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  // ---- Skills & MCP loaders ----
  const loadSkills = useCallback(async (query: string) => {
    setSkillsLoading(true);
    setSkillsError(null);
    try {
      const result = await listMarketSkills({ q: query || undefined });
      setSkillsList(result.skills || []);
      setSkillsTotal(result.total || 0);
    } catch (err: any) {
      setSkillsError(err.message || '获取 Skills 失败');
      setSkillsList([]);
      setSkillsTotal(0);
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  const loadMcpServers = useCallback(async (query: string) => {
    setMcpLoading(true);
    setMcpError(null);
    try {
      const result = await listMarketMcpServers({ q: query || undefined });
      setMcpList(result.servers || []);
      setMcpTotal(result.total || 0);
    } catch (err: any) {
      setMcpError(err.message || '获取 MCP Servers 失败');
      setMcpList([]);
      setMcpTotal(0);
    } finally {
      setMcpLoading(false);
    }
  }, []);

  // Load skills on tab activation or search change (debounced)
  const prevActiveTabRef = useRef(activeTab);
  useEffect(() => {
    if (activeTab !== 'skills') {
      prevActiveTabRef.current = activeTab;
      return;
    }
    const justSwitched = prevActiveTabRef.current !== 'skills';
    prevActiveTabRef.current = activeTab;

    if (skillsSearchTimerRef.current) clearTimeout(skillsSearchTimerRef.current);

    if (justSwitched) {
      // Immediate load on tab switch
      loadSkills(skillsSearch);
    } else {
      // Debounced load on search change
      skillsSearchTimerRef.current = setTimeout(() => {
        loadSkills(skillsSearch);
      }, 300);
    }
    return () => {
      if (skillsSearchTimerRef.current) clearTimeout(skillsSearchTimerRef.current);
    };
  }, [skillsSearch, activeTab, loadSkills]);

  // Load MCP on tab activation or search change (debounced)
  useEffect(() => {
    if (activeTab !== 'mcp-servers') {
      prevActiveTabRef.current = activeTab;
      return;
    }
    const justSwitched = prevActiveTabRef.current !== 'mcp-servers';
    prevActiveTabRef.current = activeTab;

    if (mcpSearchTimerRef.current) clearTimeout(mcpSearchTimerRef.current);

    if (justSwitched) {
      // Immediate load on tab switch
      loadMcpServers(mcpSearch);
    } else {
      // Debounced load on search change
      mcpSearchTimerRef.current = setTimeout(() => {
        loadMcpServers(mcpSearch);
      }, 300);
    }
    return () => {
      if (mcpSearchTimerRef.current) clearTimeout(mcpSearchTimerRef.current);
    };
  }, [mcpSearch, activeTab, loadMcpServers]);

  // ---- API Keys load ----
  useEffect(() => {
    if (activeTab === 'keys') loadApiKeys();
  }, [activeTab, loadApiKeys]);

  const handleCreateKey = async () => {
    if (!keyOwner.trim()) {
      showToast('请输入 Owner 名称', 'error');
      return;
    }
    try {
      const result = await createApiKey(keyOwner.trim(), keyRole);
      setNewKeyResult(result.key);
      localStorage.setItem('market_api_key', result.key);
      showToast('API Key 创建成功', 'success');
      setKeyOwner('');
      loadApiKeys();
    } catch (err: any) {
      showToast(err.message || '创建失败', 'error');
    }
  };

  const handleRevokeKey = async (key: string) => {
    if (!confirm(`确定撤销 Key: ${key}？`)) return;
    try {
      await revokeApiKey(key);
      showToast('Key 已撤销', 'success');
      loadApiKeys();
    } catch (err: any) {
      showToast(err.message || '撤销失败', 'error');
    }
  };

  // ---- Rating ----
  const handleSubmitRating = async () => {
    if (!selectedAgent || !pendingScore) {
      showToast('请选择评分星级', 'error');
      return;
    }
    setSubmittingRating(true);
    try {
      if (activeEntity === 'team') {
        await submitMarketTeamRating(selectedAgent.id, pendingScore, ratingComment);
      } else if (activeEntity === 'workflow') {
        await submitMarketWorkflowRating(selectedAgent.id, pendingScore, ratingComment);
      } else {
        await submitMarketRating(selectedAgent.id, pendingScore, ratingComment);
      }
      showToast('评分提交成功', 'success');
      setPendingScore(0);
      setRatingComment('');
      // Refresh ratings
      let ratingsData: RatingsResult;
      if (activeEntity === 'team') {
        ratingsData = await getMarketTeamRatings(selectedAgent.id);
      } else if (activeEntity === 'workflow') {
        ratingsData = await getMarketWorkflowRatings(selectedAgent.id);
      } else {
        ratingsData = await getMarketAgentRatings(selectedAgent.id);
      }
      setRatings(ratingsData);
    } catch (err: any) {
      showToast(err.message || '评分失败', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  // ---- Delete ----
  const handleDeleteAgent = async (id: string, name: string) => {
    const entityLabel = activeEntity === 'team' ? 'Team' : activeEntity === 'workflow' ? 'Workflow' : 'Agent';
    if (!confirm(`确定删除 ${entityLabel}「${name}」？此操作不可撤销。`)) return;
    try {
      if (activeEntity === 'team') {
        await deleteMarketTeam(id);
      } else if (activeEntity === 'workflow') {
        await deleteMarketWorkflow(id);
      } else {
        await deleteMarketAgent(id);
      }
      showToast(`${entityLabel} 已删除`, 'success');
      setSelectedAgent(null);
      doSearch(searchQuery, selectedCategory, selectedType, selectedSort, selectedOrder, page);
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // ---- Generate page numbers with ellipsis ----
  const getPageNumbers = (): (number | 'ellipsis-start' | 'ellipsis-end')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    pages.push(1);

    if (page <= 4) {
      // Near start: [1, 2, 3, 4, 5, ..., N]
      for (let i = 2; i <= 5; i++) pages.push(i);
      pages.push('ellipsis-end');
    } else if (page >= totalPages - 3) {
      // Near end: [1, ..., N-4, N-3, N-2, N-1, N]
      pages.push('ellipsis-start');
      for (let i = totalPages - 4; i < totalPages; i++) pages.push(i);
    } else {
      // Middle: [1, ..., p-1, p, p+1, ..., N]
      pages.push('ellipsis-start');
      pages.push(page - 1);
      pages.push(page);
      pages.push(page + 1);
      pages.push('ellipsis-end');
    }

    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="market-page">
      {/* Toast */}
      {toast && (
        <div className={`market-toast ${toast.type}`}>{toast.message}</div>
      )}

      {/* Tabs + Status */}
      <div className="market-tabs">
        <button
          className={`market-tab ${activeTab === 'market' ? 'active' : ''}`}
          onClick={() => setActiveTab('market')}
        >
          <Search size={14} /> 浏览市场
        </button>
        <button
          className={`market-tab ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          <Sparkles size={14} /> Skills
        </button>
        <button
          className={`market-tab ${activeTab === 'mcp-servers' ? 'active' : ''}`}
          onClick={() => setActiveTab('mcp-servers')}
        >
          <Wrench size={14} /> MCP
        </button>
        <span className="market-tab-separator" />
        <button
          className={`market-tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={14} /> 上传发布
        </button>
        <button
          className={`market-tab ${activeTab === 'keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('keys')}
        >
          <Key size={14} /> API Keys
        </button>
        <span className="market-tabs-spacer" />
        <span className="market-status-dot" style={{ width: 6, height: 6, background: marketStatus ? 'var(--success)' : 'var(--danger)', borderRadius: '50%', boxShadow: marketStatus ? '0 0 6px var(--success)' : 'none' }} />
        <span className="market-tabs-status">
          {marketStatus ? `${marketStatus.agents_count} 个 Agent` : '离线'}
        </span>
      </div>

      {/* ========== MARKET TAB ========== */}
      {activeTab === 'market' && (
        <div className="market-tab-content">
<<<<<<< HEAD
          {/* Entity selector */}
          <div className="entity-selector">
            {(['agent', 'team', 'workflow'] as const).map((ent) => (
              <button
                key={ent}
                className={activeEntity === ent ? 'active' : ''}
                onClick={() => {
                  setActiveEntity(ent);
                  setSelectedAgent(null);
                  setResults([]);
                  setPage(1);
                }}
              >
                {ent === 'agent' ? 'Agent' : ent === 'team' ? 'Team' : 'Workflow'}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="market-search-row">
            <div className="market-search-box">
              <Search size={16} className="market-search-icon" />
              <input
                type="text"
                placeholder={`搜索 ${activeEntity === 'team' ? 'Team' : activeEntity === 'workflow' ? 'Workflow' : 'Agent'} 名称或描述...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="market-filter-controls">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                className="btn btn-icon-only"
                title={selectedOrder === 'desc' ? '降序' : '升序'}
                onClick={() => setSelectedOrder(selectedOrder === 'desc' ? 'asc' : 'desc')}
              >
                {selectedOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
              </button>
              {(selectedCategory !== '全部' || selectedType || selectedSort !== 'downloads' || searchQuery) && (
                <button className="btn btn-ghost btn-sm" onClick={resetFilters} title="清除筛选">
                  <RotateCcw size={12} /> 清除
                </button>
              )}
              {!loading && results.length > 0 && (
                <span className="market-result-count">
                  找到 <strong>{total}</strong> 个结果
                </span>
              )}
            </div>
          </div>

          {/* Category filter */}
          <div className="market-category-row">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`market-category-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === '全部' ? '全部' : cat}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="market-error-bar">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Results area */}
          <div className="market-results-layout">
            {/* Agent grid */}
            <div className="market-agent-grid">
              {loading ? (
                <div className="market-loading-center">
                  <div className="market-spinner" />
                  搜索中...
                </div>
              ) : results.length === 0 ? (
                <div className="market-empty-center">
                  <Package size={40} />
                  <div>未找到匹配的 {activeEntity === 'team' ? 'Team' : activeEntity === 'workflow' ? 'Workflow' : 'Agent'}</div>
                  <div className="hint">尝试其他关键词或分类</div>
                </div>
              ) : (
                <>
                  {results.map((agent) => (
                    <div
                      key={agent.id}
                      className={`market-agent-card ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                      onClick={() => handleSelectAgent(agent)}
                    >
                      <div className="market-agent-card-top">
                        <span className="market-agent-card-name">{agent.display_name}</span>
                        <span className="market-agent-card-version">v{agent.version}</span>
                      </div>
                      <div className="market-agent-card-desc">{agent.description}</div>
                      <div className="market-agent-card-bottom">
                        <span className="market-agent-card-category">{agent.category}</span>
                        <span className="market-agent-card-stars">
                          <Star size={12} /> {agent.rating > 0 ? agent.rating.toFixed(1) : '--'}
                        </span>
                        <span className="market-agent-card-downloads">
                          <Download size={12} /> {agent.download_count}
                        </span>
                      </div>
                      {agent.tags?.length > 0 && (
                        <div className="market-agent-card-tags">
                          {agent.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="market-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="market-pagination-row">
                      <button
                        className="market-pagination-btn"
                        disabled={page <= 1}
                        onClick={() => handlePageChange(page - 1)}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {getPageNumbers().map((p) =>
                        p === 'ellipsis-start' ? (
                          <span key="ell-start" className="market-pagination-ellipsis">...</span>
                        ) : p === 'ellipsis-end' ? (
                          <span key="ell-end" className="market-pagination-ellipsis">...</span>
                        ) : (
                          <button
                            key={p}
                            className={`market-pagination-btn ${p === page ? 'active' : ''}`}
                            onClick={() => handlePageChange(p)}
                          >
                            {p}
                          </button>
                        )
                      )}
                      <button
                        className="market-pagination-btn"
                        disabled={page >= totalPages}
                        onClick={() => handlePageChange(page + 1)}
                      >
                        <ChevronRight size={14} />
                      </button>
                      <span className="market-pagination-info">共 {total} 个</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Detail panel */}
            <div className={`market-detail-sidebar ${!selectedAgent ? 'empty' : ''}`}>
              {!selectedAgent ? (
                detailLoading ? (
                  <div className="market-loading-center">
                    <div className="market-spinner" />
                    加载详情...
                  </div>
                ) : (
                  <div className="market-empty-center">
                    <Server size={32} />
                    <div>点击左侧 {activeEntity === 'team' ? 'Team' : activeEntity === 'workflow' ? 'Workflow' : 'Agent'} 查看详情</div>
                  </div>
                )
              ) : (
                <div className="market-detail-content">
                  <div className="market-detail-header">
                    <h3>{selectedAgent.display_name}</h3>
                    <span className="market-detail-entity-badge">
                      {selectedAgent.type === 'team' ? 'Team' : selectedAgent.type === 'workflow' ? 'Workflow' : 'Agent'}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAgent(null)}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="market-detail-meta">
                    v{selectedAgent.version} · {selectedAgent.author || '未知作者'}
                  </div>
                  <div className="market-detail-desc">{selectedAgent.readme || selectedAgent.description}</div>

                  <div className="market-detail-info-list">
                    <div className="market-detail-info-row">
                      <span className="label">分类</span>
                      <span>{selectedAgent.category}</span>
                    </div>
                    <div className="market-detail-info-row">
                      <span className="label">类型</span>
                      <span>{selectedAgent.type}</span>
                    </div>
                    <div className="market-detail-info-row">
                      <span className="label">评分</span>
                      <span><Star size={12} /> {selectedAgent.rating > 0 ? selectedAgent.rating.toFixed(1) : '--'}</span>
                    </div>
                    <div className="market-detail-info-row">
                      <span className="label">下载</span>
                      <span>{selectedAgent.download_count} 次</span>
                    </div>
                    <div className="market-detail-info-row">
                      <span className="label">大小</span>
                      <span>{formatSize(selectedAgent.package_size)}</span>
                    </div>
                    <div className="market-detail-info-row">
                      <span className="label">许可</span>
                      <span>{selectedAgent.license || 'MIT'}</span>
                    </div>
                  </div>

                  {selectedAgent.tags?.length > 0 && (
                    <div className="market-detail-tags-row">
                      {selectedAgent.tags.map((tag) => (
                        <span key={tag} className="market-tag">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="market-detail-actions">
<<<<<<< HEAD
                    <button className="btn btn-primary" onClick={handleImport}>
                      <Download size={14} /> 导入到构建器
                    </button>
                    {(() => {
                      const entityPath = selectedAgent.type === 'team' ? 'teams' : selectedAgent.type === 'workflow' ? 'workflows' : 'agents';
                      return (
                        <a
                          className="btn btn-outline"
                          href={`${import.meta.env.VITE_MARKET_URL || 'http://localhost:8321'}/api/v1/${entityPath}/${encodeURIComponent(selectedAgent.id)}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Package size={14} /> 下载包
                        </a>
                      );
                    })()}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteAgent(selectedAgent.id, selectedAgent.display_name)}
                    >
                      <Trash2 size={14} /> 删除
                    </button>
                    <div className="market-detail-actions-secondary">
                      <a
                        className="btn btn-ghost btn-sm"
                        href={`${import.meta.env.VITE_MARKET_URL || 'http://localhost:8321'}/api/v1/agents/${encodeURIComponent(selectedAgent.id)}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Package size={14} /> 下载包
                      </a>
                      <button
                        className="btn btn-ghost-danger btn-sm"
                        onClick={() => handleDeleteAgent(selectedAgent.id, selectedAgent.display_name)}
                      >
                        <Trash2 size={14} /> 删除
                      </button>
                    </div>
                  </div>

                  {/* Ratings section */}
                  <div className="market-ratings-section">
                    <h4>评分 ({ratings?.total || 0})</h4>
                    <div className="market-rating-stars-input">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          className={`star-btn ${s <= pendingScore ? 'active' : ''}`}
                          onClick={() => setPendingScore(s)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="market-rating-comment"
                      placeholder="写下你的评价..."
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      rows={2}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSubmitRating}
                      disabled={submittingRating || !pendingScore}
                    >
                      {submittingRating ? '提交中...' : '提交评分'}
                    </button>

                    {ratings?.items && ratings.items.length > 0 && (
                      <div className="market-rating-list">
                        {ratings.items.map((r, i) => (
                          <div key={i} className="market-rating-item">
                            <div className="market-rating-item-stars">
                              {'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}
                            </div>
                            <div className="market-rating-item-comment">{r.comment || '无评论'}</div>
                            <div className="market-rating-item-date">{r.created_at}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== UPLOAD TAB ========== */}
      {activeTab === 'upload' && (
        <div className="market-tab-content">
<<<<<<< HEAD
          {/* Entity selector for upload */}
          <div className="entity-selector">
            {(['agent', 'team', 'workflow'] as const).map((ent) => (
              <button
                key={ent}
                className={activeEntity === ent ? 'active' : ''}
                onClick={() => {
                  setActiveEntity(ent);
                  setUploadFile(null);
                  setUploadResult(null);
                  setUploadError(null);
                }}
              >
                {ent === 'agent' ? 'Agent' : ent === 'team' ? 'Team' : 'Workflow'}
              </button>
            ))}
          </div>

          <div className="market-upload-card">
            <div
              className="market-upload-zone"
              ref={uploadZoneRef}
              onClick={() => document.getElementById('uploadFileInput')?.click()}
            >
              <Package size={48} />
              <div>点击或拖拽上传 {activeEntity === 'team' ? 'Team' : activeEntity === 'workflow' ? 'Workflow' : 'Agent'} 包</div>
              <div className="hint">支持 .tar.gz / .zip 格式，最大 50MB</div>
              <input
                id="uploadFileInput"
                type="file"
                accept=".tar.gz,.zip"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>

            {uploadFile && (
              <div className="market-upload-fileinfo">
                <Package size={16} />
                <span className="market-upload-filename">{uploadFile.name} ({formatSize(uploadFile.size)})</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setUploadFile(null); setUploadResult(null); setUploadError(null); }}
                >
                  <X size={14} /> 移除
                </button>
              </div>
            )}

            <div className="market-upload-actions">
              <label className="market-upload-force">
                <input
                  type="checkbox"
                  checked={uploadForce}
                  onChange={(e) => setUploadForce(e.target.checked)}
                />
                强制覆盖已有版本
              </label>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
              >
                {uploading ? (
                  <>
                    <div className="market-spinner" style={{ width: 16, height: 16, marginRight: 8 }} />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> 上传并注册
                  </>
                )}
              </button>
            </div>

            {uploadResult && (
              <div className="market-upload-result success">
                <div>✅ {uploadResult}</div>
              </div>
            )}
            {uploadError && (
              <div className="market-upload-result error">
                <AlertCircle size={14} /> {uploadError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== KEYS TAB ========== */}
      {activeTab === 'keys' && (
        <div className="market-tab-content">
          <div className="market-keys-form">
            <input
              type="text"
              placeholder="Owner 名称"
              value={keyOwner}
              onChange={(e) => setKeyOwner(e.target.value)}
              className="form-input"
              style={{ width: 200 }}
            />
            <select
              value={keyRole}
              onChange={(e) => setKeyRole(e.target.value)}
              className="form-input"
            >
              <option value="publisher">Publisher</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn btn-primary" onClick={handleCreateKey}>
              <Key size={14} /> 创建 Key
            </button>
          </div>

          {newKeyResult && (
            <div className="market-new-key-result">
              <div className="market-new-key-result-header">
                <span className="success">Key 创建成功！</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(newKeyResult);
                      showToast('已复制到剪贴板', 'success');
                    } catch {
                      showToast('复制失败，请手动复制', 'error');
                    }
                  }}
                >
                  <Copy size={14} /> 复制
                </button>
              </div>
              <code>{newKeyResult}</code>
              <div className="hint">已自动保存到本地存储</div>
            </div>
          )}

          {keysError && (
            <div className="market-error-bar">
              <AlertCircle size={14} /> {keysError}
            </div>
          )}

          {keysLoading ? (
            <div className="market-loading-center">
              <div className="market-spinner" />
              加载中...
            </div>
          ) : apiKeys.length > 0 ? (
            <table className="market-keys-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Owner</th>
                  <th>Role</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((k) => (
                  <tr key={k.key}>
                    <td><code>{k.key}</code></td>
                    <td>{k.owner}</td>
                    <td><span className="market-tag">{k.role}</span></td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRevokeKey(k.key)}
                      >
                        <Trash2 size={12} /> 撤销
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="market-empty-center">
              <Key size={32} />
              <div>暂无 API Keys</div>
              <div className="hint">在上方创建第一条 Key</div>
            </div>
          )}
        </div>
      )}

      {/* ========== SKILLS TAB ========== */}
      {activeTab === 'skills' && (
        <div className="market-tab-content">
          <div className="market-search-row">
            <div className="market-search-box">
              <Search size={16} className="market-search-icon" />
              <input
                type="text"
                placeholder="搜索 Skill 名称或描述..."
                value={skillsSearch}
                onChange={(e) => setSkillsSearch(e.target.value)}
              />
            </div>
            {!skillsLoading && skillsList.length > 0 && (
              <span className="market-result-count">共 {skillsTotal} 个</span>
            )}
          </div>

          {skillsError && (
            <div className="market-error-bar">
              <AlertCircle size={14} /> {skillsError}
            </div>
          )}

          {skillsLoading ? (
            <div className="market-loading-center">
              <div className="market-spinner" />
              加载 Skills...
            </div>
          ) : skillsList.length === 0 ? (
            <div className="market-empty-center">
              <Sparkles size={40} />
              <div>暂无 Skills</div>
              <div className="hint">使用 agent-builder 发布带 Skills 的 Agent 后，Skills 会出现在这里</div>
            </div>
          ) : (
            <div className="market-list-table">
              <div className="market-list-header">
                <span className="col-name">名称</span>
                <span className="col-desc">描述</span>
                <span className="col-cat">分类</span>
                <span className="col-count">关联 Agent</span>
              </div>
              {skillsList.map((skill) => (
                <div key={skill.id} className="market-list-row">
                  <span className="col-name">
                    <span className="skill-icon-inline">{skill.display_name}</span>
                    <span className="skill-id-hint">{skill.original_name}</span>
                  </span>
                  <span className="col-desc">{skill.description}</span>
                  <span className="col-cat">
                    <span className="market-tag">{skill.category || '--'}</span>
                  </span>
                  <span className="col-count">{skill.agent_count}</span>
                </div>
              ))}
              <div className="market-list-footer">
                共 {skillsTotal} 个 Skill
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== MCP SERVERS TAB ========== */}
      {activeTab === 'mcp-servers' && (
        <div className="market-tab-content">
          <div className="market-search-row">
            <div className="market-search-box">
              <Search size={16} className="market-search-icon" />
              <input
                type="text"
                placeholder="搜索 MCP Server 名称或描述..."
                value={mcpSearch}
                onChange={(e) => setMcpSearch(e.target.value)}
              />
            </div>
            {!mcpLoading && mcpList.length > 0 && (
              <span className="market-result-count">共 {mcpTotal} 个</span>
            )}
          </div>

          {mcpError && (
            <div className="market-error-bar">
              <AlertCircle size={14} /> {mcpError}
            </div>
          )}

          {mcpLoading ? (
            <div className="market-loading-center">
              <div className="market-spinner" />
              加载 MCP Servers...
            </div>
          ) : mcpList.length === 0 ? (
            <div className="market-empty-center">
              <Wrench size={40} />
              <div>暂无 MCP Servers</div>
              <div className="hint">使用 agent-builder 发布带 MCP 的 Agent 后，MCP Servers 会出现在这里</div>
            </div>
          ) : (
            <div className="market-list-table">
              <div className="market-list-header">
                <span className="col-name">名称</span>
                <span className="col-desc">描述</span>
                <span className="col-cmd">命令</span>
                <span className="col-count">关联 Agent</span>
              </div>
              {mcpList.map((server) => (
                <div key={server.id} className="market-list-row">
                  <span className="col-name">
                    <span className="mcp-icon-inline">{server.original_name}</span>
                  </span>
                  <span className="col-desc">{server.description}</span>
                  <span className="col-cmd">
                    <code>{server.command || '--'}</code>
                  </span>
                  <span className="col-count">{server.agent_count}</span>
                </div>
              ))}
              <div className="market-list-footer">
                共 {mcpTotal} 个 MCP Server
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatSize(b: number): string {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
