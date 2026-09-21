import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Form, Input, Button, message, Switch } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { ZfAmbient, ZfGlassSurface } from '@zifeng/ui/components';
import { variants, DUR, EASE } from '@zifeng/ui/motion';
import { getCaptcha, adminLogin } from '../utils/adminApi';
import { ThemeContext } from '../App';
import { BRAND_NAME, USERNAME_RULES, CAPTCHA_RULES } from '../utils/ui';

/* 表单条目错峰入场：容器只管节奏，子项复用共享 variants，
   原先是 5 处各写一遍 initial/animate + 字面量 cubic-bezier。 */
const fieldStagger = {
  initial: {},
  animate: {
    transition: { staggerChildren: DUR.fastest / 1000, delayChildren: DUR.fast / 1000 },
  },
};

const Login = () => {
  const navigate = useNavigate();
  const { isDarkMode, setIsDarkMode } = useContext(ThemeContext);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [captchaKey, setCaptchaKey] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  /* 首屏就会发起请求，初值直接给 loading；effect 内同步 setState 会多渲染一轮 */
  const [captchaLoading, setCaptchaLoading] = useState(true);

  /* 取数包在异步 run() 里（与 zifeng-web 的 RankDetail 同形）：
     effect 的同步路径上不产生任何状态更新 */
  const fetchCaptcha = useCallback(() => {
    const run = async () => {
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
    run();
  }, []);

  /* 事件里主动刷新验证码（点击图形、登录失败重取）：先回到加载态再请求 */
  const refreshCaptcha = () => {
    setCaptchaLoading(true);
    fetchCaptcha();
  };

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

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
        navigate('/dashboard/overview');
      } else {
        message.error(res.data?.message || '登录失败');
        refreshCaptcha();
      }
    } catch (err) {
      message.error(err.response?.data?.message || '登录失败，请检查网络');
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        /* 原先写死两套渐变：暗色是蓝黑、亮色是靛紫 —— 蓝黑与用户端完全不同源，
           靛紫又和后台内部脱节。改接画布令牌后，登录页与它要进的那个后台是同一个底色。 */
        background: 'linear-gradient(160deg, var(--zf-canvas) 0%, var(--zf-canvas-2) 55%, var(--zf-surface-1) 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: 'var(--zf-s6) var(--zf-s4)',
      }}
    >
      {/* 三颗 blur(60–80px) 的彩色圆斑 → 共享氛围层。
          它必须是玻璃卡的兄弟层（合成器铁律 ②），所以放在卡片外面。 */}
      <ZfAmbient count={3} />

      <div style={{ position: 'absolute', top: 'var(--zf-s5)', right: 'var(--zf-s5)', zIndex: 1 }}>
        <Switch
          checked={isDarkMode}
          onChange={setIsDarkMode}
          size="small"
          checkedIcon={<SunOutlined />}
          unCheckedIcon={<MoonOutlined />}
          aria-label="切换明暗模式"
        />
      </div>

      <motion.div
        variants={variants.scaleIn}
        initial="initial"
        animate="animate"
        style={{ position: 'relative', width: '100%', maxWidth: 'var(--zf-container-xs)' }}
      >
        <ZfGlassSurface level={3} style={{ borderRadius: 'var(--zf-r-xl)' }}>
          <div style={{ padding: 'var(--zf-s10) var(--zf-s8)' }}>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: DUR.fast / 1000, duration: DUR.normal / 1000, ease: EASE.out }}
              style={{ textAlign: 'center', marginBottom: 'var(--zf-s8)' }}
            >
              <div
                className="brand-pulse"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--zf-r-md)',
                  background: 'var(--zf-grad-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--zf-s4)',
                  fontSize: 'var(--zf-fs-3xl)',
                  color: 'var(--zf-on-accent)',
                  fontWeight: 'var(--zf-fw-bold)',
                  boxShadow: 'var(--zf-shadow-2)',
                }}
              >
                枫
              </div>
              <h1 className="zf-h2" style={{ fontSize: 'var(--zf-fs-xl)', color: 'var(--zf-text-primary)' }}>
                {BRAND_NAME}
              </h1>
              <p className="zf-caption" style={{ marginTop: 'var(--zf-s2)' }}>
                请输入管理员账号登录
              </p>
            </motion.div>

            <Form form={form} onFinish={handleLogin} size="large" autoComplete="off">
              <motion.div variants={fieldStagger} initial="initial" animate="animate">
                <motion.div variants={variants.listRise}>
                  <Form.Item name="username" rules={USERNAME_RULES}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                </motion.div>

                <motion.div variants={variants.listRise}>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                </motion.div>

                <motion.div variants={variants.listRise}>
                  {/* 此前 Form.Item 的 name 挂在包裹用的 div 上：antd 会把 value/onChange
                      注入 div，字段其实靠事件冒泡才侥幸收集到，且 div 上会残留 value 属性。
                      现在 name 回到 Input 本体，验证码图改为等高的兄弟节点。 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--zf-s3)' }}>
                    <Form.Item name="captcha" rules={CAPTCHA_RULES} style={{ flex: 1, marginBottom: 0 }}>
                      <Input prefix={<SafetyOutlined />} placeholder="验证码" />
                    </Form.Item>
                    <button
                      type="button"
                      className="captcha-chip"
                      onClick={refreshCaptcha}
                      disabled={captchaLoading}
                      aria-label="点击刷新验证码"
                      title="看不清？点击刷新"
                    >
                      {captchaLoading ? (
                        <span className="captcha-chip__hint">加载中…</span>
                      ) : captchaImage ? (
                        <img src={captchaImage} alt="登录验证码" />
                      ) : (
                        <span className="captcha-chip__hint">点击获取</span>
                      )}
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={variants.listRise}>
                  <Form.Item style={{ marginBottom: 0, marginTop: 'var(--zf-s6)' }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                      classNames={{ root: 'zf-btn zf-btn--brand' }}
                      style={{ fontSize: 'var(--zf-fs-base)' }}
                    >
                      登 录
                    </Button>
                  </Form.Item>
                </motion.div>
              </motion.div>
            </Form>
          </div>
        </ZfGlassSurface>
      </motion.div>
    </div>
  );
};

export default Login;
