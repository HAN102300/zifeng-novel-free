/**
 * 紫枫免费小说鸿蒙应用 - 启动页面
 * 风格与紫枫免费小说网站保持一致
 */
import { router } from '@kit.ArkUI'
import { ThemeManager } from '../service/ThemeManager'

@Entry
@Component
struct StartPage {
  private timeOutId: number = 0
  @State opacityValue: number = 0
  @State scaleValue: number = 0.8
  @State translateY: number = 30
  @State logoRotate: number = -15
  @State glowOpacity: number = 0
  @State lineWidth: number = 0
  @State dotOpacity1: number = 0
  @State dotOpacity2: number = 0
  @State dotOpacity3: number = 0
  @State versionOpacity: number = 0
  @State currentTheme: string = 'light'
  private themeManager = ThemeManager.getInstance()

  aboutToAppear(): void {
    this.currentTheme = this.themeManager.isDarkMode ? 'dark' : 'light'
    this.startAnimations()
    this.timeOutId = setTimeout(() => {
      router.replaceUrl({
        url: 'pages/Index'
      }).catch((err: Error) => {
        console.log(JSON.stringify(err))
      })
    }, 2800)
  }

  aboutToDisappear(): void {
    clearTimeout(this.timeOutId)
  }

  startAnimations() {
    // Logo 缩放、淡入
    animateTo({ duration: 800, curve: Curve.FastOutSlowIn, delay: 100 }, () => {
      this.opacityValue = 1
      this.scaleValue = 1
      this.translateY = 0
      this.logoRotate = 0
    })

    // 光晕淡入
    animateTo({ duration: 1200, curve: Curve.EaseInOut, delay: 400 }, () => {
      this.glowOpacity = 1
    })

    // 装饰线展开
    animateTo({ duration: 600, curve: Curve.EaseOut, delay: 600 }, () => {
      this.lineWidth = 80
    })

    // 装饰点依次出现
    setTimeout(() => {
      animateTo({ duration: 400 }, () => { this.dotOpacity1 = 1 })
    }, 800)
    setTimeout(() => {
      animateTo({ duration: 400 }, () => { this.dotOpacity2 = 1 })
    }, 1000)
    setTimeout(() => {
      animateTo({ duration: 400 }, () => { this.dotOpacity3 = 1 })
    }, 1200)

    // 版本信息淡入
    animateTo({ duration: 600, curve: Curve.EaseIn, delay: 1500 }, () => {
      this.versionOpacity = 1
    })
  }

  build() {
    Stack() {
      // 背景层 - 与网站一致的紫罗兰渐变
      Column()
        .width('100%')
        .height('100%')
        .linearGradient({
          direction: GradientDirection.Bottom,
          colors: [
            ['#aa3bff', 0.0],
            ['#9254de', 0.4],
            ['#722ed1', 0.8],
            ['#531dab', 1.0]
          ]
        })

      // 装饰光晕 - 缩小尺寸避免视觉遮挡
      Column()
        .width(250)
        .height(250)
        .borderRadius(125)
        .backgroundColor('rgba(255, 255, 255, 0.06)')
        .blur(60)
        .position({ x: -80, y: -50 })
        .opacity(this.glowOpacity)

      Column()
        .width(200)
        .height(200)
        .borderRadius(100)
        .backgroundColor('rgba(192, 132, 252, 0.08)')
        .blur(50)
        .position({ x: '75%', y: '65%' })
        .opacity(this.glowOpacity)

      // 主内容
      Column() {
        Column() {
          // Logo 容器 - 带毛玻璃圆形背景
          Column() {
            // 内部图标
            Stack() {
              // 书本图形 - 使用 Stack 组合绘制
              Stack() {
                // 书脊
                Column()
                  .width(60)
                  .height(80)
                  .backgroundColor('#ffffff')
                  .borderRadius(4)

                // 书页分隔
                Column()
                  .width(2)
                  .height(80)
                  .backgroundColor('#aa3bff')
                  .position({ x: 29, y: 0 })

                // 页面横线
                Column()
                  .width(20)
                  .height(2)
                  .backgroundColor('#aa3bff')
                  .position({ x: 5, y: 20 })
                Column()
                  .width(20)
                  .height(2)
                  .backgroundColor('#aa3bff')
                  .position({ x: 5, y: 30 })
                Column()
                  .width(20)
                  .height(2)
                  .backgroundColor('#aa3bff')
                  .position({ x: 5, y: 40 })
                Column()
                  .width(20)
                  .height(2)
                  .backgroundColor('#aa3bff')
                  .position({ x: 5, y: 50 })

                Column()
                  .width(20)
                  .height(2)
                  .backgroundColor('#aa3bff')
                  .position({ x: 35, y: 20 })
                Column()
                  .width(20)
                  .height(2)
                  .backgroundColor('#aa3bff')
                  .position({ x: 35, y: 30 })
                Column()
                  .width(20)
                  .height(2)
                  .backgroundColor('#aa3bff')
                  .position({ x: 35, y: 40 })
                Column()
                  .width(20)
                  .height(2)
                  .backgroundColor('#aa3bff')
                  .position({ x: 35, y: 50 })
              }
              .rotate({ angle: this.logoRotate, centerX: '50%', centerY: '50%' })
            }
            .width(100)
            .height(100)
            .borderRadius(50)
            .backgroundColor('rgba(255, 255, 255, 0.95)')
            .shadow({
              radius: 24,
              color: 'rgba(0, 0, 0, 0.3)',
              offsetY: 8
            })
            .opacity(this.opacityValue)
            .scale({ x: this.scaleValue, y: this.scaleValue })
            .translate({ y: this.translateY })
          }
          .width(120)
          .height(120)
          .borderRadius(60)
          .backgroundColor('rgba(255, 255, 255, 0.15)')
          .border({
            width: 2,
            color: 'rgba(255, 255, 255, 0.25)'
          })
          .backdropBlur(20)
          .opacity(this.opacityValue)
          .scale({ x: this.scaleValue, y: this.scaleValue })
          .translate({ y: this.translateY })

          // 应用名
          Text('紫枫免费小说')
            .fontSize(32)
            .fontWeight(FontWeight.Bold)
            .fontColor('#ffffff')
            .letterSpacing(2)
            .margin({ top: 36 })
            .textShadow({
              radius: 8,
              color: 'rgba(0, 0, 0, 0.25)',
              offsetY: 2
            })
            .opacity(this.opacityValue)
            .translate({ y: this.translateY })

          // 装饰线 + 圆点
          Row({ space: 8 }) {
            Column()
              .width(this.lineWidth)
              .height(2)
              .backgroundColor('rgba(255, 255, 255, 0.6)')
              .borderRadius(1)

            Row({ space: 6 }) {
              Column()
                .width(6)
                .height(6)
                .borderRadius(3)
                .backgroundColor('#ffffff')
                .opacity(this.dotOpacity1)
              Column()
                .width(6)
                .height(6)
                .borderRadius(3)
                .backgroundColor('#ffffff')
                .opacity(this.dotOpacity2)
              Column()
                .width(6)
                .height(6)
                .borderRadius(3)
                .backgroundColor('#ffffff')
                .opacity(this.dotOpacity3)
            }
          }
          .margin({ top: 16 })

          // 副标题
          Text('海量书源 · 聚合搜索 · 永久免费')
            .fontSize(14)
            .fontColor('rgba(255, 255, 255, 0.85)')
            .letterSpacing(1)
            .margin({ top: 16 })
            .opacity(this.opacityValue)

          // Loading 指示器
          Row({ space: 6 }) {
            Column()
              .width(8)
              .height(8)
              .borderRadius(4)
              .backgroundColor('#ffffff')
              .opacity(0.4)
            Column()
              .width(8)
              .height(8)
              .borderRadius(4)
              .backgroundColor('#ffffff')
              .opacity(0.7)
            Column()
              .width(8)
              .height(8)
              .borderRadius(4)
              .backgroundColor('#ffffff')
              .opacity(1.0)
          }
          .margin({ top: 50 })
          .opacity(this.opacityValue)
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
      }

      // 底部版本号
      Column() {
        Text('v 1.0.0')
          .fontSize(12)
          .fontColor('rgba(255, 255, 255, 0.6)')
          .opacity(this.versionOpacity)
      }
      .width('100%')
      .position({ x: 0, y: '92%' })
      .alignItems(HorizontalAlign.Center)
    }
    .width('100%')
    .height('100%')
  }
}
