import React, { useState } from 'react';
import { Card, Upload, Button, Input, Space, message } from 'antd';
import { InboxOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import { ZfPageHeader, ZfGrid } from '@zifeng/ui/components';
import { importAdminSources, importFromUrl } from '../../utils/adminApi';
import { CARD, LIFT_CLASS, MONO } from '../../utils/ui';

const { TextArea } = Input;
const { Dragger } = Upload;

/**
 * 书源导入。
 * 原先是三张「48px 居中大彩色图标 + 大标题 + 说明」的卡，读起来像营销落地页，
 * 而同一后台其他页面都是紧凑的工具型表单 —— 这里收成统一的表单卡：
 * 图标进标题、说明降为 caption、控件占满剩余宽度。业务逻辑与提示文案未改。
 */
const SourceImport = () => {
  const [url, setUrl] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImportFromUrl = async () => {
    if (!url.trim()) { message.warning('请输入URL'); return; }
    setImporting(true);
    try {
      const res = await importFromUrl(url.trim());
      const data = res.data || {};
      if (data.success === false) {
        message.error(`导入失败：${data.message || '未知错误'}`);
        return;
      }
      // 兼容 sources 和 data 两种字段名
      const sources = data.sources || data.data || [];
      const count = data.count ?? sources.length ?? 0;

      if (count > 0 && sources.length > 0) {
        try {
          const res2 = await importAdminSources(sources);
          const importedCount = res2.data?.data?.length ?? res2.data?.count ?? sources.length;
          message.success(`成功导入 ${importedCount} 个书源`);
          setUrl('');
        } catch {
          message.error(`书源获取成功（${count}个），但写入数据库失败`);
        }
      } else {
        message.warning({
          content: 'URL返回的书源数据为空，可能原因：1) URL内容格式不兼容 2) 书源缺少必要字段(bookSourceUrl/bookSourceName)',
          duration: 6,
        });
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || '网络请求失败';
      message.error(`从URL导入失败：${errMsg}`);
    } finally {
      setImporting(false);
    }
  };

  const handleImportFromJson = async () => {
    if (!jsonText.trim()) { message.warning('请输入JSON内容'); return; }
    setImporting(true);
    try {
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        message.error('JSON格式不正确');
        setImporting(false);
        return;
      }
      const sources = Array.isArray(parsed) ? parsed : [parsed];
      const res = await importAdminSources(sources);
      const count = res.data?.data?.length || sources.length;
      message.success(`导入成功，共 ${count} 个书源`);
      setJsonText('');
    } catch {
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setJsonText(e.target.result);
        message.success('文件已读取，点击导入按钮确认导入');
      } catch {
        message.error('文件读取失败');
      }
    };
    reader.onerror = () => message.error('文件读取失败');
    reader.readAsText(file);
    return false;
  };

  const cardProps = (icon, title, hint) => ({
    ...CARD,
    className: `${CARD.className} ${LIFT_CLASS}`,
    title: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--zf-s2)', fontSize: 'var(--zf-fs-base)' }}>
        <span aria-hidden="true" style={{ color: 'var(--zf-brand-500)', display: 'inline-flex' }}>{icon}</span>
        {title}
      </span>
    ),
    extra: (
      <span className="zf-caption" style={{ fontWeight: 'var(--zf-fw-normal)' }}>{hint}</span>
    ),
  });

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
      <ZfPageHeader title="书源导入" subtitle="支持 URL 抓取、JSON 粘贴与本地文件三种来源" />

      <ZfGrid min={300} gap="var(--zf-s4)" style={{ marginTop: 'var(--zf-s2)' }}>
        <Card {...cardProps(<LinkOutlined />, '从 URL 导入', '拉取远端书源 JSON')}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="https://example.com/booksource.json"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPressEnter={handleImportFromUrl}
              style={MONO}
            />
            <Button type="primary" loading={importing} onClick={handleImportFromUrl}>
              导入
            </Button>
          </Space.Compact>
        </Card>

        <Card {...cardProps(<FileTextOutlined />, '从 JSON 导入', '粘贴书源数组或单个对象')}>
          <TextArea
            rows={4}
            placeholder="粘贴JSON内容"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            style={{ ...MONO, fontSize: 'var(--zf-fs-xs)' }}
          />
          <Button
            type="primary"
            loading={importing}
            onClick={handleImportFromJson}
            style={{ marginTop: 'var(--zf-s3)', width: '100%' }}
          >
            确认导入
          </Button>
        </Card>

        <Card {...cardProps(<InboxOutlined />, '上传文件', '.json / .txt，读取后仍需确认')}>
          <Dragger
            accept=".json,.txt"
            showUploadList={false}
            beforeUpload={handleFileUpload}
            multiple={false}
            style={{ borderRadius: 'var(--zf-r-md)' }}
          >
            <p style={{ fontSize: 'var(--zf-fs-xl)', color: 'var(--zf-brand-500)', marginBottom: 'var(--zf-s1)' }}>
              <InboxOutlined />
            </p>
            <p style={{ fontSize: 'var(--zf-fs-sm)', color: 'var(--zf-text-secondary)' }}>点击或拖拽文件到此处</p>
          </Dragger>
        </Card>
      </ZfGrid>
    </div>
  );
};

export default SourceImport;
