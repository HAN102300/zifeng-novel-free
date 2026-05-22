import React, { useState, useContext } from 'react';
import { Card, Upload, Button, Input, message, Space, Row, Col } from 'antd';
import { InboxOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import { importAdminSources, importFromUrl } from '../../utils/adminApi';
import { ThemeContext } from '../../App';

const { TextArea } = Input;
const { Dragger } = Upload;

const SourceImport = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [url, setUrl] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImportFromUrl = async () => {
    if (!url.trim()) { message.warning('请输入URL'); return; }
    setImporting(true);
    try {
      const res = await importFromUrl(url.trim());
      const count = res.data?.data?.length || 0;
      message.success(`从URL导入成功，共 ${count} 个书源`);
      setUrl('');
    } catch { message.error('从URL导入失败'); }
    finally { setImporting(false); }
  };

  const handleImportFromJson = async () => {
    if (!jsonText.trim()) { message.warning('请输入JSON内容'); return; }
    setImporting(true);
    try {
      let parsed;
      try { parsed = JSON.parse(jsonText); } catch { message.error('JSON格式不正确'); setImporting(false); return; }
      const sources = Array.isArray(parsed) ? parsed : [parsed];
      const res = await importAdminSources(sources);
      const count = res.data?.data?.length || sources.length;
      message.success(`导入成功，共 ${count} 个书源`);
      setJsonText('');
    } catch { message.error('导入失败'); }
    finally { setImporting(false); }
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        setJsonText(text);
        message.success('文件已读取，点击导入按钮确认导入');
      } catch { message.error('文件读取失败'); }
    };
    reader.readAsText(file);
    return false;
  };

  const cardStyle = {
    borderRadius: 12,
    border: 'none',
    boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
  };

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>书源导入</h2>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={24} md={8}>
          <Card style={{ ...cardStyle, textAlign: 'center', height: '100%' }}>
            <div style={{ fontSize: 48, color: '#1890ff', marginBottom: 12 }}><LinkOutlined /></div>
            <h3 style={{ margin: '0 0 8px' }}>从URL导入</h3>
            <p style={{ color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginBottom: 16 }}>输入书源JSON文件URL地址</p>
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="输入URL" value={url} onChange={(e) => setUrl(e.target.value)} onPressEnter={handleImportFromUrl} />
              <Button type="primary" loading={importing} onClick={handleImportFromUrl}>导入</Button>
            </Space.Compact>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card style={{ ...cardStyle, textAlign: 'center', height: '100%' }}>
            <div style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }}><FileTextOutlined /></div>
            <h3 style={{ margin: '0 0 8px' }}>从JSON导入</h3>
            <p style={{ color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginBottom: 16 }}>粘贴书源JSON内容</p>
            <TextArea rows={4} placeholder='粘贴JSON内容' value={jsonText} onChange={(e) => setJsonText(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
            <Button type="primary" loading={importing} onClick={handleImportFromJson} style={{ marginTop: 12, width: '100%' }}>确认导入</Button>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card style={{ ...cardStyle, textAlign: 'center', height: '100%' }}>
            <div style={{ fontSize: 48, color: '#faad14', marginBottom: 12 }}><InboxOutlined /></div>
            <h3 style={{ margin: '0 0 8px' }}>上传文件</h3>
            <p style={{ color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginBottom: 16 }}>拖拽或点击上传书源文件</p>
            <Dragger accept=".json,.txt" showUploadList={false} beforeUpload={handleFileUpload} multiple={false} style={{ borderRadius: 8 }}>
              <p style={{ fontSize: 24, color: '#faad14', marginBottom: 4 }}><InboxOutlined /></p>
              <p style={{ fontSize: 13 }}>点击或拖拽文件</p>
            </Dragger>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SourceImport;
