import React, { useState, useContext } from 'react';
import { Card, Upload, Button, Input, message, Space, Divider, Alert } from 'antd';
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

      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card title={<Space><LinkOutlined />从URL导入</Space>} style={cardStyle}>
          <Space.Compact style={{ width: '100%' }}>
            <Input placeholder="输入书源JSON文件URL" value={url} onChange={(e) => setUrl(e.target.value)} onPressEnter={handleImportFromUrl} size="large" />
            <Button type="primary" size="large" loading={importing} onClick={handleImportFromUrl}>导入</Button>
          </Space.Compact>
        </Card>

        <Card title={<Space><FileTextOutlined />从JSON导入</Space>} style={cardStyle}>
          <Alert message="粘贴书源JSON内容，或通过下方上传文件按钮读取" type="info" showIcon style={{ marginBottom: 16 }} />
          <TextArea rows={8} placeholder='粘贴书源JSON内容（数组或单个对象）' value={jsonText} onChange={(e) => setJsonText(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" loading={importing} onClick={handleImportFromJson}>确认导入</Button>
          </div>
        </Card>

        <Card title="上传文件" style={cardStyle}>
          <Dragger accept=".json,.txt" showUploadList={false} beforeUpload={handleFileUpload} multiple={false}>
            <p style={{ fontSize: 48, color: '#1890ff', marginBottom: 8 }}><InboxOutlined /></p>
            <p style={{ fontSize: 16, fontWeight: 500 }}>点击或拖拽文件到此区域</p>
            <p style={{ color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>支持 .json / .txt 格式的书源文件</p>
          </Dragger>
        </Card>
      </Space>
    </div>
  );
};

export default SourceImport;
