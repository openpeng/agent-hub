import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileJson,
  FileCode,
  Shield,
  Server,
  Cpu,
  Network,
  MessageSquare,
  Wrench,
  Gauge,
  Workflow,
  Terminal,
  Home,
  ChevronRight,
  Globe,
} from 'lucide-react';

// Inline GitHub SVG since lucide-react doesn't include brand icons
const GhIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={{ verticalAlign: 'middle' }}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);
import './DocsPage.css';

const SECTIONS = [
  { id: 'protocol', icon: FileJson, label: 'agent.json 协议规范' },
  { id: 'worker-yaml', icon: FileCode, label: 'worker.yaml 配置规范' },
  { id: 'llm-inheritance', icon: Cpu, label: 'LLM 配置自动继承' },
  { id: 'collaboration', icon: Network, label: '协作配置' },
  { id: 'messagebus', icon: MessageSquare, label: '消息总线协议' },
  { id: 'tool-system', icon: Wrench, label: '工具系统' },
  { id: 'pipeline', icon: Gauge, label: 'Pipeline 执行机制' },
  { id: 'lifecycle', icon: Workflow, label: '生命周期管理' },
  { id: 'security', icon: Shield, label: '安全与权限模型' },
  { id: 'mcp', icon: Terminal, label: '自定义 MCP 工具' },
  { id: 'api', icon: Server, label: 'Market REST API' },
];

export default function DocsPage() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('protocol');

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && SECTIONS.find(s => s.id === hash)) {
      setActiveSection(hash);
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="docs-page">
      {/* Sidebar */}
      <aside className="docs-sidebar">
        <div className="docs-sidebar-header">
          <a href="/" className="docs-home-link">
            <Home size={16} /> 返回首页
          </a>
          <h2>技术文档</h2>
        </div>
        <p className="docs-sidebar-sub">Agent Hub 协议与架构参考</p>
        <nav className="docs-nav">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`docs-nav-item ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => scrollTo(s.id)}
            >
              <s.icon size={15} />
              {s.label}
              <ChevronRight size={12} className="docs-nav-arrow" />
            </button>
          ))}
        </nav>
        <div className="docs-sidebar-footer">
          <a href="https://github.com/openpeng/agent-hub" target="_blank" rel="noopener noreferrer" className="docs-gh-link">
            <GhIcon size={14} /> GitHub
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="docs-main">
        {/* protocol */}
        <section id="protocol" className="docs-section">
          <h2>agent.json 协议规范</h2>
          <p className="docs-intro">agent.json 是 Agent 包的核心声明式配置（worker.yaml 位于包根目录）：</p>
          <div className="docs-code-block">
            <pre>{`{
  // 身份信息（必填）
  "identity": {
    "name": "my-agent",         // 唯一标识
    "version": "1.0.0",         // semver 版本号
    "description": "Agent 描述",
    "author": "your-name",
    "display_name": "显示名称",
    "tags": ["tag1", "tag2"]
  },
  // 入口配置（必填）—— 指定主入口子Agent
  "entry": {
    "main_subagent": "worker"
  },
  // 子Agent 引用列表（必填）
  "subagents": [
    {
      "name": "worker",
      "path": "worker.yaml"
    }
  ],
  // 分类与元数据（必填）
  "category": "utility",
  "type": "agent",
  "license": "MIT",
  // 依赖声明（可选）
  "dependencies": {
    "python3": ">=3.10"
  }
}`}</pre>
          </div>
        </section>

        {/* worker.yaml */}
        <section id="worker-yaml" className="docs-section">
          <h2>worker.yaml 配置规范</h2>
          <p className="docs-intro">
            每个子 Agent 由一个 YAML 文件定义，包含工具声明、Pipeline 步骤和权限配置。位于 Agent 包的根目录。
          </p>
          <div className="docs-code-block">
            <pre>{`# worker.yaml —— 完整示例
name: worker
version: "1.0.0"
description: "数据处理 + LLM 分析子Agent"

# ========== 工具声明 ==========
# 子Agent 只能调用此处列出的工具
tools:
  - name: read_file
    type: builtin      # 类型：builtin | skill | custom | mcp
  - name: llm_chat
    type: builtin
    # ★ 无需 model/api_key — 自动从主Agent继承
  - name: bash
    type: builtin

# ========== Pipeline 步骤（顺序执行）==========
pipeline:
  - step: read_input
    tool: read_file
    args:
      path: "{{file_path}}"
    output: raw_data
    on_fail: fail       # abort | skip | retry(N)

  - step: analyze_llm
    tool: llm_chat
    args:
      prompt: "分析: {{raw_data}}"
      system_prompt: "你是一个数据分析师"
    output: llm_result
    on_fail: continue   # LLM不可用时不中止

  - step: fallback
    tool: bash
    args:
      command: "python3 {{package_dir}}/libs/analyze.py"
      timeout: 30
    output: done
    on_fail: fail

# ========== 权限声明 ==========
permissions:
  filesystem:
    read: ["data/**", "libs/**"]
    write: ["output/**"]
  subprocess:
    max_concurrent: 1
    allowed_commands: ["python3", "cat", "echo"]

# ========== 环境变量 ==========
env:
  LOG_LEVEL: "info"`}</pre>
          </div>

          <table className="docs-table">
            <thead>
              <tr><th>字段</th><th>类型</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr><td><code>tools</code></td><td>array</td><td>工具声明列表。类型: builtin / skill / custom / mcp</td></tr>
              <tr><td><code>pipeline[]</code></td><td>array</td><td>顺序执行的步骤列表</td></tr>
              <tr><td><code>pipeline[].tool</code></td><td>string</td><td>工具名称（必须在 tools 中声明）</td></tr>
              <tr><td><code>pipeline[].args</code></td><td>object</td><td>工具参数，支持模板变量</td></tr>
              <tr><td><code>pipeline[].output</code></td><td>string</td><td>输出变量名，供后续步骤引用</td></tr>
              <tr><td><code>pipeline[].on_fail</code></td><td>string</td><td>abort（中止）/ skip（跳过）/ retry(N)（重试 N 次）</td></tr>
              <tr><td><code>permissions</code></td><td>object</td><td>文件系统、网络、子进程、资源的权限声明</td></tr>
              <tr><td><code>collaboration</code></td><td>object</td><td>协作配置（详见下节）</td></tr>
            </tbody>
          </table>
        </section>

        {/* LLM Inheritance */}
        <section id="llm-inheritance" className="docs-section">
          <h2>LLM 配置自动继承</h2>
          <p className="docs-intro">
            子 Agent 使用 <code>llm_chat</code> 工具时，<strong>无需手动配置 model/api_key/provider</strong> ——
            配置自动从主 Agent 三层优先级链继承：
          </p>
          <table className="docs-table">
            <thead><tr><th>优先级</th><th>读取位置</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><span className="docs-tag docs-tag-red">1 最高</span></td><td><code>args.model</code> / <code>args.api_key</code></td><td>显式传参覆盖默认值，例如 <code>model: "gpt-4o"</code></td></tr>
              <tr><td><span className="docs-tag docs-tag-yellow">2 默认</span></td><td><code>shared_context.llm_config</code></td><td>MainAgent 启动时从环境变量读取并自动注入</td></tr>
              <tr><td><span className="docs-tag docs-tag-gray">3 兜底</span></td><td>环境变量</td><td><code>LLM_MODEL</code> / <code>OPENROUTER_API_KEY</code> / <code>ANTHROPIC_API_KEY</code></td></tr>
            </tbody>
          </table>

          <div className="docs-code-block">
            <pre>{`# 方式 1: 不传 model/api_key → 自动继承
pipeline:
  - step: use_default
    tool: llm_chat
    args:
      prompt: "用默认模型分析..."
    # ✅ 无需 model/api_key — 自动从 MainAgent 继承

# 方式 2: 显式指定 → 覆盖默认值
  - step: use_custom
    tool: llm_chat
    args:
      prompt: "用特定模型分析..."
      model: "claude-3-opus-20240229"
      api_key: "sk-ant-xxxxx"
      provider: "anthropic"`}</pre>
          </div>
          <p className="docs-note">
            支持的 provider: <strong>openai</strong> | <strong>openrouter</strong> | <strong>anthropic</strong>
          </p>
        </section>

        {/* Collaboration */}
        <section id="collaboration" className="docs-section">
          <h2>协作配置 (CollaborationConfig)</h2>
          <p className="docs-intro">控制子 Agent 在协作中的角色和行为：</p>
          <table className="docs-table">
            <thead><tr><th>字段</th><th>默认值</th><th>可选值</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>execution_mode</code></td><td>sync</td><td>sync / async / async_wait</td><td>同步等待 / 异步不等待 / 异步可等待</td></tr>
              <tr><td><code>trigger</code></td><td>auto</td><td>auto / manual / on_complete / on_fail / conditional</td><td>子Agent激活条件</td></tr>
              <tr><td><code>coordination</code></td><td>sequential</td><td>sequential / parallel_all / parallel_any / conditional</td><td>协作协调策略</td></tr>
              <tr><td><code>data_exchange</code></td><td>file</td><td>file / message / shared_context / stream</td><td>数据交换方式</td></tr>
              <tr><td><code>merge_strategy</code></td><td>concat</td><td>concat / merge_dict / union / intersect / custom</td><td>并行结果合并策略</td></tr>
              <tr><td><code>depends_on</code></td><td>[]</td><td>string[]</td><td>依赖的子Agent列表</td></tr>
              <tr><td><code>timeout</code></td><td>300</td><td>int</td><td>最大执行时间（秒）</td></tr>
              <tr><td><code>max_retries</code></td><td>0</td><td>int</td><td>失败重试次数</td></tr>
              <tr><td><code>priority</code></td><td>0</td><td>int</td><td>执行优先级（越大越优先）</td></tr>
            </tbody>
          </table>
        </section>

        {/* MessageBus */}
        <section id="messagebus" className="docs-section">
          <h2>消息总线协议 (MessageBus)</h2>
          <p className="docs-intro">MessageBus 是父子 Agent 间的通信中枢，所有交互通过标准化消息类型进行：</p>
          <table className="docs-table">
            <thead><tr><th>分类</th><th>消息类型</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><span className="docs-tag docs-tag-blue">控制</span></td><td><code>subagent.create</code> / <code>subagent.destroy</code> / <code>subagent.pause</code> / <code>subagent.resume</code></td><td>子Agent生命周期控制</td></tr>
              <tr><td><span className="docs-tag docs-tag-green">任务</span></td><td><code>task.assign</code> / <code>task.progress</code> / <code>task.complete</code> / <code>task.fail</code></td><td>任务生命周期</td></tr>
              <tr><td><span className="docs-tag docs-tag-yellow">工具</span></td><td><code>tool.call</code> / <code>tool.result</code> / <code>tool.request</code></td><td>工具调用与权限请求</td></tr>
              <tr><td><span className="docs-tag docs-tag-purple">状态</span></td><td><code>status.report</code> / <code>log.emit</code> / <code>health.check</code></td><td>状态报告与健康检查</td></tr>
              <tr><td><span className="docs-tag docs-tag-red">协作</span></td><td><code>collab.request_help</code> / <code>collab.forward</code> / <code>collab.merge</code></td><td>Agent间协作</td></tr>
            </tbody>
          </table>
        </section>

        {/* Tool System */}
        <section id="tool-system" className="docs-section">
          <h2>工具系统</h2>
          <table className="docs-table">
            <thead><tr><th>类型</th><th>标识</th><th>说明</th><th>预置工具</th></tr></thead>
            <tbody>
              <tr><td><span className="docs-tag docs-tag-green">builtin</span></td><td><code>type: builtin</code></td><td>AgentRuntime 内置标准工具</td><td>read_file, write_file, bash, glob, llm_chat, web_fetch, web_search, invoke_agent</td></tr>
              <tr><td><span className="docs-tag docs-tag-purple">skill</span></td><td><code>type: skill</code></td><td>通过 SKILL.md 注册的技能工具</td><td>自定义数据分析/处理技能</td></tr>
              <tr><td><span className="docs-tag docs-tag-blue">custom</span></td><td><code>type: custom</code></td><td>用户自定义 Python/JS 脚本</td><td>internal_api.py, reporter.py</td></tr>
              <tr><td><span className="docs-tag docs-tag-gray">mcp</span></td><td><code>type: mcp</code></td><td>外部 MCP Server 提供的工具</td><td>filesystem, database, API wrapper</td></tr>
            </tbody>
          </table>
        </section>

        {/* Pipeline Execution */}
        <section id="pipeline" className="docs-section">
          <h2>Pipeline 执行机制</h2>
          <div className="docs-code-block">
            <pre>{`┌────────────────────────────────────────────────┐
│            Pipeline 步骤执行流程               │
├────────────────────────────────────────────────┤
│  1. 模板变量解析                               │
│     • {{var}} → 运行时参数                     │
│     • {{steps.step_name.output}} → 上一步输出  │
│     • {{shared_context.key}} → 共享上下文      │
│     • {{state.key}} → 子Agent私有状态          │
│                                                │
│  2. 工具参数注入 → 传递解析后的参数            │
│  3. 工具调用 → call_tool(tool_name, **args)    │
│  4. 错误处理 → abort / skip / retry(N)         │
│  5. 结果保存 → _step_results[step_name]        │
│  6. 进度通知 → MessageBus TASK_PROGRESS        │
└────────────────────────────────────────────────┘`}</pre>
          </div>
        </section>

        {/* Lifecycle */}
        <section id="lifecycle" className="docs-section">
          <h2>生命周期管理</h2>
          <div className="docs-code-block">
            <pre>{`LOADED → VALIDATED → APPROVED → CREATED → RUNNING
            │
    ┌───────┼────────┐
    ▼       ▼        ▼
PAUSED  COMPLETED  FAILED
    │               │
    └───→ DESTROYED ←───┘`}</pre>
          </div>
          <table className="docs-table">
            <thead><tr><th>状态</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>loaded</code></td><td>子Agent配置已从 YAML 加载</td></tr>
              <tr><td><code>validated</code></td><td>配置校验通过</td></tr>
              <tr><td><code>approved</code></td><td>安全审计通过，权限已批准</td></tr>
              <tr><td><code>created</code></td><td>运行时实例已创建</td></tr>
              <tr><td><code>running</code></td><td>正在执行 Pipeline</td></tr>
              <tr><td><code>paused</code></td><td>已暂停（可恢复）</td></tr>
              <tr><td><code>completed</code></td><td>Pipeline 执行成功完成</td></tr>
              <tr><td><code>failed</code></td><td>执行失败</td></tr>
              <tr><td><code>destroyed</code></td><td>资源已清理，实例已销毁</td></tr>
            </tbody>
          </table>
        </section>

        {/* Security */}
        <section id="security" className="docs-section">
          <h2>安全与权限模型</h2>
          <p className="docs-intro">
            每个子 Agent 声明所需权限，Auditor 自动审计拒绝越权访问。四维审计模型：文件系统、网络、子进程、资源限制。
          </p>
          <div className="docs-code-block">
            <pre>{`# 权限声明示例
permissions:
  filesystem:
    read: ["data/**"]
    write: ["output/**"]
  network:
    outbound: true
    allowed_hosts: ["api.example.com"]
  subprocess:
    max_concurrent: 2
    allowed_commands: ["python3", "node"]
  resources:
    memory_limit: "1GB"
    timeout: 300`}</pre>
          </div>
        </section>

        {/* MCP */}
        <section id="mcp" className="docs-section">
          <h2>自定义 MCP 工具</h2>
          <p className="docs-intro">声明 MCP 类型的工具，挂载到子Agent的 ToolRegistry，使用 <code>{'{name}'}__{'{tool}'}</code> 命名空间格式调用：</p>
          <div className="docs-code-block">
            <pre>{`# worker.yaml — MCP 工具声明
tools:
  - name: fs
    type: mcp
    server:
      command: "npx"
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    allowed_tools: ["read_file", "write_file"]

pipeline:
  - step: read_config
    tool: fs__read_file   # 命名空间格式: <name>__<tool>
    args:
      path: "/tmp/config.json"`}</pre>
          </div>
        </section>

        {/* Market API */}
        <section id="api" className="docs-section">
          <h2>Market REST API</h2>
          <h3>基础信息</h3>
          <table className="docs-table">
            <tbody>
              <tr><td>Base URL</td><td><code>http://localhost:8321/api/v1</code></td></tr>
              <tr><td>认证方式</td><td><code>Authorization: Bearer pd_mkt_xxx</code></td></tr>
              <tr><td>端口</td><td><code>8321</code></td></tr>
              <tr><td>数据库</td><td><code>./data/market/market.db (SQLite)</code></td></tr>
            </tbody>
          </table>

          <h3>端点列表</h3>
          <table className="docs-table">
            <thead><tr><th>方法</th><th>路径</th><th>认证</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><span className="docs-method-get">GET</span></td><td className="docs-endpoint">/api/v1/health</td><td>—</td><td>健康检查</td></tr>
              <tr><td><span className="docs-method-post">POST</span></td><td className="docs-endpoint">/api/v1/agents</td><td>publisher+</td><td>注册/上传 Agent 包</td></tr>
              <tr><td><span className="docs-method-get">GET</span></td><td className="docs-endpoint">/api/v1/agents</td><td>—</td><td>搜索/列表 Agent</td></tr>
              <tr><td><span className="docs-method-get">GET</span></td><td className="docs-endpoint">/api/v1/agents/batch?ids=a,b,c</td><td>—</td><td>批量查询</td></tr>
              <tr><td><span className="docs-method-get">GET</span></td><td className="docs-endpoint">/api/v1/agents/{'{id}'}</td><td>—</td><td>获取详情</td></tr>
              <tr><td><span className="docs-method-get">GET</span></td><td className="docs-endpoint">/api/v1/agents/{'{id}'}/download</td><td>—</td><td>下载包文件</td></tr>
              <tr><td><span className="docs-method-post">POST</span></td><td className="docs-endpoint">/api/v1/agents/{'{id}'}/ratings</td><td>publisher+</td><td>评分</td></tr>
              <tr><td><span className="docs-method-get">GET</span></td><td className="docs-endpoint">/api/v1/agents/{'{id}'}/ratings</td><td>—</td><td>获取评分列表</td></tr>
              <tr><td><span className="docs-method-delete">DELETE</span></td><td className="docs-endpoint">/api/v1/agents/{'{id}'}</td><td>admin</td><td>删除 Agent</td></tr>
              <tr><td><span className="docs-method-post">POST</span></td><td className="docs-endpoint">/api/v1/api-keys</td><td>master/admin</td><td>创建 API Key</td></tr>
              <tr><td><span className="docs-method-get">GET</span></td><td className="docs-endpoint">/api/v1/api-keys</td><td>admin</td><td>列出 API Keys</td></tr>
              <tr><td><span className="docs-method-delete">DELETE</span></td><td className="docs-endpoint">/api/v1/api-keys/{'{key}'}</td><td>admin</td><td>撤销 API Key</td></tr>
            </tbody>
          </table>

          <h3>搜索参数</h3>
          <table className="docs-table">
            <thead><tr><th>参数</th><th>类型</th><th>默认</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>q</code></td><td>string</td><td>""</td><td>关键词搜索（name/display_name/description）</td></tr>
              <tr><td><code>category</code></td><td>string</td><td>""</td><td>分类过滤</td></tr>
              <tr><td><code>type</code></td><td>string</td><td>""</td><td>类型过滤</td></tr>
              <tr><td><code>tags</code></td><td>string</td><td>""</td><td>标签过滤（逗号分隔）</td></tr>
              <tr><td><code>sort</code></td><td>string</td><td>"downloads"</td><td>排序字段: downloads / rating / created / name</td></tr>
              <tr><td><code>order</code></td><td>string</td><td>"desc"</td><td>排序方向: asc / desc</td></tr>
              <tr><td><code>page</code></td><td>int</td><td>1</td><td>页码</td></tr>
              <tr><td><code>page_size</code></td><td>int</td><td>20</td><td>每页条数（最大 100）</td></tr>
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <div className="docs-section-footer">
          <p>
            <strong>Agent Hub</strong> — 两个项目，一个协议，无限可能。
          </p>
          <div className="docs-footer-links">
            <a href="https://github.com/openpeng/agent-hub" target="_blank" rel="noopener noreferrer">
              <GhIcon size={14} /> agent-hub
            </a>
            <a href="https://github.com/openpeng/agent-market" target="_blank" rel="noopener noreferrer">
              <Globe size={14} /> agent-market
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
