import { PageHeading, SectionHeading } from '../components/PortfolioParts'
import RobotPlayground from '../components/RobotPlayground'
import { asset } from '../content/portfolio'
import type { PageProps } from '../content/types'

export default function Virtual({ openImage }: PageProps) {
  return <><PageHeading number="07" title="虚拟平台">在实体制作遇到困难时，我们搭建了这个虚拟平台，让设计中的瓦力先在屏幕里动起来。如今实体机器人已经完成装配与测试，这里可以自由查看数字模型，体验语义到动作的表达实验，也能调节姿态、编排动作，探索更多交互的可能。</PageHeading>
    <RobotPlayground />
    <section className="page-section"><SectionHeading title="换个角度，认识它" />
      <div className="virtual-review-grid">{[['front', '正面'], ['side', '侧面'], ['back', '背面']].map(([view, title]) => <figure key={view}><button className="figure-button" onClick={() => openImage({ src: `portfolio/virtual/${view}.png`, title: `虚拟瓦力 · ${title}`, caption: '展示用数字装配；含推定结构件。' })} aria-label={`放大查看：虚拟瓦力${title}`}><img src={asset(`portfolio/virtual/${view}.png`)} alt={`虚拟瓦力${title}视图`} loading="lazy" /></button><figcaption>{title}</figcaption></figure>)}</div>
    </section>
  </>
}
