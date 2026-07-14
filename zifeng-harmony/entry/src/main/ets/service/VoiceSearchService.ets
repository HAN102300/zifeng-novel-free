/**
 * VoiceSearchService - 语音搜索服务
 * 规格：移动端增强-3 语音搜索
 * 特性：语音识别、结果回调、权限处理
 * 实现：基于 @ohos.ai.asr 语音识别 Kit
 */
import asr from "@ohos.ai.asr";

interface VoiceSearchCallbacks {
  onResult: (text: string) => void;
  onError: (code: number, msg: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

export class VoiceSearchService {
  private static sessionId: string = "";
  private static listener?: VoiceSearchCallbacks;

  static async start(callbacks: VoiceSearchCallbacks): Promise<void> {
    this.listener = callbacks;
    try {
      const context = getContext(this);
      const config: asr.AsrConfig = {
        audioInfo: {
          audioType: asr.AudioType.AUDIO_MIC,
          micSource: asr.MicSource.MIC_AUTO,
        },
        language: "zh-CN",
        extraParams: {
          maxDuration: 10000,
        },
      } as asr.AsrConfig;
      this.sessionId = await asr.startListening(context, config);
      this.listener.onStart();

      // 注册结果监听
      asr.on("result", this.sessionId, (result: asr.AsrResult) => {
        if (result.result && result.result.length > 0) {
          this.listener?.onResult(result.result);
        }
      });
      asr.on("error", this.sessionId, (err: asr.AsrError) => {
        this.listener?.onError(err.code, err.message);
      });
      asr.on("complete", this.sessionId, () => {
        this.listener?.onEnd();
      });
    } catch (e) {
      callbacks.onError(-1, (e as Error).message);
    }
  }

  static async stop(): Promise<void> {
    if (this.sessionId.length === 0) return;
    try {
      await asr.finishListening(this.sessionId);
      asr.off("result", this.sessionId);
      asr.off("error", this.sessionId);
      asr.off("complete", this.sessionId);
    } catch (e) {
      /* 静默 */
    } finally {
      this.sessionId = "";
    }
  }

  static async cancel(): Promise<void> {
    if (this.sessionId.length === 0) return;
    try {
      await asr.cancelListening(this.sessionId);
    } catch (e) {
      /* 静默 */
    } finally {
      this.sessionId = "";
    }
  }
}

export default VoiceSearchService;
