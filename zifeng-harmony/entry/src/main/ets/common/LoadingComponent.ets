@ComponentV2
struct Loading {
  @Param message: string = '加载中...'

  build() {
    Column() {
      LoadingProgress().width(50).color('#ffb174ea')
      Text(this.message).fontSize(14).fontColor('#ffb174ea')
    }
    .justifyContent(FlexAlign.Center)
    .width('100%')
    .layoutWeight(1)
  }
}

export { Loading }
