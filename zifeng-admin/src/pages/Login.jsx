import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Form, Input, Button, Card, message, Switch, Space } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { getCaptcha, adminLogin } from '../utils/adminApi';
import { ThemeContext } from '../App';

const Login = () => {
  const navigate = useNavigate();
  const { isDarkMode, setIsDarkMode } = useContext(ThemeContext);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [captchaKey, setCaptchaKey] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await getCaptcha();
      if (res.data?.success) {
        setCaptchaKey(res.data.data.captchaKey);
        setCaptchaImage(res.data.data.captchaImage);
      }
    } catch {
      message.error('获取验证码失败');
    } finally {
      setCaptchaLoading(false);
    }
  };

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const res = await adminLogin({
        username: values.username,
        password: values.password,
        captcha: values.captcha,
        captchaKey: captchaKey,
      });
      if (res.data?.success) {
        const { token, admin } = res.data.data;
        localStorage.setItem('zifeng_admin_token', token);
        localStorage.setItem('zifeng_admin_info', JSON.stringify(admin));
        window.dispatchEvent(new Event('auth-change'));
        message.success('登录成功');
        navigate('/dashboard');
      } else {
        message.error(res.data?.message || '登录失败');
        fetchCaptcha();
      }
    } catch (err) {
      message.error(err.response?.data?.message || '登录失败，请检查网络');
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDarkMode
        ? 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-5%',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        top: 24,
        right: 24,
        zIndex: 10,
      }}>
        <Space>
          {isDarkMode ? <SunOutlined style={{ color: 'rgba(255,255,255,0.6)' }} /> : <MoonOutlined style={{ color: 'rgba(255,255,255,0.6)' }} />}
          <Switch
            checked={isDarkMode}
            onChange={setIsDarkMode}
            size="small"
          />
        </Space>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card
          style={{
            width: 420,
            borderRadius: 20,
            background: isDarkMode
              ? 'rgba(20, 20, 30, 0.85)'
              : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            border: isDarkMode
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid rgba(255,255,255,0.3)',
            boxShadow: isDarkMode
              ? '0 24px 80px rgba(0,0,0,0.5)'
              : '0 24px 80px rgba(0,0,0,0.15)',
          }}
          styles={{ body: { padding: '40px 36px' } }}
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ textAlign: 'center', marginBottom: 36 }}
          >
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 28,
              color: '#fff',
              fontWeight: 'bold',
              boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
            }}>
              枫
            </div>
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              margin: 0,
              color: isDarkMode ? '#f0f0f0' : '#1a1a2e',
              letterSpacing: '1px',
            }}>
              紫枫小说管理后台
            </h1>
            <p style={{
              fontSize: 13,
              color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)',
              marginTop: 8,
            }}>
              请输入管理员账号登录
            </p>
          </motion.div>

          <Form
            form={form}
            onFinish={handleLogin}
            size="large"
            autoComplete="off"
          >
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 2, message: '用户名至少2个字符' },
                  { max: 8, message: '用户名最多8个字符' },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }} />}
                  placeholder="用户名"
                  style={{ borderRadius: 10, height: 46 }}
                />
              </Form.Item>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }} />}
                  placeholder="密码"
                  style={{ borderRadius: 10, height: 46 }}
                />
              </Form.Item>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <Form.Item
                name="captcha"
                rules={[{ required: true, message: '请输入验证码' }]}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <Input
                    prefix={<SafetyOutlined style={{ color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }} />}
                    placeholder="验证码"
                    style={{ borderRadius: 10, height: 46, flex: 1 }}
                  />
                  <div
                    onClick={fetchCaptcha}
                    style={{
                      height: 46,
                      width: 130,
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f5f5f5',
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#d9d9d9'}`,
                      flexShrink: 0,
                    }}
                  >
                    {captchaLoading ? (
                      <span style={{ fontSize: 12, color: isDarkMode ? '#666' : '#999' }}>加载中...</span>
                    ) : captchaImage ? (
                      <img
                        src={captchaImage}
                        alt="验证码"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 12, color: isDarkMode ? '#666' : '#999' }}>点击获取</span>
                    )}
                  </div>
                </div>
              </Form.Item>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{
                    borderRadius: 10,
                    height: 46,
                    fontSize: 16,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  登 录
                </Button>
              </Form.Item>
            </motion.div>
          </Form>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
