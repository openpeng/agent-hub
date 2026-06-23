import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Star,
  Check,
  GripVertical,
  Trash2,
  Settings,
  X,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { mockSkills, skillCategories } from '../data/mockSkills';
import { listMarketSkills } from '../services/marketApi';
import type { MarketSkillItem } from '../services/marketApi';
import { useAgentStore } from '../store/useAgentStore';
import type { Skill, SkillParameter } from '../types';
import './SkillSelector.css';

/* ============================================================
 *  可排序的已选Skill项组件（拖拽排序）
 * ============================================================ */
interface SortableSkillItemProps {
  skill: Skill;
  params: Record<string, any>;
  expandedSkillId: string | null;
  onToggleExpand: (skillId: string) => void;
  onRemove: (skillId: string) => void;
  onParamChange: (skillId: string, key: string, value: any) => void;
  onSaveParams: () => void;
}

function SortableSkillItem({
  skill,
  params,
  expandedSkillId,
  onToggleExpand,
  onRemove,
  onParamChange,
  onSaveParams,
}: SortableSkillItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: skill.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isExpanded = expandedSkillId === skill.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`selected-skill-item ${isDragging ? 'dragging' : ''}`}
    >
      {/* 项头部：拖拽手柄 + 图标 + 信息 + 操作 */}
      <div className="selected-skill-item-header">
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </div>
        <span className="selected-skill-icon">{skill.icon}</span>
        <div className="selected-skill-info">
          <div className="selected-skill-name">{skill.name}</div>
          <div className="selected-skill-category">
            {skill.category} · v{skill.version}
          </div>
        </div>
        <div className="selected-skill-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onToggleExpand(skill.id)}
            title={isExpanded ? '收起配置' : '展开配置'}
          >
            {isExpanded ? <X size={14} /> : <Settings size={14} />}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onRemove(skill.id)}
            title="移除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 参数配置面板（展开时显示） */}
      {isExpanded && (
        <SkillParamsPanel
          skill={skill}
          params={params}
          onParamChange={(key, value) => onParamChange(skill.id, key, value)}
          onSave={onSaveParams}
        />
      )}
    </div>
  );
}

/* ============================================================
 *  参数配置面板
 * ============================================================ */
interface SkillParamsPanelProps {
  skill: Skill;
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
  onSave: () => void;
}

function SkillParamsPanel({ skill, params, onParamChange, onSave }: SkillParamsPanelProps) {
  return (
    <div className="skill-params">
      <div className="skill-params-title">参数配置</div>

      {skill.parameters.map((param: SkillParameter) => (
        <div className="skill-param-item" key={param.key}>
          <label className="skill-param-label">
            {param.label}
            {param.required && <span className="skill-param-required">*</span>}
          </label>
          <div className="skill-param-hint">{param.description}</div>

          {/* 根据参数类型渲染不同的表单控件 */}
          {param.type === 'string' && (
            <input
              type="text"
              className="skill-param-input"
              placeholder={param.description}
              value={params[param.key] ?? param.default ?? ''}
              onChange={(e) => onParamChange(param.key, e.target.value)}
            />
          )}

          {param.type === 'number' && (
            <input
              type="number"
              className="skill-param-input"
              placeholder={param.description}
              value={params[param.key] ?? param.default ?? 0}
              onChange={(e) => onParamChange(param.key, Number(e.target.value))}
            />
          )}

          {param.type === 'boolean' && (
            <div className="skill-param-toggle">
              <div
                className={`toggle-switch ${params[param.key] ?? param.default ? 'active' : ''}`}
                onClick={() =>
                  onParamChange(param.key, !(params[param.key] ?? param.default))
                }
              />
              <span className="toggle-label">
                {params[param.key] ?? param.default ? '已开启' : '已关闭'}
              </span>
            </div>
          )}

          {param.type === 'select' && param.options && (
            <select
              className="skill-param-input"
              value={params[param.key] ?? param.default ?? ''}
              onChange={(e) => onParamChange(param.key, e.target.value)}
            >
              {param.options.map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}

      {/* 保存按钮 */}
      <div className="skill-params-footer">
        <button className="btn btn-primary btn-sm" onClick={onSave}>
          保存配置
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 *  Skill选择页面主组件
 * ============================================================ */
export default function SkillSelector() {
  const navigate = useNavigate();
  const {
    agent,
    addSkill,
    removeSkill,
    updateSkill,
    reorderSkills,
    setStepCompleted,
  } = useAgentStore();

  // 本地状态：搜索关键词、分类过滤、展开的配置面板
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);

  // Market API: fetch skills list (ref guards against Strict Mode double-fire)
  const skillsFetchedRef = useRef(false);
  const [marketSkillsList, setMarketSkillsList] = useState<MarketSkillItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);

  useEffect(() => {
    if (skillsFetchedRef.current) return;
    skillsFetchedRef.current = true;
    setMarketLoading(true);
    listMarketSkills({ page_size: 100 })
      .then((result) => setMarketSkillsList(result.skills || []))
      .catch(() => setMarketSkillsList([]))
      .finally(() => setMarketLoading(false));
  }, []);

  // Merge market data with mock data: mock provides rich params, market provides the list
  const availableSkills = useMemo<Skill[]>(() => {
    if (marketSkillsList.length === 0) return mockSkills;
    return marketSkillsList.map((ms) => {
      const mock = mockSkills.find((m) => m.id === ms.id);
      if (mock) return mock;
      // Create minimal Skill from market data
      return {
        id: ms.id,
        name: ms.display_name || ms.original_name,
        version: '1.0.0',
        description: ms.description,
        icon: '🔧',
        category: ms.category,
        author: '',
        downloads: 0,
        rating: 0,
        isOfficial: false,
        parameters: [],
        dependencies: [],
      } as Skill;
    });
  }, [marketSkillsList]);

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 至少移动5px才触发拖拽，避免误触
      },
    })
  );

  // ---- 计算属性：已选Skill ID集合 ----
  const selectedSkillIds = useMemo(
    () => new Set(agent.skills.map((s) => s.skillId)),
    [agent.skills]
  );

  // ---- 计算属性：过滤后的Skill列表 ----
  const filteredSkills = useMemo(() => {
    return availableSkills.filter((skill) => {
      // 分类过滤
      const categoryMatch =
        activeCategory === '全部' || skill.category === activeCategory;

      // 搜索过滤（匹配名称和描述）
      const query = searchQuery.toLowerCase().trim();
      const searchMatch =
        !query ||
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query);

      return categoryMatch && searchMatch;
    });
  }, [searchQuery, activeCategory]);

  // ---- 选中/取消选中Skill ----
  const handleToggleSkill = useCallback(
    (skill: Skill) => {
      if (selectedSkillIds.has(skill.id)) {
        removeSkill(skill.id);
        // 如果展开的正好是被移除的Skill，收起面板
        if (expandedSkillId === skill.id) {
          setExpandedSkillId(null);
        }
      } else {
        // 构建默认参数
        const defaultParams: Record<string, any> = {};
        skill.parameters.forEach((p) => {
          defaultParams[p.key] = p.default;
        });

        addSkill({
          skillId: skill.id,
          name: skill.name,
          version: skill.version,
          description: skill.description,
          icon: skill.icon,
          category: skill.category,
          parameters: defaultParams,
          priority: agent.skills.length,
          isOfficial: skill.isOfficial,
        });
      }
    },
    [selectedSkillIds, removeSkill, addSkill, agent.skills.length, expandedSkillId]
  );

  // ---- 展开/收起参数配置 ----
  const handleToggleExpand = useCallback((skillId: string) => {
    setExpandedSkillId((prev) => (prev === skillId ? null : skillId));
  }, []);

  // ---- 参数变更 ----
  const handleParamChange = useCallback(
    (skillId: string, key: string, value: any) => {
      const skillRef = agent.skills.find((s) => s.skillId === skillId);
      if (!skillRef) return;

      const newParams = { ...skillRef.parameters, [key]: value };
      updateSkill(skillId, { parameters: newParams });
    },
    [agent.skills, updateSkill]
  );

  // ---- 保存参数 ----
  const handleSaveParams = useCallback(() => {
    // 参数已通过 handleParamChange 实时更新到 store
    // 收起配置面板
    setExpandedSkillId(null);
  }, []);

  // ---- 拖拽排序结束 ----
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = agent.skills.findIndex((s) => s.skillId === active.id);
      const newIndex = agent.skills.findIndex((s) => s.skillId === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // 重新排列数组
      const newSkills = [...agent.skills];
      const [moved] = newSkills.splice(oldIndex, 1);
      newSkills.splice(newIndex, 0, moved);

      // 更新 priority
      const reordered = newSkills.map((s, i) => ({ ...s, priority: i }));
      reorderSkills(reordered);
    },
    [agent.skills, reorderSkills]
  );

  // ---- 获取已选Skill的参数（从store中读取） ----
  const getSkillParams = useCallback(
    (skillId: string): Record<string, any> => {
      const ref = agent.skills.find((s) => s.skillId === skillId);
      return ref?.parameters ?? {};
    },
    [agent.skills]
  );

  // ---- 导航：上一步 / 下一步 ----
  const handlePrev = () => navigate('/intro');
  const handleNext = () => {
    setStepCompleted('skills', true);
    navigate('/mcp-tools');
  };

  // ---- 格式化下载量 ----
  const formatDownloads = (num: number): string => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}w`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return String(num);
  };

  return (
    <div className="skill-page">
      {/* ===== 左侧：Skill浏览器 ===== */}
      <div className="skill-browser">
        {/* 搜索框 */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="搜索Skill名称或描述..."
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
            <span className="filter-count">{availableSkills.length}</span>
          </div>
          {skillCategories.map((cat) => (
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

        {/* Skill卡片网格 */}
        {marketLoading ? (
          <div className="empty-state">
            <div className="spinner" style={{ marginBottom: 12 }} />
            <div className="empty-state-text">正在从市场加载 Skills...</div>
          </div>
        ) : (
          <div className="skill-grid">
            {filteredSkills.map((skill) => {
            const isSelected = selectedSkillIds.has(skill.id);
            return (
              <div
                key={skill.id}
                className={`skill-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleToggleSkill(skill)}
              >
                {/* 选中勾选标记 */}
                <div className="skill-card-check">
                  <Check size={14} />
                </div>

                {/* 卡片头部 */}
                <div className="skill-card-header">
                  <div className="skill-card-header-left">
                    <span className="skill-card-icon">{skill.icon}</span>
                    <div>
                      <div className="skill-card-name">{skill.name}</div>
                    </div>
                  </div>
                  <span className="skill-card-version">v{skill.version}</span>
                </div>

                {/* 官方/社区标识 */}
                <div style={{ marginBottom: '0.5rem' }}>
                  {skill.isOfficial ? (
                    <span className="official-badge">
                      <ShieldCheck size={12} /> 官方
                    </span>
                  ) : (
                    <span className="community-badge">
                      <Users size={12} /> 社区
                    </span>
                  )}
                </div>

                {/* 卡片内容 */}
                <div className="skill-card-body">
                  <div className="skill-card-desc">{skill.description}</div>
                </div>

                {/* 卡片底部 */}
                <div className="skill-card-footer">
                  <div className="skill-card-stat">
                    <Download size={14} />
                    <span className="stat-value">{formatDownloads(skill.downloads)}</span>
                  </div>
                  <div className="skill-card-stat">
                    <Star size={14} />
                    <span className="stat-value">{skill.rating}</span>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}

        {/* 空搜索结果 */}
        {!marketLoading && filteredSkills.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">
              未找到匹配的Skill，请尝试其他搜索关键词
            </div>
          </div>
        )}
      </div>

      {/* ===== 右侧：已选Skill列表 ===== */}
      <div className="selected-skills">
        <div className="selected-skills-title">
          已选Skill
          <span className="selected-skills-count">{agent.skills.length}</span>
        </div>

        {agent.skills.length === 0 ? (
          <div className="selected-empty">
            <div className="selected-empty-icon">📦</div>
            <div className="selected-empty-text">
              还未选择任何Skill
              <br />
              从左侧浏览并点击卡片添加
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={agent.skills.map((s) => s.skillId)}
              strategy={verticalListSortingStrategy}
            >
              {agent.skills.map((skillRef) => {
                // 从availableSkills中找到完整的Skill数据
                const fullSkill = availableSkills.find((s) => s.id === skillRef.skillId);
                if (!fullSkill) return null;

                return (
                  <SortableSkillItem
                    key={skillRef.skillId}
                    skill={fullSkill}
                    params={getSkillParams(skillRef.skillId)}
                    expandedSkillId={expandedSkillId}
                    onToggleExpand={handleToggleExpand}
                    onRemove={removeSkill}
                    onParamChange={handleParamChange}
                    onSaveParams={handleSaveParams}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
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
          <span className="skill-count-hint">
            已选择 <strong>{agent.skills.length}</strong> 个Skill
          </span>
          <button className="btn btn-primary" onClick={handleNext}>
            下一步
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
