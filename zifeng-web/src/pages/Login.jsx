import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Form, Input, Button, Space, Checkbox, Divider, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  SafetyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { authLogin, authRegister, getCaptcha } from '../utils/apiClient';
import { ZfPageShell, ZfPageHeader, ZfGlassSurface } from '@zifeng/ui/components';
import { variants } from '@zifeng/ui/motion';

/* ============================================================
   紫枫免费小说 · 登录 / 注册（P2 迁移）
   - 本页同时是「认证表单视觉」的唯一来源：AuthShell / AuthSubmitButton /
     AUTH_RULES 都用命名导出交出，ResetPassword.jsx 直接复用，
     两个页面不再各写一份卡片、标题、输入框与主按钮样式。
   - 「返回」圆钮从卡片内部左上角搬到卡外，交给 ZfPageHeader back
   - 标题不再用 violet→pink→cyan 渐变字：功能型标题回到常规标题色
   - 卡片 → ZfGlassSurface（毛玻璃开关由 [data-glass='off'] 承接），
     容器 → ZfPageShell size="xs"，不再自己写 maxWidth 400
   - 登录按钮的强发光改挂 --zf-glow-brand 令牌
   - 验证码：① 输入框与图片同一控制高度（antd controlHeightLG=44）
     ② 图片容器统一圆角 + 玻璃描边 + 恒定浅色底板（深色模式下白底 PNG
       也不会糊在黑玻璃上）
     ③ objectFit 由 cover 改 contain，120×40 的原图不再被裁边
     ④ 右侧常驻一枚刷新位（触屏没有 hover，只靠 title 等于不可发现）
     ⑤ 修正字段绑定：原来 Form.Item name="captchaCode" 挂在一个 div 上，
       antd 拿不到 Input 的值，验证码永远校验不过 —— 改成嵌套 noStyle
       Form.Item（只动表单结构，认证请求流程与参数一字未改）
   - 页内那两层 filter:blur() 光球已删：App.jsx 的 GlassBackground 与
     NovelBackground 本来就在更外层渲染氛围，页面再画一次是重复出资
   - ★干扰线/噪点由后端画进 PNG（zifeng-server .../CaptchaService.java，
     6 条干扰线 + 30 个噪点），前端改不动，详见迁移报告
   ============================================================ */

/* ---------- 认证表单共用件（ResetPassword.jsx 会 import） ---------- */

/** 认证页外壳：窄容器 + 卡外返回 + 玻璃卡 */
export function AuthShell({ title, subtitle, back, children }) {
  return (
    <ZfPageShell
      size="xs"
      style={{ paddingBlock: 'var(--zf-s10)' }}
      header={<ZfPageHeader back={back} title={title} subtitle={subtitle} />}
    >
      <motion.div variants={variants.scaleIn} initial="initial" animate="animate">
        <ZfGlassSurface level={2} style={{ padding: 'var(--zf-s6)' }}>
          {children}
        </ZfGlassSurface>
      </motion.div>
    </ZfPageShell>
  );
}

/** 校验规则：两个页面共用同一份，避免「一处改宽松一处改严格」 */
export const AUTH_RULES = {
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, max: 20, message: '用户名长度在 3-20 之间' },
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码长度至少 6 位' },
  ],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入正确的邮箱格式' },
  ],
  captcha: [
    { required: true, message: '请输入验证码' },
    { len: 4, message: '验证码为 4 位字符' },
  ],
};

/** 前缀图标：统一品牌色，不再各页取 themeConfigs 的 hex */
export const FIELD_PREFIX_STYLE = { color: 'var(--zf-brand-400)' };

/** 主提交按钮：渐变底与发光都走令牌 */
export function AuthSubmitButton({ children, loading }) {
  return (
    <Button
      type="primary"
      htmlType="submit"
      size="large"
      loading={loading}
      classNames={{ root: 'zf-btn zf-btn--brand' }}
      style={{ width: '100%', boxShadow: 'var(--zf-glow-brand)' }}
    >
      {children}
    </Button>
  );
}

/* ---------- 登录 / 注册 ---------- */

const Login = ({ setIsLoggedIn, setUserInfo }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

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
    <AuthShell
      back
      title={isLogin ? '用户登录' : '用户注册'}
      subtitle={isLogin ? '请输入账号密码登录' : '请填写信息注册账号'}
    >
      {/* 品牌标记：静态渐变块，不再挂 infinite 扫光（玻璃卡内不得有无限动画） */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--zf-s5)' }}>
        <span
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 'var(--zf-r-md)',
            background: 'var(--zf-grad-brand)',
            boxShadow: 'var(--zf-glow-brand-soft)',
            color: 'var(--zf-on-accent)',
            fontFamily: 'var(--zf-font-display)',
            fontWeight: 'var(--zf-fw-black)',
            fontSize: 'var(--zf-fs-xl)',
          }}
        >
          枫
        </span>
      </div>

      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item name="username" label="用户名" rules={AUTH_RULES.username}>
          <Input
            prefix={<UserOutlined style={FIELD_PREFIX_STYLE} />}
            placeholder="请输入用户名"
            size="large"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item name="password" label="密码" rules={AUTH_RULES.password}>
          <Input.Password
            prefix={<LockOutlined style={FIELD_PREFIX_STYLE} />}
            placeholder="请输入密码"
            size="large"
            autoComplete="current-password"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item label="验证码" required>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s2)' }}>
            <Form.Item name="captchaCode" noStyle rules={AUTH_RULES.captcha}>
              <Input
                prefix={<SafetyOutlined style={FIELD_PREFIX_STYLE} />}
                placeholder="请输入验证码"
                size="large"
                maxLength={4}
                autoComplete="off"
                style={{ flex: 1, minWidth: 0 }}
              />
            </Form.Item>
            {/* 与 size="large" 输入框同一控制高度（antd controlHeightLG=44），
                底板恒定浅色（不随深色模式变黑），objectFit 用 contain
                以免 120×40 的原图被裁掉边 */}
            <button
              type="button"
              onClick={refreshCaptcha}
              title="点击刷新验证码"
              aria-label="点击刷新验证码"
              style={{
                width: 132,
                height: 44,
                flexShrink: 0,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                borderRadius: 'var(--zf-r-md)',
                background: 'var(--zf-brand-50)',
                border: '1px solid var(--zf-glass-border)',
              }}
            >
              {captchaLoading ? (
                /* 不用 Spin / ReloadOutlined 的 spin：那是落在玻璃卡内部的
                   infinite 动画，违反合成器铁律第 ④ 条。这里只要一句文案。 */
                <span className="zf-caption" style={{ margin: '0 auto' }}>
                  刷新中…
                </span>
              ) : captchaImage ? (
                <img
                  src={captchaImage}
                  alt="验证码"
                  style={{ width: 110, height: '100%', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <span className="zf-caption" style={{ margin: '0 auto' }}>
                  点击获取
                </span>
              )}
              {/* 常驻可见的刷新位（触屏无 hover，只能靠看得见的图标发现） */}
              <span
                aria-hidden="true"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 22,
                  height: '100%',
                  flexShrink: 0,
                  fontSize: 'var(--zf-fs-xs)',
                  color: 'var(--zf-brand-600)',
                  background: 'var(--zf-brand-100)',
                }}
              >
                <ReloadOutlined />
              </span>
            </button>
          </div>
        </Form.Item>

        {!isLogin && (
          <Form.Item name="email" label="邮箱" rules={AUTH_RULES.email}>
            <Input
              prefix={<MailOutlined style={FIELD_PREFIX_STYLE} />}
              placeholder="请输入邮箱"
              size="large"
              autoComplete="email"
            />
          </Form.Item>
        )}

        {isLogin && (
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我，3天内免登录</Checkbox>
              </Form.Item>
              <Button type="text" onClick={() => navigate('/reset-password')}>
                忘记密码
              </Button>
            </Space>
          </Form.Item>
        )}

        <Form.Item>
          <AuthSubmitButton loading={loading}>{isLogin ? '登录' : '注册'}</AuthSubmitButton>
        </Form.Item>
      </Form>

      <Divider style={{ margin: 'var(--zf-s4) 0' }} />

      <div style={{ textAlign: 'center', fontSize: 'var(--zf-fs-sm)' }}>
        {isLogin ? '还没有账号？' : '已有账号？'}
        <Button
          type="text"
          style={{ color: 'var(--zf-brand-400)' }}
          onClick={() => {
            setIsLogin(!isLogin);
            form.resetFields();
          }}
        >
          {isLogin ? '立即注册' : '立即登录'}
        </Button>
      </div>
    </AuthShell>
  );
};

export default Login;
