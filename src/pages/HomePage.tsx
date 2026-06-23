import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Package,
  Zap,
  CheckCircle2,
  Shield,
  Layers,
  FileJson,
  Cpu,
  Network,
  MessageSquare,
  Wrench,
  Gauge,
  Workflow,
  Terminal,
  Server,
  FileCode,
  ArrowRight,
  Star,
  Download,
  Code2,
  Users,
  Rocket,
} from 'lucide-react';

// Inline GitHub SVG
const GhIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={{ verticalAlign: 'middle' }}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);
import './HomePage.css';

// Counter animation hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTime: number | null = null;
          const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return { count, ref };
}

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="home-page">
      {/* Orb background effects */}
      <div className="home-orb home-orb-1" />
      <div className="home-orb home-orb-2" />
      <div className="home-orb home-orb-3" />

      {/* ======== Header Nav ======== */}
      <header className="home-header">
        <div className="home-header-inner">
          <div className="home-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Agent Hub</div>
          <nav className="home-nav">
            <button onClick={() => scrollTo('overview')}>概览</button>
            <button onClick={() => scrollTo('quickstart')}>快速开始</button>
            <button onClick={() => scrollTo('architecture')}>架构</button>
            <button onClick={() => scrollTo('protocol')}>协议</button>
            <button onClick={() => scrollTo('api')}>API</button>
            <button onClick={() => scrollTo('roadmap')}>路线图</button>
          </nav>
          <div className="home-header-actions">
            <button className="home-header-btn" onClick={() => navigate('/quick-start')}>
              <Zap size={14} /> 开始构建
            </button>
            <a
              className="home-gh-link"
              href="https://github.com/openpeng/agent-hub"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GhIcon size={14} /> GitHub
            </a>
          </div>
        </div>
      </header>

      {/* ======== Hero ======== */}
      <section className="home-hero" id="hero">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 20,
            background: 'rgba(129,140,248,0.08)',
            border: '1px solid rgba(129,140,248,0.15)',
            fontSize: 13,
            color: '#a0a0b8',
            marginBottom: 32,
            backdropFilter: 'blur(8px)',
          }}>
            <Rocket size={14} style={{ color: '#818cf8' }} />
            Phase 8 完成 · 345+ 测试全部通过
          </div>
          <h1 className="home-hero-title">Agent Hub</h1>
          <p className="home-hero-subtitle">
            AI Agent 的原子化基础设施 — <strong>Runtime</strong> 让 Agent 跑起来，<strong>Market</strong> 让 Agent 流通起来
          </p>
          <div className="home-hero-badges">
            <span className="home-badge">🤖 原子化 Agent 设计</span>
            <span className="home-badge">🔒 安全沙箱审计</span>
            <span className="home-badge">🔗 多Agent 协作协议</span>
            <span className="home-badge">🌐 开放市场生态</span>
          </div>
          <div className="home-hero-actions">
            <button className="home-btn home-btn-primary" onClick={() => navigate('/quick-start')}>
              <Zap size={16} /> 开始构建 Agent
            </button>
            <button className="home-btn home-btn-outline" onClick={() => navigate('/market')}>
              <Globe size={16} /> 浏览 Agent 市场
            </button>
          </div>
        </div>
      </section>

      {/* ======== Stats Section ======== */}
      <section className="home-stats">
        <StatItem end={345} suffix="+" label="测试用例" icon={<Code2 size={18} />} />
        <StatItem end={8} suffix=" 期" label="开发阶段" icon={<Layers size={18} />} />
        <StatItem end={9} suffix="" label="AI 工具适配" icon={<Package size={18} />} />
        <StatItem end={100} suffix="%" label="测试通过率" icon={<Star size={18} />} />
      </section>

      {/* ======== Core Value Proposition ======== */}
      <section className="home-section" id="overview" style={{ paddingTop: 80 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 16,
            color: '#e2e8f0',
          }}>
            为什么选择 Agent Hub？
          </h2>
          <p style={{ color: '#a0a0b8', fontSize: 16, maxWidth: 600, margin: '0 auto', lineHeight: 1.8 }}>
            Agent 不是更大的 Skill，而是 AI 能力的完整载体 — 自有工具、自有状态、自洽运行
          </p>
        </div>
        <div className="home-modules-row">
          <div className="home-module-card home-mod-1">
            <div className="home-mod-icon">
              <Cpu size={32} />
            </div>
            <h3>Agent Runtime</h3>
            <div className="home-mod-path">src/agents/</div>
            <p className="home-mod-desc">
              <strong>让 Agent 跑起来。</strong>加载 agent.json → 审计权限 → 注入配置 → 启动 Pipeline。支持旧 SKILL.md 自动兼容，从声明到执行的完整引擎。
            </p>
          </div>
          <div className="home-module-card home-mod-2">
            <div className="home-mod-icon">
              <Globe size={32} />
            </div>
            <h3>Agent Market</h3>
            <div className="home-mod-path">src/market/</div>
            <p className="home-mod-desc">
              <strong>让 Agent 流通起来。</strong>FastAPI 市场服务 + Python SDK — 搜索、发布、下载、评分。SQLite 存储，零外部依赖，本地优先。
            </p>
            <a className="home-mod-gh" href="https://github.com/openpeng/agent-market" target="_blank" rel="noopener noreferrer">
              <GhIcon size={14} /> github.com/openpeng/agent-market
            </a>
          </div>
          <div className="home-module-card home-mod-3">
            <div className="home-mod-icon">
              <Package size={32} />
            </div>
            <h3>Agent Deploy</h3>
            <div className="home-mod-path">skills/agent-deploy/</div>
            <p className="home-mod-desc">
              <strong>一键部署到任意 AI 工具。</strong>自动检测 Cursor / Claude Code / CodeBuddy / Copilot 等 9 种工具，下载适配，一条命令搞定。
            </p>
            <a className="home-mod-gh" href="https://github.com/openpeng/agent-deploy" target="_blank" rel="noopener noreferrer">
              <GhIcon size={14} /> github.com/openpeng/agent-deploy
            </a>
          </div>
        </div>
      </section>

      {/* ======== Key Features ======== */}
      <section className="home-section">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 16,
            color: '#e2e8f0',
          }}>
            核心特性
          </h2>
        </div>
        <div className="home-card">
          <h3 className="home-card-title">
            <CheckCircle2 size={20} className="home-text-accent" />
            项目亮点
          </h3>
          <p className="home-card-sub">Agent 是 AI 能力的完整载体 — 一个 Skill 解决一个任务，一个 Agent 拥有一个世界。</p>
          <ul className="home-feature-list">
            <li><strong>原子化设计</strong> — 每个 Agent 是完备的自治单元：工具、Pipeline、状态、LLM 配置自包含</li>
            <li><strong>配置自动继承</strong> — LLM 配置从主 Agent 自动注入子 Agent，声明即用</li>
            <li><strong>自由伸缩</strong> — 从「读取文件」到「多Agent协作数据分析系统」，同一套抽象</li>
            <li><strong>多Agent 协作</strong> — 标准化协议通信，串行、并行、条件路由，Agent 编排 Agent</li>
            <li><strong>安全沙箱</strong> — 文件、网络、子进程、资源四维审计，每个Agent都有权限边界</li>
            <li><strong>市场生态</strong> — 一键发布、搜索、下载、评分，Agent 像 App 一样流通</li>
            <li><strong>自动发现</strong> — 安装即用，MainAgent 自动发现 market 下所有 Agent</li>
          </ul>
        </div>
      </section>

      {/* ======== Why Agent ======== */}
      <section className="home-section">
        <div className="home-card">
          <h3 className="home-card-title">
            <Layers size={20} className="home-text-accent" />
            为什么是 Agent？— 超越 Skill 的范式跃迁
          </h3>
          <p className="home-card-sub">Skill 解决上下文爆炸的表面问题，Agent 回答的是 AI 能力的组织方式这一根本问题：</p>
          <div className="home-table-wrap">
            <table className="home-table">
              <thead>
                <tr><th></th><th>Skill（技能）</th><th>Agent（智能体）</th></tr>
              </thead>
              <tbody>
                <tr><td>本质</td><td>一个可调用的函数片段</td><td><strong>一个拥有独立世界的完整存在</strong></td></tr>
                <tr><td>状态</td><td>无状态，每次调用重新开始</td><td><strong>有状态，拥有记忆和生命周期</strong></td></tr>
                <tr><td>工具</td><td>被动被编排</td><td><strong>主动声明需求，自治执行</strong></td></tr>
                <tr><td>配置</td><td>依赖调用方传入一切</td><td><strong>自包含 LLM 配置、环境变量、权限</strong></td></tr>
                <tr><td>复杂度</td><td>上限是单次调用的复杂度</td><td><strong>从一行代码到百Agent协同，同一抽象</strong></td></tr>
                <tr><td>协作</td><td>由编排层统一调度</td><td><strong>Agent 可以直接发现和调用其他 Agent</strong></td></tr>
                <tr><td>可分享性</td><td>分享一个代码片段</td><td><strong>分享一个完整的 AI 能力世界</strong></td></tr>
              </tbody>
            </table>
          </div>
          <p className="home-card-note">
            Skill 到 Agent 的升级，不是「更好的函数」，而是<strong>从碎片到整体</strong>的范式跃迁。Agent 是 AI 能力的最小完整单元 — 它既是原子，也可以组成分子。
          </p>
        </div>
      </section>

      {/* ======== Quick Start ======== */}
      <section className="home-section" id="quickstart">
        <h2 className="home-section-title">快速开始</h2>

        <div className="home-card">
          <h3 className="home-card-title">从市场下载到运行 Agent</h3>
          <p className="home-card-sub">从 Market 搜索到运行 Agent 只需 3 步：</p>
          <div className="home-steps">
            <div className="home-step">
              <div className="home-step-num">1</div>
              <div className="home-step-body"><strong>搜索</strong> — <code>client.search(query="web")</code></div>
            </div>
            <div className="home-step">
              <div className="home-step-num">2</div>
              <div className="home-step-body"><strong>安装</strong> — <code>client.install("file-summarizer")</code></div>
            </div>
            <div className="home-step">
              <div className="home-step-num">3</div>
              <div className="home-step-body"><strong>运行</strong> — <code>main.run_sync(initial_args={'{"file_path": "..."}'})</code></div>
            </div>
          </div>
        </div>

        <div className="home-card">
          <h3 className="home-card-title">Python SDK 示例</h3>
          <pre className="home-code">{`from market.client import MarketClient
from agents import MainAgent

client = MarketClient(server_url="http://localhost:8321")
main = MainAgent()

# 搜索并安装
client.search(query="web", category="browser", sort="downloads")
path = client.install("file-summarizer")

# 加载并运行（自动注入 LLM 配置）
main.load_package(str(path))
result = main.run_sync(initial_args={"file_path": "data.txt"})

# 发布 / 更新
client.publish("./my-agent-pkg", force=True)
client.check_updates("my-agent")`}</pre>
        </div>
      </section>

      {/* ======== Architecture ======== */}
      <section className="home-section" id="architecture">
        <h2 className="home-section-title">Agent Runtime 架构</h2>

        <div className="home-card">
          <h3 className="home-card-title">
            <Workflow size={20} className="home-text-accent" />
            子Agent 配置规范 (worker.yaml)
          </h3>
          <p className="home-card-sub">每个子Agent由一个 YAML 文件定义，包含工具声明、Pipeline 步骤和权限配置：</p>
          <pre className="home-code">{`name: worker
version: "1.0.0"
description: "数据处理 + LLM 分析子Agent"

tools:
  - name: read_file
    type: builtin
  - name: llm_chat
    type: builtin    # ★ 自动继承主Agent的 model/api_key
  - name: bash
    type: builtin

pipeline:
  - step: read_input
    tool: read_file
    args:
      path: "{{file_path}}"
    output: raw_data

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
    output: done

permissions:
  filesystem:
    read: ["data/**", "libs/**"]
    write: ["output/**"]
  subprocess:
    max_concurrent: 1
    allowed_commands: ["python3"]`}</pre>
        </div>

        <div className="home-card">
          <h3 className="home-card-title">
            <Cpu size={20} className="home-text-accent" />
            LLM 配置自动继承
          </h3>
          <div className="home-table-wrap">
            <table className="home-table">
              <thead><tr><th>优先级</th><th>读取位置</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><span className="home-tag home-tag-red">1 最高</span></td><td><code>args.model</code></td><td>覆盖默认值</td></tr>
                <tr><td><span className="home-tag home-tag-yellow">2 默认</span></td><td><code>shared_context.llm_config</code></td><td>MainAgent 启动时注入</td></tr>
                <tr><td><span className="home-tag home-tag-gray">3 兜底</span></td><td>环境变量</td><td><code>LLM_MODEL</code> / <code>OPENROUTER_API_KEY</code></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ======== API ======== */}
      <section className="home-section" id="api">
        <h2 className="home-section-title">Market REST API</h2>
        <div className="home-card">
          <h3 className="home-card-title">
            <Server size={20} className="home-text-accent" />
            端点概览
          </h3>
          <div className="home-table-wrap">
            <table className="home-table">
              <thead><tr><th>方法</th><th>路径</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><span className="home-method-get">GET</span></td><td className="home-endpoint">/api/v1/agents</td><td>搜索/列表 Agent</td></tr>
                <tr><td><span className="home-method-post">POST</span></td><td className="home-endpoint">/api/v1/agents</td><td>注册/上传 Agent 包</td></tr>
                <tr><td><span className="home-method-get">GET</span></td><td className="home-endpoint">/api/v1/agents/{'{id}'}/download</td><td>下载包文件</td></tr>
                <tr><td><span className="home-method-post">POST</span></td><td className="home-endpoint">/api/v1/agents/{'{id}'}/ratings</td><td>评分</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ======== Roadmap ======== */}
      <section className="home-section" id="roadmap">
        <h2 className="home-section-title">未来判断 — Agent 是 AI 能力的原子载体</h2>
        <div className="home-card">
          <p className="home-card-sub">
            Agent 将成为 AI 时代最基础的能力封装单位。就像函数是代码的原子、容器是部署的原子 — <strong>Agent 是 AI 的原子</strong>。
          </p>
          <div className="home-steps">
            <div className="home-step">
              <div className="home-step-num">1</div>
              <div className="home-step-body"><strong>Function 时代</strong> — 一个函数解决一个计算问题。AI 调用函数，但函数不理解 AI。</div>
            </div>
            <div className="home-step">
              <div className="home-step-num">2</div>
              <div className="home-step-body"><strong>Skill 时代</strong> — 一个 Skill 解决一个领域任务。上下文膨胀，仍是被动片段。</div>
            </div>
            <div className="home-step">
              <div className="home-step-num">3</div>
              <div className="home-step-body">
                <strong>Agent 时代 ← 我们在这一步</strong> — Agent 拥有完整世界：工具、状态、配置、权限、记忆。
              </div>
            </div>
            <div className="home-step">
              <div className="home-step-num">4</div>
              <div className="home-step-body"><strong>Agent 协作网络</strong> — Agent 发现 Agent、编排 Agent、交易 Agent。市场成为 Agent 的 App Store。</div>
            </div>
            <div className="home-step">
              <div className="home-step-num">5</div>
              <div className="home-step-body"><strong>数字组织</strong> — 成百上千个 Agent 组成自组织系统，像细胞形成生命体。</div>
            </div>
          </div>
        </div>
      </section>

      {/* ======== CTA Section ======== */}
      <section className="home-section" style={{ textAlign: 'center', padding: '80px 40px' }}>
        <div style={{
          background: 'rgba(20,22,36,0.6)',
          border: '1px solid rgba(129,140,248,0.15)',
          borderRadius: 24,
          padding: '60px 40px',
          backdropFilter: 'blur(16px)',
        }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
            fontWeight: 800,
            color: '#e2e8f0',
            marginBottom: 16,
            letterSpacing: '-0.02em',
          }}>
            准备好构建你的 Agent 了吗？
          </h2>
          <p style={{ color: '#a0a0b8', fontSize: 16, marginBottom: 32, lineHeight: 1.8 }}>
            加入 Agent Hub 生态，让 AI Agent 成为你的超能力
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="home-btn home-btn-primary" onClick={() => navigate('/quick-start')}>
              <Zap size={16} /> 立即开始
              <ArrowRight size={16} />
            </button>
            <a
              className="home-btn home-btn-outline"
              href="https://github.com/openpeng/agent-hub"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <GhIcon size={16} /> 查看 GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ======== Footer ======== */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-left">
            <strong>Agent Hub</strong>
            <span className="home-footer-divider">·</span>
            <span>跨平台 AI Agent 互操作系统</span>
          </div>
          <div className="home-footer-right">
            <span>Phase 8 完成 · MIT License</span>
            <span className="home-footer-divider">·</span>
            <span>维护者: Peng Xiao</span>
            <span className="home-footer-divider">·</span>
            <a href="https://github.com/openpeng/agent-hub" target="_blank" rel="noopener noreferrer">
              <GhIcon size={14} /> GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// StatItem component with count-up animation
function StatItem({ end, suffix, label, icon }: { end: number; suffix: string; label: string; icon: React.ReactNode }) {
  const { count, ref } = useCountUp(end, 2000);
  return (
    <div className="home-stat-item" ref={ref}>
      <div style={{ color: '#818cf8', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
        {icon}
      </div>
      <div className="home-stat-number">
        {count}{suffix}
      </div>
      <div className="home-stat-label">{label}</div>
    </div>
  );
}
