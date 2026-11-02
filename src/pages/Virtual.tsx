import { PageHeading, SectionHeading } from '../components/PortfolioParts'
import RobotPlayground from '../components/RobotPlayground'
import { asset } from '../content/portfolio'
import type { PageProps } from '../content/types'

export default function Virtual({ openImage }: PageProps) {
  return <><PageHeading number="06" title="虚拟平台">由于实体机器人的搭建遇到了一些困难，我们制作了这个虚拟平台，展示瓦力机器人的动作编排与部分功能，让设计中的瓦力先在虚拟世界里动起来。</PageHeading>
    <RobotPlayground />
    <section className="page-section"><SectionHeading title="换个角度，认识它" />
      <div className="virtual-review-grid">{[['front', '正面'], ['side', '侧面'], ['back', '背面']].map(([view, title]) => <figure key={view}><button className="figure-button" onClick={() => openImage({ src: `portfolio/virtual/${view}.png`, title: `虚拟瓦力 · ${title}`, caption: '展示用数字装配；含推定结构件。' })} aria-label={`放大查看：虚拟瓦力${title}`}><img src={asset(`portfolio/virtual/${view}.png`)} alt={`虚拟瓦力${title}视图`} loading="lazy" /></button><figcaption>{title}</figcaption></figure>)}</div>
    </section>
  </>
}
