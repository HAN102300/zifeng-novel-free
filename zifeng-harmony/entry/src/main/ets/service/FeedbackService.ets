/**
 * 反馈服务
 * 提供用户反馈提交和查询功能
 */
import ApiClient from './ApiClient';

/**
 * 反馈数据模型
 */
export interface Feedback {
  id: number;
  title: string;
  content: string;
  contact?: string;
  status: string;
  createdAt: string;
  reply?: string;
}

/**
 * 提交反馈请求参数
 * 字段名与后端 CreateFeedbackRequest 一致
 */
export interface SubmitFeedbackData {
  category: string;
  title: string;
  content: string;
  pageUrl?: string;
  userAgent?: string;
}

/**
 * 提交反馈响应结果
 */
export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
}

/**
 * 获取反馈列表响应结果
 */
export interface GetFeedbacksResponse {
  success: boolean;
  data: Feedback[];
}

/**
 * 反馈服务类
 * 负责处理用户反馈相关的 API 调用
 */
class FeedbackService {
  private static instance: FeedbackService;

  private constructor() {}

  /**
   * 获取 FeedbackService 单例实例
   */
  public static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  /**
   * 提交反馈
   * @param data 反馈数据，包含分类、标题、内容和可选的页面URL/UA
   * @returns 提交结果
   */
  public async submitFeedback(data: SubmitFeedbackData): Promise<SubmitFeedbackResponse> {
    try {
      // 确保 category 有默认值
      const requestData: SubmitFeedbackData = {
        category: data.category || 'other',
        title: data.title,
        content: data.content,
        pageUrl: data.pageUrl,
        userAgent: data.userAgent
      };
      const response = await ApiClient.post<SubmitFeedbackResponse>('/feedback', requestData);
      return response.data;
    } catch (error) {
      console.error('提交反馈失败:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 获取我的反馈列表
   * @returns 反馈列表
   */
  public async getMyFeedbacks(): Promise<GetFeedbacksResponse> {
    try {
      const response = await ApiClient.get<GetFeedbacksResponse>('/feedback/mine');
      return response.data;
    } catch (error) {
      console.error('获取反馈列表失败:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

// 导出单例实例
export default FeedbackService.getInstance();
