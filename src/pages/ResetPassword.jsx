import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Form, Input, Button, Steps, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import { ThemeContext } from '../App';
import { getUser, saveUser } from '../utils/database';

const { Title, Text } = Typography;

const ResetPassword = () => {
  const navigate = useNavigate();
  const { currentTheme, themeConfigs, isDarkMode } = useContext(ThemeContext);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [step1Form] = Form.useForm();
  const [step2Form] = Form.useForm();

  const color = themeConfigs[currentTheme].primaryColor;

  // 步骤1：验证用户名和邮箱
  const handleVerify = async (values) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const user = await getUser(values.username);
      if (!user) {
        message.error('用户名不存在，请重新输入');
        return;
      }
      if (user.email !== values.email) {
        message.error('邮箱与注册邮箱不一致，请重新输入');
        return;
      }
      setVerifiedUser(user);
      setCurrentStep(1);
      message.success('验证成功，请设置新密码');
    } catch (error) {
      message.error('验证失败，请重试');
      console.error('验证失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 步骤2：重置密码
  const handleResetPassword = async (values) => {
    if (values.newPassword === verifiedUser.password) {
      message.error('新密码不能与旧密码相同，请重新输入');
      return;
    }
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const updatedUser = {
        ...verifiedUser,
        password: values.newPassword
      };
      await saveUser(updatedUser);
      message.success('密码重置成功，请重新登录');
      navigate('/login');
    } catch (error) {
      message.error('密码重置失败，请重试');
      console.error('密码重置失败:', error);
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
        <BackButton onClick={() => navigate('/login')} text="返回登录" style={{ marginBottom: 20 }} />

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0, color: color }}>
            重置密码
          </Title>
          <Text type="secondary">
            {currentStep === 0 ? '请验证您的身份信息' : '请设置新密码'}
          </Text>
        </div>

        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: '验证身份' },
            { title: '重置密码' }
          ]}
        />

        {currentStep === 0 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Form
              form={step1Form}
              onFinish={handleVerify}
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
                name="email"
                label="注册邮箱"
                rules={[
                  { required: true, message: '请输入注册邮箱' },
                  { type: 'email', message: '请输入正确的邮箱格式' }
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: color }} />}
                  placeholder="请输入注册时使用的邮箱"
                  size="large"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

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
                  验证身份
                </Button>
              </Form.Item>
            </Form>
          </motion.div>
        )}

        {currentStep === 1 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Form
              form={step2Form}
              onFinish={handleResetPassword}
              layout="vertical"
            >
              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码长度至少6位' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: color }} />}
                  placeholder="请输入新密码"
                  size="large"
                  style={{ borderRadius: 8 }}
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    }
                  })
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: color }} />}
                  placeholder="请再次输入新密码"
                  size="large"
                  style={{ borderRadius: 8 }}
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
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
                    重置密码
                  </Button>
                  <Button
                    size="large"
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: 8
                    }}
                    onClick={() => {
                      setCurrentStep(0);
                      step2Form.resetFields();
                    }}
                  >
                    返回上一步
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

export default ResetPassword;
