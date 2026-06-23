(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- Chart: User Flow ---
  var chartFlow = echarts.init(document.getElementById('chart-user-flow'), null, { renderer: 'svg' });
  chartFlow.setOption({
    animation: false,
    tooltip: { trigger: 'item', appendToBody: true },
    series: [{
      type: 'sankey',
      layout: 'none',
      emphasis: { focus: 'adjacency' },
      data: [
        { name: '进入构建页面' },
        { name: '填写Agent介绍' },
        { name: '选择Skills' },
        { name: '选择MCP工具' },
        { name: '配置完成' },
        { name: '预览测试' },
        { name: '发布到市场' },
        { name: '放弃离开' }
      ],
      links: [
        { source: '进入构建页面', target: '填写Agent介绍', value: 100 },
        { source: '填写Agent介绍', target: '选择Skills', value: 85 },
        { source: '选择Skills', target: '选择MCP工具', value: 80 },
        { source: '选择MCP工具', target: '配置完成', value: 75 },
        { source: '配置完成', target: '预览测试', value: 70 },
        { source: '预览测试', target: '发布到市场', value: 65 },
        { source: '填写Agent介绍', target: '放弃离开', value: 15 },
        { source: '选择Skills', target: '放弃离开', value: 5 },
        { source: '选择MCP工具', target: '放弃离开', value: 5 },
        { source: '预览测试', target: '放弃离开', value: 5 }
      ],
      lineStyle: { color: 'source', curveness: 0.5 },
      itemStyle: { color: accent, borderColor: rule },
      label: { color: ink, fontSize: 13 }
    }]
  });
  window.addEventListener('resize', function() { chartFlow.resize(); });

  // --- Chart: Feature Priority ---
  var chartPriority = echarts.init(document.getElementById('chart-feature-priority'), null, { renderer: 'svg' });
  chartPriority.setOption({
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', max: 100, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule } } },
    yAxis: { type: 'category', data: ['市场同步', '预览测试', 'MCP工具选择', 'Skill选择', 'Agent介绍配置'], axisLabel: { color: ink }, axisLine: { lineStyle: { color: rule } } },
    series: [{
      type: 'bar',
      data: [
        { value: 90, itemStyle: { color: accent } },
        { value: 85, itemStyle: { color: accent } },
        { value: 95, itemStyle: { color: accent2 } },
        { value: 95, itemStyle: { color: accent2 } },
        { value: 100, itemStyle: { color: accent } }
      ],
      barWidth: '60%',
      label: { show: true, position: 'right', color: ink, formatter: '{c}%' }
    }]
  });
  window.addEventListener('resize', function() { chartPriority.resize(); });

  // --- Chart: Tech Stack ---
  var chartTech = echarts.init(document.getElementById('chart-tech-stack'), null, { renderer: 'svg' });
  chartTech.setOption({
    animation: false,
    tooltip: { trigger: 'item', appendToBody: true },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: bg2, borderWidth: 2 },
      label: { show: true, color: ink },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
      data: [
        { value: 30, name: '前端框架 (React/Vue)', itemStyle: { color: accent } },
        { value: 20, name: '状态管理', itemStyle: { color: accent2 } },
        { value: 15, name: 'UI组件库', itemStyle: { color: muted } },
        { value: 20, name: '可视化引擎', itemStyle: { color: accent + 'cc' } },
        { value: 15, name: 'API集成', itemStyle: { color: accent2 + 'cc' } }
      ]
    }]
  });
  window.addEventListener('resize', function() { chartTech.resize(); });
})();
