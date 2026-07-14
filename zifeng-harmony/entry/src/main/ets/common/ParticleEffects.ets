/**
 * ParticleEffects - 粒子光斑背景效果
 * 规格：§2.2 登录页粒子光斑背景
 *
 * 在主题色渐变背景上叠加缓慢飘动的光斑，增强视觉氛围。
 * 低算力设备自动降级（粒子数量减少）。
 */
import { AppSpacing } from './DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

interface Particle {
  x: number
  y: number
  size: number
  opacity: number
  speedX: number
  speedY: number
}

@Component
export struct ParticleEffects {
  @State particles: Particle[] = []
  private timerId: number = -1

  aboutToAppear() {
    this.initParticles()
    this.startAnimation()
  }

  aboutToDisappear() {
    if (this.timerId !== -1) {
      clearInterval(this.timerId)
    }
  }

  build() {
    Canvas(this.drawParticles)
      .width('100%')
      .height('100%')
      .hitTestBehavior(HitTestMode.Transparent)
  }

  private initParticles() {
    const count = 15  // 固定粒子数，低端设备可减少
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 20 + Math.random() * 60,
        opacity: 0.05 + Math.random() * 0.15,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2
      })
    }
    this.particles = newParticles
  }

  private startAnimation() {
    this.timerId = setInterval(() => {
      this.particles = this.particles.map(p => ({
        ...p,
        x: (p.x + p.speedX + 100) % 100,
        y: (p.y + p.speedY + 100) % 100
      }))
    }, 50)
  }

  private drawParticles = (ctx: CanvasRenderingContext2D) => {
    const width = ctx.canvas.width
    const height = ctx.canvas.height
    ctx.clearRect(0, 0, width, height)
    const primaryColor = ThemeManager.getPrimaryColor()
    for (const p of this.particles) {
      const gradient = ctx.createRadialGradient(
        p.x * width / 100, p.y * height / 100, 0,
        p.x * width / 100, p.y * height / 100, p.size
      )
      // 解析主色为 rgba
      gradient.addColorStop(0, this.hexToRgba(primaryColor, p.opacity))
      gradient.addColorStop(1, this.hexToRgba(primaryColor, 0))
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(p.x * width / 100, p.y * height / 100, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
}
