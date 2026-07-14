/**
 * RankService - 排行榜服务
 * 规格：§3.4 排行榜页
 *
 * 6 个榜单类型：必读/潜力/完本/更新/热搜/评论
 * 接口对齐 zifeng-parser /api/rank
 */
import { ApiClient } from "./ApiClient";
import { NovelItem } from "../model/NovelItem";

export type RankType =
  | "mustRead"
  | "potential"
  | "completed"
  | "updated"
  | "search"
  | "comment";

export interface RankConfig {
  type: RankType;
  name: string;
  accentColor: string;
}

interface RankParams {
  type: RankType;
  page: string;
}

export const RANK_CONFIGS: RankConfig[] = [
  { type: "mustRead", name: "必读榜", accentColor: "#FAAD14" },
  { type: "potential", name: "潜力榜", accentColor: "#13C2C2" },
  { type: "completed", name: "完本榜", accentColor: "#52C41A" },
  { type: "updated", name: "更新榜", accentColor: "#FA8C16" },
  { type: "search", name: "热搜榜", accentColor: "#F5222D" },
  { type: "comment", name: "评论榜", accentColor: "#722ED1" },
];

export class RankService {
  /** 获取排行榜数据 */
  static async getRank(type: RankType, page: number = 1): Promise<NovelItem[]> {
    return ApiClient.get<NovelItem[]>(`/api/rank/${type}`);
  }

  /** 获取首页排行榜（精简版，每榜 5 条） */
  static async getHomeRank(type: RankType): Promise<NovelItem[]> {
    const all = await RankService.getRank(type, 1);
    return all.slice(0, 5);
  }
}
