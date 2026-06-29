/* ============================================================
   紫枫免费小说 · 主题配置
   ============================================================ */

export const themeConfigs = {
  purple: {
    primaryColor: '#8B5CF6',
    colors: ['#722ed1', '#9254de', '#b37feb', '#d3adf7', '#efdbff'],
    name: '优雅紫'
  },
  green: {
    primaryColor: '#52c41a',
    colors: ['#52c41a', '#73d13d', '#95de64', '#b7eb8f', '#d9f7be'],
    name: '清新绿'
  },
  orange: {
    primaryColor: '#fa8c16',
    colors: ['#fa8c16', '#ffa940', '#ffc069', '#ffd591', '#ffe7ba'],
    name: '活力橙'
  },
  red: {
    primaryColor: '#f5222d',
    colors: ['#f5222d', '#ff4d4f', '#ff7875', '#ffa39e', '#ffccc7'],
    name: '热情红'
  },
  default: {
    primaryColor: '#1890ff',
    colors: ['#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff'],
    name: '经典蓝'
  }
};

export const rankUrls = {
  mustRead: '/module/rank?type=1&channel=1&page=1',
  potential: '/module/rank?type=5&channel=1&page=1',
  completed: '/module/rank?type=2&channel=1&page=1',
  updated: '/module/rank?type=3&channel=1&page=1',
  search: '/module/rank?type=4&channel=1&page=1',
  comment: '/module/rank?type=6&channel=1&page=1'
};

export const parseHeaders = (headerStr) => {
  try {
    return headerStr ? JSON.parse(headerStr) : {};
  } catch {
    return {};
  }
};
