import { ArrowDown, ArrowsOut } from '@phosphor-icons/react'
import { Figure, PageHeading, SectionHeading } from '../components/PortfolioParts'
import { asset, fileSize, modelInventory, models } from '../content/portfolio'
import type { PageProps } from '../content/types'

const groups = [
  { id: 'head', title: '头部', part: 'eye-front-left', description: '双目造型还原瓦力好奇的神态，通过眼部外壳与头部支架组合出富有表情的轮廓。' },
  { id: 'neck', title: '颈部', part: 'neck-bottom-left', description: '连接头部与机身，以支架、连杆和转轴构成活动关节，并为导线预留通道。' },
  { id: 'arms', title: '手臂', part: 'arm-barrel', description: '套筒、活塞杆与铰链连接肩部和手掌，呈现瓦力伸手、摆臂的动作形态。' },
  { id: 'body', title: '机身', part: 'body-front-door', description: '方形躯干与前舱门延续电影中的经典形象，内部容纳主控、电源和驱动模块。' },
  { id: 'wheels', title: '轮组', part: 'wheel-front', description: '车轮、齿轮与轮架构成底盘骨架，为履带提供支撑、导向与动力传递。' },
  { id: 'treads', title: '履带', part: 'tread-plate', description: '履带板由销钉逐节连接，环绕两侧轮组，组成瓦力标志性的履带行走结构。' },
]

const assemblySteps = [
  { title: '轮组与履带：先搭底盘', description: '先组合轮架、轮轴和齿轮，再逐节连接履带板与销钉，检查两侧轮组的对齐与转动间隙。' },
  { title: '头部与颈部：分层连接', description: '将双眼外壳与头部支架组合，再通过转轴、连杆和舵机连接颈部，预留抬头与转向空间。' },
  { title: '手臂与机身：模块汇合', description: '分别组合肩部支架、套筒与手掌，再将双臂、头颈和底盘连接到机身，检查各关节的活动空间。' },
  { title: '内部布置：理线后合壳', description: '安排控制板、电源与驱动模块的位置，让线束沿机身和颈部通道布置，留出关节余量与前舱门检修空间。' },
]

const totalQuantity = modelInventory.reduce((sum, item) => sum + item.quantity, 0)

export default function Structure({ openImage }: PageProps) {
  return <>
    <PageHeading number="02" title="结构与制造">以电影中的瓦力形象为原型，将熟悉的轮廓转化为结构设计、3D 打印零件与装配方案。</PageHeading>
    <div className="inventory-summary">
      <div><strong>{groups.length}<span>个</span></strong><p>结构部分</p></div>
      <div><strong>{modelInventory.length}<span>类</span></strong><p>结构零件</p></div>
      <div><strong>{totalQuantity}<span>件</span></strong><p>完成打印</p></div>
    </div>

    <section className="page-section">
      <SectionHeading title="六个部分，组成一个完整瓦力">我们的瓦力由头部、颈部、手臂、机身、轮组和履带六个部分组成。围绕电影中标志性的双眼、方形躯干与履带底盘，我们进行建模与结构设计，让外观比例、关节连接和内部空间相互配合。</SectionHeading>
      <div className="parts-gallery">{groups.map((group, i) => {
        const part = models.find(model => model.id === group.part)!
        return <article className="part-study" key={group.id}>
          <button className="part-preview" aria-label={`放大查看：${part.title}`} onClick={() => openImage({ src: part.preview, title: `${group.title} · ${part.title}`, caption: group.description })}>
            <img src={asset(part.preview)} alt={`${group.title}代表零件：${part.title}`} loading="lazy" /><span><ArrowsOut size={15} /></span>
          </button>
          <div className="part-study-caption"><span className="part-number">0{i + 1}</span><div><h3>{group.title}<span>{part.title}</span></h3><p>{group.description}</p></div></div>
        </article>
      })}</div>
    </section>

    <section className="page-section">
      <SectionHeading title="装配思路：从局部到整机">先组合底盘、头颈和双臂，再以机身为中心连接各部分；内部布局与关节布线同步考虑，最后合拢外壳。</SectionHeading>
      <div className="paired-figures">
        <Figure name="reference/瓦力机器人设计方案-image2.jpeg" title="头颈连接与分层装配" caption="双眼外壳 → 头部支架 → 颈部关节" openImage={openImage} />
        <Figure name="reference/瓦力机器人设计方案-image4.jpeg" title="机身内部布局" caption="模块定位 · 线束通道 · 舱门空间" openImage={openImage} />
      </div>
      <ol className="assembly-sequence">{assemblySteps.map((step, i) => <li key={step.title}><span>0{i + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
    </section>

    <section className="page-section">
      <SectionHeading title="打印分工与装配安排">按零件尺寸与精细程度分配打印任务，60 类、310 件结构零件已全部完成打印。</SectionHeading>
      <div className="table-scroll"><table className="document-table">
        <thead><tr><th>小组成员</th><th>打印分工</th><th>主要部件</th></tr></thead>
        <tbody>
          <tr><td>胡承越</td><td>大型结构件</td><td>机身板件、头部支架及外轮架等</td></tr>
          <tr><td>陆轩</td><td>中型结构件</td><td>眼部、手臂、颈部与轮组等</td></tr>
          <tr><td>朱兴宇、李汶远</td><td>小型精细件</td><td>转轴、铰链、履带板与销钉等</td></tr>
        </tbody>
      </table></div>
      <div className="two-column-prose">
        <div><h3>分组打印，穿插局部装配</h3><p>大型板件、中型结构件与小型连接件分组推进，打印后按结构部分归类；先组合轮组、头颈和手臂，为整机连接做好准备。</p></div>
        <div><h3>四人协作，集中完成整机连接</h3><p>整机装配由四人共同参与，依次连接底盘、机身、头颈和双臂，配合控制板、电源与线束的安装，再开展各机构的动作调试。</p></div>
      </div>
      <div className="paired-figures">
        <Figure name="model-list.png" title="建模文件与打印数量清单" caption="60 类零件 · 310 件" openImage={openImage} className="list-figure" />
        <Figure name="print-assignments.png" title="打印分工清单" caption="大型结构件 · 中型结构件 · 小型精细件" openImage={openImage} className="list-figure" />
      </div>
    </section>

    <section className="page-section" id="model-library">
      <SectionHeading title="模型文件目录">{modelInventory.length} 类零件 · {models.length} 份 STL 文件</SectionHeading>
      <div className="model-library">{groups.map(group => {
        const items = modelInventory.filter(item => item.category === group.id)
        return <details key={group.id} open={group.id === 'head'}>
          <summary><span>{group.title}</span><span>{items.length} 类零件</span><span className="details-plus">+</span></summary>
          <div className="model-file-list">{items.map(item => {
            const model = models.find(model => model.id === item.id)
            return <div className="model-file" key={item.id}>
              <div><strong>{item.title}</strong><span>{item.filename}</span></div>
              <span className="model-file-quantity">× {item.quantity}</span>
              <span className="model-file-size">{model ? fileSize(model.bytes) : ''}</span>
              {model ? <a href={asset(model.path)} download={model.filename.replace(/（.*?）/g, '')} aria-label={`下载 ${model.title} STL`}><ArrowDown size={16} /><span>STL</span></a> : <span />}
            </div>
          })}</div>
        </details>
      })}</div>
    </section>
  </>
}
