import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Row, Col, Typography, Space, Button, Upload, Avatar, Descriptions, message, Modal, Tabs, Tag, Empty, Spin } from 'antd';
import { UserOutlined, MailOutlined, LogoutOutlined, CheckOutlined, CloseOutlined, MessageOutlined, ClockCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import AvatarEditor from 'react-avatar-editor';
import { ThemeContext } from '../App';
import { getCurrentUser, authLogout, uploadAvatar, updateProfile, getMyFeedbacks } from '../utils/apiClient';
import { glassCardStyle, glassItemStyle } from '../utils/glassStyle';
import { ShinyText, ReactBitsErrorBoundary } from '../components/react-bits';

const { Title, Text } = Typography;
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

const categoryMap = {
  bug: { label: 'Bug 报告', color: 'red' },
  feature: { label: '功能建议', color: 'blue' },
  ux: { label: '体验问题', color: 'orange' },
  performance: { label: '性能问题', color: 'purple' },
  other: { label: '其他', color: 'default' },
};

const statusMap = {
  0: { label: '待处理', color: 'orange', icon: <ClockCircleOutlined /> },
  1: { label: '处理中', color: 'blue', icon: <SyncOutlined spin /> },
  2: { label: '已解决', color: 'green', icon: <CheckCircleOutlined /> },
  3: { label: '已关闭', color: 'default', icon: <CloseCircleOutlined /> },
};

const MyFeedbackTab = ({ isDarkMode, color }) => {
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无反馈记录"
        style={{ padding: 60 }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {feedbacks.map((fb, index) => (
        <motion.div
          key={fb.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <Card
            style={{
              borderRadius: 12,
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              background: isDarkMode ? '#1e1e1e' : '#fafafa',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color={categoryMap[fb.category]?.color || 'default'}>
                  {categoryMap[fb.category]?.label || fb.category}
                </Tag>
                <Tag color={statusMap[fb.status]?.color || 'default'} icon={statusMap[fb.status]?.icon}>
                  {statusMap[fb.status]?.label || '未知'}
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {fb.createdAt ? new Date(fb.createdAt).toLocaleString('zh-CN') : ''}
              </Text>
            </div>

            <Title level={5} style={{ margin: '0 0 8px', color: isDarkMode ? '#f0f0f0' : '#1a1a2e' }}>
              {fb.title}
            </Title>

            <Text style={{ color: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', lineHeight: 1.8, display: 'block' }}>
              {fb.content}
            </Text>

            {fb.adminReply && (
              <div style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 8,
                background: isDarkMode ? 'rgba(24, 144, 255, 0.08)' : 'rgba(24, 144, 255, 0.04)',
                border: `1px solid ${isDarkMode ? 'rgba(24, 144, 255, 0.2)' : 'rgba(24, 144, 255, 0.15)'}`,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#1890ff', fontSize: 13 }}>
                  管理员回复
                </div>
                <Text style={{ color: isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {fb.adminReply}
                </Text>
                {fb.repliedAt && (
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', marginTop: 8 }}>
                    回复时间：{new Date(fb.repliedAt).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

const UserCenter = ({ setIsLoggedIn, setUserInfo }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme, themeConfigs, isDarkMode, glassMode } = useContext(ThemeContext);
  const [userInfo, setLocalUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropScale, setCropScale] = useState(1.2);
  const editorRef = useRef(null);
  
  const color = themeConfigs[currentTheme].primaryColor;

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
        } catch (err) {
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
        <span>
          <UserOutlined style={{ marginRight: 6 }} />
          个人信息
        </span>
      ),
      children: (
        <Row gutter={[24, 24]} style={{ padding: '32px 24px' }}>
          <Col xs={24} md={8}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div style={{ marginBottom: 20 }}>
                <Avatar
                  size={120}
                  src={userInfo.avatar || undefined}
                  icon={<UserOutlined style={{ fontSize: 60 }} />}
                  style={{ 
                    border: `4px solid ${color}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                />
              </div>
              
              <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
                <ReactBitsErrorBoundary fallback={userInfo.username}>
                  <ShinyText text={userInfo.username} speed={3} color={isDarkMode ? '#e0e0e0' : '#333'} shineColor={color} spread={120} />
                </ReactBitsErrorBoundary>
              </Title>
              <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>{userInfo.email || '未设置邮箱'}</Text>
              
              <Dragger
                name="avatar"
                accept="image/*"
                beforeUpload={handleAvatarUpload}
                showUploadList={false}
                disabled={loading}
              >
                <p className="ant-upload-drag-icon">
                  <UserOutlined style={{ fontSize: 24, color: color }} />
                </p>
                <p className="ant-upload-text">点击或拖拽上传头像</p>
                <p className="ant-upload-hint">
                  支持 JPG、PNG、GIF 格式，文件大小不超过 5MB
                </p>
              </Dragger>
            </motion.div>
          </Col>
          
          <Col xs={24} md={16}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <Title level={3} style={{ margin: 0, color: color, marginBottom: 24 }}>个人信息</Title>
              
              <Card
                style={{
                  ...glassCardStyle(glassMode, isDarkMode),
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: isDarkMode ? '#1e1e1e' : '#f9f9f9',
                  marginBottom: 24
                }}
                styles={{ body: { padding: 20 } }}
              >
                <Descriptions 
                  column={2} 
                  bordered 
                  style={{ 
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                >
                  <Descriptions.Item label="用户名" style={{ fontWeight: 'bold' }}>{userInfo.username}</Descriptions.Item>
                  <Descriptions.Item label="邮箱" style={{ fontWeight: 'bold' }}>{userInfo.email || '未设置'}</Descriptions.Item>
                  <Descriptions.Item label="注册时间" style={{ fontWeight: 'bold' }}>
                    {formatDate(userInfo.createdAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="最后登录" style={{ fontWeight: 'bold' }}>
                    {formatDate(userInfo.lastLoginAt)}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <Button 
                  type="default" 
                  icon={<LogoutOutlined />} 
                  style={{ 
                    padding: '0 32px',
                    fontSize: 16,
                    height: 48,
                    borderColor: '#ff4d4f',
                    color: '#ff4d4f'
                  }}
                  onClick={handleLogout}
                >
                  退出登录
                </Button>
              </motion.div>
            </motion.div>
          </Col>
        </Row>
      ),
    },
    {
      key: 'feedback',
      label: (
        <span>
          <MessageOutlined style={{ marginRight: 6 }} />
          我的反馈
        </span>
      ),
      children: (
        <div style={{ padding: '24px' }}>
          <MyFeedbackTab isDarkMode={isDarkMode} color={color} />
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={{ minHeight: '80vh' }}
    >
      <Modal
        title="裁剪头像"
        open={showCropModal}
        onCancel={() => {
          setShowCropModal(false);
          setCropImage(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowCropModal(false);
            setCropImage(null);
          }}>
            <CloseOutlined /> 取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading}
            onClick={handleCropUpload}
          >
            <CheckOutlined /> 确定
          </Button>
        ]}
        width={400}
      >
        {cropImage && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
            <div 
              onWheel={(e) => {
                e.preventDefault();
                const newScale = e.deltaY > 0 ? Math.max(0.5, cropScale - 0.1) : Math.min(3, cropScale + 0.1);
                setCropScale(newScale);
              }}
              style={{ cursor: 'zoom-in' }}
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
        )}
        <p style={{ textAlign: 'center', color: '#666' }}>拖动调整头像位置，滚轮缩放头像大小</p>
      </Modal>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <BackButton onClick={() => navigate(-1)} text="返回" style={{ marginBottom: 24 }} />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card
          style={{
            ...glassCardStyle(glassMode, isDarkMode),
            borderRadius: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            background: isDarkMode ? '#141414' : '#ffffff'
          }}
          styles={{ body: { padding: 0 } }}
        >
          <Tabs
            items={tabItems}
            style={{ padding: '0 8px' }}
            tabBarStyle={{
              padding: '8px 16px 0',
              marginBottom: 0,
            }}
          />
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default UserCenter;
