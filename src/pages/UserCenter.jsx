import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Row, Col, Typography, Space, Button, Upload, Avatar, Descriptions, message, Modal } from 'antd';
import { UserOutlined, MailOutlined, LogoutOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import AvatarEditor from 'react-avatar-editor';
import { ThemeContext } from '../App';
import { getUserInfo, clearUserInfo, updateUserAvatar } from '../utils/storage';

const { Title, Text } = Typography;
const { Dragger } = Upload;

// 时间格式化函数
const formatDate = (dateString) => {
  if (!dateString) return '未知';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}时${minutes}分${seconds}秒`;
};

const UserCenter = ({ setIsLoggedIn, setUserInfo }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme, themeConfigs, isDarkMode } = useContext(ThemeContext);
  const [userInfo, setLocalUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropScale, setCropScale] = useState(1.2);
  const editorRef = useRef(null);
  
  const color = themeConfigs[currentTheme].primaryColor;

  // 加载用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      const user = await getUserInfo();
      if (user) {
        setLocalUserInfo(user);
      } else {
        // 未登录，跳转到登录页面
        navigate('/login', { state: { from: '/user' } });
      }
    };
    
    loadUserInfo();
  }, [navigate]);

  // 处理头像上传
  const handleAvatarUpload = (file) => {
    // 检查文件格式
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      message.error('只支持 JPG、PNG、GIF 格式的图片');
      return false;
    }
    
    // 检查文件大小（2MB）
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error('文件大小不能超过 2MB');
      return false;
    }
    
    // 读取文件并显示裁剪模态框
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropImage(e.target.result);
      setCropScale(1.2);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    
    // 阻止自动上传
    return false;
  };
  
  // 处理裁剪并上传
  const handleCropUpload = () => {
    if (editorRef.current) {
      setLoading(true);
      // 获取裁剪后的图片
      const canvas = editorRef.current.getImage();
      canvas.toBlob(async (blob) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const avatarUrl = e.target.result;
          const success = await updateUserAvatar(userInfo.username, avatarUrl);
          if (success) {
            const updatedUserInfo = { ...userInfo, avatar: avatarUrl };
            setLocalUserInfo(updatedUserInfo);
            setUserInfo(updatedUserInfo);
            message.success('头像更新成功');
          } else {
            message.error('头像更新失败');
          }
          setLoading(false);
          setShowCropModal(false);
          setCropImage(null);
        };
        reader.readAsDataURL(blob);
      });
    }
  };

  // 处理退出登录
  const handleLogout = () => {
    clearUserInfo();
    setIsLoggedIn(false);
    setUserInfo(null);
    message.success('退出登录成功');
    navigate('/');
  };

  if (!userInfo) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={{ minHeight: '80vh' }}
    >
      {/* 头像裁剪模态框 */}
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
            borderRadius: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            background: isDarkMode ? '#141414' : '#ffffff'
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Row gutter={[24, 24]} style={{ padding: '32px 24px' }}>
            {/* 左侧：头像和基本信息 */}
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
                
                <Title level={4} style={{ margin: 0, marginBottom: 8 }}>{userInfo.username}</Title>
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
                    支持 JPG、PNG、GIF 格式，文件大小不超过 2MB
                  </p>
                </Dragger>
              </motion.div>
            </Col>
            
            {/* 右侧：详细信息 */}
            <Col xs={24} md={16}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Title level={3} style={{ margin: 0, color: color, marginBottom: 24 }}>个人信息</Title>
                
                <Card
                  style={{
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: isDarkMode ? '#1e1e1e' : '#f9f9f9',
                    marginBottom: 24
                  }}
                  bodyStyle={{ padding: 20 }}
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
                      {formatDate(userInfo.lastLogin)}
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
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default UserCenter;