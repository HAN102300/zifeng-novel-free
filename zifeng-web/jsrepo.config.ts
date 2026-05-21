import type { JsrepoConfig } from 'jsrepo'

export const config: JsrepoConfig = {
  registry: [
    {
      name: 'react-bits',
      url: 'https://reactbits.dev/r'
    }
  ],
  paths: {
    components: 'src/components/react-bits',
    hooks: 'src/hooks',
    lib: 'src/lib'
  }
}

export default config