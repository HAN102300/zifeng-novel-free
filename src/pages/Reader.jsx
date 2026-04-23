import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { decryptMaoyanContent } from '../utils/decrypt';
import { saveReadingProgress, getReadingProgress } from '../utils/storage';
import axios from 'axios';

const cache = {
  chapters: new Map(),
  content: new Map(),
  expireTime: 24 * 60 * 60 * 1000,
  isExpired: (timestamp) => Date.now() - timestamp > cache.expireTime,
  setChapters: (novelId, chapters) => { cache.chapters.set(novelId, { data: chapters, timestamp: Date.now() }); },
  getChapters: (novelId) => {
    const cached = cache.chapters.get(novelId);
    if (cached && !cache.isExpired(cached.timestamp)) return cached.data;
    cache.chapters.delete(novelId);
    return null;
  },
  setContent: (path, content) => { cache.content.set(path, { data: content, timestamp: Date.now() }); },
  getContent: (path) => {
    const cached = cache.content.get(path);
    if (cached && !cache.isExpired(cached.timestamp)) return cached.data;
    cache.content.delete(path);
    return null;
  }
};

const bookSource = {
  url: 'http://api.jmlldsc.com',
  headers: {
    'User-Agent': 'okhttp/4.9.2',
    'client-device': '2d37f6b5b6b2605373092c3dc65a3b39',
    'client-brand': 'Redmi',
    'client-version': '2.3.0',
    'client-name': 'app.maoyankanshu.novel',
    'client-source': 'android',
    'Authorization': 'bearereyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9hcGkuanhndHp4Yy5jb21cL2F1dGhcL3RoaXJkIiwiaWF0IjoxNjgzODkxNjUyLCJleHAiOjE3NzcyMDM2NTIsIm5iZiI6MTY4Mzg5MTY1MiwianRpIjoiR2JxWmI4bGZkbTVLYzBIViIsInN1YiI6Njg3ODYyLCJwcnYiOiJhMWNiMDM3MTgwMjk2YzZhMTkzOGVmMzBiNDM3OTQ2NzJkZDAxNmM1In0.mMxaC2SVyZKyjC6rdUqFVv5d9w_X36o0AdKD7szvE_Q'
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
  const { novelId, chapterId } = useParams();
  const navigate = useNavigate();
  const { currentTheme, themeConfigs, isDarkMode } = useContext(ThemeContext);
  const { isLoggedIn, userInfo } = useContext(AuthContext);
  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
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
    }
  });

  const color = themeConfigs[currentTheme].colors[0];

  useEffect(() => {
    try {
      localStorage.setItem('reader_settings', JSON.stringify(readerSettings));
    } catch {}
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

  const getUrlParam = (name) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  };

  useEffect(() => {
    const fetchChapters = async () => {
      if (!novelId) return;
      if (isSwitchingChapterRef.current) {
        isSwitchingChapterRef.current = false;
        return;
      }
      setLoading(true);
      try {
        const from = getUrlParam('from');
        const shouldRestoreProgress = from === 'shelf';
        const cachedChapters = cache.getChapters(novelId);
        if (cachedChapters) {
          const chapterList = cachedChapters;
          setChapters(chapterList);
          let index = 0;
          if (shouldRestoreProgress && isLoggedIn && userInfo) {
            const savedProgress = await getReadingProgress(userInfo.username, novelId);
            if (savedProgress && savedProgress.chapterId) {
              index = chapterList.findIndex(chapter => chapter.chapterId === savedProgress.chapterId);
              if (index === -1) index = 0;
            } else if (chapterId) {
              index = chapterList.findIndex(chapter => chapter.chapterId === chapterId);
              if (index === -1) index = 0;
            }
          } else if (chapterId) {
            index = chapterList.findIndex(chapter => chapter.chapterId === chapterId);
            if (index === -1) index = 0;
          }
          setCurrentChapterIndex(index);
          setCurrentChapter(chapterList[index]);
          fetchChapterContent(chapterList[index].path);
        } else {
          const response = await axios.get(`/api/novel/${novelId}/chapters?readNum=1`, {
            headers: bookSource.headers
          });
          if (response.data && response.data.data) {
            const chapterList = response.data.data.list;
            cache.setChapters(novelId, chapterList);
            setChapters(chapterList);
            let index = 0;
            if (shouldRestoreProgress && isLoggedIn && userInfo) {
              const savedProgress = await getReadingProgress(userInfo.username, novelId);
              if (savedProgress && savedProgress.chapterId) {
                index = chapterList.findIndex(chapter => chapter.chapterId === savedProgress.chapterId);
                if (index === -1) index = 0;
              } else if (chapterId) {
                index = chapterList.findIndex(chapter => chapter.chapterId === chapterId);
                if (index === -1) index = 0;
              }
            } else if (chapterId) {
              index = chapterList.findIndex(chapter => chapter.chapterId === chapterId);
              if (index === -1) index = 0;
            }
            setCurrentChapterIndex(index);
            setCurrentChapter(chapterList[index]);
            fetchChapterContent(chapterList[index].path);
          }
        }
      } catch (error) {
        console.error('获取章节列表失败:', error);
        setError('获取章节列表失败');
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [novelId, chapterId, isLoggedIn, userInfo]);

  const fetchChapterContent = async (path) => {
    setLoading(true);
    try {
      const cachedContent = cache.getContent(path);
      if (cachedContent) {
        setContent(cachedContent);
      } else {
        const decryptedPath = decryptMaoyanContent(path);
        if (!decryptedPath) throw new Error('解密失败');
        let contentUrl;
        if (decryptedPath?.startsWith('http')) {
          contentUrl = `/proxy?target=${encodeURIComponent(decryptedPath)}`;
        }
        try {
          const response = await axios.get(contentUrl, { headers: bookSource.headers });
          let chapterContent;
          if (response.data) {
            if (response.data.data && response.data.data.content) {
              chapterContent = response.data.data.content || '';
            } else if (response.data.content) {
              chapterContent = response.data.content || '';
            } else {
              chapterContent = '获取章节内容失败，内容为空！';
            }
          } else {
            chapterContent = '获取章节内容失败，内容为空！';
          }
          cache.setContent(path, chapterContent);
          setContent(chapterContent);
        } catch (error) {
          console.error('获取章节内容失败:', error);
          const mockContent = '这是章节内容的模拟数据，实际项目中需要解密获取真实内容。\n\n这是第二行内容，用于测试换行显示。\n\n这是第三行内容，展示多段文本的效果正常。'
          cache.setContent(path, mockContent);
          setContent(mockContent);
        }
      }
    } catch (error) {
      console.error('获取章节内容失败:', error);
      setError('获取章节内容失败');
      const mockContent = '这是章节内容的模拟数据，实际项目中需要解密获取真实内容。\n\n这是第二行内容，用于测试换行显示。\n\n这是第三行内容，展示多段文本的效果正常。'
      cache.setContent(path, mockContent);
      setContent(mockContent);
    } finally {
      setLoading(false);
    }
  };

  const switchChapter = (index) => {
    if (index >= 0 && index < chapters.length) {
      if (isLoggedIn && userInfo && currentChapter) {
        const from = getUrlParam('from');
        if (from === 'shelf') {
          const progress = ((currentChapterIndex + 1) / chapters.length) * 100;
          saveReadingProgress(userInfo.username, novelId, currentChapter.chapterId, progress);
        }
      }
      
      isSwitchingChapterRef.current = true;
      setCurrentChapterIndex(index);
      const chapter = chapters[index];
      setCurrentChapter(chapter);
      fetchChapterContent(chapter.path);
      const fromParam = getUrlParam('from');
      const targetPath = fromParam 
        ? `/reader/${novelId}/${chapter.chapterId}?from=${fromParam}`
        : `/reader/${novelId}/${chapter.chapterId}`;
      navigate(targetPath, { replace: true });
      window.scrollTo({ top: 0 });
    }
  };

  const handleBack = () => {
    const from = getUrlParam('from');
    if (from === 'shelf' && isLoggedIn && userInfo && currentChapter && chapters.length > 0) {
      const progress = ((currentChapterIndex + 1) / chapters.length) * 100;
      saveReadingProgress(userInfo.username, novelId, currentChapter.chapterId, progress);
    }
    
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
      {/* 顶部工具栏 */}
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
        {/* 顶部章节导航 */}
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
            上一章          </Button>
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
            下一章          </Button>
        </div>

        {/* 正文内容 */}
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

        {/* 底部章节导航 */}
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
            上一章          </Button>
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
            下一章          </Button>
        </div>
      </div>

      {/* 悬浮的上下箭头按钮 */}
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

      {/* 设置面板 */}
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
          {/* 左列/上部分：文字设置 */}
          <div style={{
            flex: windowWidth >= 1200 ? '1 1 50%' : '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: windowWidth >= 768 ? 16 : 12
          }}>
            {/* 字体大小 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <FontSizeOutlined />
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>字体大小</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.fontSize}px</span>
              </div>
              <Slider
                min={12} max={28} step={1}
                value={readerSettings.fontSize}
                onChange={(v) => setReaderSettings(prev => ({ ...prev, fontSize: v }))}
              />
            </div>

            {/* 字体粗细 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <BoldOutlined />
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>字体粗细</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.fontWeight}</span>
              </div>
              <Slider
                min={300} max={700} step={100}
                value={readerSettings.fontWeight}
                onChange={(v) => setReaderSettings(prev => ({ ...prev, fontWeight: v }))}
                marks={windowWidth >= 768 ? { 300: '细', 400: '常规', 500: '中等', 700: '粗' } : { 300: '细', 700: '粗' }}
              />
            </div>

            {/* 段落缩进 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ColumnWidthOutlined />
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>段落缩进</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.indent}字符</span>
              </div>
              <Slider
                min={0} max={4} step={1}
                value={readerSettings.indent}
                onChange={(v) => setReaderSettings(prev => ({ ...prev, indent: v }))}
              />
            </div>

            {/* 行距 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <LineHeightOutlined />
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>行距</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.lineHeight}</span>
              </div>
              <Slider
                min={1.2} max={3} step={0.1}
                value={readerSettings.lineHeight}
                onChange={(v) => setReaderSettings(prev => ({ ...prev, lineHeight: v }))}
              />
            </div>

            {/* 段落间距 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>段落间距</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.paragraphSpacing}px</span>
              </div>
              <Slider
                min={4} max={40} step={2}
                value={readerSettings.paragraphSpacing}
                onChange={(v) => setReaderSettings(prev => ({ ...prev, paragraphSpacing: v }))}
              />
            </div>

            {/* 字间距 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>字间距</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.letterSpacing}px</span>
              </div>
              <Slider
                min={0} max={5} step={0.5}
                value={readerSettings.letterSpacing}
                onChange={(v) => setReaderSettings(prev => ({ ...prev, letterSpacing: v }))}
              />
            </div>
          </div>

          {/* 右列/下部分：颜色和背景设置 */}
          <div style={{
            flex: windowWidth >= 1200 ? '1 1 50%' : '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: windowWidth >= 768 ? 16 : 12
          }}>
            {/* 字体颜色 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>字体颜色</span>
                <span style={{ marginLeft: 'auto', color: '#999', fontSize: windowWidth < 768 ? 12 : 13 }}>{readerSettings.textColor}</span>
              </div>
              <input
                type="color"
                value={readerSettings.textColor}
                onChange={handleTextColorChange}
                onBlur={() => handleColorPickerClose('text')}
                style={{
                  width: windowWidth < 768 ? '100%' : 60,
                  height: 32,
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* 背景设置 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <BgColorsOutlined />
                <span style={{ fontWeight: 500, fontSize: windowWidth < 768 ? 13 : 14 }}>背景设置</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: windowWidth >= 768 ? 8 : 6,
                marginBottom: 12
              }}>
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
                <input
                  type="color"
                  value={readerSettings.bgColor}
                  onChange={handleBgColorChange}
                  onBlur={() => handleColorPickerClose('bg')}
                  style={{ width: 40, height: 30, border: '1px solid #d9d9d9', borderRadius: 4, cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: windowWidth < 768 ? 12 : 13, color: '#666' }}>背景图片</span>
                <label style={{
                  padding: '4px 12px', borderRadius: 6, border: '1px solid #d9d9d9',
                  cursor: 'pointer', fontSize: windowWidth < 768 ? 12 : 13, transition: 'all 0.2s'
                }}>
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

            {/* 重置按钮 */}
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
