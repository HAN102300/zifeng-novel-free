import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, Descriptions, Avatar, Upload, Button, Modal, message, Spin } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  CheckOutlined,
  CloseOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BugOutlined,
  BulbOutlined,
  EyeOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import AvatarEditor from 'react-avatar-editor';
import { getCurrentUser, authLogout, uploadAvatar, updateProfile, getMyFeedbacks } from '../utils/apiClient';
import {
  ZfPageShell,
  ZfGrid,
  ZfPageHeader,
  ZfSectionTitle,
  ZfGlassSurface,
  ZfPill,
  ZfSkeleton,
  ZfEmptyState,
} from '@zifeng/ui/components';
import { variants } from '@zifeng/ui/motion';
import { useBreakpoint } from '@zifeng/ui/hooks';

/* ============================================================
   紫枫免费小说 · 个人中心（P2 迁移）
   - antd Card + Row/Col 布局 → ZfPageShell(lg) + ZfGrid + ZfGlassSurface
   - 返回键：BackButton（正在被重构的旧件）→ ZfPageHeader back
   - 用户名不再套 ShinyText：那是 JS rAF 逐帧改 background-position 的
     无限动画，落在玻璃卡内部违反合成器铁律，且「用户名」是功能字段
   - 反馈标签收敛：类别=中性胶囊 + 专属图标（装饰色只有 tone=brand 可用），
     状态=语义色（待处理 warning / 处理中 info / 已解决 success / 已关闭 neutral）
   - 状态图标去掉 SyncOutlined 的 spin：infinite 动画不得是玻璃卡的子孙
   - 头像裁剪（react-avatar-editor）功能原样保留，只把视觉容器换成令牌
   - 硬编码色全部 → 令牌；isDarkMode 三元配色全部删除
   ============================================================ */

const { Dragger } = Upload;

const formatDate = (dateString) => {
  if (!dateString) return '暂无登录记录';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/* 类别是元数据不是状态，故统一中性色，只靠图标区分 */
const CATEGORY_MAP = {
  bug: { label: 'Bug 报告', icon: <BugOutlined /> },
  feature: { label: '功能建议', icon: <BulbOutlined /> },
  ux: { label: '体验问题', icon: <EyeOutlined /> },
  performance: { label: '性能问题', icon: <DashboardOutlined /> },
  other: { label: '其他', icon: <AppstoreOutlined /> },
};

const STATUS_MAP = {
  0: { label: '待处理', tone: 'warning', icon: <ClockCircleOutlined /> },
  1: { label: '处理中', tone: 'info', icon: <SyncOutlined /> },
  2: { label: '已解决', tone: 'success', icon: <CheckCircleOutlined /> },
  3: { label: '已关闭', tone: 'neutral', icon: <CloseCircleOutlined /> },
};

const COL = { display: 'flex', flexDirection: 'column', gap: 'var(--zf-s5)', minWidth: 0 };
const IDENTITY = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--zf-s3)', minWidth: 0 };
const META_LINE = { display: 'flex', alignItems: 'center', gap: 'var(--zf-s2)', flexWrap: 'wrap', minWidth: 0 };
const BODY_TEXT = { fontSize: 'var(--zf-fs-base)', lineHeight: 'var(--zf-lh-body)', color: 'var(--zf-text-secondary)' };
const BODY_P = { ...BODY_TEXT, margin: 0, whiteSpace: 'pre-wrap' };
const META_TIME = { fontSize: 'var(--zf-fs-2xs)', color: 'var(--zf-text-faint)' };

/** 我的反馈 */
function MyFeedbackTab() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeedbacks = async () => {
      try {
        const data = await getMyFeedbacks();
        setFeedbacks(Array.isArray(data) ? data : []);
      } catch {
        setFeedbacks([]);
      } finally {
        setLoading(false);
      }
    };
    loadFeedbacks();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--zf-s10)' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <ZfEmptyState
        compact
        icon={<MessageOutlined />}
        title="暂无反馈记录"
        description="在右下角的反馈按钮里提交问题或建议，处理进度会显示在这里。"
      />
    );
  }

  return (
    <ZfGrid columns={1} gap="var(--zf-s4)">
      {feedbacks.map((fb, i) => {
        const cat = CATEGORY_MAP[fb.category];
        const st = STATUS_MAP[fb.status];
        return (
          <motion.div key={fb.id ?? i} variants={variants.cardIn} initial="initial" animate="animate">
            <ZfGlassSurface level={1} style={{ padding: 'var(--zf-s5) var(--zf-s6)' }}>
              <div style={COL}>
                <div style={{ ...META_LINE, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={META_LINE}>
                    <ZfPill size="xs" icon={cat?.icon}>
                      {cat?.label ?? fb.category ?? '未分类'}
                    </ZfPill>
                    <ZfPill size="xs" tone={st?.tone ?? 'neutral'} icon={st?.icon}>
                      {st?.label ?? '未知'}
                    </ZfPill>
                  </div>
                  <span className="zf-num" style={META_TIME}>
                    {fb.createdAt ? new Date(fb.createdAt).toLocaleString('zh-CN') : ''}
                  </span>
                </div>

                <h4
                  style={{
                    fontFamily: 'var(--zf-font-display)',
                    fontSize: 'var(--zf-fs-lg)',
                    fontWeight: 'var(--zf-fw-bold)',
                    lineHeight: 'var(--zf-lh-snug)',
                    color: 'var(--zf-text-primary)',
                    margin: 0,
                  }}
                >
                  {fb.title}
                </h4>

                <p style={BODY_P}>{fb.content}</p>

                {fb.adminReply ? (
                  <div
                    style={{
                      padding: 'var(--zf-s4)',
                      borderRadius: 'var(--zf-r-sm)',
                      background: 'var(--zf-tint-brand-08)',
                      border: '1px solid rgb(var(--zf-brand-rgb-500) / 0.22)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--zf-s2)',
                        marginBottom: 'var(--zf-s2)',
                        fontSize: 'var(--zf-fs-sm)',
                        fontWeight: 'var(--zf-fw-strong)',
                        color: 'var(--zf-on-tint)',
                      }}
                    >
                      <UserOutlined aria-hidden="true" />
                      管理员回复
                    </div>
                    <p style={{ ...BODY_P, color: 'var(--zf-text-primary)' }}>
                      {fb.adminReply}
                    </p>
                    {fb.repliedAt ? (
                      <div className="zf-num" style={{ ...META_TIME, marginTop: 'var(--zf-s2)' }}>
                        回复时间：{new Date(fb.repliedAt).toLocaleString('zh-CN')}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </ZfGlassSurface>
          </motion.div>
        );
      })}
    </ZfGrid>
  );
}

const UserCenter = ({ setIsLoggedIn, setUserInfo }) => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [userInfo, setLocalUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropScale, setCropScale] = useState(1.2);
  const editorRef = useRef(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      const token = localStorage.getItem('zifeng_token');
      if (token) {
        try {
          const user = await getCurrentUser();
          if (user) {
            setLocalUserInfo(user);
            localStorage.setItem('zifeng_user', JSON.stringify(user));
          } else {
            navigate('/login', { state: { from: '/user' } });
          }
        } catch {
          localStorage.removeItem('zifeng_token');
          localStorage.removeItem('zifeng_user');
          navigate('/login', { state: { from: '/user' } });
        }
      } else {
        navigate('/login', { state: { from: '/user' } });
      }
    };

    loadUserInfo();
  }, [navigate]);

  const handleAvatarUpload = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      message.error('只支持 JPG、PNG、GIF 格式的图片');
      return false;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error('文件大小不能超过5MB');
      return false;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setCropImage(e.target.result);
      setCropScale(1.2);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);

    return false;
  };

  const handleCropUpload = () => {
    if (editorRef.current) {
      setLoading(true);
      const rawCanvas = editorRef.current.getImage();
      const maxSize = 512;
      let outputCanvas = rawCanvas;
      if (rawCanvas.width > maxSize || rawCanvas.height > maxSize) {
        outputCanvas = document.createElement('canvas');
        const scale = Math.min(maxSize / rawCanvas.width, maxSize / rawCanvas.height);
        outputCanvas.width = Math.round(rawCanvas.width * scale);
        outputCanvas.height = Math.round(rawCanvas.height * scale);
        const ctx = outputCanvas.getContext('2d');
        ctx.drawImage(rawCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
      }
      outputCanvas.toBlob(async (blob) => {
        try {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          const result = await uploadAvatar(file);
          if (result.success) {
            const newAvatarUrl = result.data;
            const profileResult = await updateProfile(newAvatarUrl, userInfo.email);
            const updatedData = profileResult?.data || profileResult;
            if (updatedData) {
              setLocalUserInfo(updatedData);
              setUserInfo(updatedData);
              localStorage.setItem('zifeng_user', JSON.stringify(updatedData));
            } else {
              const updatedUserInfo = { ...userInfo, avatar: newAvatarUrl };
              setLocalUserInfo(updatedUserInfo);
              setUserInfo(updatedUserInfo);
              localStorage.setItem('zifeng_user', JSON.stringify(updatedUserInfo));
            }
            window.dispatchEvent(new Event('auth-login'));
            message.success('头像更新成功');
          } else {
            message.error(result.message || '头像上传失败');
          }
        } catch {
          message.error('头像上传失败');
        } finally {
          setLoading(false);
          setShowCropModal(false);
          setCropImage(null);
        }
      }, 'image/jpeg', 0.85);
    }
  };

  const handleLogout = () => {
    authLogout();
    setIsLoggedIn(false);
    setUserInfo(null);
    message.success('退出登录成功');
    navigate('/');
  };

  if (!userInfo) {
    return null;
  }

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span style={META_LINE}>
          <UserOutlined />
          个人信息
        </span>
      ),
      children: (
        <ZfGrid
          gap="var(--zf-s8)"
          style={{
            gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 300px) minmax(0, 1fr)',
          }}
        >
          {/* —— 身份卡：头像 + 上传 —— */}
          <motion.div variants={variants.scaleIn} initial="initial" animate="animate" style={IDENTITY}>
            <Avatar
              size={120}
              src={userInfo.avatar || undefined}
              icon={<UserOutlined style={{ fontSize: 'var(--zf-fs-3xl)' }} />}
              style={{
                border: '3px solid var(--zf-brand-500)',
                boxShadow: '0 0 0 4px var(--zf-tint-brand-25), var(--zf-glow-brand)',
                background: 'var(--zf-glass-3)',
                color: 'var(--zf-brand-300)',
              }}
            />
            <div style={{ ...IDENTITY, gap: 2 }}>
              <h3
                style={{
                  fontFamily: 'var(--zf-font-display)',
                  fontSize: 'var(--zf-fs-xl)',
                  fontWeight: 'var(--zf-fw-bold)',
                  lineHeight: 'var(--zf-lh-snug)',
                  color: 'var(--zf-text-primary)',
                  margin: 0,
                  maxWidth: '100%',
                  overflowWrap: 'anywhere',
                }}
              >
                {userInfo.username}
              </h3>
              <span className="zf-mono" style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-muted)' }}>
                {userInfo.email || '未设置邮箱'}
              </span>
            </div>

            <Dragger
              name="avatar"
              accept="image/*"
              beforeUpload={handleAvatarUpload}
              showUploadList={false}
              disabled={loading}
              style={{ width: '100%', borderRadius: 'var(--zf-r-md)' }}
            >
              <p className="ant-upload-drag-icon" style={{ marginBottom: 'var(--zf-s2)' }}>
                <PictureOutlined style={{ fontSize: 'var(--zf-fs-xl)', color: 'var(--zf-brand-500)' }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: 'var(--zf-fs-base)' }}>
                点击或拖拽上传头像
              </p>
              <p className="ant-upload-hint" style={{ fontSize: 'var(--zf-fs-xs)' }}>
                支持 JPG、PNG、GIF，不超过 5MB
              </p>
            </Dragger>
          </motion.div>

          {/* —— 账户资料 + 退出 —— */}
          <motion.div variants={variants.fadeUp} initial="initial" animate="animate" style={COL}>
            <ZfSectionTitle animated={false} variant="line" icon={<UserOutlined />} title="个人信息" />
            <ZfGlassSurface level={1} style={{ padding: 'var(--zf-s5)' }}>
              <Descriptions column={isMobile ? 1 : 2} size="middle" bordered>
                <Descriptions.Item label="用户名">{userInfo.username}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{userInfo.email || '未设置'}</Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  <span className="zf-num">{formatDate(userInfo.createdAt)}</span>
                </Descriptions.Item>
                <Descriptions.Item label="最后登录">
                  <span className="zf-num">{formatDate(userInfo.lastLoginAt)}</span>
                </Descriptions.Item>
              </Descriptions>
            </ZfGlassSurface>

            <div style={{ ...META_LINE, gap: 'var(--zf-s4)', flexWrap: 'wrap' }}>
              <Button
                type="primary"
                danger
                size="large"
                icon={<LogoutOutlined />}
                classNames={{ root: 'zf-btn' }}
                onClick={handleLogout}
              >
                退出登录
              </Button>
              <span style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-muted)' }}>
                退出后书架与阅读进度仍保存在云端
              </span>
            </div>
          </motion.div>
        </ZfGrid>
      ),
    },
    {
      key: 'feedback',
      label: (
        <span style={META_LINE}>
          <MessageOutlined />
          我的反馈
        </span>
      ),
      children: <MyFeedbackTab />,
    },
  ];

  return (
    <ZfPageShell
      size="lg"
      header={
        <ZfPageHeader
          back
          icon={<UserOutlined />}
          title="个人中心"
          subtitle="账号资料、头像与反馈处理进度都在这里"
        />
      }
    >
      {/* 裁剪弹窗：react-avatar-editor 的逻辑与参数原样保留，只换外框 */}
      <Modal
        title="裁剪头像"
        open={showCropModal}
        onCancel={() => {
          setShowCropModal(false);
          setCropImage(null);
        }}
        footer={[
          <Button key="cancel" classNames={{ root: 'zf-btn' }} onClick={() => {
            setShowCropModal(false);
            setCropImage(null);
          }}>
            <CloseOutlined /> 取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            classNames={{ root: 'zf-btn zf-btn--brand' }}
            loading={loading}
            onClick={handleCropUpload}
          >
            <CheckOutlined /> 确定
          </Button>,
        ]}
        width={400}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s4)', padding: 'var(--zf-s5) 0' }}>
          {cropImage ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: 'var(--zf-s5)',
                borderRadius: 'var(--zf-r-lg)',
                background: 'var(--zf-glass-1)',
                border: '1px solid var(--zf-glass-border)',
              }}
            >
              <div
                onWheel={(e) => {
                  e.preventDefault();
                  const newScale = e.deltaY > 0 ? Math.max(0.5, cropScale - 0.1) : Math.min(3, cropScale + 0.1);
                  setCropScale(newScale);
                }}
                style={{
                  cursor: 'zoom-in',
                  borderRadius: 'var(--zf-r-full)',
                  overflow: 'hidden',
                  boxShadow: '0 0 0 2px var(--zf-brand-500), var(--zf-glow-brand)',
                }}
              >
                <AvatarEditor
                  ref={editorRef}
                  image={cropImage}
                  width={200}
                  height={200}
                  border={50}
                  borderRadius={100}
                  color={[255, 255, 255, 0.6]}
                  scale={cropScale}
                />
              </div>
            </div>
          ) : (
            <ZfSkeleton variant="block" height={220} />
          )}
          <p className="zf-caption" style={{ margin: 0, textAlign: 'center' }}>
            拖动调整头像位置，滚轮缩放头像大小
          </p>
        </div>
      </Modal>

      <ZfGlassSurface level={2} style={{ padding: 'var(--zf-s2) var(--zf-s4) var(--zf-s5)' }}>
        <Tabs items={tabItems} tabBarStyle={{ marginBottom: 'var(--zf-s5)' }} />
      </ZfGlassSurface>
    </ZfPageShell>
  );
};

export default UserCenter;
