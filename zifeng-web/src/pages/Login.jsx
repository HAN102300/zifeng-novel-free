import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Form, Input, Button, Space, Typography, message, Divider, Checkbox, Spin } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EyeInvisibleOutlined, EyeTwoTone, SafetyOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import { ThemeContext } from '../App';
import { authLogin, authRegister, getCaptcha } from '../utils/apiClient';
import { glassCardStyle } from '../utils/glassStyle';
import { ReactBitsErrorBoundary } from '../components/react-bits';

const { Title, Text } = Typography;

const Login = ({ setIsLoggedIn, setUserInfo }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme, themeConfigs, isDarkMode, glassMode } = useContext(ThemeContext);
  const [isLogin, setIsLogin] = useState(true);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  
  const color = themeConfigs[currentTheme].primaryColor;

  const refreshCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const result = await getCaptcha();
      if (result && result.success && result.data) {
        setCaptchaId(result.data.captchaId);
        setCaptchaImage(result.data.image);
      }
    } catch (error) {
      console.error('刷新验证码失败:', error);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    refreshCaptcha();
  }, [isLogin]);

  const handleSubmit = async (values) => {
    if (loading) return; // 防抖：正在提交时忽略
    setLoading(true);
    try {
      const rememberMe = !!form.getFieldValue('remember');

      if (isLogin) {
        const result = await authLogin(values.username, values.password, rememberMe, captchaId, values.captchaCode);
        if (!result.success) {
          message.error(result.message || '登录失败');
          return;
        }
        const userInfo = {
          id: result.data.userId,
          username: result.data.username,
          avatar: result.data.avatar,
          lastLogin: new Date().toISOString(),
        };
        setIsLoggedIn(true);
        setUserInfo(userInfo);
        window.dispatchEvent(new Event('auth-login'));
        message.success('登录成功');
        const from = location.state?.from || '/';
        navigate(from, { replace: true });
      } else {
        const result = await authRegister(values.username, values.password, values.email, captchaId, values.captchaCode);
        if (!result.success) {
          message.error(result.message || '注册失败');
          return;
        }
        const loginResult = await authLogin(values.username, values.password, false, captchaId, values.captchaCode);
        if (!loginResult.success) {
          message.success('注册成功，请登录');
          setIsLogin(true);
          form.resetFields();
          form.setFieldsValue({ username: values.username, password: values.password });
          return;
        }
        const userInfo = {
          id: loginResult.data.userId,
          username: loginResult.data.username,
          avatar: loginResult.data.avatar,
          lastLogin: new Date().toISOString(),
        };
        setIsLoggedIn(true);
        setUserInfo(userInfo);
        window.dispatchEvent(new Event('auth-login'));
        message.success('注册成功');
        const from = location.state?.from || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (!error.response) {
        message.error('网络连接失败，请检查网络后重试');
      } else {
        message.error('操作失败，请重试');
      }
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh',
        padding: '20px',
        position: 'relative'
      }}
    >
      {glassMode && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`, filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: 350, height: 350, borderRadius: '50%', background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`, filter: 'blur(60px)' }} />
        </div>
      )}
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 'var(--zf-r-lg)',
          boxShadow: 'var(--zf-shadow-lg)',
          overflow: 'hidden',
          ...glassCardStyle(glassMode, isDarkMode)
        }}
      >
        <BackButton onClick={() => navigate(-1)} text="返回" style={{ marginBottom: 'var(--zf-s5)' }} />

        <div style={{ textAlign: 'center', marginBottom: 'var(--zf-s8)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              width: 56,
              height: 56,
              margin: '0 auto var(--zf-s4)',
              borderRadius: 'var(--zf-r-md)',
              background: 'linear-gradient(135deg, var(--zf-primary-500), var(--zf-accent-magenta))',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontFamily: 'var(--zf-font-serif)',
              fontWeight: 900,
              fontSize: 28,
              boxShadow: 'var(--zf-glow-primary)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            枫
            <span style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,.5) 50%, transparent 70%)',
              animation: 'logoShine 4s ease-in-out infinite',
              transform: 'translateX(-120%)'
            }} />
          </motion.div>
          <Title level={3} style={{ margin: 0, color: color }}>
            <motion.span
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.6 }}
            >
              {isLogin ? '用户登录' : '用户注册'}
            </motion.span>
          </Title>
          <Text type="secondary">
            {isLogin ? '请输入账号密码登录' : '请填写信息注册账号'}
          </Text>
        </div>
        
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度在3-20之间' }
            ]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: color }} />} 
              placeholder="请输入用户名"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少6位' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: color }} />} 
              placeholder="请输入密码"
              size="large"
              style={{ borderRadius: 8 }}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="captchaCode"
            label="验证码"
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 4, message: '验证码为4位字符' }
            ]}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input
                prefix={<SafetyOutlined style={{ color: color }} />}
                placeholder="请输入验证码"
                size="large"
                style={{ borderRadius: 8, flex: 1 }}
                maxLength={4}
              />
              <div
                onClick={refreshCaptcha}
                style={{
                  width: 120,
                  height: 40,
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: `1px solid ${isDarkMode ? '#444' : '#d9d9d9'}`,
                  background: isDarkMode ? '#1f1f1f' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                title="点击刷新验证码"
              >
                {captchaLoading ? (
                  <Spin size="small" />
                ) : captchaImage ? (
                  <img src={captchaImage} alt="验证码" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Text style={{ fontSize: 12, color: '#999' }}>点击获取</Text>
                )}
              </div>
            </div>
          </Form.Item>
          
          {!isLogin && (
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入正确的邮箱格式' }
              ]}
            >
              <Input 
                prefix={<MailOutlined style={{ color: color }} />} 
                placeholder="请输入邮箱"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          )}
          
          {isLogin && (
            <Form.Item>
              <Space direction="horizontal" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住我，3天内免登录</Checkbox>
                </Form.Item>
                <Button type="text" style={{ color: color }} onClick={() => navigate('/reset-password')}>忘记密码</Button>
              </Space>
            </Form.Item>
          )}
          
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 'var(--zf-r-full)',
                border: 'none',
                backgroundImage: `linear-gradient(135deg, ${color}, ${color}cc)`,
                boxShadow: `0 6px 22px ${color}66, var(--zf-glow-primary)`
              }}
            >
              {isLogin ? '登录' : '注册'}
            </Button>
          </Form.Item>
        </Form>
        
        <Divider style={{ margin: '20px 0' }} />
        
        <div style={{ textAlign: 'center' }}>
          <Text>
            {isLogin ? '还没有账号？' : '已有账号？'}
            <Button 
              type="text" 
              style={{ color: color, marginLeft: 8 }}
              onClick={() => {
                setIsLogin(!isLogin);
                form.resetFields();
              }}
            >
              {isLogin ? '立即注册' : '立即登录'}
            </Button>
          </Text>
        </div>
      </Card>
    </motion.div>
  );
};

export default Login;