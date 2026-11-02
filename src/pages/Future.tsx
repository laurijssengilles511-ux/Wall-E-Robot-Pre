import { Figure, PageHeading, SectionHeading } from '../components/PortfolioParts'
import type { PageProps } from '../content/types'

export default function Future({ openImage }: PageProps) {
  return <>
    <PageHeading number="05" title="未来构想">经历装配与电路调试中的反复尝试，我们近期的目标是完成实体机器人装配。瓦力已经具备丰富的动作与回应链路，我们也希望在这些成果的基础上，探索不受项目周期限制时，交互、功能与结构还可以有哪些拓展。</PageHeading>

    <section className="page-section future-near">
      <SectionHeading number="01" title="近期：完成实体机器人装配" />
      <ol className="plain-steps">
        <li><span>建模</span><div><h3>缩小整机，让结构更容易落地</h3><p>原先设想的机器人尺寸偏大，装配和驱动的难度也随之增加。我们已调整机器人的建模方案，缩小整体尺寸，并重新考虑内部空间的分配，让机身、传动机构和电子元件之间的配合更紧凑，也让后续装配更便于操作。</p></div></li>
        <li><span>电路</span><div><h3>简化电路，理清供电与接线</h3><p>针对原方案内部电路复杂、接线和排查困难的问题，我们已梳理供电与模块连接关系，重新设计了简化版电路，并完成了行进和基本关节动作相关的接线整理，以及电压、电流与线材匹配关系的核对，为后续整机装配做好准备。</p></div></li>
        <li><span>装配</span><div><h3>从局部调试走向整机运行</h3><p>以调整后的模型和电路方案为基础，先检查履带、头颈和手臂的装配配合，再分别调试电机与舵机，确认线路固定和运动空间后装入机身。通过分步装配与联调，尽快完成实体机器人，让行进、转头和抬臂连贯地运行起来。</p></div></li>
      </ol>
    </section>

    <section className="page-section future-long">
      <SectionHeading number="02" title="远期：探索新的交互与结构">我们希望把双眼、头颈、手臂和履带的运动连成有性格的表达，也让收藏旧物、照顾植物成为它与人相处的日常。</SectionHeading>
      <div className="future-layout">
        <Figure name="concept-sheet.png" title="瓦力的表情与结构" caption="" openImage={openImage} className="concept-sheet" />
        <div className="future-notes">
          <article><span>01 / 表情与动作</span><h3>不用说话，也能表达心情</h3><p>我们希望瓦力遇到新东西时歪头观察，受到夸奖时抬起双眼、轻摆手臂，失落时低头停顿。可以为双眼增加独立的倾斜关节，将眼睛、头颈和手臂的位置编成动作序列，再通过速度、幅度和停顿的变化，让同一套机构呈现不同情绪。</p></article>
          <article><span>02 / 感知与回应</span><h3>当你伸出手，它会转过来</h3><p>未来可以让瓦力发现面前的人，转头注视，并在看到招手动作后抬臂回应。由摄像头配合视觉模块识别人脸或手势，将目标方向传给主控，再控制头部与机身转向；结合距离传感器限制靠近范围，就能把识别、转头和回应连成一次自然的互动。</p></article>
          <article><span>03 / 抓取与收藏</span><h3>把小小的发现，收进自己的舱体</h3><p>像电影中的瓦力一样，我们希望它能拾起轻巧的小物，举起来端详，再放进机身的收藏格。可以用舵机带动带软垫的夹爪，通过机械限位控制闭合行程，并先围绕固定位置、固定尺寸的小物编排抓取动作，再逐步加入视觉定位，让收藏从预设动作发展为自主选择。</p></article>
          <article><span>04 / 舱体与维护</span><h3>让小机身容纳更多可能</h3><p>随着功能增加，我们希望机身能像工具箱一样方便打开。可以将电池、控制板和收藏格分区布置，采用可拆面板与插接式线束，并在关节附近预留走线空间。这样既能缩短检修时的拆装路径，也能通过更换局部模块，继续尝试新的手部、传感器和收纳结构。</p></article>
        </div>
      </div>

      <div className="future-scene">
        <SectionHeading title="带着一株植物，走进日常">电影中被瓦力珍惜的那株幼苗，也让我们想到：机器人可以陪人一起观察生长、照顾身边的小事。</SectionHeading>
        <Figure name="concept-blueprint.png" title="瓦力与植物" caption="" rotated openImage={openImage} />
        <div className="future-notes future-details">
          <article><span>05 / 植物照料</span><h3>记得给它一点水和阳光</h3><p>我们希望瓦力能托着一盆小植物，在土壤变干时用低头、提示音或灯光提醒主人。可先用固定在机身上的可拆托盘承载花盆，接入土壤湿度与光照传感器；之后再加入独立水箱和微型水泵，将水路与电路分舱布置，逐步实现少量、定时的浇水。</p></article>
          <article><span>06 / 能源补充</span><h3>在阳光下，展开自己的小翅膀</h3><p>我们设想在机身上加入可折叠的太阳能板，让瓦力停下来时展开面板，呼应电影里的充电姿态。太阳能板可通过适配电池的充电管理模块，为低功耗待机和传感模块补充电量；主电池仍承担行进与关节运动的供电，再用电量检测触发休息和展开面板的动作。</p></article>
          <article><span>07 / 履带与行走</span><h3>带着好奇心，走得更稳一点</h3><p>为了让它能在室内缓慢跟随，也能稳稳地带着植物移动，我们希望优化履带张紧与轮组支撑，并用电机编码器修正左右速度差。前方距离传感器负责发现障碍，主控据此减速、停车或转向；再结合倾斜检测限制急转与爬坡，让表情、载物和行走可以协调进行。</p></article>
        </div>
      </div>
    </section>
  </>
}
