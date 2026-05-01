import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Form, Input, Button, Space, Typography, message, Divider, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import { ThemeContext } from '../App';
import { authLogin, authRegister } from '../utils/apiClient';

const { Title, Text } = Typography;

const Login = ({ setIsLoggedIn, setUserInfo }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme, themeConfigs, isDarkMode } = useContext(ThemeContext);
  const [isLogin, setIsLogin] = useState(true);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  const color = themeConfigs[currentTheme].primaryColor;

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const rememberMe = !!form.getFieldValue('remember');

      if (isLogin) {
        const result = await authLogin(values.username, values.password, rememberMe);
        if (!result.success) {
          message.error(result.message || '登录失败');
          return;
        }
        const userInfo = {
          id: result.data.userId,
          username: result.data.username,
          nickname: result.data.nickname,
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
        const result = await authRegister(values.username, values.password, values.email);
        if (!result.success) {
          message.error(result.message || '注册失败');
          return;
        }
        const loginResult = await authLogin(values.username, values.password, false);
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
          nickname: loginResult.data.nickname,
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
        padding: '20px'
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}
      >
        <BackButton onClick={() => navigate(-1)} text="返回" style={{ marginBottom: 20 }} />
        
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Title level={3} style={{ margin: 0, color: color }}>
            {isLogin ? '用户登录' : '用户注册'}
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
                borderRadius: 8,
                backgroundColor: color,
                borderColor: color
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