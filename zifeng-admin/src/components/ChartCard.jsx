import React from 'react';
import { Card } from 'antd';
import { CHART_CARD, LIFT_CLASS } from '../utils/ui';

/**
 * 后台唯一的「图表卡」。
 * 收编现状：Overview / SourceStats 各写一份带渐变小圆点的 Card title、
 * 四份近似但不同的 cardStyle、以及 animejs 的 cardHover/cardLeave。
 * 标题前不再放装饰圆点 —— 全站只保留侧栏顶端一条渐变装饰。
 */
export default function ChartCard({ title, extra, children, style, bodyStyle }) {
  return (
    <Card
      {...CHART_CARD}
      className={`${CHART_CARD.className} ${LIFT_CLASS}`}
      style={{ ...CHART_CARD.style, ...style }}
      styles={{
        ...CHART_CARD.styles,
        header: { borderBottom: 'none' },
        ...(bodyStyle ? { body: bodyStyle } : null),
      }}
      title={title}
      extra={extra}
    >
      {children}
    </Card>
  );
}
