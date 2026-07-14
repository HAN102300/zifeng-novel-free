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

interface FeedbackTypeLabels {
  suggestion: string;
  bug: string;
  content: string;
  other: string;
}

interface FeedbackStatusLabels {
  pending: string;
  processing: string;
  resolved: string;
  closed: string;
}

/** 别名：反馈项（对齐 UI 层命名） */
export type Feedback = FeedbackItem;

const TYPE_LABELS: FeedbackTypeLabels = {
  suggestion: "功能建议",
  bug: "问题反馈",
  content: "内容问题",
  other: "其他",
};

const STATUS_LABELS: FeedbackStatusLabels = {
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

export interface FeedbackSubmitData {
  type: FeedbackType;
  content: string;
  contact?: string;
}

export class FeedbackService {
  static async submit(
    typeOrData: FeedbackType | FeedbackSubmitData,
    content?: string,
    contact?: string,
  ): Promise<boolean> {
    let data: FeedbackSubmitData;
    if (typeof typeOrData === "string") {
      data = { type: typeOrData, content: content ?? "", contact: contact } as FeedbackSubmitData;
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
    const result: FeedbackWithLabels[] = [];
    for (const item of list) {
      let typeLabel: string = item.type;
      if (item.type === 'suggestion') typeLabel = TYPE_LABELS.suggestion;
      else if (item.type === 'bug') typeLabel = TYPE_LABELS.bug;
      else if (item.type === 'content') typeLabel = TYPE_LABELS.content;
      else if (item.type === 'other') typeLabel = TYPE_LABELS.other;

      let statusLabel: string = item.status;
      if (item.status === 'pending') statusLabel = STATUS_LABELS.pending;
      else if (item.status === 'processing') statusLabel = STATUS_LABELS.processing;
      else if (item.status === 'resolved') statusLabel = STATUS_LABELS.resolved;
      else if (item.status === 'closed') statusLabel = STATUS_LABELS.closed;

      const labeled: FeedbackWithLabels = {
        id: item.id,
        type: item.type,
        content: item.content,
        contact: item.contact,
        status: item.status,
        reply: item.reply,
        createdAt: item.createdAt,
        typeLabel: typeLabel,
        statusLabel: statusLabel,
      };
      result.push(labeled);
    }
    return result;
  }
}
