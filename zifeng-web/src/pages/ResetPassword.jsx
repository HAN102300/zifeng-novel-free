import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Form, Input, Button, Space, Steps, Alert, message } from 'antd';
import { LockOutlined, MailOutlined, EyeInvisibleOutlined, EyeTwoTone, UserOutlined } from '@ant-design/icons';
import { verifyUserForReset, resetPasswordDev } from '../utils/apiClient';
import { variants } from '@zifeng/ui/motion';
/* 认证表单视觉与校验规则一律复用 Login.jsx 的命名导出：
   两页共用同一套卡片 / 标题 / 输入框 / 主按钮，不再各写一份。 */
import { AuthShell, AuthSubmitButton, AUTH_RULES, FIELD_PREFIX_STYLE } from './Login.jsx';

/* ============================================================
   紫枫免费小说 · 重置密码（P2 迁移）
   - 与 Login 完全同一套外壳：AuthShell(size="xs" 窄容器 + 卡外返回 + 玻璃卡)
   - 标题不再用主题色渐变字，改由 ZfPageHeader 出常规标题色
   - 主按钮发光挂 --zf-glow-brand 令牌；次按钮用 zf-btn--ghost 双 class 提权
   - 「2-8 字符」这类校验文案与 Login 同一份 AUTH_RULES，不再两处手写
   - 返回登录用 back="/login"（原来是页内自己画一个 BackButton）
   - 保留：两步流程、verifyUserForReset / resetPasswordDev 调用与参数
   ============================================================ */

const ResetPassword = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [usernameValue, setUsernameValue] = useState('');
  const [step1Form] = Form.useForm();
  const [step2Form] = Form.useForm();

  const handleVerifyEmail = async (values) => {
    setLoading(true);
    try {
      const result = await verifyUserForReset(values.username, values.email);
      if (result.success && result.data?.verified) {
        setEmailValue(values.email);
        setUsernameValue(values.username);
        setCurrentStep(1);
        message.success('身份验证成功');
      } else {
        message.error(result.message || '身份验证失败');
      }
    } catch (error) {
      message.error(error.response?.data?.message || '身份验证失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (values) => {
    setLoading(true);
    try {
      const result = await resetPasswordDev({
        username: usernameValue,
        email: emailValue,
        newPassword: values.newPassword,
      });
      if (result.success) {
        message.success('密码重置成功，请重新登录');
        navigate('/login');
      } else {
        message.error(result.message || '密码重置失败');
      }
    } catch (error) {
      message.error(error.response?.data?.message || '密码重置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      back="/login"
      title="重置密码"
      subtitle={currentStep === 0 ? '请输入用户名和邮箱进行身份验证' : '请设置新密码'}
    >
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 'var(--zf-s6)' }}
        items={[{ title: '验证身份' }, { title: '设置新密码' }]}
      />

      {currentStep === 0 ? (
        <motion.div key="step1" variants={variants.pageSlide} initial="initial" animate="animate">
          <Form form={step1Form} onFinish={handleVerifyEmail} layout="vertical">
            <Form.Item name="username" label="用户名" rules={AUTH_RULES.username}>
              <Input
                prefix={<UserOutlined style={FIELD_PREFIX_STYLE} />}
                placeholder="请输入注册时使用的用户名"
                size="large"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item name="email" label="注册邮箱" rules={AUTH_RULES.email}>
              <Input
                prefix={<MailOutlined style={FIELD_PREFIX_STYLE} />}
                placeholder="请输入注册时使用的邮箱"
                size="large"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item>
              <AuthSubmitButton loading={loading}>验证身份</AuthSubmitButton>
            </Form.Item>
          </Form>
        </motion.div>
      ) : (
        <motion.div key="step2" variants={variants.pageSlide} initial="initial" animate="animate">
          <Alert
            type="success"
            showIcon
            icon={<UserOutlined />}
            style={{ marginBottom: 'var(--zf-s5)' }}
            message={
              <Space direction="vertical" size={2}>
                <span style={{ fontSize: 'var(--zf-fs-sm)' }}>
                  已验证账号：<b>{usernameValue}</b>
                </span>
                <span className="zf-mono" style={{ fontSize: 'var(--zf-fs-xs)' }}>
                  {emailValue}
                </span>
              </Space>
            }
          />

          <Form form={step2Form} onFinish={handleResetPassword} layout="vertical">
            <Form.Item name="newPassword" label="新密码" rules={AUTH_RULES.password}>
              <Input.Password
                prefix={<LockOutlined style={FIELD_PREFIX_STYLE} />}
                placeholder="请输入新密码"
                size="large"
                autoComplete="new-password"
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
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={FIELD_PREFIX_STYLE} />}
                placeholder="请再次输入新密码"
                size="large"
                autoComplete="new-password"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <AuthSubmitButton loading={loading}>重置密码</AuthSubmitButton>
                <Button
                  size="large"
                  classNames={{ root: 'zf-btn zf-btn--ghost' }}
                  style={{ width: '100%' }}
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
    </AuthShell>
  );
};

export default ResetPassword;
