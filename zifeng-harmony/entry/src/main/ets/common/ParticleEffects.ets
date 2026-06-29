/**
 * 紫枫免费小说鸿蒙应用 - 光粒子特效组件
 * 适配 HarmonyOS 26.0.0 新特性
 * 已迁移至 @ComponentV2 + V2 状态装饰器
 *
 * 提供：
 * 1. 飘浮粒子 - 缓慢上下飘动的光斑（用于背景装饰）
 * 2. 光晕脉冲 - 径向渐变光晕
 * 3. 装饰光斑 - 静态光斑（性能友好）
 * 4. 加载光点 - 三个光点交替动画
 */

import { AppColors, ParticleColors } from './DesignSystem'

/**
 * 粒子配置
 */
interface ParticleConfig {
  x: number
  y: number
  size: number
  color: string
  speed: number
  phase: number  // 动画相位
  amplitude: number  // 浮动幅度
}

/**
 * 飘浮粒子背景 - 通用背景装饰
 * 适用于：启动页、各页面背景等
 */
@ComponentV2
export struct FloatingParticles {
  @Param count: number = 20
  @Param isDarkMode: boolean = false
  @Param enableAnimation: boolean = true
  @Local particles: ParticleConfig[] = []
  @Local animationTick: number = 0
  private timeOutId: number = 0

  aboutToAppear() {
    this.initParticles()
    if (this.enableAnimation) {
      this.startAnimation()
    }
  }

  aboutToDisappear() {
    if (this.timeOutId) {
      clearInterval(this.timeOutId)
    }
  }

  initParticles() {
    const colors = this.isDarkMode ? ParticleColors.DARK_THEME : ParticleColors.LIGHT_THEME
    const particles: ParticleConfig[] = []
    for (let i = 0; i < this.count; i++) {
      particles.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 3 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        amplitude: 10 + Math.random() * 30
      })
    }
    this.particles = particles
  }

  startAnimation() {
    this.timeOutId = setInterval(() => {
      animateTo({ duration: 50 }, () => {
        this.animationTick = (this.animationTick + 1) % 1000
      })
    }, 50)
  }

  build() {
    Stack() {
      ForEach(this.particles, (particle: ParticleConfig, index: number) => {
        Column()
          .width(particle.size)
          .height(particle.size)
          .borderRadius(particle.size / 2)
          .backgroundColor(particle.color)
          .blur(particle.size / 2)
          .position({
            x: `${particle.x}%`,
            y: `${particle.y + Math.sin(this.animationTick * 0.05 * particle.speed + particle.phase) * particle.amplitude / 10}%`
          })
      })
    }
    .width('100%')
    .height('100%')
    .hitTestBehavior(HitTestMode.None)
  }
}

/**
 * 光晕脉冲 - 径向渐变光晕（优化版）
 * 适用于：英雄区背景装饰，缩小尺寸避免遮挡内容
 */
@ComponentV2
export struct GlowPulse {
  @Param x: string | number = '50%'
  @Param y: string | number = '50%'
  @Param pulseSize: number = 120
  @Param color: string = AppColors.PRIMARY_LIGHT
  @Param intensity: number = 0.15
  @Param animationDuration: number = 3000
  @Local pulseScale: number = 1
  @Local pulseOpacity: number = 0.4

  aboutToAppear() {
    this.startPulse()
  }

  startPulse() {
    animateTo({
      duration: this.animationDuration,
      iterations: -1,
      curve: Curve.EaseInOut
    }, () => {
      this.pulseScale = 1.3
      this.pulseOpacity = 0.2
    })
    setTimeout(() => {
      animateTo({
        duration: this.animationDuration,
        iterations: -1,
        curve: Curve.EaseInOut
      }, () => {
        this.pulseScale = 1
        this.pulseOpacity = 0.6
      })
    }, this.animationDuration)
  }

  build() {
    Column()
      .width(this.pulseSize)
      .height(this.pulseSize)
      .borderRadius(this.pulseSize / 2)
      .backgroundColor(this.color)
      .opacity(this.pulseOpacity * this.intensity)
      .blur(this.pulseSize / 3)
      .scale({ x: this.pulseScale, y: this.pulseScale })
      .position({ x: this.x, y: this.y })
      .hitTestBehavior(HitTestMode.None)
  }
}

/**
 * 装饰光斑 - 静态光斑（性能友好）
 * 优化：缩小尺寸、降低透明度、调整位置避开顶部栏区域
 */
@ComponentV2
export struct LightOrbs {
  @Param count: number = 3
  @Param isDarkMode: boolean = false

  build() {
    Stack() {
      if (this.count >= 1) {
        Column()
          .width(160)
          .height(160)
          .borderRadius(80)
          .backgroundColor(this.isDarkMode ? 'rgba(170, 59, 255, 0.12)' : 'rgba(170, 59, 255, 0.08)')
          .blur(60)
          .position({ x: '-15%', y: '2%' })
      }
      if (this.count >= 2) {
        Column()
          .width(120)
          .height(120)
          .borderRadius(60)
          .backgroundColor(this.isDarkMode ? 'rgba(19, 194, 194, 0.12)' : 'rgba(19, 194, 194, 0.06)')
          .blur(50)
          .position({ x: '70%', y: '20%' })
      }
    }
    .width('100%')
    .height('100%')
    .hitTestBehavior(HitTestMode.None)
  }
}

/**
 * 加载光点 - 三个光点交替动画
 * 适用于：加载占位、loading 状态
 */
@ComponentV2
export struct LoadingDots {
  @Param color: string = AppColors.PRIMARY_LIGHT
  @Param dotSize: number = 8
  @Local opacity1: number = 0.3
  @Local opacity2: number = 0.3
  @Local opacity3: number = 0.3
  private intervalId1: number = -1
  private intervalId2: number = -1
  private intervalId3: number = -1

  aboutToAppear() {
    this.startAnimation()
  }

  aboutToDisappear() {
    if (this.intervalId1 !== -1) {
      clearInterval(this.intervalId1)
    }
    if (this.intervalId2 !== -1) {
      clearInterval(this.intervalId2)
    }
    if (this.intervalId3 !== -1) {
      clearInterval(this.intervalId3)
    }
  }

  startAnimation() {
    this.intervalId1 = setInterval(() => {
      animateTo({ duration: 400, curve: Curve.EaseInOut }, () => {
        this.opacity1 = 1
      })
    }, 0)
    this.intervalId2 = setInterval(() => {
      animateTo({ duration: 400, curve: Curve.EaseInOut }, () => {
        this.opacity2 = 1
      })
    }, 400)
    this.intervalId3 = setInterval(() => {
      animateTo({ duration: 400, curve: Curve.EaseInOut }, () => {
        this.opacity3 = 1
      })
    }, 800)
  }

  build() {
    Row({ space: 6 }) {
      Column()
        .width(this.dotSize)
        .height(this.dotSize)
        .borderRadius(this.dotSize / 2)
        .backgroundColor(this.color)
        .opacity(this.opacity1)
      Column()
        .width(this.dotSize)
        .height(this.dotSize)
        .borderRadius(this.dotSize / 2)
        .backgroundColor(this.color)
        .opacity(this.opacity2)
      Column()
        .width(this.dotSize)
        .height(this.dotSize)
        .borderRadius(this.dotSize / 2)
        .backgroundColor(this.color)
        .opacity(this.opacity3)
    }
  }
}
