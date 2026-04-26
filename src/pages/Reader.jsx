import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Spin, Select, Divider, Slider, Modal, message, Tooltip } from 'antd';
import { 
  ArrowLeftOutlined, ArrowRightOutlined, 
  ArrowUpOutlined, ArrowDownOutlined, SettingOutlined,
  FontSizeOutlined, ColumnWidthOutlined, LineHeightOutlined,
  BgColorsOutlined, BoldOutlined
} from '@ant-design/icons';
import BackButton from '../components/BackButton';
import { ThemeContext, AuthContext } from '../App';
import { saveReadingProgress } from '../utils/storage';
import { getTocAPI, getContentAPI } from '../utils/apiClient';
import { getBookSources, getDefaultSource as getDefaultSourceFromManager } from '../utils/bookSourceManager';
import { loadReaderCache, simpleHash, isDefaultSource } from '../utils/novelConfig';

const cache = {
  chapters: new Map(),
  content: new Map(),
  expireTime: 24 * 60 * 60 * 1000,
  isExpired: (timestamp) => Date.now() - timestamp > cache.expireTime,
  setChapters: (key, chapters) => { cache.chapters.set(key, { data: chapters, timestamp: Date.now() }); },
  getChapters: (key) => {
    const cached = cache.chapters.get(key);
    if (cached && !cache.isExpired(cached.timestamp)) return cached.data;
    cache.chapters.delete(key);
    return null;
  },
  setContent: (chapterUrl, content) => { cache.content.set(chapterUrl, { data: content, timestamp: Date.now() }); },
  getContent: (chapterUrl) => {
    const cached = cache.content.get(chapterUrl);
    if (cached && !cache.isExpired(cached.timestamp)) return cached.data;
    cache.content.delete(chapterUrl);
    return null;
  }
};

const bgPresets = [
  { name: '默认白', color: '#ffffff', textColor: '#333333' },
  { name: '护眼绿', color: '#c7edcc', textColor: '#333333' },
  { name: '护眼黄', color: '#f5f5dc', textColor: '#333333' },
  { name: '淡灰', color: '#e8e8e8', textColor: '#333333' },
  { name: '暗夜', color: '#1a1a2e', textColor: '#e0e0e0' },
  { name: '深黑', color: '#0d0d0d', textColor: '#cccccc' },
  { name: '羊皮纸', color: '#f1e7d0', textColor: '#5b4636' },
  { name: '淡蓝', color: '#d6eaf8', textColor: '#2c3e50' },
];

const Reader = () => {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentTheme, themeConfigs } = useContext(ThemeContext);
  const { isLoggedIn, userInfo } = useContext(AuthContext);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [sourceUrl, setSourceUrl] = useState('');
  const [bookUrl, setBookUrl] = useState('');
  const [tocUrl, setTocUrl] = useState('');
  const [bookData, setBookData] = useState(null);
  const pageRef = useRef(null);
  const pendingColorRef = useRef({ textColor: '', bgColor: '' });
  const isSwitchingChapterRef = useRef(false);

  const [readerSettings, setReaderSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('reader_settings');
      return saved ? JSON.parse(saved) : {
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 2,
        paragraphSpacing: 16,
        indent: 2,
        letterSpacing: 0,
        bgColor: '#ffffff',
        textColor: '#333333',
        bgImage: ''
      };
    } catch {
      return {
        fontSize: 16, fontWeight: 400, lineHeight: 2, paragraphSpacing: 16,
        indent: 2, letterSpacing: 0, bgColor: '#ffffff', textColor: '#333333', bgImage: ''
      };
    }
  });

  const color = themeConfigs[currentTheme].colors[0];

  useEffect(() => {
    const urlSource = searchParams.get('sourceUrl') || '';
    const urlBookUrl = searchParams.get('bookUrl') || '';
    const urlTocUrl = searchParams.get('tocUrl') || '';
    const chapterIdx = parseInt(searchParams.get('chapterIndex') || '0', 10);
    setSourceUrl(urlSource);
    setBookUrl(urlBookUrl);
    setTocUrl(urlTocUrl);
    setCurrentChapterIndex(chapterIdx);

    const readerCache = loadReaderCache(urlSource, urlBookUrl);
    if (readerCache) {
      setBookData(readerCache.bookData);
      if (readerCache.chapters && readerCache.chapters.length > 0) {
        const cacheKey = simpleHash(urlSource + '_' + urlBookUrl);
        cache.setChapters(cacheKey, readerCache.chapters);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      localStorage.setItem('reader_settings', JSON.stringify(readerSettings));
    } catch (e) { console.warn('Failed to save reader settings:', e); }
  }, [readerSettings]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButtons(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const scrollToBottom = () => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); };

  const getSource = useCallback(() => {
    if (sourceUrl && isDefaultSource(sourceUrl)) {
      return getDefaultSourceFromManager();
    }
    if (sourceUrl) {
      const allSources = getBookSources();
      const found = allSources.find(s => s.bookSourceUrl === sourceUrl);
      if (found) return found;
    }
    return getDefaultSourceFromManager();
  }, [sourceUrl]);

  useEffect(() => {
    const fetchChapters = async () => {
      if (!sourceUrl && !bookUrl) return;
      if (isSwitchingChapterRef.current) {
        isSwitchingChapterRef.current = false;
        return;
      }
      setLoading(true);
      try {
        const cacheKey = simpleHash(sourceUrl + '_' + bookUrl);
        const cachedChapters = cache.getChapters(cacheKey);
        if (cachedChapters) {
          const chapterList = cachedChapters.map((ch, i) => ({
            ...ch,
            index: i,
            chapterName: ch.chapterName || ch.name || ch.title || `第${i + 1}章`,
            chapterUrl: ch.chapterUrl || ch.url || ch.path || '',
          }));
          setChapters(chapterList);
          const idx = Math.min(currentChapterIndex, chapterList.length - 1);
          setCurrentChapterIndex(idx);
          setCurrentChapter(chapterList[idx]);
          await fetchChapterContent(chapterList[idx]);
        } else {
          const source = getSource();
          const effectiveTocUrl = tocUrl || bookUrl;
          const result = await getTocAPI(source, effectiveTocUrl, bookData);

          if (result.success && result.chapters && result.chapters.length > 0) {
            const chapterList = result.chapters.map((ch, i) => ({
              ...ch,
              index: i,
              chapterName: ch.name || ch.chapterName || ch.title || `第${i + 1}章`,
              chapterUrl: ch.url || ch.chapterUrl || ch.path || '',
            }));
            cache.setChapters(cacheKey, chapterList);
            setChapters(chapterList);
            const idx = Math.min(currentChapterIndex, chapterList.length - 1);
            setCurrentChapterIndex(idx);
            setCurrentChapter(chapterList[idx]);
            await fetchChapterContent(chapterList[idx]);
          } else {
            setError('获取章节列表失败');
          }
        }
      } catch (err) {
        console.error('获取章节列表失败:', err);
        setError('获取章节列表失败');
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [sourceUrl, bookUrl, tocUrl, currentChapterIndex, getSource, bookData]);

  const fetchChapterContent = useCallback(async (chapter) => {
    if (!chapter) return;
    setLoading(true);
    try {
      const chapterUrl = chapter.chapterUrl || chapter.url || chapter.path || '';
      const cachedContent = cache.getContent(chapterUrl);
      if (cachedContent) {
        setContent(cachedContent);
      } else {
        const source = getSource();
        const result = await getContentAPI(source, chapterUrl, bookData, {
          index: chapter.index,
          title: chapter.chapterName,
          url: chapterUrl,
        });

        if (result.success && result.content) {
          const chapterContent = String(result.content);
          cache.setContent(chapterUrl, chapterContent);
          setContent(chapterContent);
        } else {
          const fallback = result.message || '获取章节内容失败，内容为空！';
          setContent(fallback);
        }
      }
    } catch (err) {
      console.error('获取章节内容失败:', err);
      setContent('获取章节内容失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [getSource, bookData]);

  const saveProgress = useCallback(() => {
    if (!isLoggedIn || !userInfo || !currentChapter || chapters.length === 0) return;
    const progressBookId = bookUrl || novelId;
    const progress = ((currentChapterIndex + 1) / chapters.length) * 100;
    saveReadingProgress(userInfo.username, progressBookId, currentChapterIndex, progress);
  }, [isLoggedIn, userInfo, currentChapter, chapters.length, bookUrl, novelId, currentChapterIndex]);

  const switchChapter = (index) => {
    if (index >= 0 && index < chapters.length) {
      saveProgress();

      isSwitchingChapterRef.current = true;
      setCurrentChapterIndex(index);
      const chapter = chapters[index];
      setCurrentChapter(chapter);
      fetchChapterContent(chapter);

      const readerParams = new URLSearchParams(searchParams);
      readerParams.set('chapterIndex', String(index));
      navigate(`/reader/${novelId}?${readerParams.toString()}`, { replace: true });
      window.scrollTo({ top: 0 });
    }
  };

  const handleBack = () => {
    saveProgress();

    const from = searchParams.get('from');
    if (from === 'shelf') {
      navigate('/shelf');
    } else {
      navigate(-1);
    }
  };

  const handleBgImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('图片大小不能超过2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReaderSettings(prev => ({ ...prev, bgImage: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const applyColorToDOM = useCallback((type, value) => {
    if (!pageRef.current) return;
    if (type === 'text') {
      pageRef.current.style.setProperty('--reader-text-color', value);
    } else if (type === 'bg') {
      pageRef.current.style.backgroundColor = value;
      const headerBar = pageRef.current.querySelector('[data-reader-header]');
      if (headerBar) headerBar.style.backgroundColor = value;
    }
  }, []);

  const handleTextColorChange = useCallback((e) => {
    const value = e.target.value;
    pendingColorRef.current.textColor = value;
    applyColorToDOM('text', value);
  }, [applyColorToDOM]);

  const handleBgColorChange = useCallback((e) => {
    const value = e.target.value;
    pendingColorRef.current.bgColor = value;
    applyColorToDOM('bg', value);
  }, [applyColorToDOM]);

  const handleColorPickerClose = useCallback((type) => {
    if (type === 'text' && pendingColorRef.current.textColor) {
      setReaderSettings(prev => ({ ...prev, textColor: pendingColorRef.current.textColor }));
      pendingColorRef.current.textColor = '';
    } else if (type === 'bg' && pendingColorRef.current.bgColor) {
      setReaderSettings(prev => ({ ...prev, bgColor: pendingColorRef.current.bgColor, bgImage: '' }));
      pendingColorRef.current.bgColor = '';
    }
  }, []);

  if (loading && !content) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <span style={{ color: '#ff4d4f' }}>{error}</span>
      </div>
    );
  }

  const bgStyle = readerSettings.bgImage
    ? { backgroundImage: `url(${readerSettings.bgImage})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }
    : { backgroundColor: readerSettings.bgColor };

  return (
    <div ref={pageRef} style={{ position: 'relative', minHeight: '100vh', '--reader-text-color': readerSettings.textColor, ...bgStyle }}>
      <div data-reader-header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: readerSettings.bgColor || '#fff',
        borderBottom: `1px solid rgba(0,0,0,0.08)`,
        opacity: 0.95
      }}>
        <BackButton
          onClick={handleBack}
          text="返回"
          style={{ color: 'var(--reader-text-color)', backgroundColor: 'transparent', border: '1px solid rgba(128,128,128,0.2)', boxShadow: 'none', backdropFilter: 'none' }}
        />
        <span style={{ 
          fontWeight: 500, 
          fontSize: 15, 
          color: 'var(--reader-text-color)',
          maxWidth: '50%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {currentChapter?.chapterName}
        </span>
        <Tooltip title="阅读设置">
          <Button
            icon={<SettingOutlined />}
            onClick={() => setShowSettings(true)}
            type="text"
            style={{ color: 'var(--reader-text-color)' }}
          />
        </Tooltip>
      </div>

      <div style={{ 
        maxWidth: 800, 
        margin: '0 auto', 
        padding: '0 20px',
        color: 'var(--reader-text-color)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '16px 0',
          borderBottom: `1px solid ${readerSettings.textColor}15`,
          flexWrap: 'nowrap',
          gap: 8
        }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => switchChapter(currentChapterIndex - 1)}
            disabled={currentChapterIndex === 0}
            type="text"
            style={{ color: 'var(--reader-text-color)', flexShrink: 0 }}
          >
            上一章
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto', justifyContent: 'center' }}>
            <span style={{ color: 'var(--reader-text-color)', fontSize: '14px', flexShrink: 0 }}>目录</span>
            <Select
              virtual
              value={currentChapterIndex}
              onChange={switchChapter}
              style={{ minWidth: 120, maxWidth: 240, flex: '1 1 auto', color: 'var(--reader-text-color)' }}
              popupMatchSelectWidth={false}
              listHeight={256}
              options={chapters.map((chapter, index) => ({
                value: index,
                label: chapter.chapterName
              }))}
            />
          </div>
          <Button 
            icon={<ArrowRightOutlined />} 
            onClick={() => switchChapter(currentChapterIndex + 1)}
            disabled={currentChapterIndex === chapters.length - 1}
            type="text"
            style={{ color: 'var(--reader-text-color)', flexShrink: 0 }}
          >
            下一章
          </Button>
        </div>

        <div style={{ padding: '24px 0 40px' }}>
          {content ? (
            content.split('\n').map((paragraph, index) => (
              <p key={index} style={{ 
                marginBottom: readerSettings.paragraphSpacing,
                fontSize: readerSettings.fontSize,
                fontWeight: readerSettings.fontWeight,
                lineHeight: readerSettings.lineHeight,
                textIndent: `${readerSettings.indent}em`,
                letterSpacing: `${readerSettings.letterSpacing}px`
              }}>
                {paragraph}
              </p>
            ))
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: 300,
              opacity: 0.5
            }}>
              正文内容为空，无法显示。
            </div>
          )}
        </div>

        <Divider style={{ borderColor: `${readerSettings.textColor}22` }} />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          paddingBottom: '40px',
          flexWrap: 'nowrap',
          gap: 8
        }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => switchChapter(currentChapterIndex - 1)}
            disabled={currentChapterIndex === 0}
            type="text"
            style={{ color: 'var(--reader-text-color)', flexShrink: 0 }}
          >
            上一章
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto', justifyContent: 'center' }}>
            <span style={{ color: 'var(--reader-text-color)', fontSize: '14px', flexShrink: 0 }}>目录</span>
            <Select
              virtual
              value={currentChapterIndex}
              onChange={switchChapter}
              style={{ minWidth: 120, maxWidth: 240, flex: '1 1 auto', color: 'var(--reader-text-color)' }}
              popupMatchSelectWidth={false}
              listHeight={256}
              options={chapters.map((chapter, index) => ({
                value: index,
                label: chapter.chapterName
              }))}
            />
          </div>
          <Button 
            icon={<ArrowRightOutlined />} 
            onClick={() => switchChapter(currentChapterIndex + 1)}
            disabled={currentChapterIndex === chapters.length - 1}
            type="text"
            style={{ color: 'var(--reader-text-color)', flexShrink: 0 }}
          >
            下一章
          </Button>
        </div>
      </div>

      {showScrollButtons && (
        <motion.div
          initial={{ opacity: 0, x: 30, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 30, scale: 0.8 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            position: 'fixed',
            right: 24,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <motion.button
            onClick={scrollToTop}
            whileHover={{ scale: 1.1, backgroundColor: themeConfigs[currentTheme].colors[1] }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 48, height: 48, borderRadius: '50%', border: 'none',
              backgroundColor: color, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
          >
            <ArrowUpOutlined style={{ fontSize: 18, color: '#fff' }} />
          </motion.button>
          <motion.button
            onClick={scrollToBottom}
            whileHover={{ scale: 1.1, backgroundColor: themeConfigs[currentTheme].colors[1] }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 48, height: 48, borderRadius: '50%', border: 'none',
              backgroundColor: color, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
          >
            <ArrowDownOutlined style={{ fontSize: 18, color: '#fff' }} />
          </motion.button>
        </motion.div>
      )}

      <Modal
        title="阅读设置"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        width={windowWidth >= 1200 ? 680 : windowWidth >= 768 ? 520 : Math.min(400, windowWidth * 0.92)}
        centered
        styles={{ body: { maxHeight: windowWidth < 768 ? '60vh' : '70vh', overflowY: 'auto' } }}
      >
        <div style={{
          display: 'flex',
          flexDirection: windowWidth >= 1200 ? 'row' : 'column',
          gap: windowWidth >= 1200 ? 24 : 16
        }}>
          <div style={{
            flex: windowWidth >= 1200 ? '1 1 50%' : '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: windowWidth >= 768 ? 16 : 12
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <FontSizeOutlined />
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>字体大小</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.fontSize}px</span>
              </div>
              <Slider min={12} max={28} step={1} value={readerSettings.fontSize} onChange={(v) => setReaderSettings(prev => ({ ...prev, fontSize: v }))} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <BoldOutlined />
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>字体粗细</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.fontWeight}</span>
              </div>
              <Slider min={300} max={700} step={100} value={readerSettings.fontWeight} onChange={(v) => setReaderSettings(prev => ({ ...prev, fontWeight: v }))} marks={windowWidth >= 768 ? { 300: '细', 400: '常规', 500: '中等', 700: '粗' } : { 300: '细', 700: '粗' }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ColumnWidthOutlined />
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>段落缩进</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.indent}字符</span>
              </div>
              <Slider min={0} max={4} step={1} value={readerSettings.indent} onChange={(v) => setReaderSettings(prev => ({ ...prev, indent: v }))} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <LineHeightOutlined />
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>行距</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.lineHeight}</span>
              </div>
              <Slider min={1.2} max={3} step={0.1} value={readerSettings.lineHeight} onChange={(v) => setReaderSettings(prev => ({ ...prev, lineHeight: v }))} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>段落间距</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.paragraphSpacing}px</span>
              </div>
              <Slider min={4} max={40} step={2} value={readerSettings.paragraphSpacing} onChange={(v) => setReaderSettings(prev => ({ ...prev, paragraphSpacing: v }))} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>字间距</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.letterSpacing}px</span>
              </div>
              <Slider min={0} max={5} step={0.5} value={readerSettings.letterSpacing} onChange={(v) => setReaderSettings(prev => ({ ...prev, letterSpacing: v }))} />
            </div>
          </div>

          <div style={{
            flex: windowWidth >= 1200 ? '1 1 50%' : '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: windowWidth >= 768 ? 16 : 12
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>字体颜色</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.textColor}</span>
              </div>
              <input type="color" value={readerSettings.textColor} onChange={handleTextColorChange} onBlur={() => handleColorPickerClose('text')} style={{ width: windowWidth < 768 ? '100%' : 60, height: 32, border: '1px solid #d9d9d9', borderRadius: 6, cursor: 'pointer' }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <BgColorsOutlined />
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>背景设置</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: windowWidth >= 768 ? 8 : 6, marginBottom: 12 }}>
                {bgPresets.map((preset) => (
                  <div
                    key={preset.name}
                    onClick={() => setReaderSettings(prev => ({ ...prev, bgColor: preset.color, textColor: preset.textColor, bgImage: '' }))}
                    style={{
                      height: windowWidth >= 768 ? 36 : 30,
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: preset.color,
                      border: readerSettings.bgColor === preset.color && !readerSettings.bgImage ? `2px solid ${color}` : '1px solid #d9d9d9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: windowWidth >= 768 ? 10 : 9,
                      color: preset.textColor,
                      transition: 'all 0.2s'
                    }}
                  >
                    {preset.name}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: windowWidth < 768 ? 12 : 13, color: '#666' }}>自定义颜色：</span>
                <input type="color" value={readerSettings.bgColor} onChange={handleBgColorChange} onBlur={() => handleColorPickerClose('bg')} style={{ width: 40, height: 30, border: '1px solid #d9d9d9', borderRadius: 4, cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: windowWidth < 768 ? 12 : 13, color: '#666' }}>背景图片</span>
                <label style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #d9d9d9', cursor: 'pointer', fontSize: windowWidth < 768 ? 12 : 13, transition: 'all 0.2s' }}>
                  选择图片
                  <input type="file" accept="image/*" onChange={handleBgImageUpload} style={{ display: 'none' }} />
                </label>
                {readerSettings.bgImage && (
                  <Button size="small" danger onClick={() => setReaderSettings(prev => ({ ...prev, bgImage: '' }))}>
                    清除图片
                  </Button>
                )}
              </div>
            </div>

            <Button
              onClick={() => {
                setReaderSettings({
                  fontSize: 16, fontWeight: 400, lineHeight: 2, paragraphSpacing: 16,
                  indent: 2, letterSpacing: 0, bgColor: '#ffffff', textColor: '#333333', bgImage: ''
                });
                message.success('已恢复默认设置');
              }}
              block
              style={{ marginTop: windowWidth >= 1200 ? 'auto' : 4 }}
            >
              恢复默认设置
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Reader;
