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

export class FeedbackService {
  /** 提交反馈 */
  static async submit(
    type: FeedbackType,
    content: string,
    contact?: string,
  ): Promise<boolean> {
    return ApiClient.post<boolean>("/api/feedback/submit", {
      type,
      content,
      contact,
    });
  }

  /** 获取反馈历史 */
  static async getHistory(): Promise<FeedbackItem[]> {
    return ApiClient.get<FeedbackItem[]>("/api/feedback/list");
  }
}
