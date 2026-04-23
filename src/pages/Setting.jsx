import React, { useState, useEffect, useContext } from 'react';
import { Card, Row, Col, Typography, Space, Switch, Slider, Select, TimePicker, List, Divider } from 'antd';
import {
  BgColorsOutlined,
  MoonOutlined,
  SunOutlined,
  CheckCircleFilled,
  FontSizeOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  RightOutlined
} from '@ant-design/icons';
import { ThemeContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { getBookSources } from '../utils/bookSourceManager';

const { Title, Text } = Typography;

// 生成时间选项 (00:00 - 23:30, 每30分钟一个)
const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      options.push({ value, label: value });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

// 检查当前时间是否在夜间模式时间范围内
const checkAutoNightMode = (setIsDarkMode) => {
  const saved = localStorage.getItem('zifeng_auto_night_mode');
  if (!saved) return;
  const config = JSON.parse(saved);
  if (!config.enabled) return;

  const manualOverride = localStorage.getItem('zifeng_manual_dark_override');
  if (manualOverride === 'true') return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = config.startTime.split(':').map(Number);
  const [endH, endM] = config.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  let shouldBeDark;
  if (startMinutes > endMinutes) {
    shouldBeDark = currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    shouldBeDark = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  setIsDarkMode(shouldBeDark);
  localStorage.setItem('zifeng_dark_mode', String(shouldBeDark));
};

const Setting = () => {
  const { currentTheme, setCurrentTheme, isDarkMode, setIsDarkMode, themeConfigs, globalFontSize, handleGlobalFontSizeChange, glassMode, handleGlassModeToggle } = useContext(ThemeContext);
  const navigate = useNavigate();
  const sourceCount = getBookSources().length;

  const handleManualDarkToggle = (checked) => {
    setIsDarkMode(checked);
    localStorage.setItem('zifeng_dark_mode', String(checked));
    localStorage.setItem('zifeng_manual_dark_override', 'true');
  };

  // 夜间模式自动切换状态
  const [autoNightEnabled, setAutoNightEnabled] = useState(() => {
    const saved = localStorage.getItem('zifeng_auto_night_mode');
    if (saved) {
      const config = JSON.parse(saved);
      return config.enabled || false;
    }
    return false;
  });

  const [nightStartTime, setNightStartTime] = useState(() => {
    const saved = localStorage.getItem('zifeng_auto_night_mode');
    if (saved) {
      const config = JSON.parse(saved);
      return config.startTime || '20:00';
    }
    return '20:00';
  });

  const [nightEndTime, setNightEndTime] = useState(() => {
    const saved = localStorage.getItem('zifeng_auto_night_mode');
    if (saved) {
      const config = JSON.parse(saved);
      return config.endTime || '07:00';
    }
    return '07:00';
  });

  // 主题选项
  const themeOptions = [
    { key: 'default', name: '经典蓝', color: '#1890ff' },
    { key: 'green', name: '清新绿', color: '#52c41a' },
    { key: 'purple', name: '优雅紫', color: '#722ed1' },
    { key: 'orange', name: '活力橙', color: '#fa8c16' },
    { key: 'red', name: '热情红', color: '#f5222d' },
  ];

  // 夜间模式自动切换开关
  const handleAutoNightToggle = (checked) => {
    setAutoNightEnabled(checked);
    const config = {
      enabled: checked,
      startTime: nightStartTime,
      endTime: nightEndTime
    };
    localStorage.setItem('zifeng_auto_night_mode', JSON.stringify(config));
    if (checked) {
      localStorage.removeItem('zifeng_manual_dark_override');
      checkAutoNightMode(setIsDarkMode);
    }
  };

  // 夜间模式时间范围变更
  const handleNightTimeChange = (type, value) => {
    let newStart = nightStartTime;
    let newEnd = nightEndTime;

    if (type === 'start') {
      newStart = value;
      setNightStartTime(value);
    } else {
      newEnd = value;
      setNightEndTime(value);
    }

    const config = {
      enabled: autoNightEnabled,
      startTime: newStart,
      endTime: newEnd
    };
    localStorage.setItem('zifeng_auto_night_mode', JSON.stringify(config));

    if (autoNightEnabled) {
      checkAutoNightMode(setIsDarkMode);
    }
  };

  // 页面加载时检查自动夜间模式，并启动定时器
  useEffect(() => {
    // 初始检查
    checkAutoNightMode(setIsDarkMode);

    // 每分钟检查一次
    const timer = setInterval(() => {
      checkAutoNightMode(setIsDarkMode);
    }, 60000);

    return () => clearInterval(timer);
  }, [setIsDarkMode]);

  // 阅读设置列表
  const readingSettings = [
    {
      title: '字体大小',
      icon: <FontSizeOutlined />,
      description: '调整网站全局字体大小',
      content: (
        <div style={{ width: 200 }}>
          <Slider
            min={12}
            max={24}
            step={1}
            value={globalFontSize}
            onChange={handleGlobalFontSizeChange}
            marks={{ 12: '12', 14: '14', 18: '18', 24: '24' }}
            tooltip={{ formatter: (val) => `${val}px` }}
          />
        </div>
      )
    },
    {
      title: '夜间模式',
      icon: <MoonOutlined />,
      description: '自动在设定时间段切换夜间模式',
      content: (
        <Space direction="vertical" size="small" align="end">
          <Switch
            size="small"
            checked={autoNightEnabled}
            onChange={handleAutoNightToggle}
          />
          {autoNightEnabled && (
            <Space size="small" style={{ marginTop: 4 }}>
              <ClockCircleOutlined style={{ color: themeConfigs[currentTheme].primaryColor }} />
              <Select
                size="small"
                value={nightStartTime}
                onChange={(val) => handleNightTimeChange('start', val)}
                options={timeOptions}
                style={{ width: 90 }}
              />
              <Text type="secondary">至</Text>
              <Select
                size="small"
                value={nightEndTime}
                onChange={(val) => handleNightTimeChange('end', val)}
                options={timeOptions}
                style={{ width: 90 }}
              />
            </Space>
          )}
        </Space>
      )
    },
  ];

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <Row gutter={[24, 24]}>
        {/* 主题设置 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BgColorsOutlined style={{ color: themeConfigs[currentTheme].primaryColor }} />
                <Title level={5} style={{ margin: 0 }}>主题配色</Title>
              </Space>
            }
            style={{
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Text type="secondary">选择您喜欢的主题颜色</Text>
              <Row gutter={[16, 16]}>
                {themeOptions.map((theme) => (
                  <Col span={8} key={theme.key}>
                    <Card
                      hoverable
                      onClick={() => setCurrentTheme(theme.key)}
                      style={{
                        borderRadius: 12,
                        border: currentTheme === theme.key ? `2px solid ${theme.color}` : `1px solid ${isDarkMode ? '#333' : '#e8e8e8'}`,
                        backgroundColor: currentTheme === theme.key
                          ? (isDarkMode ? `${theme.color}20` : `${theme.color}10`)
                          : (isDarkMode ? '#1f1f1f' : 'transparent'),
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      bodyStyle={{ padding: 16, textAlign: 'center' }}
                    >
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: theme.color,
                          margin: '0 auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: currentTheme === theme.key ? `0 4px 12px ${theme.color}50` : 'none',
                          transition: 'box-shadow 0.3s ease'
                        }}>
                          {currentTheme === theme.key && <CheckCircleFilled style={{ color: '#fff', fontSize: 20 }} />}
                        </div>
                        <Text strong style={{ color: currentTheme === theme.key ? theme.color : (isDarkMode ? '#ccc' : 'inherit') }}>
                          {theme.name}
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Space>
          </Card>
        </Col>

        {/* 深色模式设置 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                {isDarkMode ? <MoonOutlined style={{ color: themeConfigs[currentTheme].primaryColor }} /> : <SunOutlined style={{ color: themeConfigs[currentTheme].primaryColor }} />}
                <Title level={5} style={{ margin: 0 }}>显示模式</Title>
              </Space>
            }
            style={{
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Text type="secondary">切换浅色或深色模式</Text>
              <Card
                style={{
                  borderRadius: 12,
                  backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
                  border: `2px solid ${themeConfigs[currentTheme].primaryColor}`,
                  boxShadow: `0 4px 16px ${themeConfigs[currentTheme].primaryColor}15`
                }}
                bodyStyle={{ padding: 24 }}
              >
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space direction="vertical" size="small">
                      <Text strong style={{ fontSize: 16, color: isDarkMode ? '#e0e0e0' : '#333' }}>
                        {isDarkMode ? '深色模式' : '浅色模式'}
                      </Text>
                      <Text style={{ color: isDarkMode ? '#999' : '#666' }}>
                        {isDarkMode ? '适合夜间阅读，减少眼睛疲劳' : '适合日间阅读，清晰明亮'}
                      </Text>
                    </Space>
                  </Col>
                  <Col>
                    <Switch
                      checkedChildren={<MoonOutlined />}
                      unCheckedChildren={<SunOutlined />}
                      checked={isDarkMode}
                      onChange={(checked) => {
                        setIsDarkMode(checked);
                        localStorage.setItem('zifeng_dark_mode', String(checked));
                        localStorage.setItem('zifeng_manual_dark_override', 'true');
                      }}
                      size="large"
                    />
                  </Col>
                </Row>
              </Card>
              <Card
                style={{
                  borderRadius: 12,
                  backgroundColor: glassMode
                    ? (isDarkMode ? 'rgba(30,30,30,0.6)' : 'rgba(240,240,240,0.6)')
                    : (isDarkMode ? '#1a1a1a' : '#f5f5f5'),
                  backdropFilter: glassMode ? 'blur(16px) saturate(1.2)' : 'none',
                  WebkitBackdropFilter: glassMode ? 'blur(16px) saturate(1.2)' : 'none',
                  border: glassMode
                    ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`
                    : `2px solid ${themeConfigs[currentTheme].primaryColor}40`,
                  boxShadow: glassMode
                    ? `0 4px 16px ${isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'}`
                    : 'none',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                bodyStyle={{ padding: 24 }}
              >
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space direction="vertical" size="small">
                      <Text strong style={{ fontSize: 16, color: isDarkMode ? '#e0e0e0' : '#333' }}>
                        毛玻璃风格
                      </Text>
                      <Text style={{ color: isDarkMode ? '#999' : '#666' }}>
                        开启后组件呈现透明磨砂质感
                      </Text>
                    </Space>
                  </Col>
                  <Col>
                    <Switch
                      checked={glassMode}
                      onChange={(checked) => handleGlassModeToggle(checked)}
                      size="large"
                    />
                  </Col>
                </Row>
              </Card>
            </Space>
          </Card>
        </Col>

        {/* 书源管理 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <CloudOutlined style={{ color: themeConfigs[currentTheme].primaryColor }} />
                <Title level={5} style={{ margin: 0 }}>书源管理</Title>
              </Space>
            }
            style={{
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/booksource')}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <Space direction="vertical" size="small">
                  <Text strong>管理书源</Text>
                  <Text type="secondary">当前已导入 {sourceCount} 个书源，点击管理导入的书源</Text>
                </Space>
              </Col>
              <Col>
                <RightOutlined style={{ color: themeConfigs[currentTheme].primaryColor, fontSize: 16 }} />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 阅读设置 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <EyeOutlined style={{ color: themeConfigs[currentTheme].primaryColor }} />
                <Title level={5} style={{ margin: 0 }}>阅读设置</Title>
              </Space>
            }
            style={{
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}
          >
            <List
              itemLayout="horizontal"
              dataSource={readingSettings}
              renderItem={(item) => (
                <List.Item
                  actions={[item.content]}
                  style={{ padding: '16px 0' }}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: `${themeConfigs[currentTheme].primaryColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: themeConfigs[currentTheme].primaryColor
                      }}>
                        {item.icon}
                      </div>
                    }
                    title={<Text strong>{item.title}</Text>}
                    description={<Text type="secondary">{item.description}</Text>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 关于我们 */}
        <Col xs={24}>
          <Card
            style={{
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              textAlign: 'center'
            }}
          >
            <Space direction="vertical" size="small">
              <Text type="secondary">紫枫免费小说 v1.0.0</Text>
              <Text type="secondary">为您提供优质的小说阅读体验</Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Setting;
