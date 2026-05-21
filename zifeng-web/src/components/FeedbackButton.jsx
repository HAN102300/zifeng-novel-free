import React, { useState } from 'react';
import { FloatButton, Modal, Form, Input, Select, Button, message } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { submitFeedback } from '../utils/apiClient';

const { TextArea } = Input;
const { Option } = Select;

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await submitFeedback({
        ...values,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
      });
      message.success('感谢您的反馈！我们会尽快处理');
      form.resetFields();
      setOpen(false);
    } catch (err) {
      message.error(err.response?.data?.message || '提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatButton
        icon={<MessageOutlined />}
        type="primary"
        style={{ right: 24, bottom: 80 }}
        onClick={() => setOpen(true)}
        tooltip="提交反馈"
      />
      <Modal
        title="提交反馈"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="category"
            label="反馈类型"
            rules={[{ required: true, message: '请选择反馈类型' }]}
          >
            <Select placeholder="请选择">
              <Option value="bug">Bug 报告</Option>
              <Option value="feature">功能建议</Option>
              <Option value="ux">体验问题</Option>
              <Option value="performance">性能问题</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="简要描述问题" maxLength={200} />
          </Form.Item>
          <Form.Item
            name="content"
            label="详细描述"
            rules={[{ required: true, message: '请输入详细描述' }]}
          >
            <TextArea rows={4} placeholder="请详细描述您遇到的问题或建议..." maxLength={2000} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              提交反馈
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
