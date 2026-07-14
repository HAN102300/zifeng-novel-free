/**
 * FeedbackService - 反馈服务
 * 规格：§5.4 反馈页
 *
 * 接口对齐 zifeng-server module-feedback
 */
import { ApiClient } from "./ApiClient";

export type FeedbackType = "suggestion" | "bug" | "content" | "other";
export type FeedbackStatus = "pending" | "processing" | "resolved" | "closed";

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  content: string;
  contact?: string;
  status: FeedbackStatus;
  reply?: string;
  createdAt: string;
}

/** 别名：反馈项（对齐 UI 层命名） */
export type Feedback = FeedbackItem;

const TYPE_LABELS: Record<FeedbackType, string> = {
  suggestion: "功能建议",
  bug: "问题反馈",
  content: "内容问题",
  other: "其他",
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: "待处理",
  processing: "处理中",
  resolved: "已解决",
  closed: "已关闭",
};

/** 扩展反馈项（含计算字段） */
export interface FeedbackWithLabels extends FeedbackItem {
  typeLabel: string;
  statusLabel: string;
}

export class FeedbackService {
  /** 提交反馈（支持对象参数） */
  static async submit(
    typeOrData: FeedbackType | { type: FeedbackType; content: string; contact?: string },
    content?: string,
    contact?: string,
  ): Promise<boolean> {
    let data: { type: FeedbackType; content: string; contact?: string };
    if (typeof typeOrData === "string") {
      data = { type: typeOrData, content: content ?? "", contact };
    } else {
      data = typeOrData;
    }
    return ApiClient.post<boolean>("/api/feedback/submit", data);
  }

  /** 获取反馈历史 */
  static async getHistory(): Promise<FeedbackItem[]> {
    return ApiClient.get<FeedbackItem[]>("/api/feedback/list");
  }

  /** 获取我的反馈（别名，附带标签字段） */
  static async getMyFeedback(): Promise<FeedbackWithLabels[]> {
    const list = await FeedbackService.getHistory();
    return list.map((item) => ({
      ...item,
      typeLabel: TYPE_LABELS[item.type] ?? item.type,
      statusLabel: STATUS_LABELS[item.status] ?? item.status,
    }));
  }
}
